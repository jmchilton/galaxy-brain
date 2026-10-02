# Workflow refactor API rewrites the version it refactors

An agent-to-agent issue draft, written by Claude on 2026-10-02 at John's request while polishing #23799. It's queued only and hasn't been posted.

**Why file it:** #23799 fixes this bug, and its opener should cite an issue for it alongside 🎯 #23762. #23799 is blocked until this issue exists; the gx_branches agent then updates the PR opener to `Fix 🎯 #23762 and 🎯 #NNNN`.

## Problem

On `dev`, `PUT /api/workflows/{id}/refactor` with `dry_run: false` changes the steps of the source workflow version, not just the new version it creates. The version history then no longer shows what the workflow was before the refactor, and the user can't revert to it.

Observed symptoms:

- **Tool upgrade:** upload a workflow with `multiple_versions` at `0.1`, then refactor with `upgrade_tool` (or `upgrade_all_steps`). Version 1 has `0.2`, as expected. **Version 0's step also reads `0.2`.**
- **Subworkflow upgrade:** after `upgrade_subworkflow`, version 0's step points at the new subworkflow id.
- **Position move:** after `update_step_position`, version 0's layout moves too. The test shows a left offset of 7, where it should still be 10.

The version-0 row still exists, but its steps now point at the new tool, subworkflow or position. The pre-refactor version is gone from the history.

## Who hits it

- Any refactor API caller that upgrades: `planemo autoupdate` runs `upgrade_all_steps` with no dry run, and BioBlend has `refactor_workflow`.
- The editor's Upgrade activity, `client/src/components/Workflow/Editor/Index.vue` (~968, `upgrade_all_steps`).
- The subworkflow Upgrade button, `FormDefault.vue` (~139, `upgrade_subworkflow`). Both go through `RefactorConfirmationModal.vue`: a dry run, then `dry_run: false`.
- Not affected: the per-step tool version dropdown (`FormTool.vue` `onChangeVersion` → `getModule` → normal editor save), because it doesn't call refactor.

It's committed only when a value really changes (a newer tool or subworkflow exists, or a position moved), and only for non-dry-run requests.

## Mechanism

`WorkflowContentsManager.do_refactor` (`lib/galaxy/managers/workflows.py`) on `dev`:

1. `workflow = stored_workflow.get_internal_version(version)` gets the persistent source version.
2. `as_dict = _workflow_to_dict_export(..., allow_upgrade=True)` exports it. The export shares each step's `position` JSON object (a `MutableJSONType` column) with the persistent step.
3. `WorkflowRefactorExecutor(raw_workflow_description, workflow, module_injector)` is given the **persistent** workflow. Its upgrade and inject paths use `self.workflow.steps[...]` as scratch space (`lib/galaxy/workflow/refactor/execute.py` ~451, 467, 515, 519), setting `tool_version`, `tool_id` and `subworkflow` on persistent steps. Position edits on `as_dict` reach the persistent step through the shared JSON.
4. `update_workflow_from_raw_description(..., dry_run=False)` saves the new version and commits, which flushes the step edits from step 3 into the source version.

## Fix (already on #23799, branch `workflow_refactor_detached_executor`)

- The executor gets a detached, unsaved dry-run build of the export (`_build_detached`), never the persistent version.
- The export is deep-copied, so position edits don't reach persistent steps.
- History: closed PR #23792 (targeting `release_26.1`) expired the source steps after the executor ran. #23799 replaced that with the detached build.

## Tests on #23799 that fail on `dev`

Each was run against `dev`'s `managers/workflows.py`:

- `test/integration/test_workflow_refactoring.py::test_tool_version_upgrade_preserves_source_version`: `assert '0.2' == '0.1'`.
- `test/integration/test_workflow_refactoring.py::test_subworkflow_upgrade_preserves_source_version`.
- `lib/galaxy_test/api/test_workflows.py::test_refactor_step_position_creates_version`, with its `changed` check removed: `assert 7.0 == 10` on version 0's layout.
- `lib/galaxy_test/api/test_workflows.py::test_refactor_upgrade_preserves_previous_version`.

## Notes for the filer

- Suggested title: "Workflow refactor API rewrites the source version's steps".
- Lead with the user-visible symptom (the version history loses the pre-upgrade version). The mechanism is secondary.
- Related to #23762 (no-op refactors save duplicate versions), which is fixed in the same PR. Don't merge the two issues: they're separate bugs.
- #23762's body says upgrade actions report `tool_version_change` when they change something, citing #22534. That's false: a 0.1 → 0.2 upgrade reports no messages (`test_tool_version_upgrade_no_state_change`). Don't repeat it here. Whether to correct #23762 is John's call.
- Possibly worth checking: is `release_26.1` affected? #23792 targeted it. John decides whether a backport is wanted.
