"""Label helpers shared by the issue scripts: issue_tags.md parsing and GitHub's label list."""

import re
import subprocess

# One backticked label per bullet; prose and anything else in issue_tags.md is ignored.
TAG_LINE = re.compile(r"^- `([^`]+)`", re.MULTILINE)


class GhError(Exception):
    pass


def gh_label_names(github_repo: str) -> set[str]:
    result = subprocess.run(
        ["gh", "label", "list", "--repo", github_repo, "--limit", "1000", "--json", "name", "--jq", ".[].name"],
        capture_output=True,
        text=True,
    )
    if result.returncode:
        raise GhError(f"gh label list failed: {result.stderr.strip()}")
    return set(result.stdout.splitlines())
