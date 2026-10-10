# /// script
# requires-python = ">=3.11"
# ///
"""Before/after metrics for the test-conversion lanes; prints markdown tables.

Lane 1 compares each test file at the dev merge-base against the readability tip.
``--update`` also counts executed tests (``vitest list``) in throwaway worktrees of both refs.
Lanes 2 and 3 measure each per-test commit (``Test-File:`` trailer) against its parent,
counting the test file together with its sibling ``.stories.ts``.
"""

import argparse
import json
import os
import re
import subprocess
import tempfile
from collections import Counter
from datetime import date
from pathlib import Path
from typing import NamedTuple

DEFAULT_REPO = Path.home() / "projects/worktrees/galaxy/branch/vitest_readability"
REMOTE = "jmchilton"
LANES = ("vitest_readability", "vitest_stories", "vitest_story_play")
VITEST_DIRS = ("client", "lib/tool_shed/webapp/frontend")
NODE_MODULES = (*VITEST_DIRS, "client/packages/api-client", "client/packages/ui")
SAME_TOOLING = (
    "client/package.json",
    "client/pnpm-lock.yaml",
    "client/vitest.config.mts",
    "client/packages/*/package.json",
    "lib/tool_shed/webapp/frontend/package.json",
    "lib/tool_shed/webapp/frontend/vitest.config.ts",
)
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
    "casts": r"\bas (?:any|unknown|never)\b",
    "eslint-disable": r"eslint-disable",
    "manual flush/sleep": r"\bflushPromises\(|\bsetTimeout\(",
}
COMPILED = {name: re.compile(rx, re.MULTILINE) for name, rx in SIGNALS.items()}
PITCH_ROWS = {
    "lines": "Test lines",
    "wrapper.vm": "`.vm` reach-ins",
    "casts": "`as any`/`as unknown`/`as never` casts",
    "manual flush/sleep": "`flushPromises`/`setTimeout` calls",
    "vi.mock": "`vi.mock` module mocks",
    "eslint-disable": "`eslint-disable`",
}
BLOCK = re.compile(
    r"(<!-- case_metrics:lane1:start -->\n).*?(<!-- case_metrics:lane1:end -->)",
    re.DOTALL,
)
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


class Support(NamedTuple):
    """Non-test files changed alongside the tests: helpers, fixtures, docs."""

    shortstat: str
    before: Counter
    after: Counter


def changed_paths(repo, base, tip):
    """(base path, tip path) per changed file, following renames; '' marks added/deleted."""
    for line in git(repo, "diff", "-M", "--name-status", base, tip).splitlines():
        status, *paths = line.split("\t")
        if status[0] == "R":
            yield tuple(paths)
        else:
            yield ("" if status == "A" else paths[0], "" if status == "D" else paths[0])


def lane1(repo, base, tip):
    changed = list(changed_paths(repo, base, tip))
    files = [(old, new) for old, new in changed if TEST_FILE.search(new or old)]
    before, after, rows = Counter(), Counter(), []
    for old, new in files:
        b, a = (
            measure(show(repo, base, old) if old else ""),
            measure(show(repo, tip, new) if new else ""),
        )
        before.update(b)
        after.update(a)
        rows.append((old, new, b, a))
    support = Support(
        git(
            repo,
            "diff",
            "--shortstat",
            base,
            tip,
            "--",
            ".",
            *[f":!{path}" for pair in files for path in pair if path],
        ).strip(),
        Counter(),
        Counter(),
    )
    for old, new in set(changed) - set(files):
        support.before.update(measure(show(repo, base, old) if old else ""))
        support.after.update(measure(show(repo, tip, new) if new else ""))
    return rows, before, after, support


def vitest_list(repo, ref, tmp):
    """Executed tests per repo-relative file at ``ref``, from ``vitest list`` in a throwaway worktree."""
    worktree = Path(tmp) / ref[:11]
    git(repo, "worktree", "add", "-q", "--detach", str(worktree), ref)
    try:
        for d in NODE_MODULES:
            (worktree / d / "node_modules").symlink_to(repo / d / "node_modules")
        env = {
            **os.environ,
            "npm_config_use_node_version": (worktree / "client/.node_version")
            .read_text()
            .strip(),
            "VITE_CONFIG_NATIVE_IGNORE_WARNING": "true",
        }
        counts = Counter()
        for d in VITEST_DIRS:
            out = Path(tmp) / f"{ref[:11]}-{d.replace('/', '_')}.json"
            subprocess.run(
                ["pnpm", "exec", "vitest", "list", f"--json={out}"],
                cwd=worktree / d,
                env=env,
                check=True,
                capture_output=True,
            )
            for test in json.loads(out.read_text()):
                counts[
                    str(Path(test["file"]).resolve().relative_to(worktree.resolve()))
                ] += 1
        return counts
    finally:
        git(repo, "worktree", "remove", "--force", str(worktree))


def executed(repo, base, tip, files):
    """Executed tests per changed test file at both refs; tooling must match so node_modules can be shared."""
    if git(repo, "diff", "--name-only", base, tip, "--", *SAME_TOOLING).strip():
        raise SystemExit(
            "client tooling differs between base and tip; executed counts need separate installs"
        )
    with tempfile.TemporaryDirectory() as tmp:
        at_base, at_tip = vitest_list(repo, base, tmp), vitest_list(repo, tip, tmp)
    return [
        (old, new, at_base[old] if old else 0, at_tip[new] if new else 0)
        for old, new in files
    ]


def drops_table(rows, signal, limit):
    worst = sorted(rows, key=lambda r: r[3][signal] - r[2][signal])[:limit]
    other = "expects" if signal == "cases" else "cases"
    lines = [
        f"| Test | {signal} | {other} | `.each` tables | lines |",
        "| --- | --- | --- | --- | --- |",
    ]
    for _, path, b, a in worst:
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


def delta(b, a):
    d = f"{a - b:+,d}".replace("-", "\u2212")
    return f"{d} ({(a - b) / b:+.0%})".replace("-", "\u2212") if b else d


def pitch_block(base, tip, files, before, after, support, runs, today):
    run_b, run_a = sum(r[2] for r in runs), sum(r[3] for r in runs)
    lost = [r for r in runs if r[3] < r[2]]
    grew = sum(r[3] > r[2] for r in runs)
    lines = [
        f"{len(files)} test files, dev merge-base `{base[:11]}` → `vitest_readability` `{tip[:11]}`, as of {today}.",
        "",
        "| Signal | Before | After | Δ | Δ with helpers |",
        "| --- | ---: | ---: | ---: | ---: |",
        f"| Executed tests (`vitest list`) | {run_b:,} | {run_a:,} | {delta(run_b, run_a)} | |",
    ]
    for name, label in PITCH_ROWS.items():
        b, a = before[name], after[name]
        with_b, with_a = b + support.before[name], a + support.after[name]
        lines.append(
            f"| {label} | {b:,} | {a:,} | {delta(b, a)} | {delta(with_b, with_a)} |"
        )
    lines += [
        "",
        f"Files that lost an executed test: {len(lost)} of {len(runs)}"
        + (
            f" ({', '.join(f'`{Path(r[0]).name}` {r[2]} → {r[3]}' for r in lost)})"
            if lost
            else ""
        )
        + f"; {grew} gained tests and the rest kept the same count.",
        "",
        f"Δ with helpers also counts the non-test files the work changed (shared helpers, fixtures, docs): {support.shortstat}.",
    ]
    return "\n".join(lines) + "\n"


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
        "--update",
        type=Path,
        help="rewrite the lane-1 pitch table between the case_metrics markers in this file, print nothing else",
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
    if args.update:
        tip = git(repo, "rev-parse", readability).strip()
        runs = executed(repo, base1, tip, [(old, new) for old, new, _, _ in files])
        block = pitch_block(
            base1, tip, files, before, after, support, runs, date.today().isoformat()
        )
        text = args.update.read_text()
        if not BLOCK.search(text):
            parser.error(f"no case_metrics:lane1 markers in {args.update}")
        args.update.write_text(
            BLOCK.sub(lambda m: m.group(1) + block + m.group(2), text)
        )
        return
    print(
        f"## Lane 1: readability ({len(files)} test files, `{base1[:11]}` → `{git(repo, 'rev-parse', '--short', readability).strip()}`)\n"
    )
    print(signal_table(before, after))
    print(f"\nSupporting (non-test) changes: {support.shortstat}\n")
    print(signal_table(support.before, support.after))
    print()
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
