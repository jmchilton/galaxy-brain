#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# ///
"""Apply an issues record's staged issue_tags.md labels and parent to its GitHub issue,
then retire the file with a line in index.md.

Usage: vault/agents/_shared/scripts/apply_issue_tags.py RECORD_DIR [--github-repo OWNER/REPO] [--dry-run]
"""

import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Callable

from issue_labels import TAG_LINE, GhError, gh_label_names

PARENT_LINE = re.compile(r"^Parent: #(\d+)", re.MULTILINE)
# A staged label in one of these groups replaces the issue's other labels in that group.
EXCLUSIVE_PREFIXES = ("roadmap/", "priority/", "work/")


class ApplyError(GhError):
    pass


@dataclass
class LiveIssue:
    node_id: str
    state: str
    labels: list[str]
    parent: int | None


@dataclass
class ApplyPlan:
    record: Path
    github_repo: str
    number: int
    node_id: str
    add: list[str] = field(default_factory=list)
    remove: list[str] = field(default_factory=list)
    parent: int | None = None

    @property
    def empty(self) -> bool:
        return not (self.add or self.remove or self.parent)

    def describe(self) -> str:
        changes = [f"+{label}" for label in self.add] + [f"-{label}" for label in self.remove]
        return ", ".join(changes) + (f"; parent #{self.parent}" if self.parent else "")


def is_work(label: str) -> bool:
    return label.startswith("work/")


def is_blocker(label: str) -> bool:
    return label.startswith("upstream/") or label == "requires-iwc-inputs"


def replaces(staged: str, current: str) -> bool:
    """Whether applying `staged` removes the issue's `current` label; work/* and blockers exclude each other."""
    if any(staged.startswith(prefix) and current.startswith(prefix) for prefix in EXCLUSIVE_PREFIXES):
        return True
    return (is_work(staged) and is_blocker(current)) or (is_blocker(staged) and is_work(current))


def read_staged(text: str) -> tuple[list[str], int | None]:
    """Staged labels and parent issue number from issue_tags.md text."""
    parent = PARENT_LINE.search(text)
    return TAG_LINE.findall(text), int(parent.group(1)) if parent else None


def record_location(record: Path) -> tuple[str, int]:
    """(repo, issue number) of a `repositories/<repo>/issues/<status>/<number>/` record."""
    parts = record.resolve().parts
    if len(parts) < 5 or parts[-3] != "issues" or parts[-5] != "repositories" or not parts[-1].isdigit():
        raise ApplyError(f"{record} is not an issues record (repositories/<repo>/issues/<status>/<number>/)")
    return parts[-4], int(parts[-1])


def plan_apply(record: Path, live: LiveIssue, known: set[str], github_repo: str | None = None) -> ApplyPlan:
    repo, number = record_location(record)
    tags = record / "issue_tags.md"
    if not tags.is_file():
        raise ApplyError(f"{record} has no issue_tags.md; nothing is staged")
    labels, parent = read_staged(tags.read_text())
    if not labels:
        raise ApplyError(f"{tags} stages no labels (one backticked label per bullet)")
    unknown = [label for label in labels if label not in known]
    if unknown:
        raise ApplyError(f"unknown label(s): {', '.join(unknown)}; fix issue_tags.md")
    work = [label for label in labels if is_work(label)]
    if work and any(is_blocker(label) for label in labels):
        raise ApplyError(f"{tags} stages both a work/* label and a blocker; a blocked issue has no work state")
    if len(work) > 1:
        raise ApplyError(f"{tags} stages more than one work/* label: {', '.join(work)}")
    if live.state != "OPEN":
        raise ApplyError(f"#{number} is {live.state}; sync the record instead")
    return ApplyPlan(
        record=record.resolve(),
        github_repo=github_repo or f"galaxyproject/{repo}",
        number=number,
        node_id=live.node_id,
        add=[label for label in labels if label not in live.labels],
        remove=[current for current in live.labels if current not in labels and any(replaces(s, current) for s in labels)],
        parent=parent if parent and parent != live.parent else None,
    )


def gh(args: list[str], what: str) -> str:
    result = subprocess.run(["gh", *args], capture_output=True, text=True)
    if result.returncode:
        raise ApplyError(f"{what} failed: {result.stderr.strip()}")
    return result.stdout


def graphql(query: str, what: str, **variables: str | int) -> dict:
    args = ["api", "graphql", "-f", f"query={query}"]
    for key, value in variables.items():
        args += ["-F" if isinstance(value, int) else "-f", f"{key}={value}"]
    return json.loads(gh(args, what))["data"]


ISSUE_QUERY = """query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    issue(number: $number) { id state labels(first: 100) { nodes { name } } parent { number } }
  }
}"""


def gh_live_issue(github_repo: str, number: int) -> LiveIssue:
    owner, name = github_repo.split("/")
    issue = graphql(ISSUE_QUERY, f"reading #{number}", owner=owner, name=name, number=number)["repository"]["issue"]
    if issue is None:
        raise ApplyError(f"{github_repo}#{number} not found")
    parent = issue["parent"]
    return LiveIssue(issue["id"], issue["state"], [node["name"] for node in issue["labels"]["nodes"]], parent["number"] if parent else None)


def gh_edit_labels(github_repo: str, number: int, add: list[str], remove: list[str]) -> None:
    args = ["issue", "edit", str(number), "--repo", github_repo]
    if add:
        args += ["--add-label", ",".join(add)]
    if remove:
        args += ["--remove-label", ",".join(remove)]
    gh(args, "gh issue edit")


def gh_link_parent(github_repo: str, parent: int, child_id: str) -> None:
    parent_id = gh_live_issue(github_repo, parent).node_id
    mutation = "mutation($parent: ID!, $child: ID!) { addSubIssue(input: {issueId: $parent, subIssueId: $child, replaceParent: true}) { issue { number } } }"
    graphql(mutation, f"linking parent #{parent}", parent=parent_id, child=child_id)


def apply_plan(
    plan: ApplyPlan,
    edit: Callable[[str, int, list[str], list[str]], None] = gh_edit_labels,
    link_parent: Callable[[str, int, str], None] = gh_link_parent,
    today: date | None = None,
) -> None:
    # Parent first: the label edit triggers Foundry's triage check, which reads the parent.
    if plan.parent:
        link_parent(plan.github_repo, plan.parent, plan.node_id)
    if plan.add or plan.remove:
        edit(plan.github_repo, plan.number, plan.add, plan.remove)
    index = plan.record / "index.md"
    text = index.read_text() if index.is_file() else ""
    line = f"Staged labels applied {(today or date.today()).isoformat()}: {plan.describe() or 'already on GitHub'}.\n"
    index.write_text(text.rstrip("\n") + "\n\n" + line if text else line)
    (plan.record / "issue_tags.md").unlink()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("record", type=Path, help="issues record directory")
    parser.add_argument("--github-repo", help="OWNER/REPO; default galaxyproject/<repo>")
    parser.add_argument("--dry-run", action="store_true", help="print the changes without applying them")
    args = parser.parse_args(argv)
    try:
        repo, number = record_location(args.record)
        github_repo = args.github_repo or f"galaxyproject/{repo}"
        plan = plan_apply(args.record, gh_live_issue(github_repo, number), gh_label_names(github_repo), github_repo)
        target = f"{plan.github_repo}#{plan.number}"
        if args.dry_run:
            print(f"Would update {target}")
            print(f"add: {', '.join(plan.add) or 'none'}\nremove: {', '.join(plan.remove) or 'none'}")
            print(f"parent: #{plan.parent}" if plan.parent else "parent: unchanged")
            return 0
        apply_plan(plan)
    except GhError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    print(f"Updated {target}: {plan.describe() or 'already on GitHub'}; removed issue_tags.md")
    print("Next: the next issue sync (the agent's tick) moves the record per its label mapping")
    return 0


if __name__ == "__main__":
    sys.exit(main())
