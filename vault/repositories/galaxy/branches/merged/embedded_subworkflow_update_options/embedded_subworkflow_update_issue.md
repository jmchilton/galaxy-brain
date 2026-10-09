# Workflow manager passes update options to a routine requiring creation options

The embedded-subworkflow construction path forwards `WorkflowUpdateOptions` to `build_workflow_from_raw_description`, which reads the creation-only `.publish` field; the update options class does not define that field.

Two parameter annotations expose this mismatch with mypy, without constructing or executing a workflow, changing runtime behavior, or using mocks.

This is an options-contract/typing issue independent of the PostgreSQL annotation indexes in #23579. Whether a particular workflow description is valid, or should be accepted by the update API, is a separate question; the evidence here does not establish that the minimal API fixture below is a valid executable workflow.

## Primary evidence: static reproduction

Against Galaxy dev `18bb36a9f49071da5e502b162c9a6905d7b78aae`, add only these annotations to a temporary copy of `lib/galaxy/managers/workflows.py`:

```diff
@@ def build_workflow_from_raw_description(
-        workflow_create_options,
+        workflow_create_options: WorkflowCreateOptions,
@@ def __build_embedded_subworkflow(
-        workflow_state_resolution_options,
+        workflow_state_resolution_options: WorkflowCreateOptions | WorkflowUpdateOptions,
```

The first annotation describes the routine's actual requirement: it accesses `.publish`. The second represents the two options types flowing from the existing creation and update paths; it does not add an imaginary call or new runtime code.

From the repository's `lib/` directory, with Galaxy's mypy requirements installed:

```sh
# Baseline: the existing untyped parameters hide the mismatch.
python -m mypy --follow-imports=silent galaxy/managers/workflows.py

# Replace /path/to/typed/workflows.py with the annotated temporary copy.
python -m mypy --follow-imports=silent \
  --shadow-file galaxy/managers/workflows.py /path/to/typed/workflows.py \
  galaxy/managers/workflows.py
```

Mypy's [`--shadow-file` option](https://mypy.readthedocs.io/en/stable/command_line.html#cmdoption-mypy-shadow-file) checks the temporary contents while retaining the real module name and source location; the repository source need not be edited.

Baseline result with mypy 2.3.0 and the repository's `mypy.ini`:

```text
Success: no issues found in 1 source file
```

With the two annotations:

```text
galaxy/managers/workflows.py:2255: error: Argument 3 to
"build_workflow_from_raw_description" of "WorkflowContentsManager" has
incompatible type "WorkflowCreateOptions | WorkflowUpdateOptions"; expected
"WorkflowCreateOptions"  [arg-type]
Found 1 error in 1 file (checked 1 source file)
```

This intentionally failing reproduction exposes the existing contract mismatch; the successful unannotated baseline is not evidence that the code is correct, and the follow-up fix is tracked separately on branch `embedded_subworkflow_update_options` with [its PR description](pr_description.md).

Annotated copy: `/private/tmp/galaxy-embedded-options-typing.GNFAff/workflows.py`; its diff from the real module contains exactly the two annotation changes above, and the Galaxy worktree remains clean.

## Secondary evidence: runtime diagnostic

`POST /api/workflows` accepts the description below, but submitting the same embedded description to `PUT /api/workflows/{id}` returns HTTP 500. This reaches the incompatible-options path with empty annotations, no tools, and SQLite, but import acceptance alone does not demonstrate that the fixture is a valid executable workflow; the static mismatch above is the primary evidence.

Against a local Galaxy instance, set `GALAXY_URL` and `GALAXY_API_KEY` and run this Python script with `requests` installed:

```python
import json
import os

import requests

url = os.environ["GALAXY_URL"].rstrip("/")
session = requests.Session()
session.params = {"key": os.environ["GALAXY_API_KEY"]}
base = {"a_galaxy_workflow": "true", "format-version": "0.1", "annotation": ""}
child = {
    **base,
    "name": "child",
    "steps": {"0": {
        "id": 0, "type": "data_input", "name": "Input dataset",
        "label": "dataset", "annotation": "",
        "tool_state": '{"name": "dataset"}', "input_connections": {},
        "position": {"left": 0, "top": 0},
    }},
}
workflow = {
    **base,
    "name": "parent",
    "steps": {"0": {
        "id": 0, "type": "subworkflow", "name": "child", "annotation": "",
        "subworkflow": child, "input_connections": {},
        "position": {"left": 0, "top": 0},
    }},
}
created = session.post(
    f"{url}/api/workflows", data={"workflow": json.dumps(workflow)}, timeout=60
)
created.raise_for_status()
workflow_id = created.json()["id"]
updated = session.put(
    f"{url}/api/workflows/{workflow_id}", json={"workflow": workflow}, timeout=60
)
print(updated.status_code, updated.text)
```

## Actual behavior

Import returns HTTP 200; updating the embedded description returns HTTP 500 with:

```text
{"err_msg": "Uncaught exception in exposed API method:", "err_code": 0}
```

The server traceback ends with:

```text
File "lib/galaxy/managers/workflows.py", line 2252, in __build_embedded_subworkflow
    subworkflow = self.build_workflow_from_raw_description(...)
File "lib/galaxy/managers/workflows.py", line 749, in build_workflow_from_raw_description
    stored.published = workflow_create_options.publish
AttributeError: 'WorkflowUpdateOptions' object has no attribute 'publish'
```

## Expected behavior

Make the creation/update options boundary explicit and keep the relevant path type-safe, rather than forwarding an options object missing a required field. The eventual implementation should decide whether to construct appropriate child-creation options or reject unsupported update descriptions; this report does not prescribe that API design.

## Cause and scope

The [update controller creates `WorkflowUpdateOptions`](https://github.com/galaxyproject/galaxy/blob/18bb36a9f49071da5e502b162c9a6905d7b78aae/lib/galaxy/webapps/galaxy/api/workflows.py#L520-L528), which flows through [`__build_embedded_subworkflow`](https://github.com/galaxyproject/galaxy/blob/18bb36a9f49071da5e502b162c9a6905d7b78aae/lib/galaxy/managers/workflows.py#L2244-L2261) into a creation routine that [unconditionally reads `.publish`](https://github.com/galaxyproject/galaxy/blob/18bb36a9f49071da5e502b162c9a6905d7b78aae/lib/galaxy/managers/workflows.py#L740-L749).

[`WorkflowUpdateOptions`](https://github.com/galaxyproject/galaxy/blob/18bb36a9f49071da5e502b162c9a6905d7b78aae/lib/galaxy/managers/workflows.py#L633-L639) has no such field; [`WorkflowCreateOptions`](https://github.com/galaxyproject/galaxy/blob/18bb36a9f49071da5e502b162c9a6905d7b78aae/lib/galaxy/managers/workflows.py#L2485-L2490) does.

This affects updates that supply an embedded subworkflow description; it is not a claim that all subworkflow editor saves fail. A name-only update of the same parent succeeds, as does updating a plain workflow containing only a data-input step.

## Verification

Independently reproduced on September 17, 2026 using real Galaxy API requests, Python 3.13.12, and the test harness's default SQLite database, on local branch `issue_23579_annotation_indexes` at `5822ab3785a5a571261cc17cb4c6ff8da6ffe241`, based on `dev` at `18bb36a9f49071da5e502b162c9a6905d7b78aae`.

Both the workflow manager and API controller are unchanged from that `dev` commit; this was not a separate pristine-`dev` test run. Two diagnostic API tests observed the failing embedded update and successful controls, with no mock objects and no Galaxy tracked-code changes. The diagnostic suite explicitly expects the current HTTP 500, so its passing result confirms that observed failure rather than indicating a fix or proving workflow validity. The separate mypy checks above were also run on September 17 using only a temporary shadow copy of the unchanged manager module.

Local reproduction: `/private/tmp/galaxy-embedded-subworkflow-review.w23SKj/test_embedded_subworkflow_update.py`; captured response and server traceback: `/private/tmp/galaxy-embedded-subworkflow-review.w23SKj/report.json`.
