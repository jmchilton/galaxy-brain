"""Overlay committed production sources onto the frozen accessibility audit."""

import argparse
import re
import shutil
import subprocess
from pathlib import Path

AUDIT_SHA = "f43e9950dca7c322cfbb66def9961b301e854345"
PRODUCTION_SHA = "0d7e194649453a63c6f18f54feb8549ce4e6b4c3"


def git(root, *args):
    return subprocess.check_output(["git", *args], cwd=root, text=True).strip()


def production_path(path):
    name = Path(path).name.lower()
    return (
        path.startswith(("client/packages/ui/src/", "client/src/"))
        and ".stories." not in path
        and ".test." not in path
        and "__mocks__" not in path
        and not any(word in name for word in ("test", "fixture", "mock", "play"))
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--target", required=True, type=Path)
    args = parser.parse_args()
    source, target = args.source.resolve(), args.target.resolve()
    if source == target:
        parser.error("source and target must be separate checkouts")
    if git(source, "rev-parse", "HEAD") != PRODUCTION_SHA:
        parser.error(f"source must be checked out at {PRODUCTION_SHA}")
    if git(source, "status", "--porcelain"):
        parser.error("source must be clean so the overlay matches the recorded SHA")
    if git(target, "rev-parse", "HEAD") != AUDIT_SHA:
        parser.error(f"target must be a detached checkout of {AUDIT_SHA}")
    if not (target / "client/.storybook").is_dir():
        parser.error("target is missing the frozen Storybook harness")

    paths = git(source, "diff", "--no-renames", "--name-only", AUDIT_SHA, PRODUCTION_SHA, "--", "client").splitlines()
    copied = removed = 0
    for path in paths:
        if not production_path(path):
            continue
        destination = target / path
        if (source / path).is_file():
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source / path, destination)
            copied += 1
        elif destination.is_file():
            destination.unlink()
            removed += 1

    strict = 0
    for path in (target / "client/src").rglob("*.stories.ts"):
        content, count = re.subn(r'(a11y:\s*\{\s*test:\s*)"todo"', r'\1"error"', path.read_text())
        if count:
            path.write_text(content)
            strict += count
    print(f"Frozen audit {AUDIT_SHA}; production {PRODUCTION_SHA}")
    print(f"Copied {copied} production files; removed {removed}; made {strict} accessibility declarations strict.")


if __name__ == "__main__":
    main()
