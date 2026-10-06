Title: Workflow refactor API rewrites the source version's steps

_Posted by an AI assistant (Claude) on jmchilton's behalf — not personally authored._

A non-dry-run workflow refactor saves a new version, and it also overwrites the steps of the version it started from, so the history loses the original workflow.

Upload a workflow with a step using `multiple_versions` at `0.1`, then `PUT /api/workflows/{id}/refactor` with `upgrade_tool` and `dry_run: false`:

| Version | Expected step `tool_version` | Actual |
|---|---|---|
| 0 (source) | `0.1` | **`0.2`** |
| 1 (new) | `0.2` | `0.2` |

Version 0 still exists, but nothing in it shows the workflow from before the upgrade, and reverting to it gets the upgraded tool. The same thing happens with:

- **`upgrade_subworkflow`**: version 0's step now points at the new subworkflow.
- **`update_step_position`**: version 0's layout moves too (in the test below, the left offset between two steps goes 10 → 7 in version 0).

Changes are written only when something actually changes (a newer tool or subworkflow exists, or a position moved), and only when `dry_run` is false.

**Who hits it:** the editor's Upgrade activity (`upgrade_all_steps`) and the subworkflow Upgrade button (`upgrade_subworkflow`). Both do a dry run and then a real run through `RefactorConfirmationModal.vue`. API clients hit it too: `planemo autoupdate` runs `upgrade_all_steps` with no dry run, and BioBlend has `refactor_workflow`. The per-step tool version dropdown in the editor isn't affected, because it saves through the normal editor path.

<details><summary>Why it happens</summary>

`WorkflowContentsManager.do_refactor` (`lib/galaxy/managers/workflows.py`):

1. `workflow = stored_workflow.get_internal_version(version)` loads the **persistent** source version.
2. `_workflow_to_dict_export(..., allow_upgrade=True)` exports it. `step_dict["position"] = step.position`, so each exported step's `position` is the same `MutableJSONType` object as the persistent step's, and nothing copies it before the executor runs.
3. `WorkflowRefactorExecutor(raw_workflow_description, workflow, module_injector)` is given that persistent workflow. `_apply_upgrade_tool` and `_apply_upgrade_subworkflow` (`lib/galaxy/workflow/refactor/execute.py`) use `self.workflow.steps[...]` as scratch space and set `tool_id`, `tool_version` and `subworkflow` on persistent steps. Position edits to the export reach the persistent step through the shared JSON.
4. `update_workflow_from_raw_description(..., dry_run=False)` saves the new version and commits. The commit also flushes the dirty source steps from step 3.

Code checked against `dev` @ `4f78c5014e8`. `release_26.1` has the same code.

</details>

<details><summary>Failing tests</summary>

These are on 🔀 #23799 and fail against `dev`'s `do_refactor`:

- `test/integration/test_workflow_refactoring.py::test_tool_version_upgrade_preserves_source_version`: `assert '0.2' == '0.1'`
- `test/integration/test_workflow_refactoring.py::test_subworkflow_upgrade_preserves_source_version`
- `lib/galaxy_test/api/test_workflows.py::test_refactor_upgrade_preserves_previous_version`
- `lib/galaxy_test/api/test_workflows.py::test_refactor_step_position_creates_version` (with its `changed` check removed): `assert 7.0 == 10` on version 0's layout

</details>

## Context

Bug discovered while working on 🔀 #23799, which fixes it. Related to 🎯 #23762 (no-op refactors save duplicate versions), a separate bug fixed in the same PR. 🔀 #23792 (closed, targeting `release_26.1`) was an earlier fix that #23799 merged forward and then replaced.

## Proposed Approach

Never give the executor persistent model objects. Deep-copy the export, build a detached, unsaved workflow from it through the dry-run path of `update_workflow_from_raw_description` (`_build_detached` on #23799), and hand the executor that build as scratch space. Only the final non-dry-run `update_workflow_from_raw_description` writes to the database, and it only adds the new version. This is the approach on #23799. It also expunges a dry-run step's children (inputs, workflow outputs, post-job actions) so detached builds stay out of the session.

## Alternative Approaches

#23792 left the executor working on the persistent version and expired the source steps (recursively) after it ran, so their changes were discarded before the commit. That fixes the known symptoms, but it relies on the expire list covering every object the executor touches, and a new mutation added to the executor can bring the bug back. A detached copy removes that class of bug.

<details><summary>Alternatives In Detail</summary>

### Alternative: Expire source steps after the executor runs (#23792)

<details><summary>Description</summary>

#### Details

Keep `WorkflowRefactorExecutor(..., workflow, ...)` on the persistent version. After `refactor()`, expire the source workflow's steps in the session so that their dirty attributes are discarded before `update_workflow_from_raw_description` commits.

#### Why the proposed approach is preferred

The executor still mutates persistent objects, and expiring only discards pending changes on the objects it's called on. A change to anything outside that list (an object reached through a relationship, say), or any explicit flush or commit during the executor run, still reaches the source version. The detached copy can't write to the source version at all.

</details>

### Alternative: Roll back or refresh the session before saving

<details><summary>Description</summary>

#### Details

Snapshot what the executor needs, roll back or `refresh()` the source steps, then save the new version.

#### Why the proposed approach is preferred

`refresh()` has the same coverage problem as expiring. A rollback would also discard unrelated pending work in the request's session.

</details>

</details>
