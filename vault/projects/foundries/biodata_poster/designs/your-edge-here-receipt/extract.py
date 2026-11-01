# /// script
# requires-python = ">=3.11"
# ///
"""Emit ledger.json for poster.typ from the Foundry repos, read-only via `git show <rev>:<path>`.

A Foundry "uses" a foundry-lib package if any of its package.json files declares it as a (dev/peer) dependency.
"""
import json
import os
import re
import subprocess
import sys
from pathlib import Path

REPOS = Path(os.environ.get("FOUNDRY_REPOS", Path.home() / "projects/repositories"))
REV = os.environ.get("LEDGER_REV", "origin/main")
OUT = Path(__file__).with_name("ledger.json")
LIB = "foundry-lib"
FOUNDRIES = [
    ("wf", "foundry"),
    ("sg", "statistical-genomics-foundry"),
    ("tda", "topological-data-analysis-bioinformatics-foundry"),
]
TDA = FOUNDRIES[2][1]


def git(repo, *args):
    return subprocess.run(["git", "-C", str(REPOS / repo), *args], check=True, capture_output=True, text=True).stdout


def meta(repo):
    sha, date = git(repo, "log", "-1", "--format=%h %cs", REV).split()
    return {"repo": repo, "sha": sha, "date": date}


def scoped_deps(repo):
    files = [f for f in git(repo, "ls-tree", "-r", "--name-only", REV).splitlines()
             if f.endswith("package.json") and "node_modules" not in f]
    found = set()
    for f in files:
        pkg = json.loads(git(repo, "show", f"{REV}:{f}"))
        for field in ("dependencies", "devDependencies", "peerDependencies"):
            found |= {k.split("/", 1)[1] for k in pkg.get(field, {}) if k.startswith("@galaxy-foundry/")}
    return found


def main():
    if not all((REPOS / r).is_dir() for r in [LIB] + [r for _, r in FOUNDRIES]):
        print("repos not found; keeping committed ledger.json", file=sys.stderr)
        return
    packages = sorted(p.split("/")[-1] for p in git(LIB, "ls-tree", "-d", "--name-only", REV, "packages/").split())
    out = {"lib": meta(LIB), "packages": packages, "foundries": {}}
    for key, repo in FOUNDRIES:
        used = scoped_deps(repo) & set(packages)
        out["foundries"][key] = meta(repo) | {"uses": sorted(used), "count": len(used)}
    audit = git(TDA, "show", f"{REV}:audit/citation-audit.md")
    part = dict(re.findall(r"^\| (resolved|resolved-mismatched|unresolved|unavailable|total) \| (\d+) \|$", audit, re.M))
    verified = re.search(r"Verified against a described work: \*\*(\d+) of (\d+)\*\*", audit)
    extracted = re.search(r"Extracted \*\*(\d+) of (\d+)\*\* reference-section lines", audit)
    recipes = [f for f in git(TDA, "ls-tree", "--name-only", REV, "content/recipes/").split() if f.endswith(".md")]
    out["tda"] = {
        "resolved": int(part["resolved"]),
        "mismatched": int(part["resolved-mismatched"]),
        "total": int(part["total"]),
        "verified": int(verified.group(1)),
        "extracted": int(extracted.group(1)),
        "ref_lines": int(extracted.group(2)),
        "recipes": len(recipes),
    }
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    for key, f in out["foundries"].items():
        print(f"{key}: {f['count']}/{len(packages)} @ {f['sha']}")
    print("tda:", out["tda"])


main()
