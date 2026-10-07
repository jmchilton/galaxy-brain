"""Independent check of a loop run on test.galaxyproject.org, via the API.

Looks only at histories, workflows and invocations created after the run started, so it does not
depend on what the agent reports. Usage: python3 verify.py runs/<id>
Pass: everything the run created is ok and no invocation failed, plus the tutorial's minimums in
EXPECTED (unknown tutorials need at least one history).
Auth: GALAXY_API_KEY if set, else the galaxysession cookie from $GXUI_LOOP_HOME/auth/galaxy-test-auth.json.
"""

import json
import os
import sys
import urllib.request

SERVER = "https://test.galaxyproject.org"
# Minimum histories / workflows / finished invocations a run of each tutorial must leave.
EXPECTED = {
    "introduction/tutorials/galaxy-intro-short": {"histories": 2, "workflows": 1, "invocations": 1},
    "galaxy-interface/tutorials/workflow-editor": {"histories": 1, "workflows": 2, "invocations": 3},
    "galaxy-interface/tutorials/workflow-parameters": {"histories": 1, "workflows": 2, "invocations": 2},
    "galaxy-interface/tutorials/history-to-workflow": {"histories": 0, "workflows": 1, "invocations": 1},
    "galaxy-interface/tutorials/workflow-reports": {"histories": 1, "workflows": 1, "invocations": 1},
}
run = sys.argv[1]
with open(f"{run}/started_at") as f:
    started = f.read().strip().replace("Z", "")
tutorial = "introduction/tutorials/galaxy-intro-short"  # runs before run.sh recorded it
if os.path.exists(f"{run}/tutorial"):
    with open(f"{run}/tutorial") as f:
        tutorial = f.read().strip()
expected = EXPECTED.get(tutorial, {"histories": 1, "workflows": 0, "invocations": 0})


if "GALAXY_API_KEY" in os.environ:
    HEADERS = {"x-api-key": os.environ["GALAXY_API_KEY"]}
else:
    loop_home = os.environ.get("GXUI_LOOP_HOME", os.path.expanduser("~/.cache/gxui-loop"))
    with open(os.path.join(loop_home, "auth", "galaxy-test-auth.json")) as f:
        cookies = json.load(f)["cookies"]
    HEADERS = {"Cookie": "; ".join(f"{c['name']}={c['value']}" for c in cookies if c["name"] == "galaxysession")}


def get(path):
    request = urllib.request.Request(f"{SERVER}/api/{path}", headers=HEADERS)
    with urllib.request.urlopen(request) as response:
        return json.load(response)


def created_in_run(items):
    # The workflow index has no create_time; update_time >= start still bounds it to this run.
    return [i for i in items if (i.get("create_time") or i.get("update_time") or "") >= started]


histories = []
for history in created_in_run(get("histories?view=detailed&keys=id,name,create_time&limit=50")):
    contents = get(f"histories/{history['id']}/contents?v=dev&keys=hid,name,state,deleted,history_content_type")
    live = [c for c in contents if not c.get("deleted")]
    histories.append(
        {
            "name": history["name"],
            "items": len(live),
            "not_ok": [f"{c['hid']}: {c['name']} ({c.get('state')})" for c in live if c.get("state") not in ("ok", None)],
        }
    )
workflows = [w["name"] for w in created_in_run(get("workflows"))]
invocations = [
    {"workflow_id": i["workflow_id"], "state": i["state"]} for i in created_in_run(get("invocations?limit=50"))
]
finished = [i for i in invocations if i["state"] in ("scheduled", "completed")]
summary = {
    "tutorial": tutorial,
    "expected": expected,
    "histories": histories,
    "workflows_created": workflows,
    "invocations": invocations,
    "pass": len(histories) >= expected["histories"]
    and len(workflows) >= expected["workflows"]
    and len(finished) >= expected["invocations"]
    and not any(i["state"] in ("failed", "cancelled") for i in invocations)
    and not any(h["not_ok"] for h in histories),
}
print(json.dumps(summary, indent=2))
