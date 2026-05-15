#!/usr/bin/env python3
"""List recently merged Galaxy PRs and rank likely relevance to a maintainer.

This helper is intentionally conservative: it gathers objective PR metadata with gh,
adds transparent scoring reasons, and leaves the final decision to the agent/user.
"""

from __future__ import annotations

import argparse
import datetime as dt
import fnmatch
import json
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

DEFAULT_INTEREST_LABELS = {
    "area/tool-framework": 4,
    "area/tools": 4,
    "area/API": 2,
    "area/testing": 1,
    "area/workflows": 3,
    "area/tool-shed": 4,
    "area/admin": 1,
}

DEFAULT_INTEREST_PATHS = {
    "lib/galaxy/tool_util/**": 5,
    "lib/galaxy/tool_util_models/**": 5,
    "lib/galaxy/tools/**": 4,
    "lib/galaxy/files/**": 4,
    "lib/tool_shed/**": 4,
    "test/**/tool_util/**": 4,
    "test/**/tool_shed/**": 4,
    "test/unit/tool_util/**": 4,
    "lib/galaxy/schema/**": 2,
    "client/src/api/schema/**": 1,
}

DEFAULT_KEYWORDS = {
    "tool framework": 4,
    "tool_util": 4,
    "tool shed": 4,
    "toolshed": 4,
    "workflow": 3,
    "markdown": 3,
    "agents": 3,
    "ai": 3,
    "jupyter": 3,
    "schema": 1,
    "pydantic": 2,
}


def run_json(cmd: list[str]) -> Any:
    proc = subprocess.run(cmd, text=True, capture_output=True)
    if proc.returncode != 0:
        print(proc.stderr.strip() or proc.stdout.strip(), file=sys.stderr)
        raise SystemExit(proc.returncode)
    return json.loads(proc.stdout)


def iso_days_ago(days: int) -> str:
    since = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=days)
    return since.date().isoformat()


def load_interest_file(path: str | None) -> tuple[dict[str, int], dict[str, int], dict[str, int]]:
    labels = dict(DEFAULT_INTEREST_LABELS)
    paths = dict(DEFAULT_INTEREST_PATHS)
    keywords = dict(DEFAULT_KEYWORDS)
    if not path:
        return labels, paths, keywords
    data = json.loads(Path(path).read_text())
    labels.update({k: int(v) for k, v in data.get("labels", {}).items()})
    paths.update({k: int(v) for k, v in data.get("paths", {}).items()})
    keywords.update({k.lower(): int(v) for k, v in data.get("keywords", {}).items()})
    return labels, paths, keywords


@dataclass
class ScoredPR:
    pr: dict[str, Any]
    score: int
    reasons: list[str]


def score_pr(pr: dict[str, Any], login: str, labels: dict[str, int], paths: dict[str, int], keywords: dict[str, int]) -> ScoredPR:
    score = 0
    reasons: list[str] = []

    author = (pr.get("author") or {}).get("login", "")
    if author.lower() == login.lower():
        score += 10
        reasons.append(f"authored by @{login}")

    text = "\n".join([pr.get("title") or "", pr.get("body") or ""]).lower()
    mention = f"@{login.lower()}"
    if mention in text:
        score += 6
        reasons.append(f"mentions {mention}")

    for comment in pr.get("comments") or []:
        cbody = (comment.get("body") or "").lower()
        cauthor = ((comment.get("author") or {}).get("login") or "").lower()
        if mention in cbody:
            score += 4
            reasons.append(f"comment mentions {mention}")
            break
        if cauthor == login.lower():
            score += 5
            reasons.append(f"@{login} commented")
            break

    label_names = [l.get("name", "") for l in pr.get("labels") or []]
    for label in label_names:
        if label in labels:
            score += labels[label]
            reasons.append(f"label {label} (+{labels[label]})")

    for f in pr.get("files") or []:
        path = f.get("path", "")
        for pattern, points in paths.items():
            if fnmatch.fnmatch(path, pattern):
                score += points
                reasons.append(f"path {path} matches {pattern} (+{points})")
                break

    for keyword, points in keywords.items():
        if keyword in text:
            score += points
            reasons.append(f"keyword '{keyword}' (+{points})")

    # De-duplicate while preserving order.
    reasons = list(dict.fromkeys(reasons))
    return ScoredPR(pr=pr, score=score, reasons=reasons)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default="galaxyproject/galaxy")
    parser.add_argument("--days", type=int, default=7)
    parser.add_argument("--since", help="YYYY-MM-DD override; defaults to UTC today minus --days")
    parser.add_argument("--login", default="jmchilton", help="GitHub login used for relevance scoring")
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--threshold", type=int, default=5)
    parser.add_argument("--interest-file", help="JSON file with labels/paths/keywords point maps")
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of markdown")
    args = parser.parse_args()

    since = args.since or iso_days_ago(args.days)
    labels, paths, keywords = load_interest_file(args.interest_file)
    fields = "number,title,author,mergedAt,url,labels,files,body,comments"
    prs = run_json([
        "gh", "pr", "list",
        "--repo", args.repo,
        "--state", "merged",
        "--search", f"merged:>={since}",
        "--limit", str(args.limit),
        "--json", fields,
    ])
    scored = [score_pr(pr, args.login, labels, paths, keywords) for pr in prs]
    scored.sort(key=lambda x: (x.score, x.pr.get("mergedAt") or ""), reverse=True)
    candidates = [s for s in scored if s.score >= args.threshold]

    if args.json:
        print(json.dumps({"repo": args.repo, "since": since, "candidates": [s.__dict__ for s in candidates], "all": [s.__dict__ for s in scored]}, indent=2))
        return

    print(f"# Recently merged {args.repo} PRs since {since}\n")
    print(f"Relevance login: @{args.login}; threshold: {args.threshold}\n")
    print("## Review candidates\n")
    if not candidates:
        print("No PRs met the threshold. Lower --threshold or tune the interest file.\n")
    for s in candidates:
        pr = s.pr
        print(f"- #{pr['number']} [{pr['title']}]({pr['url']}) — score {s.score}, merged {pr.get('mergedAt')}")
        for reason in s.reasons[:8]:
            print(f"  - {reason}")
        print(f"  - Suggested command: `/ingest-gx-pr {pr['number']}`")
    print("\n## Other merged PRs\n")
    for s in scored:
        if s.score >= args.threshold:
            continue
        pr = s.pr
        print(f"- #{pr['number']} {pr['title']} — score {s.score}")


if __name__ == "__main__":
    main()
