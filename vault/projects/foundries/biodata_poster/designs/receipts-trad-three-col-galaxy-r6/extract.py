# /// script
# dependencies = ["pyyaml"]
# ///
"""Write receipts.json (four receipts, the route diagram, drift, recast and corpus rows) from the run records, the foundry clone and data/ (read-only)."""
import json
import os
import re
import subprocess
from datetime import datetime
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
FOUNDRY = Path(os.environ.get("FOUNDRY_REPO", Path.home() / "projects/repositories/foundry"))
FOUNDRY_REF = os.environ.get("FOUNDRY_REF", "eb2de3f1")
RUN = Path(os.environ.get("RUN_DIR", Path.home() / "projects/foundry-runs/dengueseq-denv3/dengueseq-denv3-galaxy"))
PLANEMO_LOG = RUN.parent / "_scratch/planemo/planemo.log"
SESSION_LOG = RUN.parent / "_logs/galaxy.jsonl"
SKILL = "discover-shed-tool"
CAST_DIR = f"casts/claude/skills/{SKILL}"
DATA = HERE / "data"


def git(repo, *args):
    return subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True, text=True).stdout


def run_file(name, ref="HEAD"):
    return git(RUN, "show", f"{ref}:./{name}")


def utc(ts):
    return datetime.fromisoformat(ts.replace("Z", "+00:00")).strftime("%H:%M")


# ---------- CAST: the skill binary the run used ----------
prov = json.loads(git(FOUNDRY, "show", f"{FOUNDRY_REF}:{CAST_DIR}/_provenance.json"))
verify = json.loads(git(FOUNDRY, "show", f"{FOUNDRY_REF}:{CAST_DIR}/_verify.json"))["entries"][0]
cast_cmd = json.loads(git(FOUNDRY, "show", f"{FOUNDRY_REF}:package.json"))["scripts"]["cast"]
cast_src = git(FOUNDRY, "show", f"{FOUNDRY_REF}:packages/build-cli/src/commands/cast-mold.ts")
assert "foundry-build.ts cast" in cast_cmd and "there is no LLM phase" in cast_src
feedback = yaml.safe_load(run_file("foundry-feedback.ledger.yml"))
used = {(e["observed_in"]["revision"], e["observed_in"]["content_hash"])
        for e in feedback["entries"] if (e.get("observed_in") or {}).get("mold") == SKILL}
assert used == {(prov["mold"]["revision"], prov["mold"]["content_hash"])}, used  # run used this exact cast
refs = prov["refs"]
cast = {
    "skill": SKILL,
    "foundry": git(FOUNDRY, "rev-parse", "--short=8", FOUNDRY_REF).strip(),
    "revision": prov["mold"]["revision"],
    "hash": prov["mold"]["content_hash"][:8],
    "cast_at": prov["cast_at"][:10],
    "refs": len(refs),
    "upfront": sum(r["load"] == "upfront" for r in refs),
    "verify_file": verify["default_filename"],
    "verify_schema": verify["args"][verify["args"].index("--schema-sha256") + 1][:8],
    "signed": "foundry-build cast",
}

# ---------- run record: phases and times ----------
record = yaml.safe_load(run_file("foundry-run.yml"))
phase = {p["n"]: p for p in record["phases"]}
assert phase[5]["skill"] == "advance-galaxy-draft-step" and phase[9]["skill"] == "validate-galaxy-workflow"
assert phase[10]["skill"] == "run-workflow-test" and record["status"] == "complete"
p5 = [a["at"] for a in phase[5]["artifacts"] if a["id"] == "galaxy-tool-pin"]

# ---------- PINNED: changesets in the final workflow ----------
wf = yaml.safe_load(run_file("galaxy-workflow.gxwf.yml"))
pins = []
for label, s in wf["steps"].items():
    if "tool_id" not in s:
        continue
    tsr = s["tool_shed_repository"]
    tool = s["tool_id"].split("/")[-2]
    pins.append({"step": label, "owner": tsr["owner"], "repo": tsr["name"], "tool": tool,
                 "version": s["tool_version"], "changeset": tsr["changeset_revision"]})
assert len(pins) == 7
# each phase-5 iteration's galaxy-tool-pin.json names the same changeset
pin_files = {}
for sha in git(RUN, "log", "--reverse", "--format=%h", "--", "galaxy-tool-pin.json").split():
    c = json.loads(run_file("galaxy-tool-pin.json", sha))["candidate"]
    pin_files[(c["owner"], c["tool_id"], c["version"])] = c["changeset_revision"]
for p in pins:
    assert pin_files[(p["owner"], p["tool"], p["version"])] == p["changeset"], p
# the run's own gxwf tool-revisions output (session log) printed each changeset
printed = set()
calls = set()
for line in SESSION_LOG.read_text().splitlines():
    ev = json.loads(line)
    for c in (ev.get("message") or {}).get("content") or []:
        if not isinstance(c, dict):
            continue
        if c.get("type") == "tool_use" and "gxwf tool-revisions" in str((c.get("input") or {}).get("command", "")):
            calls.add(c["id"])
        if c.get("type") == "tool_result" and c.get("tool_use_id") in calls:
            body = c["content"] if isinstance(c["content"], str) else "".join(x.get("text", "") for x in c["content"])
            printed |= set(re.findall(r'"changesetRevision": "([0-9a-f]{12})"', body))
            printed |= set(re.findall(r"^([0-9a-f]{12})\t", body, re.M))
missing = [p["changeset"] for p in pins if p["changeset"] not in printed]
assert not missing, f"not in the run's tool-revisions output: {missing}"
# Galaxy's installer cloned exactly these changesets during planemo test
log = PLANEMO_LOG.read_text()
installed = re.findall(r"Cloning repository 'https://toolshed\.g2\.bx\.psu\.edu/repos/([^/]+)/([^']+)' at \d+:([0-9a-f]{12})", log)
assert sorted(installed) == sorted((p["owner"], p["repo"], p["changeset"]) for p in pins), installed
pinned = {"pins": pins, "from": utc(min(p5)), "to": utc(max(p5)), "date": p5[0][:10],
          "signed": "gxwf tool-revisions"}

# ---------- VALIDATED: replay of phase 9 ----------
val = json.loads((DATA / "validate.json").read_text())
meta = dict(ln.split("=", 1) for ln in (DATA / "run-meta.txt").read_text().split())
times = [float(t) for t in (DATA / "timing.txt").read_text().split()]
recorded = json.loads(run_file("galaxy-workflow-validation-result.json"))
ts = val["summary"]
assert ts == recorded["summary"]["tool_state"] and val["connection_report"]["valid"] == recorded["summary"]["connections_valid"]
assert not val["structure_errors"] and not val["encoding_errors"]
tool_steps = [s for s in val["connection_report"]["step_results"] if s["step_type"] == "tool"]
validated = {
    "cli": meta["cli"], "replayed": meta["date"], "run_cli": "1.14.0",
    "at": utc(phase[9]["artifacts"][0]["at"]),
    "command": "gxwf validate --connections --strict --json",
    "tool_state": ts, "connections": val["connection_report"]["summary"],
    "map_over_list": sum(s["map_over"] == "list" for s in tool_steps), "tool_steps": len(tool_steps),
    "wall_min": min(times), "wall_max": max(times), "signed": "gxwf validate",
}
assert max(times) < 1.0

# ---------- TESTED: planemo's own JSON and Galaxy's log ----------
tto = json.loads(run_file("tool_test_output.json"))
t0 = tto["tests"][0]["data"]
jobs = [j for st in t0["invocation_details"]["steps"].values() for j in st.get("jobs") or []]
images = sorted(set(re.findall(r"quay\.io/biocontainers/[A-Za-z0-9._:/-]+", log)))
wtr = json.loads(run_file("workflow-test-result.json"))
# planemo version from the command the run actually executed (session log), not the agent's record
planemo_cmds = set(re.findall(r"uvx --from planemo==([0-9.]+) planemo test", SESSION_LOG.read_text()))
assert planemo_cmds == {wtr["planemo"]["version"]}, planemo_cmds
span = datetime.fromisoformat(t0["end_datetime"]) - datetime.fromisoformat(t0["start_datetime"])
tested = {
    "planemo": planemo_cmds.pop(),
    "at": utc(phase[10]["artifacts"][0]["at"]),
    "summary": tto["summary"], "status": t0["status"],
    "jobs": len(jobs), "jobs_ok": sum(j["state"] == "ok" for j in jobs),
    "installed": len(installed), "containers": len(images),
    "minutes": round(span.total_seconds() / 60), "tests_not_run": len(wtr["tests_not_run"]),
    "signed": "planemo test",
}
assert tested["summary"] == wtr["planemo"]["summary"] and tested["status"] == "success"

# ---------- ROUTE: the pipeline diagram, from the run records (no outcomes) ----------
def brief_run(path):
    rec = yaml.safe_load((Path(path) / "foundry-run.yml").read_text())
    return {"pipeline": rec["pipeline"], "skills": [p["skill"] for p in rec["phases"]]}


BRIEFS = {"paper": RUN.parent / "dengueseq-denv3-brief",
          "nextflow": Path(os.environ.get("NF_BRIEF_DIR", Path.home() / "projects/foundry-runs/bacass-sr-assembly/bacass-sr-assembly-brief"))}
lanes = {k: brief_run(v) for k, v in BRIEFS.items()}
assert lanes["paper"] == {"pipeline": "paper-to-workflow-brief", "skills": ["summarize-paper", "freeform-summary-to-workflow-brief"]}
assert lanes["nextflow"] == {"pipeline": "nextflow-to-workflow-brief", "skills": ["summarize-nextflow", "nextflow-summary-to-workflow-brief"]}
spine = [{"n": p["n"], "step": p.get("skill") or p.get("selected"), "iterations": p.get("iterations", 1)} for p in record["phases"]]
assert record["pipeline"] == "workflow-brief-to-galaxy" and len(spine) == 11 and spine[4]["iterations"] == 7
route = {"lanes": lanes, "spine_pipeline": record["pipeline"], "spine": spine}

# ---------- DRIFT: the Tool Shed's answer today for one pinned (tool, version) ----------
pin_trim = next(p for p in pins if p["tool"] == "ivar_trim")
today = json.loads((DATA / "tool-revisions/iuc~ivar_trim~ivar_trim.json").read_text())
assert today["version"] == pin_trim["version"]
drift = {"tool": pin_trim["tool"], "version": pin_trim["version"], "pinned": pin_trim["changeset"],
         "today": today["revisions"][-1]["changesetRevision"], "asked": meta["date"]}
assert drift["today"] != drift["pinned"]

# ---------- RECAST: one note, many skills (PR #701) and a hash change (73af1f62) ----------
pr701 = git(FOUNDRY, "show", "-m", "--first-parent", "--name-only", "--format=", "9adc20b7").split()
notes_701 = sorted({f for f in pr701 if f.startswith("content/research/")})
skills_701 = sorted({f.split("/")[3] for f in pr701 if f.startswith("casts/claude/skills/") and f.endswith("_provenance.json")})
assert notes_701 == ["content/research/planemo-asserts-idioms/index.md"] and len(skills_701) == 8, (notes_701, skills_701)
diff = git(FOUNDRY, "show", "73af1f62", "--", f"{CAST_DIR}/_provenance.json")
old_h, new_h = re.findall(r'^[-+]\s+"content_hash": "([0-9a-f]{8})', diff, re.M)
recast = {"note": "planemo-asserts-idioms", "skills": skills_701, "pr": 701,
          "commit": "73af1f62", "old": old_h, "new": new_h}

# ---------- CORPUS: one dated count set (raw-file definitions, r1 §1.1) ----------
CORPUS_REF = "bc79096"
ls = lambda *a: git(FOUNDRY, "ls-tree", *a).split("\n")
corpus = {"ref": CORPUS_REF, "date": "2026-10-24",
          "notes": sum(f.endswith(".md") for f in ls("-r", "--name-only", CORPUS_REF, "content")),
          "molds": len([x for x in ls("-d", "--name-only", CORPUS_REF, "content/molds/") if x]),
          "patterns": sum(f.endswith(".md") for f in ls("-r", "--name-only", CORPUS_REF, "content/patterns")),
          "skills": len([x for x in ls("-d", "--name-only", CORPUS_REF, "casts/claude/skills/") if x])}
assert (corpus["notes"], corpus["molds"], corpus["patterns"], corpus["skills"]) == (420, 56, 54, 69), corpus

out = {"run": record["run_slug"], "pipeline": record["pipeline"], "started": record["started_at"],
       "finished": record["finished_at"], "run_head": git(RUN, "rev-parse", "--short", "HEAD").strip(),
       "cast": cast, "pinned": pinned, "validated": validated, "tested": tested,
       "route": route, "drift": drift, "recast": recast, "corpus": corpus}
(HERE / "receipts.json").write_text(json.dumps(out, indent=1) + "\n")
print(f"receipts.json: cast rev {cast['revision']} {cast['hash']}; {len(pins)} pins; "
      f"tool state {ts}; connections {validated['connections']}; wall {min(times)}-{max(times)} s; "
      f"jobs {tested['jobs_ok']}/{tested['jobs']} ok; installed {tested['installed']}; containers {tested['containers']}")
