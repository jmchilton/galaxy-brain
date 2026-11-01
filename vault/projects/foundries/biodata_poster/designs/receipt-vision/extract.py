# /// script
# requires-python = ">=3.11"
# dependencies = ["pyyaml"]
# ///
"""Emit receipt.json for poster.typ from the real DengueSeq run files."""
import json
import re
import os
import sys
from pathlib import Path

import yaml

RUNS = Path(os.environ.get("FOUNDRY_RUNS", Path.home() / "projects/foundry-runs"))
RUN = RUNS / "dengueseq-denv3"
PLUGIN = "f275059e"  # cast snapshot named in the run's _logs/*.jsonl
SKILLS = RUNS / "_plugin" / PLUGIN / "casts/claude/skills"
OUT = Path(__file__).with_name("receipt.json")


def load_yaml(p):
    return yaml.safe_load(p.read_text())


def load_json(p):
    return json.loads(p.read_text())


def skill_prov(name):
    p = SKILLS / name / "_provenance.json"
    if not p.exists():
        return None
    d = load_json(p)
    srcs = {r["ref"] for r in d.get("refs", []) if r.get("ref")}
    return {
        "mold_rev": d["mold"]["revision"],
        "hash": d["mold"]["content_hash"][:8],
        "refs": len(srcs),
        "srcs": sorted(srcs),
    }


def phases(run_yml, pipe_label):
    d = load_yaml(run_yml)
    out = []
    for ph in d["phases"]:
        name = ph.get("skill") or ph.get("selected")
        prov = skill_prov(name)
        stamps = [a["at"] for a in ph.get("artifacts", []) if a.get("at")]
        out.append({
            "n": ph["n"],
            "pipeline": pipe_label,
            "kind": ph["kind"],
            "skill": name,
            "pattern": ph.get("pattern"),
            "status": ph["status"],
            "at": max(stamps) if stamps else None,
            "prov": prov,
        })
    return d, out


def main():
    if not RUN.exists():
        sys.exit(f"run dir not found: {RUN} (receipt.json left as is)")
    brief_dir = RUN / "dengueseq-denv3-brief"
    gx = RUN / "dengueseq-denv3-galaxy"
    brief_run, brief_phases = phases(brief_dir / "foundry-run.yml", "paper-to-workflow-brief")
    gx_run, gx_phases = phases(gx / "foundry-run.yml", "workflow-brief-to-galaxy")

    wf = load_yaml(gx / "galaxy-workflow.gxwf.yml")
    tools = []
    for label, s in wf["steps"].items():
        if not s.get("tool_id"):
            continue
        tsr = s.get("tool_shed_repository", {})
        tools.append({
            "step": label,
            "tool": s["tool_id"].split("/")[-2],
            "owner": tsr.get("owner"),
            "version": s["tool_version"],
            "changeset": tsr.get("changeset_revision"),
        })

    val = load_json(gx / "galaxy-workflow-validation-result.json")
    test = load_json(gx / "workflow-test-result.json")
    ledger = load_yaml(gx / "open-requirements.ledger.yml")
    entries = ledger["entries"]
    open_entries = [
        {"id": e["id"], "kind": e.get("kind", "open"), "step": e.get("step"),
         "unmet": e.get("unmet"), "because": e.get("because"), "missing": e.get("missing")}
        for e in entries if e["status"] == "open"
    ]
    all_srcs = sorted({s for p in brief_phases + gx_phases if p["prov"] for s in p["prov"]["srcs"]})
    for p in brief_phases + gx_phases:
        if p["prov"]:
            del p["prov"]["srcs"]

    review = (RUN / "review.md").read_text()
    brief_sha = re.search(r"sha256 after review: `([0-9a-f]{64})`", review).group(1)
    data = {
        "review": {"brief_sha": brief_sha[:8], "questions": 10, "edited": 1},
        "source": {
            "paper": "Vogels CBF et al. DengueSeq. BMC Genomics 25:433 (2024)",
            "doi": "10.1186/s12864-024-10350-x",
            "code": "grubaughlab/DENV_pipeline v1.0",
            "code_pin": "8214cfbb",
            "test_sample": "SRR25366733",
        },
        "plugin_snapshot": PLUGIN,
        "brief_run": {
            "pipeline": brief_run["pipeline"],
            "assembly": brief_run["assembly_sha256"][:8],
            "started": brief_run["started_at"],
            "finished": brief_run["finished_at"],
        },
        "galaxy_run": {
            "pipeline": gx_run["pipeline"],
            "assembly": gx_run["assembly_sha256"][:8],
            "started": gx_run["started_at"],
            "finished": gx_run["finished_at"],
        },
        "phases": brief_phases + gx_phases,
        "distinct_wiki_refs": len(all_srcs),
        "tools": tools,
        "outputs": list(wf["outputs"].keys()),
        "inputs": list(wf["inputs"].keys()),
        "gxwf": {
            "status": val["status"],
            "tool_state_ok": val["summary"]["tool_state"]["ok"],
            "tool_state_fail": val["summary"]["tool_state"]["fail"],
            "connections_valid": val["summary"]["connections_valid"],
            "package": val["gxwf_package"].split(" (")[0],
        },
        "planemo": {
            "status": test["status"],
            "version": test["planemo"]["version"],
            "tests": test["planemo"]["summary"]["num_tests"],
            "failures": test["planemo"]["summary"]["num_failures"],
            "jobs_ok": sum(1 for s in test["steps"] if s["job_state"] == "ok"),
            "galaxy_head": test["galaxy"]["galaxy_branch_note"].split()[-1][:8],
            "selected": test["tests_selected"][0].split()[0],
        },
        "ledger": {
            "total": len(entries),
            "resolved": sum(1 for e in entries if e["status"] == "resolved"),
            "open": open_entries,
            "decisions": len(ledger["decisions"]),
            "discoveries": len(ledger["discoveries"]),
        },
    }
    OUT.write_text(json.dumps(data, indent=2) + "\n")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
