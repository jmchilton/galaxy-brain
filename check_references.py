#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "pyyaml",
# ]
# ///
"""Check that every inline citation in a paper's manuscript.md resolves to a
references.yml entry, and that the bibliography data is well-formed.

references.yml is the canonical, hand-curated bibliography data the site
renderer consumes (keyed by the inline citation key used in `[Key]`). Editorial
guidance and status notes live as `#` comments inside references.yml. Entries
that are not cited inline are a legitimate tracked backlog (candidate citations)
and are reported as a count, not a warning. This linter guarantees the renderer
never meets an unknown citation key.

Usage:
    uv run check_references.py          # report coverage for every paper
    uv run check_references.py --check  # exit 1 if any errors
    uv run check_references.py vault/papers/gxwf  # one paper
"""
import argparse
import re
import sys
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).parent
DEFAULT_PAPERS = REPO_ROOT / "vault" / "papers"

# Inline citation: `[...]` that is not a wiki link (`[[...]]`), not a markdown
# link (`[...](...)`), and holds no nested brackets.
_CITE_SPAN_RE = re.compile(r"(?<!\[)\[([^\[\]]+)\](?!\()(?!\])")
# A citation part that ends in a 4-digit year, e.g. "Goecks 2010",
# "Moreau and Missier 2013", "Galaxy Community 2024".
_AUTHOR_YEAR_RE = re.compile(r"^[A-Z].*\s\d{4}$")
# Fenced code blocks and inline code spans (brackets there are not citations).
_FENCE_RE = re.compile(r"```.*?```", re.DOTALL)
_INLINE_CODE_RE = re.compile(r"`[^`]*`")


def strip_code(text: str) -> str:
    text = _FENCE_RE.sub("", text)
    text = _INLINE_CODE_RE.sub("", text)
    return text


def extract_cited_keys(manuscript: str) -> set[str]:
    """Citation keys referenced inline. A bracket part counts as a citation if
    it looks like an author-year key (ends in a year). Short keys (MCP, IWC,
    ...) are resolved against the bibliography by the caller, since they are not
    self-identifying."""
    keys: set[str] = set()
    for span in _CITE_SPAN_RE.finditer(strip_code(manuscript)):
        for part in span.group(1).split(";"):
            part = part.strip()
            if _AUTHOR_YEAR_RE.match(part):
                keys.add(part)
    return keys


def extract_bracket_parts(manuscript: str) -> set[str]:
    """All bracket-span parts (used to detect usage of short keys like MCP)."""
    parts: set[str] = set()
    for span in _CITE_SPAN_RE.finditer(strip_code(manuscript)):
        for part in span.group(1).split(";"):
            parts.add(part.strip())
    return parts


def validate_entry(key: str, entry) -> list[str]:
    errors = []
    if not isinstance(entry, dict):
        return [f"entry '{key}' is not a mapping"]
    title = entry.get("title")
    if not isinstance(title, str) or not title.strip():
        errors.append(f"entry '{key}' is missing a non-empty 'title'")
    if _AUTHOR_YEAR_RE.match(key):
        if not entry.get("authors"):
            errors.append(f"entry '{key}' (author-year key) is missing 'authors'")
        if not entry.get("year"):
            errors.append(f"entry '{key}' (author-year key) is missing 'year'")
    return errors


def check_paper(paper_dir: Path) -> tuple[list[str], list[str], dict]:
    """Return (errors, warnings, info) for one paper directory.

    info = {"total": N, "cited": M, "backlog": K} where backlog entries are
    bibliography records present but not cited inline (a legitimate candidate
    pool, not a problem).
    """
    errors: list[str] = []
    warnings: list[str] = []
    info: dict = {"total": 0, "cited": 0, "backlog": 0}

    manuscript_path = paper_dir / "manuscript.md"
    refs_path = paper_dir / "references.yml"

    if not manuscript_path.exists() or not refs_path.exists():
        return errors, warnings, info  # not a fully-wired paper; skip silently

    raw = yaml.safe_load(refs_path.read_text(encoding="utf-8")) or {}
    if not isinstance(raw, dict):
        return [f"{refs_path}: top-level YAML must be a mapping of keys"], warnings, info

    for key, entry in raw.items():
        errors.extend(f"{refs_path.name}: {e}" for e in validate_entry(key, entry))

    bib_keys = set(raw.keys())
    manuscript = manuscript_path.read_text(encoding="utf-8")

    # Author-year citations must resolve.
    cited_author_year = extract_cited_keys(manuscript)
    for key in sorted(cited_author_year):
        if key not in bib_keys:
            errors.append(f"manuscript cites [{key}] but references.yml has no entry")

    # Short keys (no year) are detected by membership in the bibliography.
    bracket_parts = extract_bracket_parts(manuscript)
    used_short_keys = {k for k in bib_keys if not _AUTHOR_YEAR_RE.match(k) and k in bracket_parts}

    used = (cited_author_year & bib_keys) | used_short_keys
    info["total"] = len(bib_keys)
    info["cited"] = len(used)
    info["backlog"] = len(bib_keys - used)

    return errors, warnings, info


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", help="paper dirs (default: all under vault/papers)")
    parser.add_argument("--check", action="store_true", help="exit 1 if any errors")
    args = parser.parse_args()

    if args.paths:
        paper_dirs = [Path(p) for p in args.paths]
    else:
        paper_dirs = sorted(p for p in DEFAULT_PAPERS.iterdir() if p.is_dir())

    total_errors = 0
    for paper_dir in paper_dirs:
        errors, warnings, info = check_paper(paper_dir)
        if not (paper_dir / "references.yml").exists():
            continue
        status = "OK" if not errors else "FAIL"
        print(f"\n{paper_dir.name}: {status} ({len(errors)} errors) — "
              f"{info['cited']} cited, {info['backlog']} backlog, {info['total']} total")
        for e in errors:
            print(f"  ERROR: {e}")
        for w in warnings:
            print(f"  warn:  {w}")
        total_errors += len(errors)

    print(f"\nTotal: {total_errors} errors")
    if args.check and total_errors:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
