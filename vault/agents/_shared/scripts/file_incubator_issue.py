#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# ///
"""Post an issues_incubator record's proposal.md as a GitHub issue, labeled per its
issue_tags.md, and move the record to `repositories/<repo>/issues/<status>/<number>/`.

Usage: vault/agents/_shared/scripts/file_incubator_issue.py RECORD_DIR [--status STATUS] [--github-repo OWNER/REPO] [--assign] [--dry-run]
"""

import argparse
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

ISSUE_STATUSES = ["needs_decision", "queued", "wip", "blocked", "delegated"]
FILEABLE_STATUSES = ["incubating", "internal"]
ISSUE_URL = re.compile(r"https://github\.com/[^/\s]+/[^/\s]+/issues/(\d+)")
# One backticked label per bullet; prose and anything else in issue_tags.md is ignored.
TAG_LINE = re.compile(r"^- `([^`]+)`", re.MULTILINE)


class FilingError(Exception):
    pass


@dataclass
class FilingPlan:
    record: Path
    repo: str
    github_repo: str
    title: str
    body: str
    summary: str
    dest_parent: Path
    assign: bool = False
    labels: list[str] = field(default_factory=list)


def plan_filing(record: Path, status: str, github_repo: str | None = None, assign: bool = False) -> FilingPlan:
    record = record.resolve()
    parts = record.parts
    if len(parts) < 5 or parts[-3] != "issues_incubator" or parts[-5] != "repositories":
        raise FilingError(f"{record} is not an issues_incubator record (repositories/<repo>/issues_incubator/<status>/<name>/)")
    repo, record_status = parts[-4], parts[-2]
    if record_status not in FILEABLE_STATUSES:
        raise FilingError(f"{record} is {record_status}; only {', '.join(FILEABLE_STATUSES)} records can be filed")
    proposal = record / "proposal.md"
    if not proposal.is_file():
        hint = (
            "debrief.md exists without a proposal, so it likely recommends rejection; move the record to rejected/ instead"
            if (record / "debrief.md").is_file()
            else "prepare it first with the gx_issues PREPARE_TO_FILE.md process (the ❯ Prepare to file launcher)"
        )
        raise FilingError(f"{record} has no proposal.md; {hint}")
    title_match = re.match(r"\s*#\s+(.+?)\s*\n", proposal.read_text())
    if not title_match:
        raise FilingError(f"{proposal} must start with a `# title` line")
    body = proposal.read_text()[title_match.end():].lstrip("\n")
    index = record / "index.md"
    summary = re.sub(r"^\s*#\s+.*\n", "", index.read_text(), count=1).strip() if index.is_file() else ""
    tags = record / "issue_tags.md"
    labels = TAG_LINE.findall(tags.read_text()) if tags.is_file() else []
    return FilingPlan(
        record=record,
        repo=repo,
        github_repo=github_repo or f"galaxyproject/{repo}",
        title=title_match.group(1),
        body=body,
        summary=summary,
        dest_parent=record.parents[2] / "issues" / status,
        assign=assign,
        labels=labels,
    )


def gh_create_issue(plan: FilingPlan) -> str:
    cmd = ["gh", "issue", "create", "--repo", plan.github_repo, "--title", plan.title, "--body-file", "-"]
    if plan.assign:
        cmd += ["--assignee", "@me"]
    for label in plan.labels:
        cmd += ["--label", label]
    result = subprocess.run(cmd, input=plan.body, capture_output=True, text=True)
    if result.returncode:
        raise FilingError(f"gh issue create failed: {result.stderr.strip()}")
    return result.stdout.strip().splitlines()[-1]


def gh_label_names(github_repo: str) -> set[str]:
    result = subprocess.run(
        ["gh", "label", "list", "--repo", github_repo, "--limit", "1000", "--json", "name", "--jq", ".[].name"],
        capture_output=True,
        text=True,
    )
    if result.returncode:
        raise FilingError(f"gh label list failed: {result.stderr.strip()}")
    return set(result.stdout.splitlines())


def check_labels(plan: FilingPlan, known: Callable[[str], set[str]] = gh_label_names) -> None:
    unknown = [label for label in plan.labels if label not in known(plan.github_repo)] if plan.labels else []
    if unknown:
        raise FilingError(f"unknown label(s) on {plan.github_repo}: {', '.join(unknown)}; fix issue_tags.md")


def file_record(
    plan: FilingPlan,
    create: Callable[[FilingPlan], str] = gh_create_issue,
    known_labels: Callable[[str], set[str]] = gh_label_names,
) -> Path:
    check_labels(plan, known_labels)
    url = create(plan)
    match = ISSUE_URL.search(url)
    if not match:
        raise FilingError(f"issue created but its URL wasn't recognized ({url!r}); record left at {plan.record}")
    number = match.group(1)
    dest = plan.dest_parent / number
    if dest.exists():
        raise FilingError(f"filed {url}, but issues/{number} record {dest} already exists; record left at {plan.record}")
    dest.mkdir(parents=True)
    for path in plan.record.iterdir():
        if path.name != "index.md":
            shutil.move(str(path), dest / path.name)
    index = f"# {plan.repo}#{number} — {plan.title}\n\n[Issue]({url})\n"
    (dest / "index.md").write_text(index + (f"\n{plan.summary}\n" if plan.summary else ""))
    (plan.record / "index.md").unlink(missing_ok=True)
    plan.record.rmdir()
    return dest


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("record", type=Path, help="issues_incubator record directory")
    parser.add_argument("--status", default="needs_decision", choices=ISSUE_STATUSES, help="issues/ status to move it to")
    parser.add_argument("--github-repo", help="OWNER/REPO; default galaxyproject/<repo>")
    parser.add_argument("--assign", action="store_true", help="assign the issue to yourself")
    parser.add_argument("--dry-run", action="store_true", help="print the issue and destination without filing")
    args = parser.parse_args(argv)
    try:
        plan = plan_filing(args.record, args.status, args.github_repo, args.assign)
        if args.dry_run:
            check_labels(plan)
            labels = ", ".join(plan.labels) or "none"
            print(f"Would file on {plan.github_repo}: {plan.title}\nlabels: {labels}\nthen move to {plan.dest_parent}/<number>/\n\n{plan.body}")
            return 0
        dest = file_record(plan)
    except FilingError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    print(f"Filed and moved record to {dest}\nNext: triage it into MY_ISSUES.md per vault/agents/_shared/MY_ISSUES_INDEX.md")
    return 0


if __name__ == "__main__":
    sys.exit(main())
