# /// script
# dependencies = ["pyyaml"]
# ///
"""Replay gxwf draft-validate / draft-next-step over each draft commit of two real runs -> receipt.json."""
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import yaml

RUNS = Path(os.environ.get("FOUNDRY_RUNS", Path.home() / "projects/foundry-runs"))
DEPS = Path(os.environ.get("POSTER_DEPS", "/private/tmp/claude-503/gxwf-gxwf-draft-format-deps"))
GXWF = Path(os.environ.get("GXWF", DEPS / "node_modules/.bin/gxwf"))
DRAFT = "galaxy-workflow-draft.gxwf.yml"
FINAL = "galaxy-workflow.gxwf.yml"
SERIES = {
    "denv": "dengueseq-denv3/dengueseq-denv3-galaxy",
    "bacass": "bacass-sr-assembly/bacass-sr-assembly-galaxy",
}


def git(repo, *args):
    return subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True, text=True).stdout


def gx(*args):
    out = subprocess.run([str(GXWF), *args], check=True, capture_output=True, text=True).stdout
    return json.loads(out)


def steps_of(wf):
    s = wf.get("steps") or {}
    if isinstance(s, dict):
        return {k: v for k, v in s.items()}
    return {v.get("id") or v.get("label"): v for v in s}


def has_todo(node):
    if isinstance(node, str):
        return node.startswith("TODO")
    if isinstance(node, dict):
        return any(has_todo(k) or has_todo(v) for k, v in node.items())
    if isinstance(node, list):
        return any(has_todo(v) for v in node)
    return False


def drafty(step):
    plan = any(k.startswith("_plan_") for k in step)
    core = {k: step.get(k) for k in ("tool_id", "tool_version", "in", "out")}
    return plan or has_todo(core)


def tool_of(step):
    parts = (step.get("tool_id") or "").split("/")
    name = parts[4] if len(parts) > 4 else parts[-1]
    cs = (step.get("tool_shed_repository") or {}).get("changeset_revision")
    return {"tool": name, "version": step.get("tool_version"), "changeset": cs}


def replay(key, rel, tmp):
    repo = RUNS / rel
    log = git(repo, "log", "--reverse", "--format=%H|%s", "--", DRAFT).strip().splitlines()
    rows, prev = [], None
    for line in log:
        sha, subject = line.split("|", 1)
        text = git(repo, "show", f"{sha}:./{DRAFT}")
        f = Path(tmp) / f"{key}-{sha[:7]}.gxwf.yml"
        f.write_text(text)
        steps = steps_of(yaml.safe_load(text))
        open_steps = sorted(k for k, v in steps.items() if drafty(v))
        args = ("draft-validate", "--json", "--concrete", "--connections", "--cache-dir", str(DEPS / "toolcache"), str(f))
        val = gx(*args)
        if val["concrete"]["tool_state"]["summary"]["skip"]:  # a cold-cache ToolShed fetch can skip a tool once
            val = gx(*args)
        nxt = gx("draft-next-step", str(f))
        survey = val["survey"]
        gx_open = sorted({p[0] for p in survey["todo_paths"]} | {p[0] for p in survey["plan_step_paths"]})
        assert gx_open == open_steps, (key, sha, gx_open, open_steps)  # YAML diff agrees with gxwf survey
        resolved = sorted(set(prev) - set(open_steps)) if prev is not None else []
        ts = val["concrete"]["tool_state"]["summary"]
        conn = val["concrete"]["connection_report"]["valid"]
        rows.append({
            "sha": sha[:7], "subject": subject,
            "todo": survey["todo_count"], "open_steps": len(open_steps), "n_steps": len(steps),
            "ok": val["ok"], "ts_ok": ts["ok"], "ts_fail": ts["fail"], "ts_skip": ts["skip"],
            "connections_valid": conn, "concrete_ok": val["concrete"]["ok"],
            # what the receipt prints as "ok": draft valid, concrete subset valid, no failed or skipped tools
            "valid": bool(val["ok"] and val["concrete"]["ok"] and conn and ts["fail"] == 0 and ts["skip"] == 0),
            "next": (nxt.get("step") or [None])[0] if nxt.get("draft") else None,
            "resolved": [dict(step=s, **tool_of(steps[s])) for s in resolved],
        })
        prev = open_steps
    final_sha = git(repo, "log", "-1", "--format=%h", "--", FINAL).strip()
    final_class = yaml.safe_load(git(repo, "show", f"{final_sha}:./{FINAL}"))["class"]
    draft_class = yaml.safe_load(git(repo, "show", f"{log[0].split('|')[0]}:./{DRAFT}"))["class"]
    return {"run": rel.split("/")[-1], "commits": rows, "all_valid": all(r["valid"] for r in rows),
            "promoted": {"sha": final_sha, "from": draft_class, "to": final_class, "file": FINAL}}


def main():
    if not GXWF.exists():
        sys.exit(f"gxwf not found at {GXWF}; npm i --prefix {DEPS} @galaxy-tool-util/cli@1.15.0")
    version = subprocess.run([str(GXWF), "--version"], capture_output=True, text=True).stdout.strip()
    with tempfile.TemporaryDirectory() as tmp:
        data = {"gxwf": version, "series": {k: replay(k, rel, tmp) for k, rel in SERIES.items()}}
    out = Path(__file__).with_name("receipt.json")
    out.write_text(json.dumps(data, indent=1) + "\n")
    for k, s in data["series"].items():
        print(k, [c["todo"] for c in s["commits"]], [c["ts_ok"] for c in s["commits"]],
              [r["step"] for c in s["commits"] for r in c["resolved"]], s["promoted"])


main()
