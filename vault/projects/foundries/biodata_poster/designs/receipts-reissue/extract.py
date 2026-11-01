# /// script
# dependencies = []
# ///
"""Write receipt.json: one cast before/after commit FIX, plus the PR #701 fan-out (read-only, via git show)."""
import json
import os
import re
import subprocess
from pathlib import Path

REPO = Path(os.environ.get("FOUNDRY_REPO", Path.home() / "projects/repositories/foundry"))
FIX = "73af1f62"  # discover-shed-tool: normalize tool-id-shaped queries before declaring miss
MERGE = "9adc20b7"  # PR #701: planemo-asserts-idioms revised
NOTE = "content/research/planemo-asserts-idioms/index.md"
SKILL = "discover-shed-tool"
CASTS = "casts/claude/skills"
CAST = f"{CASTS}/{SKILL}"
JOURNAL = f"content/molds/{SKILL}/refinements/2026-06-17-tool-id-query-normalization.md"


def git(*args):
    return subprocess.run(["git", "-C", str(REPO), *args], check=True, capture_output=True, text=True).stdout


def show(ref, path):
    return git("show", f"{ref}:{path}")


def cast(ref):
    prov = json.loads(show(ref, f"{CAST}/_provenance.json"))
    names = git("ls-tree", "--name-only", ref, f"{CAST}/").split()
    ver = json.loads(show(ref, f"{CAST}/_verify.json")) if f"{CAST}/_verify.json" in names else None
    return {
        "sha": git("rev-parse", ref).strip(),
        "mold": {k: prov["mold"][k] for k in ("name", "revision", "content_hash", "commit")},
        "cast_target": prov["cast_target"],
        "cast_at": prov["cast_at"],
        "cast_revision": prov.get("cast_revision"),
        "cast_history_len": len(prov.get("cast_history", [])),
        "refs": [{k: r.get(k) for k in ("kind", "ref", "load", "mode", "evidence", "src_hash", "dst_hash")}
                 for r in prov["refs"]],
        "verify": [{"artifact": e["default_filename"], "validator": e["validator_bin"], "args": e["args"]}
                   for e in ver["entries"]] if ver else [],
    }


before, after = cast(f"{FIX}^"), cast(FIX)
assert before["refs"] == after["refs"], "refs changed across the reissue"
assert before["mold"]["revision"] == after["mold"]["revision"]

# the fix commit itself
meta = git("log", "-1", "--format=%s%n%aI%n%cI", FIX).splitlines()
numstat = [ln.split("\t") for ln in git("show", "--numstat", "--format=", FIX).splitlines() if ln.strip()]
files = {p: (int(a), int(d)) for a, d, p in numstat}
eval_after = show(FIX, f"content/molds/{SKILL}/eval.md")
props = re.findall(r"^## Property: (.+)$", eval_after, re.M)
eval_path = f"content/molds/{SKILL}/eval.md"
new_prop = [p for p in props if p not in re.findall(r"^## Property: (.+)$", show(f"{FIX}^", eval_path), re.M)]
assert len(new_prop) == 1
idx_diff = git("show", "--format=", FIX, "--", f"content/molds/{SKILL}/index.md")
added = [ln[1:] for ln in idx_diff.splitlines() if ln.startswith("+") and not ln.startswith("+++")]
norm = re.search(r"\*\*(Normalize a tool-id-shaped need before searching)\.\*\*", "\n".join(added))
assert norm
journal = show(FIX, JOURNAL)
assert "`gxwf tool-search integron_finder`" in journal and "**`No hits`**" in journal
cs = re.search(r"`(iuc/integron_finder)`\s+wrapper \(changeset `([0-9a-f]{12})`", journal)
assert cs and "`integron finder` (34.60)" in journal

# PR #701: every cast that bundles the note, recast in one merge
m_files = git("diff", "--name-only", f"{MERGE}^1", MERGE).split()
recast = sorted(p.split("/")[3] for p in m_files if p.startswith(CASTS) and p.endswith("/_provenance.json"))
all_casts = sorted({p.split("/")[3] for p in git("ls-tree", "-r", "--name-only", MERGE, CASTS).split()
                    if p.endswith("/_provenance.json")})
cites = [s for s in all_casts if NOTE in show(MERGE, f"{CASTS}/{s}/_provenance.json")]
assert recast == cites, (recast, cites)
pairs = set()
for s in recast:
    old = {r["src"]: r for r in json.loads(show(f"{MERGE}^1", f"{CASTS}/{s}/_provenance.json"))["refs"]}
    new = {r["src"]: r for r in json.loads(show(MERGE, f"{CASTS}/{s}/_provenance.json"))["refs"]}
    pairs.add((old[NOTE]["src_hash"], new[NOTE]["src_hash"]))
    assert old[NOTE]["src_hash"] == old[NOTE]["dst_hash"] and new[NOTE]["src_hash"] == new[NOTE]["dst_hash"]
assert len(pairs) == 1, pairs
note_old, note_new = pairs.pop()
rev = lambda ref: int(re.search(r"^revision: (\d+)$", show(ref, NOTE), re.M).group(1))

out = {
    "skill": SKILL,
    "before": before,
    "after": after,
    "fix": {
        "short": FIX, "subject": meta[0], "authored": meta[1], "committed": meta[2],
        "files": len(files), "plus": sum(a for a, _ in files.values()), "minus": sum(d for _, d in files.values()),
        "eval_plus": files[eval_path][0], "new_property": new_prop[0], "new_property_n": props.index(new_prop[0]) + 1,
        "index_rule": norm.group(1), "journal": JOURNAL,
        "miss_query": "integron_finder", "hit_query": "integron finder", "hit": cs.group(1), "changeset": cs.group(2),
    },
    "pr701": {
        "merge": MERGE, "date": git("log", "-1", "--format=%cs", MERGE).strip(), "note": "planemo-asserts-idioms",
        "note_revision": [rev(f"{MERGE}^1"), rev(MERGE)], "recast": recast, "casts": len(all_casts),
        "src_hash": [note_old, note_new],
    },
}
Path(__file__).with_name("receipt.json").write_text(json.dumps(out, indent=2) + "\n")
print(f"receipt.json: {SKILL} {before['mold']['content_hash'][:8]} -> {after['mold']['content_hash'][:8]};",
      f"#701 recast {len(recast)} of {len(all_casts)} casts ({note_old[:8]} -> {note_new[:8]})")
