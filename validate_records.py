#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "python-frontmatter",
#     "jsonschema",
#     "pyyaml",
# ]
# ///
"""Validate repository record frontmatter in vault/repositories/.

Usage:
    uv run validate_records.py [vault] [--schema FILE]

Checks each record's index.md against meta_record_schema.yml, that `blockers:`,
`blocking:`, `related_records:`, `parent_branch:` and `child_branches:` targets exist,
and that they pair up.
"""
import argparse
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

import frontmatter
import yaml

from validate_frontmatter import validate_schema

# Mirrors STATUS_ORDER in site/src/lib/records.ts and the statuses in vault/agents/_shared/REPOSITORY_*.md.
RECORD_STATUSES = {
    "branches": ("active", "merged", "abandoned"),
    "issues": ("needs_decision", "queued", "wip", "delegated", "closed"),
    "issues_incubator": ("incubating", "internal", "rejected"),
    "reviews": ("active", "archived"),
}
RECORD_KINDS = tuple(RECORD_STATUSES)
BRANCH_ONLY_FIELDS = ("upstream_base_branch", "parent_branch", "child_branches", "pr")
# Mirrors TERMINAL_STATUSES in site/src/lib/records.ts.
TERMINAL_STATUSES = {"merged", "abandoned", "archived", "closed", "rejected"}


@dataclass(frozen=True)
class Pairing:
    paired: str
    """The field the target must list this record in."""
    reason: str
    branch_names: bool = False
    """Values are branch record names in this repository, not `<repo>/<kind>/<name>`."""
    when_finished: str | None = None
    """Warning advice when the target is terminal and this record isn't."""


PAIRED_FIELDS = {
    "blockers": Pairing("blocking", "names this record as its blocker", when_finished="drop it here and its blocking: entry"),
    "blocking": Pairing("blockers", "lists this record as blocking"),
    "related_records": Pairing("related_records", "lists this record as related"),
    "parent_branch": Pairing(
        "child_branches",
        "names this branch as its parent",
        branch_names=True,
        when_finished="retarget onto upstream_base_branch, then drop it here and its child_branches: entry",
    ),
    "child_branches": Pairing("parent_branch", "lists this branch as a child", branch_names=True),
}


@dataclass
class Record:
    repo: str
    kind: str
    status: str
    name: str
    index: Path
    meta: dict = field(default_factory=dict)
    parse_error: str | None = None

    @property
    def id(self):
        return f"{self.repo}/{self.kind}/{self.name}"


def load_record_schema(schema_path):
    with open(schema_path) as f:
        return yaml.safe_load(f)


def as_list(value):
    """A record-reference field value as a list: one reference or a list of them."""
    if value is None:
        return []
    return [value] if isinstance(value, str) else list(value)


def read_record(directory, repositories):
    repo, kind, status, name = directory.relative_to(repositories).parts
    record = Record(repo, kind, status, name, directory / "index.md")
    if record.index.is_file():
        text = record.index.read_text(encoding="utf-8")
        if frontmatter.checks(text):
            try:
                record.meta = frontmatter.loads(text).metadata
            except Exception as e:
                record.parse_error = f"failed to parse frontmatter: {e}"
    return record


def find_records(vault):
    """Yield every `repositories/<repo>/<kind>/<status>/<name>/` record directory."""
    repositories = Path(vault) / "repositories"
    for directory in sorted(repositories.glob("*/*/*/*/")):
        parts = directory.relative_to(repositories).parts
        if parts[0] == "_defaults" or parts[1] not in RECORD_KINDS or not directory.is_dir():
            continue
        yield read_record(directory, repositories)


def validate_records(vault, schema):
    """Returns (errors, warnings), each a list of (index.md path, message)."""
    vault = Path(vault)
    records = list(find_records(vault))
    by_id = defaultdict(list)
    for record in records:
        by_id[record.id].append(record)

    errors, warnings = [], []
    checked = []
    for record in records:
        allowed = RECORD_STATUSES[record.kind]
        if record.status not in allowed:
            errors.append((record.index, f"status: {record.status}/ is not a {record.kind} status ({', '.join(allowed)})"))
        if record.parse_error:
            errors.append((record.index, record.parse_error))
            continue
        if not record.meta:
            continue
        problems = validate_schema(record.meta, schema)
        if record.kind != "branches":
            problems += [f"{name}: only branch records take this field" for name in BRANCH_ONLY_FIELDS if name in record.meta]
        errors += [(record.index, problem) for problem in problems]
        if not problems:
            checked.append(record)

    def resolve(record, field_name, ref, record_id):
        matches = by_id.get(record_id, [])
        if len(matches) == 1:
            return matches[0]
        if matches:
            statuses = ", ".join(sorted(match.status for match in matches))
            errors.append((record.index, f"{field_name}: {ref} is ambiguous ({statuses})"))
        else:
            errors.append((record.index, f"{field_name}: {ref} not found"))
        return None

    for record in checked:
        for field_name, pairing in PAIRED_FIELDS.items():
            # How the target must list this record back, in the paired field's form.
            back = record.name if pairing.branch_names else record.id
            for ref in as_list(record.meta.get(field_name)):
                if field_name == "blockers" and ref.count("/") == 1:
                    agent, name = ref.split("/")
                    if not (vault / "agents" / agent / "blockers" / name).is_dir():
                        errors.append((record.index, f"blockers: {ref} not found (no agents/{agent}/blockers/{name}/)"))
                    continue
                record_id = f"{record.repo}/branches/{ref}" if pairing.branch_names else ref
                if record_id == record.id:
                    errors.append((record.index, f"{field_name}: {ref} is this record"))
                    continue
                target = resolve(record, field_name, ref, record_id)
                if target is None:
                    continue
                if back not in as_list(target.meta.get(pairing.paired)):
                    errors.append((target.index, f"{pairing.paired}: missing {back}, which {pairing.reason}"))
                if pairing.when_finished and target.status in TERMINAL_STATUSES and record.status not in TERMINAL_STATUSES:
                    warnings.append((record.index, f"{field_name}: {ref} is {target.status}; {pairing.when_finished}"))
    return errors, warnings


def main():
    parser = argparse.ArgumentParser(description="Validate repository record frontmatter")
    parser.add_argument("vault", nargs="?", default="vault/", help="Vault directory (default: vault/)")
    parser.add_argument("--schema", default="meta_record_schema.yml", help="Record schema (default: meta_record_schema.yml)")
    args = parser.parse_args()

    errors, warnings = validate_records(args.vault, load_record_schema(args.schema))
    by_path = defaultdict(list)
    for path, message in errors:
        by_path[path].append(f"  ERROR  {message}")
    for path, message in warnings:
        by_path[path].append(f"  WARN   {message}")
    for path in sorted(by_path):
        print(f"\n{path}:")
        print("\n".join(by_path[path]))
    print(f"\n{'=' * 50}")
    print(f"Records  Errors: {len(errors)}  Warnings: {len(warnings)}")
    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
