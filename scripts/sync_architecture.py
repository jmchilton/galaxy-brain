#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Bump the galaxy-architecture submodule pin and regenerate vault views.

Workflow:
  1. fetch origin in the submodule
  2. show commits between current pin and origin/main
  3. prompt for confirmation (skip with --yes)
  4. fast-forward submodule to origin/main
  5. regenerate vault views via generate_architecture_views.py
  6. stage submodule pointer + regenerated views
  7. print a suggested commit message (no commit)

Usage:
    uv run scripts/sync_architecture.py
    uv run scripts/sync_architecture.py --yes
    uv run scripts/sync_architecture.py --rev <sha>   # pin to specific commit
"""

import argparse
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SUBMODULE = REPO_ROOT / "galaxy-architecture"
SUBMODULE_REL = "galaxy-architecture"
GENERATOR = REPO_ROOT / "generate_architecture_views.py"
VIEWS_REL = "vault/projects/architecture/topics"


def run(cmd: list[str], cwd: Path | None = None, capture: bool = False) -> subprocess.CompletedProcess:
    return subprocess.run(
        cmd,
        cwd=cwd,
        check=True,
        text=True,
        capture_output=capture,
    )


def submodule_dirty() -> bool:
    res = run(["git", "status", "--porcelain"], cwd=SUBMODULE, capture=True)
    return bool(res.stdout.strip())


def current_sha() -> str:
    return run(["git", "rev-parse", "HEAD"], cwd=SUBMODULE, capture=True).stdout.strip()


def short(sha: str) -> str:
    return sha[:8]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--yes", action="store_true", help="skip confirmation prompt")
    parser.add_argument("--rev", default="origin/main", help="target ref (default: origin/main)")
    args = parser.parse_args()

    if not SUBMODULE.exists():
        print(f"ERROR: submodule not initialized at {SUBMODULE}", file=sys.stderr)
        print("run: git submodule update --init", file=sys.stderr)
        return 2

    if submodule_dirty():
        print(f"ERROR: submodule {SUBMODULE_REL} has uncommitted changes — commit/stash upstream first", file=sys.stderr)
        return 2

    print(f"==> fetching {SUBMODULE_REL}")
    run(["git", "fetch", "origin"], cwd=SUBMODULE)

    old_sha = current_sha()
    target = run(["git", "rev-parse", args.rev], cwd=SUBMODULE, capture=True).stdout.strip()

    if old_sha == target:
        print(f"already at {short(old_sha)} — no update needed")
        return 0

    print(f"\n==> commits between {short(old_sha)} and {short(target)}:")
    log = run(
        ["git", "log", "--oneline", f"{old_sha}..{target}"],
        cwd=SUBMODULE,
        capture=True,
    )
    print(log.stdout or "  (no commits — target is behind current?)")

    if not args.yes:
        try:
            answer = input(f"\nFast-forward {SUBMODULE_REL} to {short(target)}? [y/N] ").strip().lower()
        except EOFError:
            answer = ""
        if answer not in ("y", "yes"):
            print("aborted")
            return 1

    print(f"\n==> checking out {short(target)}")
    run(["git", "checkout", target], cwd=SUBMODULE)

    print("\n==> regenerating vault views")
    run(["uv", "run", str(GENERATOR)], cwd=REPO_ROOT)

    print("\n==> staging changes")
    run(["git", "add", SUBMODULE_REL, VIEWS_REL], cwd=REPO_ROOT)

    n_commits = len([line for line in log.stdout.splitlines() if line.strip()])
    msg = f"vault: sync architecture @ {short(target)} ({n_commits} commits)"
    print(f"\n==> ready to commit. Suggested message:\n  {msg}")
    print("\nReview with `git diff --cached` then commit when ready.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except subprocess.CalledProcessError as e:
        print(f"ERROR: command failed: {' '.join(e.cmd)}", file=sys.stderr)
        sys.exit(e.returncode)
