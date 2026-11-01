# /// script
# dependencies = []
# ///
"""Write data/build.json from the foundry repo at FOUNDRY_REF (read-only, via git show)."""
import json
import os
import re
import subprocess
from collections import Counter
from pathlib import Path

REPO = Path(os.environ.get("FOUNDRY_REPO", Path.home() / "projects/repositories/foundry"))
REF = os.environ.get("FOUNDRY_REF", "origin/main")
SKILL = "discover-shed-tool"
CASTS = "casts/claude/skills"
# Fan-out rows: five shared notes. Skipped: open-requirements-ledger (22) and the
# summarize-nextflow schema package (12); see README.
FAN = [
    "galaxy-workflow-testability-design",
    "iwc-test-data-conventions",
    "galaxy-collection-semantics",
    "galaxy-data-flow-draft-contract",
    "iwc-shortcuts-anti-patterns",
]


def git(*args):
    return subprocess.run(["git", "-C", str(REPO), *args], check=True, capture_output=True, text=True).stdout


def show(path):
    return git("show", f"{REF}:{path}")


sha = git("rev-parse", REF).strip()
date = git("log", "-1", "--format=%cs", REF).strip()
prov = json.loads(show(f"{CASTS}/{SKILL}/_provenance.json"))
req = json.loads(show(f"{CASTS}/{SKILL}/_required_tools.json"))
ver = json.loads(show(f"{CASTS}/{SKILL}/_verify.json"))
skill_md = show(f"{CASTS}/{SKILL}/SKILL.md")
eval_md = show(f"content/molds/{SKILL}/eval.md")

props = []
for m in re.finditer(r"^## Property: (.+?)\n\n- check: (\S+)", eval_md, re.M):
    props.append({"title": m.group(1).strip(), "check": m.group(2)})

tree = git("ls-tree", "-r", "--name-only", REF, CASTS).split()
cast_dirs = len({p.split("/")[3] for p in tree})  # Mold casts + pipeline harnesses
skills = sorted({p.split("/")[3] for p in tree if p.endswith("/_provenance.json")})
srcs, load, evidence, total = Counter(), Counter(), Counter(), 0
for s in skills:
    refs = json.loads(show(f"{CASTS}/{s}/_provenance.json")).get("refs", [])
    total += len(refs)
    for r in refs:
        srcs[r["src"]] += 1
        load[r.get("load")] += 1
        evidence[r.get("evidence")] += 1

out = {
    "foundry": {"sha": sha, "short": sha[:8], "date": date, "ref": REF},
    "skill": SKILL,
    "skill_md_lines": len(skill_md.splitlines()),
    "mold": {k: prov["mold"][k] for k in ("name", "revision", "content_hash", "commit")},
    "cast_target": prov["cast_target"],
    "cast_at": prov["cast_at"],
    "cast_history": prov["cast_history"],
    "refs": [{k: r.get(k) for k in ("kind", "ref", "load", "mode", "evidence", "src_hash", "dst_hash", "trigger")}
             for r in prov["refs"]],
    "required_tools": [{k: t[k] for k in ("tool", "package", "package_version", "availability_check")} for t in req],
    "verify": [{"artifact": e["default_filename"], "validator": e["validator_bin"], "args": e["args"]}
               for e in ver["entries"]],
    "eval": props,
    "corpus": {
        "cast_dirs": cast_dirs,
        "casts": len(skills),
        "ref_entries": total,
        "load": dict(load),
        "evidence": dict(evidence),
        "fan": [{"note": n, "skills": srcs[f"content/research/{n}/index.md"]} for n in FAN],
        "top_srcs": srcs.most_common(8),
    },
}
(Path(__file__).with_name("data") / "build.json").write_text(json.dumps(out, indent=2) + "\n")
print(f"data/build.json from foundry {REF} @ {sha[:8]} ({date}): {len(skills)} casts, {total} refs,",
      ", ".join(f"{f['note']} {f['skills']}" for f in out["corpus"]["fan"]))
