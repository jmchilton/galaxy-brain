from datetime import date
from pathlib import Path

import pytest

from apply_issue_tags import ApplyError, LiveIssue, apply_plan, main, plan_apply, read_staged

TAGS = "Proposed for #678.\n\n- `roadmap/substep`: schema gap\n- `priority/mvp`\n- `work/ready-implement`\n\nParent: #318 (backbone)\n"


def make_record(vault: Path, status="needs_decision", number="678", tags: str | None = TAGS) -> Path:
    record = vault / "repositories" / "foundry" / "issues" / status / number
    record.mkdir(parents=True)
    (record / "index.md").write_text("# #678 title\n\nFindings.\n")
    if tags is not None:
        (record / "issue_tags.md").write_text(tags)
    return record


def live(labels=("needs-triage",), parent=None, state="OPEN") -> LiveIssue:
    return LiveIssue(node_id="I_child", state=state, labels=list(labels), parent=parent)


KNOWN = {"roadmap/main", "roadmap/substep", "roadmap/off", "priority/mvp", "priority/v2", "work/ready-implement", "work/ready-research", "work/human", "work/in-progress", "upstream/galaxy", "requires-iwc-inputs", "needs-triage"}


def test_reads_labels_and_parent():
    assert read_staged(TAGS) == (["roadmap/substep", "priority/mvp", "work/ready-implement"], 318)
    assert read_staged("- `work/human`\n") == (["work/human"], None)


def test_plans_additions_and_parent(tmp_path):
    plan = plan_apply(make_record(tmp_path), live(), KNOWN)
    assert plan.github_repo == "galaxyproject/foundry"
    assert plan.number == 678
    assert plan.add == ["roadmap/substep", "priority/mvp", "work/ready-implement"]
    assert plan.remove == []
    assert plan.parent == 318


def test_swaps_conflicting_exclusive_labels_but_keeps_others(tmp_path):
    current = live(labels=("needs-triage", "roadmap/off", "priority/mvp", "work/human", "bug"))
    plan = plan_apply(make_record(tmp_path), current, KNOWN)
    assert plan.add == ["roadmap/substep", "work/ready-implement"]
    assert plan.remove == ["roadmap/off", "work/human"]


def test_staged_work_state_clears_blockers(tmp_path):
    current = live(labels=("roadmap/substep", "priority/mvp", "upstream/galaxy", "requires-iwc-inputs"), parent=318)
    plan = plan_apply(make_record(tmp_path), current, KNOWN)
    assert plan.add == ["work/ready-implement"]
    assert plan.remove == ["upstream/galaxy", "requires-iwc-inputs"]


def test_staged_blocker_clears_work_state_but_keeps_other_blockers(tmp_path):
    record = make_record(tmp_path, tags="- `upstream/galaxy`\n")
    plan = plan_apply(record, live(labels=("work/in-progress", "requires-iwc-inputs")), KNOWN)
    assert plan.add == ["upstream/galaxy"]
    assert plan.remove == ["work/in-progress"]


def test_rejects_work_state_with_blocker_or_two_work_states(tmp_path):
    with pytest.raises(ApplyError, match="both a work/\\* label and a blocker"):
        plan_apply(make_record(tmp_path, number="1", tags="- `work/human`\n- `upstream/galaxy`\n"), live(), KNOWN)
    with pytest.raises(ApplyError, match="more than one work/\\* label"):
        plan_apply(make_record(tmp_path, number="2", tags="- `work/human`\n- `work/ready-research`\n"), live(), KNOWN)


def test_skips_parent_already_linked(tmp_path):
    plan = plan_apply(make_record(tmp_path), live(parent=318), KNOWN)
    assert plan.parent is None


def test_nothing_to_do_is_empty(tmp_path):
    current = live(labels=("roadmap/substep", "priority/mvp", "work/ready-implement"), parent=318)
    assert plan_apply(make_record(tmp_path), current, KNOWN).empty


def test_rejects_missing_tags_closed_issue_unknown_label_and_non_records(tmp_path):
    with pytest.raises(ApplyError, match=r"no issue_tags\.md"):
        plan_apply(make_record(tmp_path, number="1", tags=None), live(), KNOWN)
    with pytest.raises(ApplyError, match="CLOSED"):
        plan_apply(make_record(tmp_path, number="2"), live(state="CLOSED"), KNOWN)
    with pytest.raises(ApplyError, match="unknown label.*work/ready-implemnt"):
        plan_apply(make_record(tmp_path, number="3", tags="- `work/ready-implemnt`\n"), live(), KNOWN)
    with pytest.raises(ApplyError, match="no labels"):
        plan_apply(make_record(tmp_path, number="4", tags="Nothing staged.\n"), live(), KNOWN)
    with pytest.raises(ApplyError, match="not an issues record"):
        plan_apply(tmp_path, live(), KNOWN)


def test_apply_links_parent_edits_then_retires_tags(tmp_path):
    record = make_record(tmp_path)
    plan = plan_apply(record, live(labels=("work/human",)), KNOWN)
    calls = []
    apply_plan(
        plan,
        edit=lambda repo, number, add, remove: calls.append(("edit", repo, number, add, remove)),
        link_parent=lambda repo, parent, child_id: calls.append(("parent", repo, parent, child_id)),
        today=date(2026, 11, 3),
    )
    assert calls == [
        ("parent", "galaxyproject/foundry", 318, "I_child"),
        ("edit", "galaxyproject/foundry", 678, ["roadmap/substep", "priority/mvp", "work/ready-implement"], ["work/human"]),
    ]
    assert not (record / "issue_tags.md").exists()
    assert (record / "index.md").read_text() == (
        "# #678 title\n\nFindings.\n\n"
        "Staged labels applied 2026-11-03: +roadmap/substep, +priority/mvp, +work/ready-implement, -work/human; parent #318.\n"
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
    monkeypatch.setattr("apply_issue_tags.gh_live_issue", lambda repo, number: live(labels=("work/human",)))
    monkeypatch.setattr("apply_issue_tags.gh_label_names", lambda repo: KNOWN)
    assert main([str(record), "--dry-run"]) == 0
    out = capsys.readouterr().out
    assert "galaxyproject/foundry#678" in out
    assert "add: roadmap/substep, priority/mvp, work/ready-implement" in out
    assert "remove: work/human" in out
    assert "parent: #318" in out
    assert (record / "issue_tags.md").exists()
