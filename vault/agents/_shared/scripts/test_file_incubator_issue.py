from pathlib import Path

import pytest

from file_incubator_issue import FilingError, file_record, plan_filing


def make_record(vault: Path, status="incubating", name="orphaned_tools", proposal=True, debrief=True) -> Path:
    record = vault / "repositories" / "galaxy" / "issues_incubator" / status / name
    record.mkdir(parents=True)
    (record / "index.md").write_text("# Orphaned tools\n\nImport leaks tools. **Recommendation:** post.\n")
    (record / "raw.md").write_text("rough draft\n")
    if proposal:
        (record / "proposal.md").write_text("# Import leaves orphaned tools\n\nBody line.\n\n## Testing\n\nSteps.\n")
    if debrief:
        (record / "debrief.md").write_text("debrief\n")
    return record


def test_plans_title_body_and_destination(tmp_path):
    record = make_record(tmp_path)
    plan = plan_filing(record, "needs_decision")
    assert plan.title == "Import leaves orphaned tools"
    assert plan.body == "Body line.\n\n## Testing\n\nSteps.\n"
    assert plan.github_repo == "galaxyproject/galaxy"
    assert plan.dest_parent == tmp_path / "repositories" / "galaxy" / "issues" / "needs_decision"


def test_rejects_missing_proposal_pointing_at_prepare_to_file(tmp_path):
    record = make_record(tmp_path, proposal=False, debrief=False)
    with pytest.raises(FilingError, match=r"no proposal\.md.*PREPARE_TO_FILE"):
        plan_filing(record, "needs_decision")


def test_missing_proposal_with_debrief_mentions_rejection(tmp_path):
    record = make_record(tmp_path, proposal=False)
    with pytest.raises(FilingError, match=r"debrief\.md.*rejected/"):
        plan_filing(record, "needs_decision")


def test_rejects_rejected_records_and_non_records(tmp_path):
    with pytest.raises(FilingError, match="rejected"):
        plan_filing(make_record(tmp_path, status="rejected"), "needs_decision")
    with pytest.raises(FilingError, match="not an issues_incubator record"):
        plan_filing(tmp_path, "needs_decision")


def test_rejects_proposal_without_title(tmp_path):
    record = make_record(tmp_path)
    (record / "proposal.md").write_text("No heading here.\n")
    with pytest.raises(FilingError, match="# title"):
        plan_filing(record, "needs_decision")


def test_files_and_moves_record(tmp_path):
    record = make_record(tmp_path)
    calls = []

    def create(plan):
        calls.append((plan.github_repo, plan.title, plan.body))
        return "https://github.com/galaxyproject/galaxy/issues/24500"

    dest = file_record(plan_filing(record, "queued"), create)
    assert calls == [("galaxyproject/galaxy", "Import leaves orphaned tools", "Body line.\n\n## Testing\n\nSteps.\n")]
    assert dest == tmp_path / "repositories" / "galaxy" / "issues" / "queued" / "24500"
    assert not record.exists()
    assert sorted(p.name for p in dest.iterdir()) == ["debrief.md", "index.md", "proposal.md", "raw.md"]
    assert (dest / "index.md").read_text() == (
        "# galaxy#24500 — Import leaves orphaned tools\n\n"
        "[Issue](https://github.com/galaxyproject/galaxy/issues/24500)\n\n"
        "Import leaks tools. **Recommendation:** post.\n"
    )


def test_existing_destination_keeps_record_and_reports_url(tmp_path):
    record = make_record(tmp_path)
    plan = plan_filing(record, "needs_decision")
    (plan.dest_parent / "24500").mkdir(parents=True)

    def create(plan):
        return "https://github.com/galaxyproject/galaxy/issues/24500"

    with pytest.raises(FilingError, match=r"issues/24500 .*already exists"):
        file_record(plan, create)
    assert record.exists()


TAGS = "- `kind/bug` — imports leak tools.\n- `area/API`\n\nThe `area/testing` label - not central - is left off.\n"


def test_plans_labels_from_issue_tags(tmp_path):
    record = make_record(tmp_path)
    (record / "issue_tags.md").write_text(TAGS)
    assert plan_filing(record, "needs_decision").labels == ["kind/bug", "area/API"]


def test_plans_no_labels_without_issue_tags(tmp_path):
    assert plan_filing(make_record(tmp_path), "needs_decision").labels == []


def test_files_with_labels_and_moves_issue_tags(tmp_path):
    record = make_record(tmp_path)
    (record / "issue_tags.md").write_text(TAGS)
    calls = []

    def create(plan):
        calls.append(plan.labels)
        return "https://github.com/galaxyproject/galaxy/issues/24500"

    dest = file_record(plan_filing(record, "queued"), create, lambda repo: {"kind/bug", "area/API"})
    assert calls == [["kind/bug", "area/API"]]
    assert (dest / "issue_tags.md").read_text() == TAGS


def test_unknown_label_raises_before_create(tmp_path):
    record = make_record(tmp_path)
    (record / "issue_tags.md").write_text(TAGS)

    def create(plan):
        raise AssertionError("created despite an unknown label")

    with pytest.raises(FilingError, match=r"unknown label.*area/API"):
        file_record(plan_filing(record, "queued"), create, lambda repo: {"kind/bug"})
    assert record.exists()
