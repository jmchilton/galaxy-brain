# /// script
# dependencies = ["pyyaml"]
# ///
"""Write route.json: the two brief lanes and the shared Galaxy spine (foundry pipeline notes), plus the run's phase facts."""
import json
import os
import subprocess
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
FOUNDRY = Path(os.environ.get("FOUNDRY_REPO", Path.home() / "projects/repositories/foundry"))
FOUNDRY_REF = os.environ.get("FOUNDRY_REF", "eb2de3f1")
RUN = Path(os.environ.get("RUN_DIR", Path.home() / "projects/foundry-runs/dengueseq-denv3/dengueseq-denv3-galaxy"))


def git(repo, *args):
    return subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True, text=True).stdout


def front(text):
    return yaml.safe_load(text.split("---")[1])


def phases(slug):
    fm = front(git(FOUNDRY, "show", f"{FOUNDRY_REF}:content/pipelines/{slug}/index.md"))
    out = []
    for p in fm["phases"]:
        if "mold" in p:
            out.append({"mold": p["mold"].strip("[]"), "loop": bool(p.get("loop"))})
        else:
            out.append({"branch": p["branch"], "chain": [c.strip("[]") for c in p["chain"]]})
    return out


spine = phases("workflow-brief-to-galaxy")
lanes = {"paper": phases("paper-to-workflow-brief"), "nextflow": phases("nextflow-to-workflow-brief")}
run = yaml.safe_load(git(RUN, "show", "HEAD:./foundry-run.yml"))
assert run["pipeline"] == "workflow-brief-to-galaxy"
assert len(run["phases"]) == len(spine), "run phase count differs from the pipeline note"
for rp, sp in zip(run["phases"], spine):
    assert rp.get("skill", rp.get("pattern")) == sp.get("mold", sp.get("branch")), (rp, sp)
loop = next(p for p in run["phases"] if p.get("iterations"))
ledger = yaml.safe_load(git(RUN, "show", "HEAD:./open-requirements.ledger.yml"))
status = [x["status"] for x in ledger["entries"]]
filtered = [x for x in ledger["entries"] if x["id"] == "filtered-variant-frequency-table-not-carried"]
assert filtered and filtered[0]["status"] == "open" and "not reproduced" in filtered[0]["unmet"] and filtered[0]["kind"] == "dropped", "ledger example changed"
by_skill = {p.get("skill"): p["n"] for p in run["phases"]}
out = {
    "foundry": git(FOUNDRY, "rev-parse", "--short=8", FOUNDRY_REF).strip(),
    "lanes": lanes,
    "spine": spine,
    "ledger": {"entries": len(status), "resolved": status.count("resolved"), "open": status.count("open")},
    "run": {
        "slug": run["run_slug"],
        "loop_phase": loop["n"],
        "loop_iterations": loop["iterations"],
        "validate_phase": by_skill["validate-galaxy-workflow"],
        "test_phase": by_skill["run-workflow-test"],
    },
}
(HERE / "route.json").write_text(json.dumps(out, indent=1) + "\n")
print("route.json:", len(spine), "spine phases;", out["run"])
