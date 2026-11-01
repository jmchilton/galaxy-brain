# /// script
# dependencies = ["pyyaml"]
# ///
"""Write receipt.json from one real run dir and the foundry casts (both read-only, via git show)."""
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import yaml

RUN = Path(os.environ.get("FOUNDRY_RUNS", Path.home() / "projects/foundry-runs")) / "dengueseq-denv3/dengueseq-denv3-galaxy"
REPO = Path(os.environ.get("FOUNDRY_REPO", Path.home() / "projects/repositories/foundry"))
REF = os.environ.get("FOUNDRY_REF", "origin/main")
DEPS = Path(os.environ.get("POSTER_DEPS", "/private/tmp/claude-503/receipts-bill-of-skills-deps"))
STUB = "discover-shed-tool"
CASTS = "casts/claude/skills"
LEDGER_ID = "discovery-alternates-require-full-pin"


def git(repo, *args):
    return subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True, text=True).stdout


def ts(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(timezone.utc)


def hm(t):
    return t.strftime("%H:%M")


# ---------- the bill: foundry-run.yml ----------
run = yaml.safe_load(git(RUN, "show", "HEAD:./foundry-run.yml"))
start, finish = ts(run["started_at"]), ts(run["finished_at"])
commits = {}
for line in git(RUN, "log", "--reverse", "--format=%H|%aI|%s").splitlines():
    sha, at, subject = line.split("|", 2)
    commits.setdefault(subject.split(":")[0], (sha[:7], ts(at)))  # "phase 5 step 1" etc.
phases, prev = [], start
for p in run["phases"]:
    end = max(ts(a["at"]) for a in p["artifacts"])
    key = f"phase {p['n']}" if p["n"] != 5 else f"phase 5 step {p['iterations']}"
    sha, cat = commits[key]
    assert abs((cat - end).total_seconds()) < 120, (p["n"], cat, end)  # run record agrees with git
    phases.append({
        "n": p["n"], "kind": p["kind"], "skill": p.get("skill"), "pattern": p.get("pattern"),
        "selected": p.get("selected"), "iterations": p.get("iterations"), "status": p["status"],
        "start": prev.isoformat(), "end": end.isoformat(), "end_hm": hm(end),
        "minutes": round((end - prev).total_seconds() / 60, 1), "commit": sha,
    })
    prev = end
assert prev == finish, (prev, finish)
skills = [p["skill"] or p["selected"] for p in phases]

# ---------- subtotals: what gxwf and Planemo wrote in this run ----------
val = json.loads((RUN / "galaxy-workflow-validation-result.json").read_text())
test = json.loads((RUN / "workflow-test-result.json").read_text())

# ---------- tear-off 1: one galaxy-tool-pin.json per phase-5 iteration ----------
wf = yaml.safe_load((RUN / "galaxy-workflow.gxwf.yml").read_text())
wf_cs = {s["tool_id"].split("/")[-2]: s["tool_shed_repository"]["changeset_revision"]
         for s in wf["steps"].values() if "tool_shed_repository" in s}
pins = []
for line in git(RUN, "log", "--reverse", "--format=%h|%s", "--", "galaxy-tool-pin.json").splitlines():
    sha, subject = line.split("|", 1)
    d = json.loads(git(RUN, "show", f"{sha}:./galaxy-tool-pin.json"))
    c = d["candidate"]
    assert wf_cs[c["tool_id"]] == c["changeset_revision"], c  # the workflow carries the pinned changeset
    pins.append({"commit": sha, "subject": subject, "status": d["status"], "owner": c["owner"], "repo": c["repo"],
                 "tool_id": c["tool_id"], "version": c["version"], "changeset": c["changeset_revision"],
                 "score": c["score"], "alternates": len(d.get("alternates", []))})
assert len(pins) == phases[4]["iterations"] == len(wf_cs), (len(pins), len(wf_cs))

# ---------- the run's own feedback ledger: which skill revision it ran ----------
fb = yaml.safe_load((RUN / "foundry-feedback.ledger.yml").read_text())
entries = fb.get("entries") or fb.get("feedback") or []
fe = next(e for e in entries if e.get("id") == LEDGER_ID)
seen = {"id": fe["id"], "status": fe["status"], "evidence": fe["evidence"],
        "mold": fe["observed_in"]["mold"], "revision": fe["observed_in"]["revision"],
        "content_hash": fe["observed_in"]["content_hash"], "foundry_head": fe["observed_in"]["foundry_head"],
        "schema": fe["subject"]["label"], "schema_hash": fe["subject"]["content_hash"]}

# ---------- tear-off 2: the build receipt of the skill that pinned them ----------
sha = git(REPO, "rev-parse", REF).strip()
date = git(REPO, "log", "-1", "--format=%cs", REF).strip()
show = lambda p: json.loads(git(REPO, "show", f"{REF}:{p}"))
prov = show(f"{CASTS}/{STUB}/_provenance.json")
ver = show(f"{CASTS}/{STUB}/_verify.json")
req = show(f"{CASTS}/{STUB}/_required_tools.json")
tree = set(git(REPO, "ls-tree", "-r", "--name-only", REF, CASTS).split())
missing = [s for s in skills if f"{CASTS}/{s}/_provenance.json" not in tree]
assert not missing, f"bill lines without a cast build receipt: {missing}"  # footer claim
v = next(e for e in ver["entries"] if e["artifact_id"] == "galaxy-tool-pin")
schema = v["args"][v["args"].index("--schema-sha256") + 1]
assert (RUN / v["default_filename"]).exists()
assert seen["mold"] == STUB and seen["revision"] == prov["mold"]["revision"]
assert seen["content_hash"] == prov["mold"]["content_hash"] and seen["schema_hash"] == schema
up = sum(r["load"] == "upfront" for r in prov["refs"])
cast_changed = ts(git(REPO, "log", "-1", "--format=%cI", REF, "--", f"{CASTS}/{STUB}").strip())
# the cast as it stood when the run started: same Mold source, possibly an older compile
then = git(REPO, "log", "-1", "--format=%h", f"--before={start.isoformat()}", REF, "--", f"{CASTS}/{STUB}").strip()
prov_then = json.loads(git(REPO, "show", f"{then}:{CASTS}/{STUB}/_provenance.json"))
ver_then = json.loads(git(REPO, "show", f"{then}:{CASTS}/{STUB}/_verify.json"))
assert (prov_then["mold"]["revision"], prov_then["mold"]["content_hash"]) == (prov["mold"]["revision"], prov["mold"]["content_hash"])
cast_then = {"commit": then, "cast_at": prov_then["cast_at"],
             "verify_args": next(e for e in ver_then["entries"] if e["artifact_id"] == "galaxy-tool-pin")["args"]}

# ---------- optional replays (README only, not printed): gxwf 1.15.0 and the pin validator ----------
replay = {}
gxwf, foundry = DEPS / "node_modules/.bin/gxwf", DEPS / "node_modules/.bin/foundry"
if gxwf.exists():
    r = subprocess.run([str(gxwf), "validate", "--json", "--connections", "--strict", "--cache-dir",
                        str(DEPS / "toolcache"), str(RUN / "galaxy-workflow.gxwf.yml")], capture_output=True, text=True)
    j = json.loads(r.stdout)
    replay["gxwf"] = {"version": subprocess.run([str(gxwf), "--version"], capture_output=True, text=True).stdout.strip(),
                      "tool_state": j["summary"], "connections": j["connection_report"]["summary"],
                      "connections_valid": j["connection_report"]["valid"]}
if foundry.exists():
    tmp = DEPS / "pins"
    tmp.mkdir(parents=True, exist_ok=True)
    out = []
    for p in pins:
        f = tmp / f"{p['commit']}.json"
        f.write_text(git(RUN, "show", f"{p['commit']}:./galaxy-tool-pin.json"))
        r = subprocess.run([str(foundry), "validate-galaxy-tool-discovery", "--schema-sha256", schema, str(f)],
                           capture_output=True, text=True)
        out.append({"commit": p["commit"], "tool_id": p["tool_id"], "exit": r.returncode,
                    "result": (r.stdout + r.stderr).strip().splitlines()[-1].split(": ", 1)[-1]})
    replay["pins"] = {"validator": "@galaxy-foundry/gxwf-foundry (deps dir)", "results": out}

data = {
    "run": {"dir": str(RUN.relative_to(Path.home())), "head": git(RUN, "rev-parse", "--short", "HEAD").strip(),
            "pipeline": run["pipeline"], "slug": run["run_slug"], "status": run["status"],
            "started": start.isoformat(), "finished": finish.isoformat(), "start_hm": hm(start), "finish_hm": hm(finish), "finish_md": finish.strftime("%m-%d"),
            "date": start.strftime("%Y-%m-%d"), "minutes": round((finish - start).total_seconds() / 60, 1)},
    "phases": phases,
    "validation": {"command": val["command"], "package": val["gxwf_package"], "status": val["status"], **val["summary"]},
    "test": {"status": test["status"], "planemo": test["planemo"]["version"], "exit": test["planemo"]["exit_code"],
             **test["planemo"]["summary"], "tool_staging": test["galaxy"]["tool_staging"]},
    "pins": pins,
    "feedback": seen,
    "foundry": {"sha": sha, "short": sha[:8], "date": date},
    "stub": {"skill": STUB, "revision": prov["mold"]["revision"], "content_hash": prov["mold"]["content_hash"],
             "cast_at": prov["cast_at"], "cast_changed": cast_changed.isoformat(), "cast_at_run_start": cast_then, "cast_target": prov["cast_target"], "refs": len(prov["refs"]), "upfront": up,
             "requires": f"{req[0]['tool']} {req[0]['package_version']}",
             "verify_artifact": v["default_filename"], "verify_id": v["artifact_id"], "schema": schema},
    "replay": replay,
}
Path(__file__).with_name("receipt.json").write_text(json.dumps(data, indent=1) + "\n")
print(f"receipt.json: {run['run_slug']} {len(phases)} phases {data['run']['minutes']} min; {len(pins)} pins;",
      f"stub {STUB} rev {prov['mold']['revision']} {prov['mold']['content_hash'][:8]} @ {sha[:8]};",
      "pin replay:", [r["exit"] for r in replay.get("pins", {}).get("results", [])])
