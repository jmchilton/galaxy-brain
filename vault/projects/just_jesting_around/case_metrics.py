# /// script
# requires-python = ">=3.11"
# ///
"""Before/after metrics for the test-conversion lanes; prints markdown tables.

Lane 1 compares each test file at the dev merge-base against the readability tip.
Lanes 2 and 3 measure each per-test commit (``Test-File:`` trailer) against its parent,
counting the test file together with its sibling ``.stories.ts``.
"""

import argparse
import re
import subprocess
from collections import Counter
from pathlib import Path

DEFAULT_REPO = Path.home() / "projects/worktrees/galaxy/branch/vitest_readability"
REMOTE = "jmchilton"
LANES = ("vitest_readability", "vitest_stories", "vitest_story_play")
TEST_FILE = re.compile(r"\.test\.[jt]sx?$")
STORY_LANE = re.compile(r"^Move .* test setup into Storybook stories$")
PLAY_LANE = re.compile(r"^Move .* into (a )?play functions?$")

SIGNALS = {
    "cases": r"^\s*(?:it|test)(?:\.(?:each|skip|only|todo)\b[^(]*)?\(",
    "stories": r"^export const \w+\s*(?::\s*Story\b|=)",
    "plays": r"^\s*(?:play:|async play\()",
    "expects": r"\bexpect(?:\.soft)?\(",
    ".each tables": r"\b(?:it|test|describe)\.each\b",
    "role/label queries": r"\b(?:get|find|query)(?:All)?By(?:Role|LabelText|Text|Title|PlaceholderText|AltText)\(",
    "wrapper.vm": r"\.vm\b",
    "class selectors": r"\.(?:find|findAll|get|querySelector|querySelectorAll)\(\s*[\"'`]\.",
    "vi.mock": r"\b(?:vi|jest)\.mock\(",
    "casts": r"\bas (?:any|unknown)\b",
    "eslint-disable": r"eslint-disable",
    "manual flush/sleep": r"\bflushPromises\(|\bsetTimeout\(|\bvi\.advanceTimers",
}
COMPILED = {name: re.compile(rx, re.MULTILINE) for name, rx in SIGNALS.items()}
GOOD = {"cases", ".each tables", "stories", "plays", "expects", "role/label queries"}


def git(repo, *args):
    return subprocess.run(
        ["git", "-C", str(repo), *args], capture_output=True, text=True, check=True
    ).stdout


def show(repo, ref, path):
    out = subprocess.run(
        ["git", "-C", str(repo), "show", f"{ref}:{path}"],
        check=False,
        capture_output=True,
        text=True,
    )
    return out.stdout if out.returncode == 0 else ""


def measure(text):
    counts = Counter({name: len(rx.findall(text)) for name, rx in COMPILED.items()})
    counts["lines"] = len(text.splitlines())
    return counts


def stories_path(test_path):
    return re.sub(r"\.test\.[jt]sx?$", ".stories.ts", test_path)


def measure_pair(repo, ref, test_path):
    test = measure(show(repo, ref, test_path))
    story = measure(show(repo, ref, stories_path(test_path)))
    return test, story


def lane1(repo, base, tip):
    files = [
        f
        for f in git(repo, "diff", "--name-only", base, tip).split()
        if TEST_FILE.search(f)
    ]
    before, after, rows = Counter(), Counter(), []
    for f in files:
        b, a = measure(show(repo, base, f)), measure(show(repo, tip, f))
        before.update(b)
        after.update(a)
        rows.append((f, b, a))
    support = git(
        repo, "diff", "--shortstat", base, tip, "--", ".", *[f":!{f}" for f in files]
    ).strip()
    return rows, before, after, support


def drops_table(rows, signal, limit):
    worst = sorted(rows, key=lambda r: r[2][signal] - r[1][signal])[:limit]
    other = "expects" if signal == "cases" else "cases"
    lines = [
        f"| Test | {signal} | {other} | `.each` tables | lines |",
        "| --- | --- | --- | --- | --- |",
    ]
    for path, b, a in worst:
        if a[signal] < b[signal]:
            lines.append(
                f"| `{path.removeprefix('client/src/')}` | {b[signal]} → {a[signal]} | {b[other]} → {a[other]} "
                f"| {b['.each tables']} → {a['.each tables']} | {b['lines']} → {a['lines']} |"
            )
    return "\n".join(lines)


def per_test_commits(repo, base, tip, subject_rx):
    log = git(
        repo,
        "log",
        "--reverse",
        "--format=%H%x1f%s%x1f%(trailers:key=Test-File,valueonly,separator=%x2C)",
        f"{base}..{tip}",
    )
    for line in log.splitlines():
        sha, subject, trailer = line.split("\x1f")
        if subject_rx.match(subject) and trailer:
            yield sha, trailer.strip()


def lane_by_commit(repo, base, tip, subject_rx):
    rows, before, after = [], Counter(), Counter()
    for sha, test_path in per_test_commits(repo, base, tip, subject_rx):
        t0, s0 = measure_pair(repo, f"{sha}^", test_path)
        t1, s1 = measure_pair(repo, sha, test_path)
        rows.append((test_path, t0, s0, t1, s1))
        before.update(t0 + s0)
        after.update(t1 + s1)
    return rows, before, after


def signal_table(before, after):
    lines = ["| Signal | Before | After | Δ |", "| --- | ---: | ---: | ---: |"]
    for name in ["lines", *SIGNALS]:
        b, a = before[name], after[name]
        if b or a:
            lines.append(f"| {name} | {b} | {a} | {a - b:+d} |")
    return "\n".join(lines)


def file_table(rows):
    lines = [
        "| Test | Test lines | Story lines | Cases | Plays | Expects | Brittle signals |",
        "| --- | --- | ---: | --- | ---: | --- | --- |",
    ]
    brittle = [n for n in SIGNALS if n not in GOOD]
    for path, t0, s0, t1, s1 in rows:
        b0 = sum(t0[n] + s0[n] for n in brittle)
        b1 = sum(t1[n] + s1[n] for n in brittle)
        lines.append(
            f"| `{Path(path).name}` | {t0['lines']} → {t1['lines']} | {s0['lines']} → {s1['lines']} "
            f"| {t0['cases']} → {t1['cases']} | {s1['plays'] - s0['plays']:+d} "
            f"| {t0['expects'] + s0['expects']} → {t1['expects'] + s1['expects']} | {b0} → {b1} |"
        )
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=DEFAULT_REPO)
    parser.add_argument("--dev", default="origin/dev")
    parser.add_argument(
        "--drops", type=int, default=12, help="rows in the lane-1 drop tables"
    )
    parser.add_argument(
        "--fetch", action="store_true", help="fetch dev and the lane branches first"
    )
    args = parser.parse_args()
    repo = args.repo
    if args.fetch:
        git(repo, "fetch", "-q", "origin", "dev")
        git(repo, "fetch", "-q", REMOTE, *LANES)
    readability, stories, play = (f"{REMOTE}/{lane}" for lane in LANES)
    base1 = git(repo, "merge-base", args.dev, readability).strip()

    files, before, after, support = lane1(repo, base1, readability)
    print(
        f"## Lane 1: readability ({len(files)} test files, `{base1[:11]}` → `{git(repo, 'rev-parse', '--short', readability).strip()}`)\n"
    )
    print(signal_table(before, after))
    print(f"\nSupporting (non-test) changes: {support}\n")
    for signal in ("expects", "cases"):
        print(f"Largest `{signal}` drops (each needs an explanation in the case):\n")
        print(drops_table(files, signal, args.drops))
        print()

    for title, tip, rx in (
        ("Lane 2: stories", stories, STORY_LANE),
        ("Lane 3: play functions", play, PLAY_LANE),
    ):
        rows, before, after = lane_by_commit(
            repo, git(repo, "merge-base", base1, tip).strip(), tip, rx
        )
        print(
            f"## {title} ({len(rows)} tests; test file + sibling `.stories.ts`, per commit)\n"
        )
        print(signal_table(before, after))
        print()
        print(file_table(rows))
        print()


if __name__ == "__main__":
    main()
