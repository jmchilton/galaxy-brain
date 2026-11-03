#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "python-frontmatter",
#     "jsonschema",
#     "pyyaml",
# ]
# ///
"""Pull gitignored screenshots from remote environments into this vault.

Record screenshots land in the record's current status directory, so records moved on either
machine keep them; local copies stranded by a move are moved too. Dry run unless --apply.

Usage:
    uv run pull_screenshots.py           # rsync to staging, print the plan
    uv run pull_screenshots.py --apply   # also write into the vault
"""

import argparse
import shlex
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path, PurePosixPath

import yaml

from validate_records import RECORD_KINDS, find_records

REPO_ROOT = Path(__file__).resolve().parent
VAULT = REPO_ROOT / "vault"
ENVIRONMENTS = VAULT / "agents" / "_shared" / "ENVIRONMENTS.yml"
STAGING = Path.home() / ".cache" / "galaxy-brain" / "screenshots"


@dataclass(frozen=True)
class Source:
    rel: str
    """Path relative to the vault it came from."""
    path: Path
    label: str


def load_hosts(path):
    """(host, vault) pairs for the remote environments."""
    environments = yaml.safe_load(Path(path).read_text())["environments"]
    return [(env["host"], env["vault"]) for env in environments if env.get("host")]


def ignored_screenshots(vault, host=None):
    """Gitignored files under a `screenshots/` directory, relative to the vault."""
    cmd = ["git", "-C", str(vault), "ls-files", "-z", "--others", "--ignored", "--exclude-standard"]
    if host:
        cmd = ["ssh", host, shlex.join(cmd)]
    out = subprocess.run(cmd, check=True, capture_output=True, text=True).stdout
    return sorted(p for p in out.split("\0") if p and "screenshots" in PurePosixPath(p).parts[:-1])


def record_homes(vault):
    """Map (repo, kind, name) to the vault-relative record directory holding its index.md."""
    return {
        (r.repo, r.kind, r.name): PurePosixPath(r.index.parent.relative_to(vault).as_posix())
        for r in find_records(vault)
        if r.index.is_file()
    }


def resolve(rel, homes):
    """Where `rel` belongs in this vault, or None when its record isn't here."""
    parts = PurePosixPath(rel).parts
    if len(parts) < 6 or parts[0] != "repositories" or parts[2] not in RECORD_KINDS:
        return rel
    home = homes.get((parts[1], parts[2], parts[4]))
    return None if home is None else str(home.joinpath(*parts[5:]))


def plan(sources, vault, homes):
    """Per destination, the newest source that is newer than the vault's copy."""
    best = {}
    warnings = []
    for source in sources:
        dest = resolve(source.rel, homes)
        if dest is None:
            warnings.append(f"no local record for {source.label}")
        elif dest not in best or source.path.stat().st_mtime > best[dest].path.stat().st_mtime:
            best[dest] = source
    transfers = []
    for dest, source in sorted(best.items()):
        target = Path(vault) / dest
        if target.exists() and target.stat().st_mtime >= source.path.stat().st_mtime:
            continue
        transfers.append((source, dest))
    return transfers, warnings


def stranded(vault, rels, homes):
    """Local screenshots sitting outside their record's current directory."""
    return [Source(rel, Path(vault) / rel, rel) for rel in rels if resolve(rel, homes) != rel]


def prune_empty(directory, stop):
    """Remove `directory` and its parents up to `stop` while they are empty."""
    directory = Path(directory)
    while directory != stop and directory.is_dir() and not any(directory.iterdir()):
        directory.rmdir()
        directory = directory.parent


def apply(transfers, vault):
    vault = Path(vault)
    for source, dest in transfers:
        target = vault / dest
        target.parent.mkdir(parents=True, exist_ok=True)
        if source.path.is_relative_to(vault):
            shutil.move(source.path, target)
            prune_empty(source.path.parent, vault)
        else:
            shutil.copy2(source.path, target)


def stage(host, remote_vault, rels):
    """rsync `rels` from the host into its staging mirror; return them as sources."""
    staging = STAGING / host
    staging.mkdir(parents=True, exist_ok=True)
    if rels:
        subprocess.run(
            ["rsync", "-a", "--from0", "--files-from=-", f"{host}:{remote_vault}/", f"{staging}/"],
            input="\0".join(rels),
            check=True,
            text=True,
        )
    return [Source(rel, staging / rel, f"{host}:{rel}") for rel in rels]


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--apply", action="store_true", help="write into the vault (default: dry run)")
    args = parser.parse_args()

    homes = record_homes(VAULT)
    local = stranded(VAULT, ignored_screenshots(VAULT), homes)
    sources = list(local)
    for host, remote_vault in load_hosts(ENVIRONMENTS):
        sources += stage(host, remote_vault, ignored_screenshots(remote_vault, host))

    transfers, warnings = plan(sources, VAULT, homes)
    moved = {source for source, _ in transfers}
    warnings += [f"stranded copy left behind, a newer one wins: {s.rel}" for s in local if s not in moved]

    for source, dest in transfers:
        verb = "move" if source in local else "copy"
        print(f"{verb} {source.label} -> {dest}")
    for warning in warnings:
        print(f"warning: {warning}", file=sys.stderr)
    if args.apply:
        apply(transfers, VAULT)
        print(f"{len(transfers)} file(s) written")
    else:
        print(f"dry run: {len(transfers)} file(s) planned; rerun with --apply")


if __name__ == "__main__":
    main()
