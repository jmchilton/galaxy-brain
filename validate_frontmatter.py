#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "python-frontmatter",
#     "jsonschema",
#     "pyyaml",
# ]
# ///
"""Validate YAML frontmatter in Galaxy notes against JSON Schema.

Usage:
    uv run validate_frontmatter.py [directory] [--schema FILE] [--tags FILE]

Loads meta_tags.yml to build the allowed tag enum, injects it into
meta_schema.yml, then validates every .md file in the target directory.
"""
import argparse
import datetime
import re
import sys
from pathlib import Path

import frontmatter
import jsonschema
import yaml

SKIP_DIRS = {".obsidian", "templates"}
SKIP_FILES = {"Dashboard.md"}

# Wiki link fields and whether they hold a single value or array of values.
WIKI_LINK_FIELDS = {
    "parent_plan": "single",
    "related_issues": "array",
    "related_notes": "array",
}

# Maps (type, subtype) -> expected tag. subtype=None for non-research types.
TYPE_TAG_MAP = {
    ("research", "component"): "research/component",
    ("research", "issue"): "research/issue",
    ("research", "pr"): "research/pr",
    ("research", "issue-roundup"): "research/issue-roundup",
    ("research", "design-problem"): "research/design-problem",
    ("research", "design-spec"): "research/design-spec",
    ("research", "dependency"): "research/dependency",
    ("plan", None): "plan",
    ("plan-section", None): "plan/section",
    ("concept", None): "concept",
    ("moc", None): "moc",
}


def load_tags(tags_path):
    """Load allowed tags from meta_tags.yml. Returns list of tag strings."""
    with open(tags_path) as f:
        data = yaml.safe_load(f)
    return list(data.keys())


def load_schema(schema_path, tags):
    """Load JSON Schema from YAML file and inject tag enum."""
    with open(schema_path) as f:
        schema = yaml.safe_load(f)
    schema["properties"]["tags"]["items"]["enum"] = tags
    return schema


def preprocess_frontmatter(data):
    """Convert datetime.date values to ISO strings for JSON Schema validation.

    PyYAML parses bare dates (2025-01-15) as datetime.date objects.
    The schema expects strings, so we convert before validation.
    """
    result = dict(data)
    for key, value in result.items():
        if isinstance(value, (datetime.date, datetime.datetime)):
            result[key] = value.isoformat()
    return result


def validate_schema(data, schema):
    """Validate frontmatter dict against JSON Schema. Returns list of error strings."""
    errors = []
    validator = jsonschema.Draft7Validator(schema)
    for error in sorted(validator.iter_errors(data), key=lambda e: list(e.path)):
        path = ".".join(str(p) for p in error.absolute_path) or "(root)"
        errors.append(f"{path}: {error.message}")
    return errors


def validate_dates(data):
    """Validate date fields are valid ISO dates. Returns list of error strings."""
    errors = []
    for field in ("created", "revised"):
        value = data.get(field)
        if isinstance(value, str):
            try:
                datetime.date.fromisoformat(value)
            except ValueError:
                errors.append(f"{field}: '{value}' is not a valid ISO date (YYYY-MM-DD)")
    return errors


_WIKI_LINK_RE = re.compile(r"^\[\[(.+)\]\]$")


def validate_wiki_links(data):
    """Validate wiki link fields beyond what JSON Schema pattern catches.

    Checks for whitespace-only inner text inside [[...]].
    Returns (errors, warnings).
    """
    errors = []
    warnings = []

    for field, mode in WIKI_LINK_FIELDS.items():
        value = data.get(field)
        if value is None:
            continue

        values = [value] if mode == "single" else (value if isinstance(value, list) else [])

        for i, v in enumerate(values):
            if not isinstance(v, str):
                continue
            m = _WIKI_LINK_RE.match(v)
            if not m:
                # Schema pattern already catches missing brackets.
                continue
            inner = m.group(1)
            if inner.strip() == "":
                loc = f"{field}[{i}]" if mode == "array" else field
                errors.append(f"{loc}: wiki link has whitespace-only inner text: '{v}'")

    return errors, warnings


def _tag_matches(actual_tag, expected_tag):
    """Hierarchy-aware tag match: 'plan/followup' satisfies expected 'plan'."""
    return actual_tag == expected_tag or actual_tag.startswith(expected_tag + "/")


def validate_tag_coherence(data):
    """Warn if tags don't include the expected type tag. Returns list of warnings."""
    warnings = []
    tags = data.get("tags", [])
    note_type = data.get("type")
    subtype = data.get("subtype")

    if not isinstance(tags, list) or not note_type:
        return warnings

    expected = TYPE_TAG_MAP.get((note_type, subtype)) or TYPE_TAG_MAP.get((note_type, None))
    if expected and not any(_tag_matches(t, expected) for t in tags):
        msg = f"tags: expected '{expected}' tag for type={note_type}"
        if subtype:
            msg += f", subtype={subtype}"
        msg += f" but tags are {tags}"
        warnings.append(msg)

    return warnings


def validate_data(data, schema):
    """Validate a frontmatter dict. Returns (errors, warnings).

    Handles date preprocessing, schema validation, date format checks,
    wiki link checks, and tag coherence checks.
    """
    processed = preprocess_frontmatter(data)
    errors = []
    warnings = []

    errors.extend(validate_schema(processed, schema))
    errors.extend(validate_dates(processed))

    wiki_errors, wiki_warnings = validate_wiki_links(processed)
    errors.extend(wiki_errors)
    warnings.extend(wiki_warnings)

    warnings.extend(validate_tag_coherence(processed))

    return errors, warnings


def validate_file(filepath, schema):
    """Validate a single markdown file. Returns (errors, warnings)."""
    try:
        text = Path(filepath).read_text(encoding="utf-8")
    except Exception as e:
        return ([f"failed to read: {e}"], [])

    if not frontmatter.checks(text):
        return (["no frontmatter found"], [])

    try:
        post = frontmatter.loads(text)
    except Exception as e:
        return ([f"failed to parse frontmatter: {e}"], [])

    return validate_data(post.metadata, schema)


def find_md_files(directory):
    """Yield .md files, skipping hidden dirs, templates/, and SKIP_FILES."""
    directory = Path(directory)
    for path in sorted(directory.rglob("*.md")):
        parts = path.relative_to(directory).parts
        if any(p.startswith(".") or p in SKIP_DIRS for p in parts):
            continue
        if path.name in SKIP_FILES:
            continue
        yield path


def validate_directory(directory, schema_path, tags_path):
    """Validate all .md files in directory. Returns (total_errors, total_warnings)."""
    tags = load_tags(tags_path)
    schema = load_schema(schema_path, tags)

    total_errors = 0
    total_warnings = 0
    files_checked = 0

    for filepath in find_md_files(directory):
        files_checked += 1
        errors, warnings = validate_file(filepath, schema)

        if errors or warnings:
            print(f"\n{filepath}:")

        for e in errors:
            print(f"  ERROR  {e}")
            total_errors += 1

        for w in warnings:
            print(f"  WARN   {w}")
            total_warnings += 1

    print(f"\n{'=' * 50}")
    print(f"Files: {files_checked}  Errors: {total_errors}  Warnings: {total_warnings}")

    return total_errors, total_warnings


def main():
    parser = argparse.ArgumentParser(description="Validate frontmatter in Galaxy notes")
    parser.add_argument(
        "directory",
        nargs="?",
        default="vault/",
        help="Directory to validate (default: vault/)",
    )
    parser.add_argument(
        "--schema",
        default="meta_schema.yml",
        help="Path to JSON Schema file (default: meta_schema.yml)",
    )
    parser.add_argument(
        "--tags",
        default="meta_tags.yml",
        help="Path to tags file (default: meta_tags.yml)",
    )
    args = parser.parse_args()

    total_errors, _ = validate_directory(args.directory, args.schema, args.tags)

    if total_errors > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
