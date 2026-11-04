from datetime import date
from pathlib import Path

import pytest

from apply_issue_tags import ApplyError, LiveIssue, apply_plan, main, plan_apply, read_staged

TAGS = "Proposed for #678.\n\n- `roadmap/substep`: schema gap\n- `priority/mvp`\n- `agent/implement`\n\nParent: #318 (backbone)\n"


def make_record(vault: Path, status="needs_decision", number="678", tags: str | None = TAGS) -> Path:
    record = vault / "repositories" / "foundry" / "issues" / status / number
    record.mkdir(parents=True)
    (record / "index.md").write_text("# #678 title\n\nFindings.\n")
    if tags is not None:
        (record / "issue_tags.md").write_text(tags)
    return record


def live(labels=("needs-triage",), parent=None, state="OPEN") -> LiveIssue:
    return LiveIssue(node_id="I_child", state=state, labels=list(labels), parent=parent)


KNOWN = {"roadmap/main", "roadmap/substep", "roadmap/off", "priority/mvp", "priority/v2", "agent/implement", "agent/research", "agent/human", "upstream/galaxy", "needs-triage"}


def test_reads_labels_and_parent():
    assert read_staged(TAGS) == (["roadmap/substep", "priority/mvp", "agent/implement"], 318)
    assert read_staged("- `agent/human`\n") == (["agent/human"], None)


def test_plans_additions_and_parent(tmp_path):
    plan = plan_apply(make_record(tmp_path), live(), KNOWN)
    assert plan.github_repo == "galaxyproject/foundry"
    assert plan.number == 678
    assert plan.add == ["roadmap/substep", "priority/mvp", "agent/implement"]
    assert plan.remove == []
    assert plan.parent == 318


def test_swaps_conflicting_exclusive_labels_but_keeps_others(tmp_path):
    current = live(labels=("needs-triage", "roadmap/off", "priority/mvp", "agent/human", "upstream/galaxy", "bug"))
    plan = plan_apply(make_record(tmp_path), current, KNOWN)
    assert plan.add == ["roadmap/substep", "agent/implement"]
    assert plan.remove == ["roadmap/off", "agent/human"]


def test_skips_parent_already_linked(tmp_path):
    plan = plan_apply(make_record(tmp_path), live(parent=318), KNOWN)
    assert plan.parent is None


def test_nothing_to_do_is_empty(tmp_path):
    current = live(labels=("roadmap/substep", "priority/mvp", "agent/implement"), parent=318)
    assert plan_apply(make_record(tmp_path), current, KNOWN).empty


def test_rejects_missing_tags_closed_issue_unknown_label_and_non_records(tmp_path):
    with pytest.raises(ApplyError, match=r"no issue_tags\.md"):
        plan_apply(make_record(tmp_path, number="1", tags=None), live(), KNOWN)
    with pytest.raises(ApplyError, match="CLOSED"):
        plan_apply(make_record(tmp_path, number="2"), live(state="CLOSED"), KNOWN)
    with pytest.raises(ApplyError, match="unknown label.*agent/implemnt"):
        plan_apply(make_record(tmp_path, number="3", tags="- `agent/implemnt`\n"), live(), KNOWN)
    with pytest.raises(ApplyError, match="no labels"):
        plan_apply(make_record(tmp_path, number="4", tags="Nothing staged.\n"), live(), KNOWN)
    with pytest.raises(ApplyError, match="not an issues record"):
        plan_apply(tmp_path, live(), KNOWN)


def test_apply_edits_links_parent_then_retires_tags(tmp_path):
    record = make_record(tmp_path)
    plan = plan_apply(record, live(labels=("agent/human",)), KNOWN)
    calls = []
    apply_plan(
        plan,
        edit=lambda repo, number, add, remove: calls.append(("edit", repo, number, add, remove)),
        link_parent=lambda repo, parent, child_id: calls.append(("parent", repo, parent, child_id)),
        today=date(2026, 11, 3),
    )
    assert calls == [
        ("edit", "galaxyproject/foundry", 678, ["roadmap/substep", "priority/mvp", "agent/implement"], ["agent/human"]),
        ("parent", "galaxyproject/foundry", 318, "I_child"),
    ]
    assert not (record / "issue_tags.md").exists()
    assert (record / "index.md").read_text() == (
        "# #678 title\n\nFindings.\n\n"
        "Staged labels applied 2026-11-03: +roadmap/substep, +priority/mvp, +agent/implement, -agent/human; parent #318.\n"
    )


def test_failed_edit_keeps_tags(tmp_path):
    record = make_record(tmp_path)
    plan = plan_apply(record, live(), KNOWN)

    def edit(*args):
        raise ApplyError("gh issue edit failed: boom")

    with pytest.raises(ApplyError, match="boom"):
        apply_plan(plan, edit=edit, link_parent=lambda *a: None)
    assert (record / "issue_tags.md").exists()


def test_dry_run_prints_without_applying(tmp_path, capsys, monkeypatch):
    record = make_record(tmp_path)
    monkeypatch.setattr("apply_issue_tags.gh_live_issue", lambda repo, number: live(labels=("agent/human",)))
    monkeypatch.setattr("apply_issue_tags.gh_label_names", lambda repo: KNOWN)
    assert main([str(record), "--dry-run"]) == 0
    out = capsys.readouterr().out
    assert "galaxyproject/foundry#678" in out
    assert "add: roadmap/substep, priority/mvp, agent/implement" in out
    assert "remove: agent/human" in out
    assert "parent: #318" in out
    assert (record / "issue_tags.md").exists()
