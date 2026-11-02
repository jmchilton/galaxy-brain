"""Tests for validate_records.py against the real meta_record_schema.yml."""
from pathlib import Path

import pytest
import yaml

from validate_records import load_record_schema, validate_records

REPO_ROOT = Path(__file__).parent


@pytest.fixture
def schema():
    return load_record_schema(REPO_ROOT / "meta_record_schema.yml")


def write_record(vault: Path, path: str, frontmatter: dict | None = None) -> Path:
    """Write `repositories/<path>/index.md`, with frontmatter when given."""
    record = vault / "repositories" / path
    record.mkdir(parents=True)
    head = f"---\n{yaml.safe_dump(frontmatter, sort_keys=False)}---\n" if frontmatter is not None else ""
    (record / "index.md").write_text(f"{head}# {record.name}\n")
    return record / "index.md"


def write_agent_blocker(vault: Path, agent: str, name: str):
    blocker = vault / "agents" / agent / "blockers" / name
    blocker.mkdir(parents=True)
    (blocker / "condition.md").write_text("galaxyproject/galaxy#1 is merged\n")


def messages(found):
    return [message for _, message in found]


def test_records_without_frontmatter_pass(tmp_path, schema):
    write_record(tmp_path, "galaxy/branches/active/plain")
    write_record(tmp_path, "galaxy/issues/queued/123")
    assert validate_records(tmp_path, schema) == ([], [])


def test_branch_metadata_passes(tmp_path, schema):
    write_record(tmp_path, "galaxy/branches/active/fix", {"upstream_base_branch": "release_26.1", "parent_branch": "base", "pr": 24300})
    write_record(tmp_path, "galaxy/branches/active/base", {"upstream_base_branch": "release_26.1", "child_branches": "fix"})
    assert validate_records(tmp_path, schema) == ([], [])


def test_unknown_field_is_an_error(tmp_path, schema):
    index = write_record(tmp_path, "galaxy/issues/queued/123", {"blocker": "gx_issues/later"})
    errors, _ = validate_records(tmp_path, schema)
    assert [path for path, _ in errors] == [index]
    assert "'blocker' was unexpected" in errors[0][1]


def test_branch_fields_are_errors_on_other_kinds(tmp_path, schema):
    write_record(tmp_path, "galaxy/reviews/active/24300", {"pr": 24300})
    errors, _ = validate_records(tmp_path, schema)
    assert messages(errors) == ["pr: only branch records take this field"]


def test_malformed_blocker_is_an_error(tmp_path, schema):
    write_record(tmp_path, "galaxy/branches/active/fix", {"blockers": "galaxy/pulls/12"})
    errors, _ = validate_records(tmp_path, schema)
    assert len(errors) == 1 and errors[0][1].startswith("blockers:")


def test_agent_blocker_must_exist(tmp_path, schema):
    write_record(tmp_path, "galaxy/branches/active/fix", {"blockers": "gx_branches/parent_merged"})
    errors, _ = validate_records(tmp_path, schema)
    assert messages(errors) == ["blockers: gx_branches/parent_merged not found (no agents/gx_branches/blockers/parent_merged/)"]
    write_agent_blocker(tmp_path, "gx_branches", "parent_merged")
    assert validate_records(tmp_path, schema) == ([], [])


def test_reciprocal_record_blockers_pass_as_scalars_and_lists(tmp_path, schema):
    write_agent_blocker(tmp_path, "gx_branches", "needs_host")
    write_record(tmp_path, "galaxy/branches/active/child", {"blockers": ["galaxy/branches/parent", "gx_branches/needs_host"]})
    write_record(tmp_path, "galaxy/issues/queued/24551", {"blockers": "galaxy/branches/parent"})
    write_record(tmp_path, "galaxy/branches/active/parent", {"blocking": ["galaxy/branches/child", "galaxy/issues/24551"]})
    assert validate_records(tmp_path, schema) == ([], [])


def test_record_blocker_must_exist(tmp_path, schema):
    write_record(tmp_path, "galaxy/branches/active/child", {"blockers": "galaxy/branches/gone"})
    errors, _ = validate_records(tmp_path, schema)
    assert messages(errors) == ["blockers: galaxy/branches/gone not found"]


def test_blocking_target_must_exist(tmp_path, schema):
    write_record(tmp_path, "galaxy/branches/active/parent", {"blocking": "galaxy/issues/999"})
    errors, _ = validate_records(tmp_path, schema)
    assert messages(errors) == ["blocking: galaxy/issues/999 not found"]


def test_blocker_without_blocking_is_an_error_on_the_target(tmp_path, schema):
    write_record(tmp_path, "galaxy/branches/active/child", {"blockers": "galaxy/reviews/24484"})
    target = write_record(tmp_path, "galaxy/reviews/active/24484")
    errors, _ = validate_records(tmp_path, schema)
    assert errors == [(target, "blocking: missing galaxy/branches/child, which names this record as its blocker")]


def test_blocking_without_blocker_is_an_error_on_the_target(tmp_path, schema):
    write_record(tmp_path, "galaxy/reviews/active/24484", {"blocking": "galaxy/issues/24551"})
    target = write_record(tmp_path, "galaxy/issues/queued/24551")
    errors, _ = validate_records(tmp_path, schema)
    assert errors == [(target, "blockers: missing galaxy/reviews/24484, which lists this record as blocking")]


def test_cross_repository_blockers_resolve(tmp_path, schema):
    write_record(tmp_path, "planemo/issues/queued/1745", {"blockers": "galaxy/reviews/24224"})
    write_record(tmp_path, "galaxy/reviews/active/24224", {"blocking": "planemo/issues/1745"})
    assert validate_records(tmp_path, schema) == ([], [])


def test_ambiguous_record_name_is_an_error(tmp_path, schema):
    write_record(tmp_path, "galaxy/branches/active/child", {"blockers": "galaxy/branches/parent"})
    write_record(tmp_path, "galaxy/branches/active/parent", {"blocking": "galaxy/branches/child"})
    write_record(tmp_path, "galaxy/branches/merged/parent")
    errors, _ = validate_records(tmp_path, schema)
    assert messages(errors) == ["blockers: galaxy/branches/parent is ambiguous (active, merged)"]


@pytest.mark.parametrize("kind,status,name", [("branches", "merged", "parent"), ("issues", "closed", "12"), ("reviews", "archived", "24484")])
def test_terminal_blocker_warns_with_its_status(tmp_path, schema, kind, status, name):
    child = write_record(tmp_path, "galaxy/branches/active/child", {"blockers": f"galaxy/{kind}/{name}"})
    write_record(tmp_path, f"galaxy/{kind}/{status}/{name}", {"blocking": "galaxy/branches/child"})
    assert validate_records(tmp_path, schema) == ([], [(child, f"blockers: galaxy/{kind}/{name} is {status}; drop it here and its blocking: entry")])


@pytest.mark.parametrize("path,allowed", [
    ("galaxy/issues/blocked/24551", "needs_decision, queued, wip, delegated, closed"),
    ("galaxy/branches/parked/fix", "active, merged, abandoned"),
])
def test_undocumented_status_directory_is_an_error(tmp_path, schema, path, allowed):
    index = write_record(tmp_path, path)
    status = path.split("/")[2]
    assert validate_records(tmp_path, schema) == ([(index, f"status: {status}/ is not a {path.split('/')[1]} status ({allowed})")], [])


def test_defaults_are_not_records(tmp_path, schema):
    (tmp_path / "repositories" / "_defaults" / "branches").mkdir(parents=True)
    (tmp_path / "repositories" / "_defaults" / "branches" / "FILE_DOCS.md").write_text("# docs\n")
    assert validate_records(tmp_path, schema) == ([], [])


def test_real_vault_records_validate(schema):
    errors, _ = validate_records(REPO_ROOT / "vault", schema)
    assert errors == []


def test_related_records_pair_as_scalars_lists_and_across_repositories(tmp_path, schema):
    write_record(tmp_path, "galaxy/branches/active/fix", {"related_records": ["galaxy/issues/24551", "planemo/issues/1745"]})
    write_record(tmp_path, "galaxy/issues/queued/24551", {"related_records": "galaxy/branches/fix"})
    write_record(tmp_path, "planemo/issues/queued/1745", {"related_records": "galaxy/branches/fix"})
    assert validate_records(tmp_path, schema) == ([], [])


def test_related_record_must_exist(tmp_path, schema):
    write_record(tmp_path, "galaxy/branches/active/fix", {"related_records": "galaxy/issues/999"})
    errors, _ = validate_records(tmp_path, schema)
    assert messages(errors) == ["related_records: galaxy/issues/999 not found"]


def test_one_sided_related_record_is_an_error_on_the_target(tmp_path, schema):
    write_record(tmp_path, "galaxy/branches/active/fix", {"related_records": "galaxy/reviews/24484"})
    target = write_record(tmp_path, "galaxy/reviews/active/24484")
    errors, _ = validate_records(tmp_path, schema)
    assert errors == [(target, "related_records: missing galaxy/branches/fix, which lists this record as related")]


def test_terminal_related_record_does_not_warn(tmp_path, schema):
    write_record(tmp_path, "galaxy/branches/active/fix", {"related_records": "galaxy/branches/old"})
    write_record(tmp_path, "galaxy/branches/merged/old", {"related_records": "galaxy/branches/fix"})
    assert validate_records(tmp_path, schema) == ([], [])


@pytest.mark.parametrize("field_name,ref", [
    ("blockers", "galaxy/branches/fix"),
    ("blocking", "galaxy/branches/fix"),
    ("related_records", "galaxy/branches/fix"),
    ("parent_branch", "fix"),
    ("child_branches", "fix"),
])
def test_record_cannot_reference_itself(tmp_path, schema, field_name, ref):
    write_record(tmp_path, "galaxy/branches/active/fix", {field_name: ref})
    errors, _ = validate_records(tmp_path, schema)
    assert messages(errors) == [f"{field_name}: {ref} is this record"]


def test_malformed_related_record_is_an_error(tmp_path, schema):
    write_record(tmp_path, "galaxy/branches/active/fix", {"related_records": "gx_branches/wait"})
    errors, _ = validate_records(tmp_path, schema)
    assert len(errors) == 1 and errors[0][1].startswith("related_records:")


def test_parent_and_child_branches_pair(tmp_path, schema):
    write_record(tmp_path, "galaxy/branches/active/base", {"upstream_base_branch": "dev", "child_branches": ["a", "b"]})
    write_record(tmp_path, "galaxy/branches/active/a", {"upstream_base_branch": "dev", "parent_branch": "base"})
    write_record(tmp_path, "galaxy/branches/active/b", {"upstream_base_branch": "dev", "parent_branch": "base", "child_branches": "c"})
    write_record(tmp_path, "galaxy/branches/active/c", {"upstream_base_branch": "dev", "parent_branch": "b"})
    assert validate_records(tmp_path, schema) == ([], [])


def test_parent_branch_must_be_a_branch_record_in_the_same_repository(tmp_path, schema):
    write_record(tmp_path, "planemo/branches/active/base", {"child_branches": "child"})
    write_record(tmp_path, "galaxy/branches/active/child", {"parent_branch": "base"})
    errors, _ = validate_records(tmp_path, schema)
    assert sorted(messages(errors)) == ["child_branches: child not found", "parent_branch: base not found"]


def test_parent_without_child_branches_is_an_error_on_the_parent(tmp_path, schema):
    write_record(tmp_path, "galaxy/branches/active/child", {"parent_branch": "base"})
    parent = write_record(tmp_path, "galaxy/branches/active/base", {"upstream_base_branch": "dev"})
    errors, _ = validate_records(tmp_path, schema)
    assert errors == [(parent, "child_branches: missing child, which names this branch as its parent")]


def test_child_without_parent_branch_is_an_error_on_the_child(tmp_path, schema):
    write_record(tmp_path, "galaxy/branches/active/base", {"child_branches": "child"})
    child = write_record(tmp_path, "galaxy/branches/active/child", {"parent_branch": "other"})
    write_record(tmp_path, "galaxy/branches/active/other", {"child_branches": "child"})
    errors, _ = validate_records(tmp_path, schema)
    assert errors == [(child, "parent_branch: missing base, which lists this branch as a child")]


def test_merged_parent_warns_only_for_unfinished_children(tmp_path, schema):
    write_record(tmp_path, "galaxy/branches/merged/base", {"child_branches": ["open", "done"]})
    child = write_record(tmp_path, "galaxy/branches/active/open", {"parent_branch": "base"})
    write_record(tmp_path, "galaxy/branches/merged/done", {"parent_branch": "base"})
    assert validate_records(tmp_path, schema) == ([], [
        (child, "parent_branch: base is merged; retarget onto upstream_base_branch, then drop it here and its child_branches: entry"),
    ])


def test_child_branches_are_branch_only(tmp_path, schema):
    write_record(tmp_path, "galaxy/reviews/active/24300", {"child_branches": "fix"})
    errors, _ = validate_records(tmp_path, schema)
    assert messages(errors) == ["child_branches: only branch records take this field"]
