#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# ///
"""Remove tasks from an agent's TASKS.md whose PR has merged or closed, if their section says `expires: pr_closed`.

Usage: vault/agents/_shared/scripts/prune_tasks.py AGENT_DIRECTORY
"""

import argparse
import re
import subprocess
import sys
from functools import lru_cache
from pathlib import Path
from typing import Callable

AGENTS_ROOT = Path(__file__).resolve().parents[2]
ENDED = {"MERGED", "CLOSED"}
PULL_URL = re.compile(r"^https://github\.com/[^/]+/[^/]+/pull/\d+\b")
FIELD = re.compile(r"^(?:- |  )(\w+): *(.*?)\s*$")

Removed = list[tuple[str, str]]


def fields(entry: list[str]) -> dict[str, str]:
    """An entry's top-level fields; nested lines are indented too far to match."""
    matches = (FIELD.match(line) for line in entry)
    return {m[1]: m[2].strip("\"'") for m in matches if m}


def prune(text: str, expires: Callable[[str], bool], pr_state: Callable[[str], str | None]) -> tuple[str, Removed]:
    """`text` without the gb-tasks entries that have ended; everything else stays byte for byte."""
    out: list[str] = []
    removed: Removed = []

    def flush(entry: list[str]) -> None:
        task = fields(entry)
        link, suggested_by = task.get("link", ""), task.get("suggested_by", "")
        if suggested_by and PULL_URL.match(link) and expires(suggested_by):
            state = pr_state(link)
            if state in ENDED:
                removed.append((link, state))
                return
        out.extend(entry)

    in_block = False
    entry: list[str] = []
    for line in text.splitlines(keepends=True):
        if not in_block:
            in_block = line.rstrip() == "```gb-tasks"
            out.append(line)
        elif line.rstrip() == "```":
            flush(entry)
            entry = []
            in_block = False
            out.append(line)
        elif line.startswith("- "):
            flush(entry)
            entry = [line]
        elif entry:
            entry.append(line)
        else:
            out.append(line)
    flush(entry)
    return "".join(out), removed


def section_expires(agents_root: Path, suggested_by: str) -> bool:
    """Whether the `<path>#<heading>` section declares `expires: pr_closed`."""
    path, _, heading = suggested_by.partition("#")
    source = agents_root / path
    if not source.is_file():
        return False
    in_section = False
    for line in source.read_text().splitlines():
        if line.startswith("## "):
            in_section = line == f"## {heading}"
        elif in_section and line.strip() == "expires: pr_closed":
            return True
    return False


def run(tasks: Path, agents_root: Path, pr_state: Callable[[str], str | None]) -> Removed:
    cached = lru_cache(maxsize=None)(pr_state)
    expires = lambda suggested_by: section_expires(agents_root, suggested_by)
    prune(tasks.read_text(), expires, cached)
    # Read again: John may have edited the file during the GitHub queries.
    text = tasks.read_text()
    new, removed = prune(text, expires, cached)
    if new != text:
        tasks.write_text(new)
    return removed


def gh_pr_state(link: str) -> str | None:
    result = subprocess.run(["gh", "pr", "view", link, "--json", "state", "--jq", ".state"], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Could not check {link}: {result.stderr.strip()}", file=sys.stderr)
        return None
    return result.stdout.strip()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("agent_directory", type=Path)
    args = parser.parse_args(argv)
    tasks = args.agent_directory / "TASKS.md"
    if not tasks.is_file():
        return 0
    for link, state in run(tasks, AGENTS_ROOT, gh_pr_state):
        print(f"Removed {link} ({state})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
