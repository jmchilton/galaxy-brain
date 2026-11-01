# /// script
# dependencies = ["pyyaml"]
# ///
"""Write route.json: both runs' phase lists and test outcomes, plus the DengueSeq draft graph at two commits."""
import json
import os
import re
import subprocess
from pathlib import Path

import yaml

here = Path(__file__).resolve().parent
runs = Path(os.environ.get("FOUNDRY_RUNS", Path.home() / "projects/foundry-runs"))
DENV = runs / "dengueseq-denv3"
BAC = runs / "bacass-sr-assembly"
SNAPSHOTS = {"draft": ("daf2928", "galaxy-workflow-draft.gxwf.yml"), "promoted": ("b82fa5e", "galaxy-workflow.gxwf.yml")}


def phases(path):
    rec = yaml.safe_load(path.read_text())
    out = [{"n": p["n"], "name": p.get("skill") or p.get("pattern"), "iterations": p.get("iterations")} for p in rec["phases"]]
    assert all(p["status"] == "done" for p in rec["phases"]), path
    return {"pipeline": rec["pipeline"], "phases": out}


def has_todo(v):
    return "TODO" in json.dumps(v)


def graph(sha, file):
    wf = yaml.safe_load(subprocess.check_output(["git", "-C", str(DENV / "dengueseq-denv3-galaxy"), "show", f"{sha}:./{file}"]))
    steps = []
    for name, s in wf["steps"].items():
        core = {k: v for k, v in s.items() if not k.startswith("_plan")}
        srcs = [v for v in (s.get("in") or {}).values() if isinstance(v, str) and "/" in v]
        steps.append({"id": name, "concrete": not has_todo(core), "from": sorted({v.split("/")[0] for v in srcs})})
    return {"sha": sha, "class": wf["class"], "steps": steps}


def debug_class(path):
    m = re.search(r"^classification: (.+)$", path.read_text(), re.M)
    return m.group(1).strip() if m else None


def test(run_dir):
    r = json.loads((run_dir / "workflow-test-result.json").read_text())
    s = r["planemo"]["summary"]  # the two runs' planemo summaries use different key sets
    v = json.loads((run_dir / "galaxy-workflow-validation-result.json").read_text())
    return {"validate": v["status"], "status": r["status"], "num_tests": s.get("num_tests", s.get("total")),
            "num_failures": s.get("num_failures", s.get("failed")), "not_run": len(r.get("tests_not_run", []))}


route = {
    "denv": {"brief": phases(DENV / "dengueseq-denv3-brief/foundry-run.yml"),
             "galaxy": phases(DENV / "dengueseq-denv3-galaxy/foundry-run.yml"),
             "test": test(DENV / "dengueseq-denv3-galaxy")},
    "bacass": {"brief": phases(BAC / "bacass-sr-assembly-brief/foundry-run.yml"),
               "galaxy": phases(BAC / "bacass-sr-assembly-galaxy/foundry-run.yml"),
               "test": test(BAC / "bacass-sr-assembly-galaxy"),
               "debug": debug_class(BAC / "bacass-sr-assembly-galaxy/workflow-debug-report.md")},
    "graphs": {k: graph(*v) for k, v in SNAPSHOTS.items()},
}
assert [p["name"] for p in route["denv"]["galaxy"]["phases"]] == [p["name"] for p in route["bacass"]["galaxy"]["phases"]]
(here / "route.json").write_text(json.dumps(route, indent=1) + "\n")
print("wrote route.json:", len(route["denv"]["galaxy"]["phases"]), "shared phases;",
      sum(s["concrete"] for s in route["graphs"]["draft"]["steps"]), "concrete at", SNAPSHOTS["draft"][0])
