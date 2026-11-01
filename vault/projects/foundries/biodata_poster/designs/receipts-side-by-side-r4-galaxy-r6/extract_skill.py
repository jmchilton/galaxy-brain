# /// script
# dependencies = []
# ///
"""Write receipt-skill.json (left receipt) from the foundry repo at FOUNDRY_REF, read-only via git show."""
import json
import os
import subprocess
from pathlib import Path

REPO = Path(os.environ.get("FOUNDRY_REPO", Path.home() / "projects/repositories/foundry"))
REF = os.environ.get("FOUNDRY_REF", "origin/main")
SKILL = "discover-shed-tool"
CAST = f"casts/claude/skills/{SKILL}"


def git(*args):
    return subprocess.run(["git", "-C", str(REPO), *args], check=True, capture_output=True, text=True).stdout


def show(path):
    return json.loads(git("show", f"{REF}:{path}"))


sha = git("rev-parse", REF).strip()
date = git("log", "-1", "--format=%cs", REF).strip()
prov = show(f"{CAST}/_provenance.json")
req = show(f"{CAST}/_required_tools.json")
ver = show(f"{CAST}/_verify.json")
# corpus counts, dossier definitions: .md under content/, dirs in content/molds/ and casts/claude/skills/
md = [f for f in git("ls-tree", "-r", "--name-only", REF, "content/").split() if f.endswith(".md")]
dirs = lambda p: len(git("ls-tree", "-d", "--name-only", REF, p).split())

out = {
    "foundry": {"sha": sha, "short": sha[:8], "date": date, "ref": REF},
    "skill": SKILL,
    "corpus": {"notes": len(md), "molds": dirs("content/molds/"), "skills": dirs("casts/claude/skills/")},
    "mold": {k: prov["mold"][k] for k in ("name", "revision", "content_hash", "commit")},
    "cast_target": prov["cast_target"],
    "cast_at": prov["cast_at"],
    "refs": [{k: r.get(k) for k in ("kind", "ref", "load", "mode", "evidence", "src_hash", "dst_hash")}
             for r in prov["refs"]],
    "required_tools": [{k: t[k] for k in ("tool", "package", "package_version")} for t in req],
    "verify": [{"artifact": e["default_filename"], "validator": e["validator_bin"], "args": e["args"]}
               for e in ver["entries"]],
}
assert out["verify"][0]["args"][1] == "--schema-sha256", out["verify"]
Path(__file__).with_name("receipt-skill.json").write_text(json.dumps(out, indent=2) + "\n")
print(f"receipt-skill.json from foundry {REF} @ {sha[:8]} ({date}): {SKILL} rev {out['mold']['revision']}, "
      f"{len(out['refs'])} refs; corpus {out['corpus']}")
