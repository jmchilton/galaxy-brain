"""Tests for validate_frontmatter.py.

Uses the real meta_schema.yml and meta_tags.yml from the repo root.
"""
import copy
import datetime
from pathlib import Path

import pytest

from validate_frontmatter import (
    find_md_files,
    load_schema,
    load_tags,
    preprocess_frontmatter,
    validate_data,
    validate_dates,
    validate_directory,
    validate_file,
    validate_tag_coherence,
    validate_wiki_links,
)

REPO_ROOT = Path(__file__).parent


@pytest.fixture
def schema():
    tags = load_tags(str(REPO_ROOT / "meta_tags.yml"))
    return load_schema(str(REPO_ROOT / "meta_schema.yml"), tags)


# ---------------------------------------------------------------------------
# Valid frontmatter fixtures for each note type
# ---------------------------------------------------------------------------

VALID_RESEARCH_COMPONENT = {
    "type": "research",
    "subtype": "component",
    "tags": ["research/component"],
    "status": "draft",
    "created": "2025-01-15",
    "revised": "2025-01-15",
    "revision": 1,
    "ai_generated": True,
}

VALID_RESEARCH_DEPENDENCY = {
    "type": "research",
    "subtype": "dependency",
    "tags": ["research/dependency"],
    "status": "draft",
    "created": "2025-01-15",
    "revised": "2025-01-15",
    "revision": 1,
    "ai_generated": True,
}

VALID_RESEARCH_ISSUE = {
    "type": "research",
    "subtype": "issue",
    "tags": ["research/issue"],
    "status": "draft",
    "created": "2025-01-15",
    "revised": "2025-01-15",
    "revision": 1,
    "ai_generated": True,
    "github_issue": 12345,
    "github_repo": "galaxyproject/galaxy",
}

VALID_RESEARCH_PR = {
    "type": "research",
    "subtype": "pr",
    "tags": ["research/pr"],
    "status": "draft",
    "created": "2025-01-15",
    "revised": "2025-01-15",
    "revision": 1,
    "ai_generated": True,
    "github_pr": 6789,
    "github_repo": "galaxyproject/galaxy",
}

VALID_PLAN = {
    "type": "plan",
    "tags": ["plan"],
    "status": "draft",
    "created": "2025-01-15",
    "revised": "2025-01-15",
    "revision": 1,
    "ai_generated": True,
    "title": "Implement dataset collection mapping",
}

VALID_PLAN_SECTION = {
    "type": "plan-section",
    "tags": ["plan/section"],
    "status": "draft",
    "created": "2025-01-15",
    "revised": "2025-01-15",
    "revision": 1,
    "ai_generated": True,
    "parent_plan": "[[Plan - Dataset Collection Mapping]]",
    "section": "API endpoint design",
}

VALID_CONCEPT = {
    "type": "concept",
    "tags": ["concept"],
    "status": "draft",
    "created": "2025-01-15",
    "revised": "2025-01-15",
    "revision": 1,
    "ai_generated": True,
}

VALID_MOC = {
    "type": "moc",
    "tags": ["moc"],
    "status": "draft",
    "created": "2025-01-15",
    "revised": "2025-01-15",
    "revision": 1,
    "ai_generated": True,
}

VALID_PROJECT = {
    "type": "project",
    "tags": ["project"],
    "status": "draft",
    "created": "2025-01-15",
    "revised": "2025-01-15",
    "revision": 1,
    "ai_generated": True,
    "title": "Sample Project",
}


# ---------------------------------------------------------------------------
# Valid notes of each type
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "data",
    [
        pytest.param(VALID_RESEARCH_COMPONENT, id="research-component"),
        pytest.param(VALID_RESEARCH_DEPENDENCY, id="research-dependency"),
        pytest.param(VALID_RESEARCH_ISSUE, id="research-issue"),
        pytest.param(VALID_RESEARCH_PR, id="research-pr"),
        pytest.param(VALID_PLAN, id="plan"),
        pytest.param(VALID_PLAN_SECTION, id="plan-section"),
        pytest.param(VALID_CONCEPT, id="concept"),
        pytest.param(VALID_MOC, id="moc"),
        pytest.param(VALID_PROJECT, id="project"),
    ],
)
def test_valid_notes(schema, data):
    errors, warnings = validate_data(data, schema)
    assert errors == []
    assert warnings == []


# ---------------------------------------------------------------------------
# github_issue: single int and list of ints
# ---------------------------------------------------------------------------


def test_github_issue_single_int(schema):
    data = {**VALID_RESEARCH_ISSUE, "github_issue": 99999}
    errors, _ = validate_data(data, schema)
    assert errors == []


def test_github_issue_list_of_ints(schema):
    data = {**VALID_RESEARCH_ISSUE, "github_issue": [9161, 13823, 12236]}
    errors, _ = validate_data(data, schema)
    assert errors == []


def test_github_issue_wrong_type(schema):
    data = {**VALID_RESEARCH_ISSUE, "github_issue": "not a number"}
    errors, _ = validate_data(data, schema)
    assert any("github_issue" in e for e in errors)


# ---------------------------------------------------------------------------
# Missing required base fields
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "field",
    ["type", "tags", "status", "created", "revised", "revision", "ai_generated"],
)
def test_missing_required_base_field(schema, field):
    data = copy.deepcopy(VALID_CONCEPT)
    del data[field]
    errors, _ = validate_data(data, schema)
    assert any(field in e for e in errors)


# ---------------------------------------------------------------------------
# Missing conditional fields
# ---------------------------------------------------------------------------


def test_research_missing_subtype(schema):
    data = {
        "type": "research",
        "tags": ["research"],
        "status": "draft",
        "created": "2025-01-15",
        "revised": "2025-01-15",
        "revision": 1,
        "ai_generated": True,
    }
    errors, _ = validate_data(data, schema)
    assert any("subtype" in e for e in errors)


def test_research_issue_missing_github_issue(schema):
    data = {
        "type": "research",
        "subtype": "issue",
        "tags": ["research/issue"],
        "status": "draft",
        "created": "2025-01-15",
        "revised": "2025-01-15",
        "revision": 1,
        "ai_generated": True,
        "github_repo": "galaxyproject/galaxy",
    }
    errors, _ = validate_data(data, schema)
    assert any("github_issue" in e for e in errors)


def test_research_issue_missing_github_repo(schema):
    data = {
        "type": "research",
        "subtype": "issue",
        "tags": ["research/issue"],
        "status": "draft",
        "created": "2025-01-15",
        "revised": "2025-01-15",
        "revision": 1,
        "ai_generated": True,
        "github_issue": 12345,
    }
    errors, _ = validate_data(data, schema)
    assert any("github_repo" in e for e in errors)


def test_research_pr_missing_github_pr(schema):
    data = {
        "type": "research",
        "subtype": "pr",
        "tags": ["research/pr"],
        "status": "draft",
        "created": "2025-01-15",
        "revised": "2025-01-15",
        "revision": 1,
        "ai_generated": True,
        "github_repo": "galaxyproject/galaxy",
    }
    errors, _ = validate_data(data, schema)
    assert any("github_pr" in e for e in errors)


def test_plan_missing_title(schema):
    data = {
        "type": "plan",
        "tags": ["plan"],
        "status": "draft",
        "created": "2025-01-15",
        "revised": "2025-01-15",
        "revision": 1,
        "ai_generated": True,
    }
    errors, _ = validate_data(data, schema)
    assert any("title" in e for e in errors)


def test_plan_section_missing_parent_plan(schema):
    data = {
        "type": "plan-section",
        "tags": ["plan/section"],
        "status": "draft",
        "created": "2025-01-15",
        "revised": "2025-01-15",
        "revision": 1,
        "ai_generated": True,
        "section": "API design",
    }
    errors, _ = validate_data(data, schema)
    assert any("parent_plan" in e for e in errors)


def test_plan_section_missing_section(schema):
    data = {
        "type": "plan-section",
        "tags": ["plan/section"],
        "status": "draft",
        "created": "2025-01-15",
        "revised": "2025-01-15",
        "revision": 1,
        "ai_generated": True,
        "parent_plan": "[[Plan - Test]]",
    }
    errors, _ = validate_data(data, schema)
    assert any("section" in e for e in errors)


# ---------------------------------------------------------------------------
# Invalid enum values
# ---------------------------------------------------------------------------


def test_invalid_tag(schema):
    data = {**VALID_CONCEPT, "tags": ["nonexistent-tag"]}
    errors, _ = validate_data(data, schema)
    assert any("nonexistent-tag" in e for e in errors)


def test_invalid_status(schema):
    data = {**VALID_CONCEPT, "status": "invalid-status"}
    errors, _ = validate_data(data, schema)
    assert any("invalid-status" in e for e in errors)


def test_invalid_type(schema):
    data = {**VALID_CONCEPT, "type": "invalid-type"}
    errors, _ = validate_data(data, schema)
    assert any("invalid-type" in e for e in errors)


def test_invalid_subtype(schema):
    data = {**VALID_RESEARCH_COMPONENT, "subtype": "nonexistent"}
    errors, _ = validate_data(data, schema)
    assert any("nonexistent" in e for e in errors)


# ---------------------------------------------------------------------------
# additionalProperties: false -> unknown fields rejected
# ---------------------------------------------------------------------------


def test_unknown_field_rejected(schema):
    data = {**VALID_CONCEPT, "unknown_field": "should fail"}
    errors, _ = validate_data(data, schema)
    assert any("unknown_field" in e or "Additional properties" in e for e in errors)


# ---------------------------------------------------------------------------
# File-level: no frontmatter
# ---------------------------------------------------------------------------


def test_file_no_frontmatter(schema, tmp_path):
    md = tmp_path / "no_frontmatter.md"
    md.write_text("# Just a heading\n\nNo frontmatter here.\n")
    errors, _ = validate_file(str(md), schema)
    assert any("no frontmatter" in e for e in errors)


def test_file_valid(schema, tmp_path):
    md = tmp_path / "valid.md"
    md.write_text(
        "---\n"
        "type: concept\n"
        "tags:\n  - concept\n"
        "status: draft\n"
        "created: 2025-01-15\n"
        "revised: 2025-01-15\n"
        "revision: 1\n"
        "ai_generated: true\n"
        "---\n"
        "# Content\n"
    )
    errors, warnings = validate_file(str(md), schema)
    assert errors == []


# ---------------------------------------------------------------------------
# Date preprocessing: datetime.date -> string
# ---------------------------------------------------------------------------


def test_preprocess_converts_dates():
    data = {
        "created": datetime.date(2025, 1, 15),
        "revised": datetime.datetime(2025, 6, 1, 12, 0),
        "title": "unchanged",
    }
    result = preprocess_frontmatter(data)
    assert result["created"] == "2025-01-15"
    assert result["revised"] == "2025-06-01T12:00:00"
    assert result["title"] == "unchanged"


def test_date_object_passes_validation(schema):
    """Dates parsed as datetime.date by PyYAML should still validate."""
    data = {
        **VALID_CONCEPT,
        "created": datetime.date(2025, 1, 15),
        "revised": datetime.date(2025, 1, 15),
    }
    errors, _ = validate_data(data, schema)
    assert errors == []


def test_invalid_date_string(schema):
    data = {**VALID_CONCEPT, "created": "not-a-date"}
    errors, _ = validate_data(data, schema)
    assert any("created" in e and "not a valid ISO date" in e for e in errors)


# ---------------------------------------------------------------------------
# Wiki link validation
# ---------------------------------------------------------------------------


def test_wiki_link_valid(schema):
    data = {**VALID_PLAN_SECTION}
    errors, _ = validate_data(data, schema)
    assert errors == []


def test_wiki_link_bare_string(schema):
    data = {**VALID_PLAN_SECTION, "parent_plan": "Plan - No Brackets"}
    errors, _ = validate_data(data, schema)
    assert any("parent_plan" in e for e in errors)


def test_wiki_link_empty_brackets(schema):
    """[[]] has zero chars between brackets -> schema pattern fails (.+ needs 1+)."""
    data = {**VALID_PLAN_SECTION, "parent_plan": "[[]]"}
    errors, _ = validate_data(data, schema)
    assert any("parent_plan" in e for e in errors)


def test_wiki_link_whitespace_only():
    """[[ ]] passes schema pattern (.+ matches space) but custom validator catches it."""
    errors, _ = validate_wiki_links({"parent_plan": "[[ ]]"})
    assert any("whitespace-only" in e for e in errors)


def test_wiki_link_array_valid(schema):
    data = {
        **VALID_PLAN,
        "related_issues": ["[[Issue 12345]]", "[[Issue 67890]]"],
    }
    errors, _ = validate_data(data, schema)
    assert errors == []


def test_wiki_link_array_bare_string(schema):
    data = {
        **VALID_PLAN,
        "related_issues": ["Issue 12345"],
    }
    errors, _ = validate_data(data, schema)
    assert any("related_issues" in e or "pattern" in e for e in errors)


# ---------------------------------------------------------------------------
# Tag coherence (warnings, not errors)
# ---------------------------------------------------------------------------


def test_tag_coherence_pass():
    data = {"type": "research", "subtype": "issue", "tags": ["research/issue"]}
    warnings = validate_tag_coherence(data)
    assert warnings == []


def test_tag_coherence_warns_missing_type_tag():
    data = {"type": "research", "subtype": "issue", "tags": ["galaxy/api"]}
    warnings = validate_tag_coherence(data)
    assert len(warnings) == 1
    assert "research/issue" in warnings[0]


def test_tag_coherence_hierarchy_aware():
    """plan/followup satisfies expected 'plan' tag via hierarchy matching."""
    data = {"type": "plan", "tags": ["plan/followup"]}
    warnings = validate_tag_coherence(data)
    assert warnings == []


def test_tag_coherence_concept():
    data = {"type": "concept", "tags": ["concept", "galaxy/tools"]}
    warnings = validate_tag_coherence(data)
    assert warnings == []


def test_tag_coherence_warns_concept_wrong_tag():
    data = {"type": "concept", "tags": ["galaxy/tools"]}
    warnings = validate_tag_coherence(data)
    assert len(warnings) == 1
    assert "concept" in warnings[0]


# ---------------------------------------------------------------------------
# Optional fields
# ---------------------------------------------------------------------------


def test_optional_aliases(schema):
    data = {**VALID_CONCEPT, "aliases": ["alias1", "alias2"]}
    errors, _ = validate_data(data, schema)
    assert errors == []


def test_optional_branch(schema):
    data = {**VALID_CONCEPT, "branch": "feature/my-branch"}
    errors, _ = validate_data(data, schema)
    assert errors == []


def test_optional_related_prs_mixed(schema):
    """related_prs can contain wiki links or plain integers."""
    data = {**VALID_PLAN, "related_prs": ["[[PR 123]]", 456]}
    errors, _ = validate_data(data, schema)
    assert errors == []


def test_optional_related_notes(schema):
    data = {**VALID_CONCEPT, "related_notes": ["[[Concept - Foo]]", "[[Issue 123]]"]}
    errors, _ = validate_data(data, schema)
    assert errors == []


def test_optional_galaxy_areas(schema):
    data = {**VALID_RESEARCH_COMPONENT, "galaxy_areas": ["api", "client"]}
    errors, _ = validate_data(data, schema)
    assert errors == []


def test_optional_resolves_question(schema):
    data = {**VALID_PLAN_SECTION, "resolves_question": 3}
    errors, _ = validate_data(data, schema)
    assert errors == []


def test_optional_parent_feature(schema):
    data = {**VALID_PLAN, "parent_feature": "workflow extraction"}
    errors, _ = validate_data(data, schema)
    assert errors == []


# ---------------------------------------------------------------------------
# Project type
# ---------------------------------------------------------------------------


def test_valid_project(schema):
    errors, warnings = validate_data(VALID_PROJECT, schema)
    assert errors == []
    assert warnings == []


def test_project_missing_title(schema):
    data = {
        "type": "project",
        "tags": ["project"],
        "status": "draft",
        "created": "2025-01-15",
        "revised": "2025-01-15",
        "revision": 1,
        "ai_generated": True,
    }
    errors, _ = validate_data(data, schema)
    assert any("title" in e for e in errors)


def test_project_tag_coherence():
    data = {"type": "project", "tags": ["galaxy/api"]}
    warnings = validate_tag_coherence(data)
    assert len(warnings) == 1
    assert "project" in warnings[0]


def test_find_md_files_skips_project_subfiles(tmp_path):
    proj_dir = tmp_path / "projects" / "sample"
    proj_dir.mkdir(parents=True)
    (proj_dir / "index.md").write_text("---\ntype: project\n---\n")
    (proj_dir / "overview.md").write_text("# Overview\n")
    (proj_dir / "architecture.md").write_text("# Architecture\n")

    files = list(find_md_files(tmp_path))
    filenames = [f.name for f in files]
    assert "overview.md" not in filenames
    assert "architecture.md" not in filenames


def test_find_md_files_includes_project_index(tmp_path):
    proj_dir = tmp_path / "projects" / "sample"
    proj_dir.mkdir(parents=True)
    (proj_dir / "index.md").write_text("---\ntype: project\n---\n")
    (proj_dir / "overview.md").write_text("# Overview\n")

    files = list(find_md_files(tmp_path))
    filenames = [f.name for f in files]
    assert "index.md" in filenames


def test_validate_directory_with_project(tmp_path):
    proj_dir = tmp_path / "projects" / "sample"
    proj_dir.mkdir(parents=True)
    (proj_dir / "index.md").write_text(
        "---\n"
        "type: project\n"
        "tags:\n  - project\n"
        "status: draft\n"
        "created: 2025-01-15\n"
        "revised: 2025-01-15\n"
        "revision: 1\n"
        "ai_generated: true\n"
        "title: Sample Project\n"
        "---\n"
        "# Sample Project\n"
    )
    (proj_dir / "overview.md").write_text("# Overview\nNo frontmatter here.\n")

    total_errors, total_warnings = validate_directory(
        str(tmp_path), str(REPO_ROOT / "meta_schema.yml"), str(REPO_ROOT / "meta_tags.yml")
    )
    assert total_errors == 0
    assert total_warnings == 0
