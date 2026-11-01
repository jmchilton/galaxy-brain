# /// script
# requires-python = ">=3.10"
# dependencies = ["pyyaml"]
# ///
"""Snapshot the DengueSeq run, review and foundry provenance into data/run.json + data/manifest.json.

Reads local run dirs and the foundry clone read-only. Fails if the run no longer says what the poster says.
"""
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
RUNS = Path(os.environ.get("FOUNDRY_RUNS", Path.home() / "projects/foundry-runs"))
FOUNDRY = Path(os.environ.get("FOUNDRY_REPO", Path.home() / "projects/repositories/foundry"))
PROJ = RUNS / "dengueseq-denv3"
BRIEF_DIR = PROJ / "dengueseq-denv3-brief"
GX_DIR = PROJ / "dengueseq-denv3-galaxy"
PLUGIN = RUNS / "_plugin/f275059e/casts/claude/skills"

BRIEF_PRE_REVIEW = "c7172f2"  # "run complete", before "review: expert edits"
BRIEF_REVIEWED = "6b8b630"
CAST = "f275059e"
RECOMPILE_1 = "73af1f62"
RECOMPILE_2 = "9adc20b7"  # merge of PR #701

manifest = []


def fail(msg):
    sys.exit(f"extract: {msg}")


def git(repo, *args):
    return subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True, check=True).stdout


def sha(data: bytes):
    return hashlib.sha256(data).hexdigest()


def note(path, what, rev=None, data=None):
    entry = {"source": str(path).replace(str(Path.home()), "~"), "used_for": what}
    if rev:
        entry["git"] = rev
    if data is not None:
        entry["sha256"] = sha(data)
    manifest.append(entry)


def read(path, what):
    data = Path(path).read_bytes()
    note(path, what, data=data)
    return data.decode()


def parse_open_questions(md):
    sec = md.split("### Open questions", 1)[1].split("\n### ", 1)[0]
    qs = []
    for line in sec.splitlines():
        if line.startswith("- "):
            qs.append({"question": line[2:].strip()})
        elif line.startswith("  - ") and qs:
            key, _, val = line[4:].partition(": ")
            qs[-1][key.strip().lower()] = val.strip()
    return qs


def main():
    # --- the ten questions: as proposed (pre-review) and as reviewed
    pre_md = git(BRIEF_DIR, "show", f"{BRIEF_PRE_REVIEW}:workflow-brief.md")
    note(BRIEF_DIR / "workflow-brief.md", "brief as proposed", rev=BRIEF_PRE_REVIEW, data=pre_md.encode())
    post_md = read(BRIEF_DIR / "workflow-brief.md", "brief as reviewed (ten open questions)")
    pre, post = parse_open_questions(pre_md), parse_open_questions(post_md)
    if len(pre) != 10 or len(post) != 10:
        fail(f"expected 10 open questions, got {len(pre)} / {len(post)}")
    review_iso = git(BRIEF_DIR, "log", "-1", "--format=%cI", BRIEF_REVIEWED).strip()
    reviewer = git(BRIEF_DIR, "log", "-1", "--format=%an", BRIEF_REVIEWED).strip()

    review_md = read(PROJ / "review.md", "review: reviewer, brief hash, 1 edited")
    m = re.search(r"sha256 after review: `([0-9a-f]{64})`", review_md)
    if not m or m.group(1) != sha(post_md.encode()):
        fail("review.md brief hash no longer matches workflow-brief.md")

    ledger = yaml.safe_load(read(GX_DIR / "open-requirements.ledger.yml", "ledger: entries, decisions, recommendations"))
    oq = [d for d in ledger["decisions"] if d.get("open_question")]
    if len(oq) != 10:
        fail(f"expected 10 open-question decisions, got {len(oq)}")
    norm = lambda s: re.sub(r"\W+", " ", s).strip().lower()
    by_q = {norm(d["open_question"]): d for d in oq}
    questions = []
    for i, (a, b) in enumerate(zip(pre, post), start=1):
        if norm(a["question"]) != norm(b["question"]):
            fail(f"question {i} text changed at review")
        d = by_q.get(norm(b["question"]))
        if not d:
            fail(f"no ledger decision for question {i}")
        questions.append({
            "n": i,
            "question": b["question"],
            "proposed_before": a.get("proposed"),
            "proposed_after": b.get("proposed"),
            "low_before": a.get("confidence") == "low",
            "low_after": b.get("confidence") == "low",
            "review": d["review"],
            "decision_id": d["id"],
        })
    edited = [q["n"] for q in questions if q["review"] == "expert-edited"]
    if edited != [2]:
        fail(f"expected exactly question 2 expert-edited, got {edited}")
    if any(q["review"] not in ("accepted-proposal", "expert-edited") for q in questions):
        fail("unknown review value")
    low_before = [q["n"] for q in questions if q["low_before"]]
    low_after = [q["n"] for q in questions if q["low_after"]]
    if low_before != [1, 2, 3, 4, 5] or low_after != [1, 3, 4, 5]:
        fail(f"low-confidence set changed: {low_before} / {low_after}")

    # --- ledger accounting
    entries = ledger["entries"]
    open_e = [e for e in entries if e["status"] == "open"]
    dropped = [e["id"] for e in open_e if e.get("kind") == "dropped"]
    resolved = [e for e in entries if e["status"] == "resolved"]
    if (len(entries), len(open_e), len(dropped), len(resolved)) != (19, 5, 2, 14):
        fail(f"ledger counts drifted: {len(entries)}/{len(open_e)}/{len(dropped)}/{len(resolved)}")
    recs = ledger.get("brief_change_recommendations", [])
    raised_by = {}
    for e in entries:
        raised_by[e["raised_by"]] = raised_by.get(e["raised_by"], 0) + 1

    # --- run records
    brief_run = yaml.safe_load(read(BRIEF_DIR / "foundry-run.yml", "brief run timestamps"))
    gx_run = yaml.safe_load(read(GX_DIR / "foundry-run.yml", "galaxy run timestamps, 11 phases, 7 iterations"))
    phases = gx_run["phases"]
    iters = next(p["iterations"] for p in phases if p.get("skill") == "advance-galaxy-draft-step")
    if len(phases) != 11 or iters != 7:
        fail("galaxy run shape drifted")

    # --- verdicts
    val = json.loads(read(GX_DIR / "galaxy-workflow-validation-result.json", "gxwf verdict"))
    tst = json.loads(read(GX_DIR / "workflow-test-result.json", "planemo verdict"))
    ts = val["summary"]["tool_state"]
    jobs_ok = sum(1 for s in tst["steps"] if s.get("job_state") == "ok")
    if val["status"] != "pass" or ts["ok"] != 7 or ts["fail"] != 0 or not val["summary"]["connections_valid"]:
        fail("gxwf verdict changed")
    if tst["status"] != "pass" or tst["planemo"]["summary"]["num_failures"] != 0 or jobs_ok != 7:
        fail("planemo verdict changed")
    galaxy_head = re.search(r"HEAD ([0-9a-f]{40})", tst["galaxy"]["galaxy_branch_note"]).group(1)

    # --- pins: workflow changesets + per-iteration discovery status from the run's git history
    wf = yaml.safe_load(read(GX_DIR / "galaxy-workflow.gxwf.yml", "7 pinned tools"))
    pins = []
    for label, step in wf["steps"].items():
        r = step.get("tool_shed_repository")
        if r:
            pins.append({"step": label, "owner": r["owner"], "repo": r["name"], "changeset": r["changeset_revision"]})
    statuses = []
    for c in git(GX_DIR, "log", "--reverse", "--format=%h", "--", "galaxy-tool-pin.json").split():
        d = json.loads(git(GX_DIR, "show", f"{c}:galaxy-tool-pin.json"))
        statuses.append({"commit": c, "status": d["status"], "changeset": d["candidate"]["changeset_revision"]})
        note(GX_DIR / "galaxy-tool-pin.json", f"pin status, iteration {len(statuses)}", rev=c)
    if len(pins) != 7 or len(statuses) != 7 or any(s["status"] != "hit" for s in statuses):
        fail("pins drifted")
    if sorted(s["changeset"] for s in statuses) != sorted(p["changeset"] for p in pins):
        fail("pin history does not match workflow changesets")

    # --- build provenance of the skill that wrote the brief
    prov_path = PLUGIN / "freeform-summary-to-workflow-brief/_provenance.json"
    prov = json.loads(read(prov_path, "Mold hash + verbatim note hash of the brief skill"))
    ref = next(r for r in prov["refs"] if r["ref"] == "[[workflow-brief-design]]")
    note_src = git(FOUNDRY, "show", f"{CAST}:{ref['src']}")
    note(FOUNDRY / ref["src"], "wiki note text and sha256", rev=CAST, data=note_src.encode())
    if not (ref["mode"] == "verbatim" and ref["src_hash"] == ref["dst_hash"] == sha(note_src.encode())):
        fail("verbatim note hash mismatch")
    rule = ("When the evidence is thin, still propose an answer, mark it low confidence, "
            "and say what evidence is missing.")
    if rule not in note_src:
        fail("quoted rule no longer in the wiki note")
    cast_date = git(FOUNDRY, "log", "-1", "--format=%cI", CAST).strip()

    # --- recompile instances
    d1 = git(FOUNDRY, "show", RECOMPILE_1, "--", "casts/claude/skills/discover-shed-tool/_provenance.json")
    h1 = re.findall(r'^[-+]\s+"content_hash": "([0-9a-f]{64})"', d1, re.M)
    note(FOUNDRY, "recompile 1: discover-shed-tool content_hash", rev=RECOMPILE_1)
    d2 = git(FOUNDRY, "diff", f"{RECOMPILE_2}^1", RECOMPILE_2, "--", "casts/*/_provenance.json")
    files2 = re.findall(r"^diff --git a/(\S+)", d2, re.M)
    h2 = re.findall(r'^[-+]\s+"src_hash": "(64c477c4[0-9a-f]*|9a636385[0-9a-f]*)"', d2, re.M)
    note(FOUNDRY, "recompile 2: PR #701, planemo-asserts-idioms src_hash, skills recast", rev=RECOMPILE_2)
    if len(h1) != 2 or len(files2) != 8 or not h2:
        fail("recompile evidence drifted")
    r1_date = git(FOUNDRY, "log", "-1", "--format=%aI", RECOMPILE_1).strip()
    r2_date = git(FOUNDRY, "log", "-1", "--format=%aI", RECOMPILE_2).strip()

    run = {
        "questions": questions,
        "brief": {
            "sha_before": sha(pre_md.encode()), "sha_after": sha(post_md.encode()),
            "finished_at": brief_run["finished_at"], "started_at": brief_run["started_at"],
            "reviewed_at": review_iso, "reviewer": reviewer,
            "low_before": len(low_before), "low_after": len(low_after),
            "accepted": sum(q["review"] == "accepted-proposal" for q in questions), "edited": len(edited),
        },
        "ledger": {
            "entries": len(entries), "open": len(open_e), "dropped": len(dropped), "resolved": len(resolved),
            "open_ids": [e["id"] for e in open_e], "dropped_ids": dropped, "raised_by": raised_by,
            "recommendations": [{"id": r["id"], "status": r["status"]} for r in recs],
        },
        "galaxy_run": {"started_at": gx_run["started_at"], "finished_at": gx_run["finished_at"],
                       "phases": len(phases), "iterations": iters},
        "gxwf": {"status": val["status"], "tool_state_ok": ts["ok"], "tool_state_total": ts["ok"] + ts["fail"] + ts["skip"],
                 "connections_valid": val["summary"]["connections_valid"], "package": val["gxwf_package"]},
        "planemo": {"status": tst["status"], "version": tst["planemo"]["version"], "jobs_ok": jobs_ok,
                    "jobs": len(tst["steps"]), "tests": tst["planemo"]["summary"]["num_tests"],
                    "galaxy_head": galaxy_head, "not_run": [t["case"] for t in tst["tests_not_run"]]},
        "pins": pins, "pin_status": statuses,
        "provenance": {"cast": CAST, "cast_date": cast_date, "mold": prov["mold"]["name"],
                       "mold_hash": prov["mold"]["content_hash"], "note": "workflow-brief-design",
                       "note_src_hash": ref["src_hash"], "note_dst_hash": ref["dst_hash"], "rule": rule},
        "recompile": [
            {"commit": RECOMPILE_1, "date": r1_date, "skill": "discover-shed-tool", "before": h1[0], "after": h1[1], "skills": 1},
            {"commit": RECOMPILE_2, "pr": 701, "date": r2_date, "note": "planemo-asserts-idioms",
             "before": h2[0], "after": h2[-1], "skills": len(files2)},
        ],
    }
    (HERE / "data").mkdir(exist_ok=True)
    (HERE / "data/run.json").write_text(json.dumps(run, indent=1) + "\n")
    (HERE / "data/manifest.json").write_text(json.dumps(manifest, indent=1) + "\n")
    print(f"extract: wrote data/run.json ({len(manifest)} sources in data/manifest.json)")


if __name__ == "__main__":
    main()
