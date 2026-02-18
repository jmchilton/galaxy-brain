#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Generate vault/Dashboard.md from dashboard_sections.json.

Usage:
    uv run generate_dashboard.py          # write vault/Dashboard.md
    uv run generate_dashboard.py --check  # exit 1 if file differs from generated
"""
import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent
DEFAULT_CONFIG = REPO_ROOT / "dashboard_sections.json"
DEFAULT_OUTPUT = REPO_ROOT / "vault" / "Dashboard.md"


def generate_dashboard(sections):
    """Build Dashboard.md content from section list."""
    blocks = []
    for section in sections:
        block = (
            f"## {section['label']}\n"
            f"```dataview\n"
            f"\n"
            f"TABLE status, revised, revision\n"
            f"\n"
            f"FROM #{section['tag']}\n"
            f"\n"
            f'WHERE status != "archived"\n'
            f"\n"
            f"SORT revised DESC\n"
            f"\n"
            f"```"
        )
        blocks.append(block)
    return "\n\n".join(blocks) + "\n"


def check_dashboard(sections, output_path=None):
    """Return True if file matches generated content, False otherwise."""
    output_path = Path(output_path or DEFAULT_OUTPUT)
    expected = generate_dashboard(sections)
    if not output_path.exists():
        return False
    actual = output_path.read_text(encoding="utf-8")
    return actual == expected


def main():
    parser = argparse.ArgumentParser(description="Generate Dashboard.md from config")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Check if Dashboard.md matches generated content (exit 1 if not)",
    )
    parser.add_argument(
        "--config",
        default=str(DEFAULT_CONFIG),
        help=f"Path to config JSON (default: {DEFAULT_CONFIG})",
    )
    parser.add_argument(
        "--output",
        default=str(DEFAULT_OUTPUT),
        help=f"Path to output file (default: {DEFAULT_OUTPUT})",
    )
    args = parser.parse_args()

    with open(args.config) as f:
        sections = json.load(f)

    if args.check:
        if check_dashboard(sections, args.output):
            print("Dashboard.md is up to date.")
        else:
            print("Dashboard.md is out of date. Run 'make dashboard' to regenerate.")
            sys.exit(1)
    else:
        content = generate_dashboard(sections)
        Path(args.output).write_text(content, encoding="utf-8")
        print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()
