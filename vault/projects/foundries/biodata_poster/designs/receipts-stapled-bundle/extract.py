# /// script
# dependencies = ["pyyaml"]
# ///
"""Write receipt.json for the three stapled slips: draft burn-down (gxwf replay), open-requirements ledger, evidence tally.

Each section is refreshed only when its sources exist; otherwise the committed section is kept.
"""
import json
import os
import subprocess
import sys
import tempfile
from collections import Counter
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
RUNS = Path(os.environ.get("FOUNDRY_RUNS", Path.home() / "projects/foundry-runs"))
RUN = RUNS / "dengueseq-denv3/dengueseq-denv3-galaxy"
DEPS = Path(os.environ.get("POSTER_DEPS", "/private/tmp/claude-503/receipts-stapled-bundle-deps"))
GXWF = Path(os.environ.get("GXWF", DEPS / "node_modules/.bin/gxwf"))
FOUNDRY = Path(os.environ.get("FOUNDRY_REPO", Path.home() / "projects/repositories/foundry"))
FOUNDRY_REF = os.environ.get("FOUNDRY_REF", "origin/main")
CASTS = "casts/claude/skills"
DRAFT = "galaxy-workflow-draft.gxwf.yml"
FINAL = "galaxy-workflow.gxwf.yml"
LEDGER = "open-requirements.ledger.yml"


def git(repo, *args):
    return subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True, text=True).stdout


def gx(*args):
    return json.loads(subprocess.run([str(GXWF), *args], check=True, capture_output=True, text=True).stdout)


def steps_of(wf):
    s = wf.get("steps") or {}
    return dict(s) if isinstance(s, dict) else {v.get("id") or v.get("label"): v for v in s}


def has_todo(node):
    if isinstance(node, str):
        return node.startswith("TODO")
    if isinstance(node, dict):
        return any(has_todo(k) or has_todo(v) for k, v in node.items())
    if isinstance(node, list):
        return any(has_todo(v) for v in node)
    return False


def drafty(step):
    core = {k: step.get(k) for k in ("tool_id", "tool_version", "in", "out")}
    return any(k.startswith("_plan_") for k in step) or has_todo(core)


def tool_of(step):
    parts = (step.get("tool_id") or "").split("/")
    return {"tool": parts[4] if len(parts) > 4 else parts[-1], "version": step.get("tool_version")}


def draft_series():
    """Replay draft-validate over every draft commit (same predicate as known-unknowns-receipt)."""
    log = git(RUN, "log", "--reverse", "--format=%H|%aI|%s", "--", DRAFT).strip().splitlines()
    rows, prev = [], None
    with tempfile.TemporaryDirectory() as tmp:
        for line in log:
            sha, at, subject = line.split("|", 2)
            text = git(RUN, "show", f"{sha}:./{DRAFT}")
            f = Path(tmp) / f"{sha[:7]}.gxwf.yml"
            f.write_text(text)
            steps = steps_of(yaml.safe_load(text))
            open_steps = sorted(k for k, v in steps.items() if drafty(v))
            val = gx("draft-validate", "--json", "--concrete", "--connections", "--cache-dir", str(DEPS / "toolcache"), str(f))
            survey = val["survey"]
            gx_open = sorted({p[0] for p in survey["todo_paths"]} | {p[0] for p in survey["plan_step_paths"]})
            assert gx_open == open_steps, (sha, gx_open, open_steps)
            ts = val["concrete"]["tool_state"]["summary"]
            conn = val["concrete"]["connection_report"]["valid"]
            resolved = sorted(set(prev) - set(open_steps)) if prev is not None else []
            rows.append({
                "sha": sha[:7], "at": at, "subject": subject, "todo": survey["todo_count"],
                "n_steps": len(steps), "ts_ok": ts["ok"],
                "valid": bool(val["ok"] and val["concrete"]["ok"] and conn and ts["fail"] == 0 and ts["skip"] == 0),
                "resolved": [dict(step=s, **tool_of(steps[s])) for s in resolved],
            })
            prev = open_steps
    final_sha = git(RUN, "log", "-1", "--format=%h", "--", FINAL).strip()
    first = yaml.safe_load(git(RUN, "show", f"{log[0].split('|')[0]}:./{DRAFT}"))
    return {
        "run": RUN.name, "gxwf": subprocess.run([str(GXWF), "--version"], capture_output=True, text=True).stdout.strip(),
        "commits": rows, "all_valid": all(r["valid"] for r in rows),
        "promoted": {"sha": final_sha, "from": first["class"],
                     "to": yaml.safe_load(git(RUN, "show", f"{final_sha}:./{FINAL}"))["class"]},
    }


def ledger():
    """`entries:` of the run's open-requirements ledger at HEAD; ledger history vs the test commit."""
    doc = yaml.safe_load(git(RUN, "show", f"HEAD:./{LEDGER}"))
    entries = doc["entries"]
    opened = [e for e in entries if e["status"] != "resolved"]
    last = git(RUN, "log", "-1", "--format=%h|%s", "--", LEDGER).strip().split("|", 1)
    test_commit = git(RUN, "log", "-1", "--format=%h", "--grep=^phase 10:").strip()
    # the ledger was not touched by the test phase or after it
    assert subprocess.run(["git", "-C", str(RUN), "merge-base", "--is-ancestor", last[0], test_commit]).returncode == 0
    assert not git(RUN, "log", "--format=%h", f"{test_commit}~1..HEAD", "--", LEDGER).strip()
    test = json.loads(git(RUN, "show", "HEAD:./workflow-test-result.json"))
    val = json.loads(git(RUN, "show", "HEAD:./galaxy-workflow-validation-result.json"))
    return {
        "entries": len(entries),
        "statuses": dict(Counter(e["status"] for e in entries)),
        "open": [{"id": e["id"], "kind": e.get("kind", "gap")} for e in opened],
        "dropped": sum(e.get("kind") == "dropped" for e in opened),
        "last_changed": {"sha": last[0], "subject": last[1]},
        "test_commit": test_commit,
        "planemo": {"status": test["status"], "version": test["planemo"]["version"], **test["planemo"]["summary"]},
        "validate": {"status": val["status"], "package": val["gxwf_package"].split(" (")[0], **val["summary"]["tool_state"]},
    }


def tally():
    """Evidence/load/mode counts over every Mold cast's _provenance.json."""
    sha = git(FOUNDRY, "rev-parse", FOUNDRY_REF).strip()
    tree = git(FOUNDRY, "ls-tree", "-r", "--name-only", FOUNDRY_REF, CASTS).split()
    skills = sorted({p.split("/")[3] for p in tree if p.endswith("/_provenance.json")})
    c = {k: Counter() for k in ("evidence", "load", "mode")}
    total = hyp_companion_no_verif = 0
    for s in skills:
        for r in json.loads(git(FOUNDRY, "show", f"{FOUNDRY_REF}:{CASTS}/{s}/_provenance.json")).get("refs", []):
            total += 1
            for k in c:
                c[k][r.get(k)] += 1
            if r.get("evidence") == "hypothesis" and not r.get("verification"):
                assert r.get("companion_of"), (s, r["ref"])  # only companion files may omit it
                hyp_companion_no_verif += 1
            if r.get("load") == "on-demand":
                assert r.get("trigger"), (s, r["ref"])
    return {
        "sha": sha[:8], "date": git(FOUNDRY, "log", "-1", "--format=%cs", FOUNDRY_REF).strip(),
        "cast_dirs": len({p.split("/")[3] for p in tree}), "skills": len(skills), "citations": total,
        **{k: dict(v.most_common()) for k, v in c.items()},
        "hypothesis_companions_without_verification": hyp_companion_no_verif,
    }


def main():
    out = HERE / "receipt.json"
    data = json.loads(out.read_text()) if out.exists() else {}
    if GXWF.exists() and RUN.is_dir():
        data["draft"] = draft_series()
    else:
        print(f"gxwf ({GXWF}) or run dir missing; keeping committed draft section", file=sys.stderr)
    if RUN.is_dir():
        data["ledger"] = ledger()
    if (FOUNDRY / ".git").exists():
        data["tally"] = tally()
    missing = {"draft", "ledger", "tally"} - set(data)
    if missing:
        sys.exit(f"receipt.json lacks {sorted(missing)} and its sources are unavailable")
    out.write_text(json.dumps(data, indent=1) + "\n")
    d, l, t = data["draft"], data["ledger"], data["tally"]
    print("draft", [c["todo"] for c in d["commits"]], d["all_valid"], d["promoted"])
    print("ledger", l["entries"], l["statuses"], l["dropped"], [o["id"] for o in l["open"]], l["last_changed"])
    print("tally", t["sha"], t["skills"], t["citations"], t["evidence"], t["load"], t["mode"])


main()
