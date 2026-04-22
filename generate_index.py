#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "python-frontmatter",
#     "pyyaml",
# ]
# ///
"""Generate vault/Index.md: a prose catalog of every note with summary.

Usage:
    uv run generate_index.py          # write vault/Index.md
    uv run generate_index.py --check  # exit 1 if file differs from generated
"""
import argparse
import re
import sys
from pathlib import Path

import frontmatter

from validate_frontmatter import find_md_files

REPO_ROOT = Path(__file__).parent
DEFAULT_VAULT = REPO_ROOT / "vault"
DEFAULT_OUTPUT = DEFAULT_VAULT / "Index.md"

_H1_RE = re.compile(r"^#\s+(.+?)\s*$", re.MULTILINE)

# (type, subtype) -> (section heading, sort_key)
# Top-level sections rendered in this order.
TOP_LEVEL_ORDER = ["plans", "projects", "research", "concepts", "mocs"]

RESEARCH_SUBTYPE_ORDER = [
    "component",
    "pr",
    "issue",
    "dependency",
    "design-problem",
    "design-spec",
    "issue-roundup",
]

RESEARCH_SUBTYPE_LABEL = {
    "component": "Components",
    "pr": "Pull Requests",
    "issue": "Issues",
    "dependency": "Dependencies",
    "design-problem": "Design Problems",
    "design-spec": "Design Specs",
    "issue-roundup": "Issue Roundups",
}


def derive_title(path: Path, body: str) -> str:
    """Prefer first H1 in body; fall back to filename stem."""
    m = _H1_RE.search(body)
    if m:
        return m.group(1).strip()
    return path.stem


def collect_notes(vault_dir: Path):
    """Walk vault and return a list of note dicts with frontmatter + derived title."""
    notes = []
    for path in find_md_files(vault_dir):
        text = path.read_text(encoding="utf-8")
        if not frontmatter.checks(text):
            continue
        post = frontmatter.loads(text)
        meta = post.metadata
        rel = path.relative_to(vault_dir)
        # Project index.md files share stem "index"; slug by parent dir instead.
        if meta.get("type") == "project" and path.name == "index.md":
            slug = path.parent.name
        else:
            slug = path.stem
        notes.append({
            "slug": slug,
            "path": rel.as_posix(),
            "title": derive_title(path, post.content),
            "type": meta.get("type"),
            "subtype": meta.get("subtype"),
            "status": meta.get("status"),
            "summary": meta.get("summary", ""),
        })
    return notes


def _entry_line(note):
    """Render a single bullet: `- [[slug]] — summary [*(status)*]`."""
    line = f"- [[{note['slug']}]] — {note['summary']}"
    status = note.get("status")
    if status in ("stale", "archived"):
        line += f" *({status})*"
    return line


def generate_index(notes):
    """Build Index.md content from a list of note dicts."""
    by_type = {t: [] for t in ("plan", "plan-section", "project", "research", "concept", "moc")}
    for n in notes:
        t = n.get("type")
        if t in by_type:
            by_type[t].append(n)

    for lst in by_type.values():
        lst.sort(key=lambda n: n["title"].lower())

    lines = ["# Galaxy Brain Index", ""]
    lines.append(f"*{len(notes)} notes. Auto-generated — run `make index` to refresh.*")
    lines.append("")

    # Plans (includes plan-sections as sub-bullets under their parent, or flat)
    plans = by_type["plan"] + by_type["plan-section"]
    if plans:
        lines.append("## Plans")
        lines.append("")
        for n in sorted(plans, key=lambda n: (n["type"] != "plan", n["title"].lower())):
            lines.append(_entry_line(n))
        lines.append("")

    if by_type["project"]:
        lines.append("## Projects")
        lines.append("")
        for n in by_type["project"]:
            lines.append(_entry_line(n))
        lines.append("")

    if by_type["research"]:
        lines.append("## Research")
        lines.append("")
        by_subtype = {}
        for n in by_type["research"]:
            by_subtype.setdefault(n.get("subtype") or "other", []).append(n)
        ordered = [st for st in RESEARCH_SUBTYPE_ORDER if st in by_subtype]
        ordered += sorted(st for st in by_subtype if st not in RESEARCH_SUBTYPE_ORDER)
        for st in ordered:
            label = RESEARCH_SUBTYPE_LABEL.get(st, st.replace("-", " ").title())
            lines.append(f"### {label}")
            lines.append("")
            for n in sorted(by_subtype[st], key=lambda n: n["title"].lower()):
                lines.append(_entry_line(n))
            lines.append("")

    if by_type["concept"]:
        lines.append("## Concepts")
        lines.append("")
        for n in by_type["concept"]:
            lines.append(_entry_line(n))
        lines.append("")

    if by_type["moc"]:
        lines.append("## Maps of Content")
        lines.append("")
        for n in by_type["moc"]:
            lines.append(_entry_line(n))
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def check_index(notes, output_path=None):
    output_path = Path(output_path or DEFAULT_OUTPUT)
    expected = generate_index(notes)
    if not output_path.exists():
        return False
    actual = output_path.read_text(encoding="utf-8")
    return actual == expected


def main():
    parser = argparse.ArgumentParser(description="Generate Index.md from vault frontmatter")
    parser.add_argument("--check", action="store_true",
                        help="Exit 1 if Index.md differs from generated content")
    parser.add_argument("--vault", default=str(DEFAULT_VAULT),
                        help=f"Vault directory (default: {DEFAULT_VAULT})")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT),
                        help=f"Output file (default: {DEFAULT_OUTPUT})")
    args = parser.parse_args()

    notes = collect_notes(Path(args.vault))

    if args.check:
        if check_index(notes, args.output):
            print("Index.md is up to date.")
        else:
            print("Index.md is out of date. Run 'make index' to regenerate.")
            sys.exit(1)
    else:
        content = generate_index(notes)
        Path(args.output).write_text(content, encoding="utf-8")
        print(f"Wrote {args.output} ({len(notes)} notes)")


if __name__ == "__main__":
    main()
