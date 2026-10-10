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
COVERAGE_METRICS = {"lines": "Line coverage", "branches": "Branch coverage"}
TEST_SUPPORT = re.compile(
    r"(^|/)(tests?|__mocks__|_testing)/|test-?utils|testUtils|test-?data|testData|\.stories\."
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
    "truthy checks": r"\.toBe(?:Truthy|Falsy)\(",
    "exact equality": r"\.to(?:Strict)?Equal\(",
    "test-data imports": r"from [\"']@tests/test-data",
    "direct mounts": r"\b(?:shallowMount|mount)\(",
    "manual flush/sleep": r"\bflushPromises\(|\bsetTimeout\(",
}
COMPILED = {name: re.compile(rx, re.MULTILINE) for name, rx in SIGNALS.items()}
PITCH_ROWS = {
    "lines": "Test lines",
    "exact equality": "Strong Checks - exact `toEqual`/`toStrictEqual`",
    "truthy checks": "Weak Checks - `toBeTruthy`/`toBeFalsy`",
    "test-data imports": "Imports of shared `@tests/test-data` fixtures",
    "direct mounts": "Direct `mount`/`shallowMount` calls",
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
GOOD = {
    "cases",
    ".each tables",
    "stories",
    "plays",
    "expects",
    "role/label queries",
    "exact equality",
    "test-data imports",
    "direct mounts",
}


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


class RefRun(NamedTuple):
    tests: Counter  # executed tests per repo-relative test file
    coverage: dict  # repo-relative source file -> {metric: (covered, total)}


def measure_ref(repo, ref, tmp, client_tests):
    """``vitest list`` everywhere plus client coverage of ``client_tests``, in a throwaway worktree of ``ref``."""
    worktree = (
        Path(tmp).resolve() / ref[:11]
    )  # vitest filters must match its resolved root (/var -> /private/var)
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
        tests = Counter()
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
                tests[relative(test["file"], worktree)] += 1
        return RefRun(
            tests,
            client_coverage(
                worktree, env, Path(tmp) / f"{ref[:11]}-coverage", client_tests
            ),
        )
    finally:
        git(repo, "worktree", "remove", "--force", str(worktree))


def relative(path, worktree):
    return str(Path(path).resolve().relative_to(worktree.resolve()))


def client_coverage(worktree, env, out, tests):
    """Per-source-file line and branch counts from running ``tests`` with v8 coverage."""
    run = subprocess.run(
        [
            "pnpm",
            "exec",
            "vitest",
            "run",
            *[str(worktree / t) for t in tests],
            "--coverage.enabled",
            "--coverage.reporter=json-summary",
            f"--coverage.reportsDirectory={out}",
            "--coverage.reportOnFailure",
        ],
        cwd=worktree / "client",
        env=env,
        check=False,
        capture_output=True,
        text=True,
    )
    summary = json.loads((out / "coverage-summary.json").read_text())
    coverage = {}
    for path, metrics in summary.items():
        if path == "total" or TEST_SUPPORT.search(rel := relative(path, worktree)):
            continue
        coverage[rel] = {
            m: (metrics[m]["covered"], metrics[m]["total"]) for m in COVERAGE_METRICS
        }
    if not coverage:
        raise SystemExit(
            f"coverage run measured no source files:\n{run.stdout[-2000:]}"
        )
    return coverage


def coverage_percent(base_cov, tip_cov, metric):
    """Coverage % at both refs over the union of source files either run loaded; unloaded counts as uncovered."""
    covered_b = covered_a = total = 0
    for path in base_cov.keys() | tip_cov.keys():
        b, a = base_cov.get(path, {}).get(metric), tip_cov.get(path, {}).get(metric)
        total += max(x[1] for x in (b, a) if x)
        covered_b += b[0] if b else 0
        covered_a += a[0] if a else 0
    return 100 * covered_b / total, 100 * covered_a / total


def coverage_losses(base_cov, tip_cov):
    """Markdown table of source files whose covered lines or branches fell between the refs."""
    lines = [
        "| Source file | Lines covered | Branches covered |",
        "| --- | --- | --- |",
    ]
    for path in sorted(base_cov.keys() | tip_cov.keys()):
        b, a = base_cov.get(path, {}), tip_cov.get(path, {})
        cells = [(b.get(m, (0, 0))[0], a.get(m, (0, 0))[0]) for m in COVERAGE_METRICS]
        if any(after < before for before, after in cells):
            lines.append(
                f"| `{path}` | " + " | ".join(f"{x} → {y}" for x, y in cells) + " |"
            )
    return "\n".join(lines)


def executed(repo, base, tip, files):
    """Executed tests per changed test file, plus both refs' client coverage; tooling must match to share node_modules."""
    if git(repo, "diff", "--name-only", base, tip, "--", *SAME_TOOLING).strip():
        raise SystemExit(
            "client tooling differs between base and tip; executed counts need separate installs"
        )
    client_tests_b = [old for old, _ in files if old.startswith("client/")]
    client_tests_a = [new for _, new in files if new.startswith("client/")]
    with tempfile.TemporaryDirectory() as tmp:
        at_base = measure_ref(repo, base, tmp, client_tests_b)
        at_tip = measure_ref(repo, tip, tmp, client_tests_a)
    runs = [
        (old, new, at_base.tests[old] if old else 0, at_tip.tests[new] if new else 0)
        for old, new in files
    ]
    return runs, at_base.coverage, at_tip.coverage, len(client_tests_a)


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


def pitch_block(base, tip, files, before, after, support, measured, today):
    runs, base_cov, tip_cov, client_tests = measured
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
    for metric, label in COVERAGE_METRICS.items():
        pct_b, pct_a = coverage_percent(base_cov, tip_cov, metric)
        pp = f"{pct_a - pct_b:+.1f} pp".replace("-", "\u2212")
        lines.append(
            f"| {label} (source the tests load) | {pct_b:.1f}% | {pct_a:.1f}% | {pp} | |"
        )
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
        (
            f"Coverage runs the {client_tests} client test files at both refs (the Tool Shed frontend has no coverage provider) "
            f"and measures the {len(base_cov.keys() | tip_cov.keys())} non-test source files they load; production code is identical at both refs."
        ),
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
        measured = executed(repo, base1, tip, [(old, new) for old, new, _, _ in files])
        block = pitch_block(
            base1,
            tip,
            files,
            before,
            after,
            support,
            measured,
            date.today().isoformat(),
        )
        text = args.update.read_text()
        if not BLOCK.search(text):
            parser.error(f"no case_metrics:lane1 markers in {args.update}")
        args.update.write_text(
            BLOCK.sub(lambda m: m.group(1) + block + m.group(2), text)
        )
        print("Coverage losses (fix these in the tests rather than reporting them):\n")
        print(coverage_losses(measured[1], measured[2]))
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
