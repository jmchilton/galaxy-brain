"""Tests for check_references.py — the citation-coverage linter.

Unit tests exercise the extraction/validation helpers directly; integration
tests run check_paper() against temp paper directories, and one test confirms
the real vault papers stay clean.
"""
from pathlib import Path

import pytest

from check_references import (
    check_paper,
    extract_bracket_parts,
    extract_cited_keys,
    strip_code,
    validate_entry,
)

REPO_ROOT = Path(__file__).parent


# --- extract_cited_keys -----------------------------------------------------

def test_single_author_year_citation():
    assert extract_cited_keys("text [Goecks 2010] more") == {"Goecks 2010"}


def test_multi_citation_split_on_semicolon():
    keys = extract_cited_keys("see [Goecks 2010; Sandve 2013; Abueg 2024].")
    assert keys == {"Goecks 2010", "Sandve 2013", "Abueg 2024"}


def test_two_author_and_year_key():
    assert extract_cited_keys("[Moreau and Missier 2013]") == {"Moreau and Missier 2013"}


def test_apostrophe_and_accent_in_name():
    keys = extract_cited_keys("[O'Connor 2017] and [Mölder 2021]")
    assert keys == {"O'Connor 2017", "Mölder 2021"}


def test_short_key_not_returned_as_author_year():
    # Short keys (no year) are resolved by membership, not by this extractor.
    assert extract_cited_keys("[MCP] and [IWC]") == set()


def test_markdown_link_ignored():
    assert extract_cited_keys("[Goecks 2010](http://x) link") == set()


def test_wiki_link_ignored():
    assert extract_cited_keys("[[Some Note 2020]]") == set()


def test_mixed_short_and_author_year():
    keys = extract_cited_keys("[Blankenberg 2014; GA4GH TRS]")
    assert keys == {"Blankenberg 2014"}


def test_citations_in_code_ignored():
    assert extract_cited_keys("`[Goecks 2010]` inline") == set()
    assert extract_cited_keys("```\n[Goecks 2010]\n```") == set()


def test_bracket_parts_includes_short_keys():
    parts = extract_bracket_parts("[Blankenberg 2014; GA4GH TRS] and [MCP]")
    assert "GA4GH TRS" in parts
    assert "MCP" in parts


def test_strip_code_removes_fences_and_inline():
    assert "secret" not in strip_code("a ```x secret y``` b `c secret d` e")


# --- validate_entry ---------------------------------------------------------

def test_valid_author_year_entry():
    entry = {"authors": "Goecks J", "year": 2010, "title": "Galaxy"}
    assert validate_entry("Goecks 2010", entry) == []


def test_author_year_entry_missing_authors():
    errors = validate_entry("Goecks 2010", {"year": 2010, "title": "Galaxy"})
    assert any("authors" in e for e in errors)


def test_author_year_entry_missing_year():
    errors = validate_entry("Goecks 2010", {"authors": "Goecks J", "title": "Galaxy"})
    assert any("year" in e for e in errors)


def test_entry_missing_title():
    errors = validate_entry("MCP", {"authors": "Anthropic"})
    assert any("title" in e for e in errors)


def test_short_key_entry_no_year_required():
    entry = {"authors": "Anthropic", "title": "Model Context Protocol"}
    assert validate_entry("MCP", entry) == []


def test_non_mapping_entry():
    assert validate_entry("X", "just a string") != []


# --- check_paper (integration) ---------------------------------------------

def _write_paper(tmp_path: Path, manuscript: str, refs_yaml: str) -> Path:
    (tmp_path / "manuscript.md").write_text(manuscript, encoding="utf-8")
    (tmp_path / "references.yml").write_text(refs_yaml, encoding="utf-8")
    return tmp_path


def test_check_paper_clean(tmp_path):
    paper = _write_paper(
        tmp_path,
        "Body cites [Goecks 2010] and [MCP].",
        '"Goecks 2010":\n  authors: Goecks J\n  year: 2010\n  title: Galaxy\n'
        '"MCP":\n  authors: Anthropic\n  title: Model Context Protocol\n',
    )
    errors, warnings, info = check_paper(paper)
    assert errors == []
    assert warnings == []
    assert info == {"total": 2, "cited": 2, "backlog": 0}


def test_check_paper_missing_citation(tmp_path):
    paper = _write_paper(
        tmp_path,
        "Body cites [Goecks 2010] and [Sandve 2013].",
        '"Goecks 2010":\n  authors: Goecks J\n  year: 2010\n  title: Galaxy\n',
    )
    errors, _, _ = check_paper(paper)
    assert any("Sandve 2013" in e for e in errors)


def test_check_paper_uncited_entry_is_backlog_not_warning(tmp_path):
    paper = _write_paper(
        tmp_path,
        "Body cites [Goecks 2010].",
        '"Goecks 2010":\n  authors: Goecks J\n  year: 2010\n  title: Galaxy\n'
        '"Sandve 2013":\n  authors: Sandve G\n  year: 2013\n  title: Rules\n',
    )
    errors, warnings, info = check_paper(paper)
    assert errors == []
    assert warnings == []
    assert info["cited"] == 1 and info["backlog"] == 1 and info["total"] == 2


def test_check_paper_short_key_usage_counts_as_cited(tmp_path):
    paper = _write_paper(
        tmp_path,
        "Body cites [MCP].",
        '"MCP":\n  authors: Anthropic\n  title: Model Context Protocol\n',
    )
    errors, warnings, info = check_paper(paper)
    assert errors == []
    assert info["cited"] == 1 and info["backlog"] == 0


def test_check_paper_skips_without_refs(tmp_path):
    (tmp_path / "manuscript.md").write_text("[Goecks 2010]", encoding="utf-8")
    errors, warnings, info = check_paper(tmp_path)
    assert errors == [] and warnings == [] and info["total"] == 0


# --- real vault papers stay clean ------------------------------------------

@pytest.mark.parametrize("paper", ["foundry", "galaxy-notebooks", "gxwf"])
def test_real_papers_resolve(paper):
    errors, _, _ = check_paper(REPO_ROOT / "vault" / "papers" / paper)
    assert errors == [], f"{paper}: {errors}"
