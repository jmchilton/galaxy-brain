# /// script
# dependencies = []
# ///
"""Turn the saved gxwf outputs in data/ into receipt.json; fail if any printed number or VOID message is not in them."""
import json
import re
from collections import OrderedDict
from pathlib import Path

here = Path(__file__).resolve().parent
data = here / "data"
v = json.loads((data / "validate.json").read_text())
txt = (data / "validate.txt").read_text()
vp = json.loads((data / "void-param.json").read_text())
vc = json.loads((data / "void-conn.json").read_text())
meta = dict(line.split("=", 1) for line in (data / "run-meta.txt").read_text().split())
times = [float(t) for t in (data / "timing.txt").read_text().split()]
raw_state = (data / "featurecounts-tool_state.txt").read_text().strip()
tree = json.loads((data / "iwc-tree-summary.json").read_text())
rep = json.loads((data / "repair.json").read_text())
rep_times = [float(t) for t in (data / "repair-timing.txt").read_text().split()]
bx = json.loads((data / "bamx.json").read_text())
bx_fixed = json.loads((data / "bamx-fixed.json").read_text())
bx_diff = (data / "bamx.diff").read_text()

# labels for subworkflow steps, as named in the .ga (step 25 has no label; use its subworkflow name)
SUB = {"19": "Unstranded coverage", "20": "Stranded coverage", "24": "More QC", "25": "Process count files"}


def short(tool_id):
    return tool_id.split("/")[-2] if "/" in tool_id else tool_id


top, subs = OrderedDict(), OrderedDict()
for r in v["results"]:
    assert r["status"] == "ok", r
    step = r["step"]
    if "." in step:
        key = step.split(".")[0]
        subs.setdefault(key, {"name": SUB[key], "qty": 0})["qty"] += 1
    else:
        key = (short(r["tool_id"]), r["version"])
        top.setdefault(key, {"tool": key[0], "version": key[1], "qty": 0})["qty"] += 1

s, c = v["summary"], v["connection_report"]["summary"]
assert f"Tool state: {s['ok']} validated, {s['skip']} skipped" in txt
assert f"{c['ok']} ok, {c['invalid']} invalid, {c['skip']} skip" in txt
conns = [x for sr in v["connection_report"]["step_results"] for x in sr["connections"]]
assert len(conns) == c["ok"]
mapped = [x for x in conns if x["mapping"]]
reductions = [x for x in conns if x["reduction"]]
fastp = next(x for x in conns if x["target_step"] == "12" and x["target_input"].endswith("paired_input"))
src = next(sr for sr in v["connection_report"]["step_results"] if sr["step"] == fastp["source_step"])
src_type = src["resolved_outputs"][0]["collection_type"]

bad_param = next(r for r in vp["results"] if r["status"] == "fail")
param_msg = bad_param["errors"][0]
bad_conn = [x for sr in vc["connection_report"]["step_results"] for x in sr["connections"] if x["status"] == "invalid"]
root = next(x for x in bad_conn if x["source_step"] == "12")
conn_msg = root["errors"][0]
m = re.match(r'(.+?): Expected (.+), actual (.+)$', param_msg)
assert m, param_msg
cm = re.match(r"Incompatible types: (output is .+), (input expects .+)$", conn_msg)
assert cm, conn_msg
pe = re.search(r'"pe_parameters": \{"paired_end_status": "([A-Za-z_]+)"', raw_state)
assert pe and pe.group(1) == "PE_fragments"

# repair stub: the restored copy passes with the receipt's own totals
assert rep["summary"] == s and all(r["status"] == "ok" for r in rep["results"]), rep["summary"]
fc_fixed = next(r for r in rep["results"] if r["step"] == bad_param["step"])
# Format 2 slip: one planted select typo in chipseq-sr.gxwf.yml; the unplanted file passes full --strict
assert "<       format: BAM\n" in bx_diff and ">       format: BAMX\n" in bx_diff, bx_diff
bx_bad = [r for r in bx["results"] if r["status"] == "fail"]
assert len(bx_bad) == 1 and bx["summary"]["fail"] == 1, bx["summary"]
bx_lines = bx_bad[0]["errors"]
bx_alts = [re.match(r'format: Expected "([A-Z]+)", actual "BAMX"$', e) for e in bx_lines]
bx_named = [m.group(1) for m in bx_alts if m]
assert bx_named == ["BAM", "BAMPE", "BED"], bx_lines
assert bx_fixed["summary"]["fail"] == 0 and bx_fixed["connection_report"]["summary"]["invalid"] == 0

out = {
    "cli": meta["cli"], "iwc": meta["iwc"], "node": meta["node"], "date": meta["date"],
    "tools": list(top.values()),
    "subworkflows": list(subs.values()),
    "tool_state": s,
    "connections": c,
    "mapped": len(mapped),
    "map_example": {"from": src_type, "mapping": fastp["mapping"]},
    "reductions": len(reductions),
    "reduction_targets": sorted({x["target_step"] for x in reductions}),
    "wall_s": {"min": min(times), "max": max(times), "n": len(times)},
    "void_param": {"tool": short(bad_param["tool_id"]), "step": bad_param["step"],
                   "path": m.group(1), "expected": m.group(2), "actual": m.group(3), "message": param_msg,
                   "summary": vp["summary"]},
    "void_conn": {"target": root["target_input"], "source_output": root["source_output"],
                  "out": cm.group(1), "inp": cm.group(2), "message": conn_msg,
                  "downstream": len(bad_conn) - 1},
    "iwc_tree": {"workflows": tree["workflows"], "ok": tree["summary"]["ok"], "fail": tree["summary"]["fail"],
                 "skip": tree["summary"]["skip"], "errors": tree["errors"]},
    "repair": {"tool": short(fc_fixed["tool_id"]), "status": fc_fixed["status"], "summary": rep["summary"],
               "wall_s": {"min": min(rep_times), "max": max(rep_times), "n": len(rep_times)}},
    "bamx": {"tool": short(bx_bad[0]["tool_id"]), "step": bx_bad[0]["step"], "named": bx_named,
             "extra": len(bx_lines) - len(bx_named), "summary": bx["summary"],
             "fixed": bx_fixed["summary"], "fixed_conn": bx_fixed["connection_report"]["summary"]},
    "raw_state_len": len(raw_state),
    "raw_state_head": raw_state[:60],
}
assert sum(t["qty"] for t in out["tools"]) + sum(x["qty"] for x in out["subworkflows"]) == s["ok"]
(here / "receipt.json").write_text(json.dumps(out, indent=2) + "\n")
print(f"receipt.json: {len(out['tools'])} tool lines, {len(out['subworkflows'])} subworkflows, "
      f"state {s}, connections {c}, mapped {len(mapped)}, reductions {len(reductions)}")
