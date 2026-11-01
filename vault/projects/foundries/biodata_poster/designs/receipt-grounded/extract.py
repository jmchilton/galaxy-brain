# /// script
# requires-python = ">=3.10"
# dependencies = ["pyyaml"]
# ///
"""Snapshot receipt data from local Foundry run dirs into data/*.json."""
import json
import sys
from datetime import datetime
from pathlib import Path

import yaml

RUNS = Path.home() / "projects" / "foundry-runs"
OUT = Path(__file__).resolve().parent / "data"

RECEIPTS = {
    "dengueseq": {
        "run_dirs": ["dengueseq-denv3/dengueseq-denv3-brief", "dengueseq-denv3/dengueseq-denv3-galaxy"],
        "plugin": "f275059e",
    },
    "bacass": {
        "run_dirs": ["bacass-sr-assembly/bacass-sr-assembly-brief", "bacass-sr-assembly/bacass-sr-assembly-galaxy"],
        "plugin": "b9c16bad",
    },
}


def load_yaml(p):
    return yaml.safe_load(p.read_text())


def ts(s):
    return datetime.fromisoformat(str(s).replace("Z", "+00:00"))


def mold_info(plugin, skill):
    prov = RUNS / "_plugin" / plugin / "casts" / "claude" / "skills" / skill / "_provenance.json"
    if not prov.exists():
        return None
    d = json.loads(prov.read_text())
    m = d.get("mold", {})
    return {
        "mold_revision": m.get("revision"),
        "mold_hash": (m.get("content_hash") or "")[:8],
        "refs": len(d.get("refs", [])),
        "cast_at": d.get("cast_at"),
    }


def stages(run_dirs, plugin):
    out = []
    timing = []
    for rd in run_dirs:
        rec = load_yaml(RUNS / rd / "foundry-run.yml")
        timing.append({
            "pipeline": rec["pipeline"],
            "started_at": rec["started_at"],
            "finished_at": rec["finished_at"],
            "minutes": round((ts(rec["finished_at"]) - ts(rec["started_at"])).total_seconds() / 60),
            "assembly_sha256": rec.get("assembly_sha256", "")[:8],
            "status": rec.get("status"),
        })
        for ph in rec["phases"]:
            skill = ph.get("skill") or ph.get("selected")
            out.append({
                "pipeline": rec["pipeline"],
                "kind": ph["kind"],
                "skill": skill,
                "status": ph["status"],
                "iterations": ph.get("iterations"),
                **(mold_info(plugin, skill) or {}),
            })
    return out, timing


def tool_pins(wf_path):
    wf = load_yaml(wf_path)
    steps = wf["steps"]
    items = steps.items() if isinstance(steps, dict) else ((s.get("label") or s.get("id"), s) for s in steps)
    pins = []
    for label, step in items:
        tsr = step.get("tool_shed_repository")
        if not tsr:
            if step.get("tool_id"):
                pins.append({"step": label, "tool": step["tool_id"], "version": step.get("tool_version"), "builtin": True})
            continue
        pins.append({
            "step": label,
            "tool": step["tool_id"].split("/")[-2],
            "version": step["tool_version"],
            "owner": tsr["owner"],
            "repo": tsr["name"],
            "changeset": tsr["changeset_revision"],
        })
    return pins


def ledger(path):
    d = load_yaml(path)
    ents = d["entries"]
    open_ = [
        {"id": e["id"], "kind": e.get("kind", "gap"), "step": e.get("step"), "unmet": e.get("unmet")}
        for e in ents if e.get("status") != "resolved"
    ]
    return {
        "entries": len(ents),
        "resolved": sum(1 for e in ents if e.get("status") == "resolved"),
        "open": len(open_),
        "dropped": sum(1 for e in open_ if e["kind"] == "dropped"),
        "decisions": len(d.get("decisions") or []),
        "discoveries": len(d.get("discoveries") or []),
        "open_entries": open_,
    }


def dengueseq():
    cfg = RECEIPTS["dengueseq"]
    g = RUNS / "dengueseq-denv3" / "dengueseq-denv3-galaxy"
    st, timing = stages(cfg["run_dirs"], cfg["plugin"])
    val = json.loads((g / "galaxy-workflow-validation-result.json").read_text())
    tr = json.loads((g / "workflow-test-result.json").read_text())
    return {
        "slug": "dengueseq-denv3",
        "plugin": cfg["plugin"],
        "stages": st,
        "timing": timing,
        "pins": tool_pins(g / "galaxy-workflow.gxwf.yml"),
        "validation": {
            "status": val["status"],
            "tool_state_ok": val["summary"]["tool_state"]["ok"],
            "tool_state_fail": val["summary"]["tool_state"]["fail"],
            "connections_valid": val["summary"]["connections_valid"],
        },
        "test": {
            "status": tr["status"],
            "planemo_version": tr["planemo"]["version"],
            "num_tests": tr["planemo"]["summary"]["num_tests"],
            "num_failures": tr["planemo"]["summary"]["num_failures"],
            "jobs_ok": sum(1 for s in tr["steps"] if s["job_state"] == "ok"),
            "jobs": len(tr["steps"]),
            "selected": tr["tests_selected"],
            "not_run": [n["case"] for n in tr.get("tests_not_run", [])],
        },
        "ledger": ledger(g / "open-requirements.ledger.yml"),
    }


def bacass():
    cfg = RECEIPTS["bacass"]
    g = RUNS / "bacass-sr-assembly" / "bacass-sr-assembly-galaxy"
    st, timing = stages(cfg["run_dirs"], cfg["plugin"])
    val = json.loads((g / "galaxy-workflow-validation-result.json").read_text())
    tr = json.loads((g / "workflow-test-result.json").read_text())
    dbg = (g / "workflow-debug-report.md").read_text().split("---")[1]
    dbg = yaml.safe_load(dbg)
    outputs = tr.get("output_results", {})
    return {
        "slug": "bacass-sr-assembly",
        "plugin": cfg["plugin"],
        "stages": st,
        "timing": timing,
        "pins": tool_pins(g / "galaxy-workflow.gxwf.yml"),
        "validation": {
            "status": val["status"],
            "tool_state_ok": val["summary"]["tool_state"]["ok"],
            "connections_ok": val["summary"]["connections"]["ok"],
            "connections_valid": val["summary"]["connections"]["valid"],
        },
        "test": {
            "status": tr["status"],
            "planemo_version": tr["planemo"]["version"],
            "total": tr["planemo"]["summary"]["total"],
            "passed": tr["planemo"]["summary"]["passed"],
            "failed": tr["planemo"]["summary"]["failed"],
            "jobs": tr["invocation"]["jobs"],
            "outputs": {k: v.get("result") for k, v in outputs.items()},
            "failed_assertion": next(
                (v.get("failed_assertion") for v in outputs.values() if v.get("result") == "fail"), None
            ),
            "failure_modality": tr["failure"]["modality"],
        },
        "debug": {"classification": dbg.get("classification"), "workflow_defect": dbg.get("workflow_defect")},
        "ledger": ledger(g / "open-requirements.ledger.yml"),
    }


def main():
    if not RUNS.exists():
        print(f"{RUNS} not found; keeping checked-in data/*.json", file=sys.stderr)
        return
    OUT.mkdir(exist_ok=True)
    for name, fn in (("dengueseq", dengueseq), ("bacass", bacass)):
        (OUT / f"{name}.json").write_text(json.dumps(fn(), indent=1) + "\n")
        print(f"wrote data/{name}.json")


if __name__ == "__main__":
    main()
