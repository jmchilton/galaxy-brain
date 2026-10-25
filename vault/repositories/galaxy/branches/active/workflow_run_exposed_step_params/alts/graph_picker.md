# Alt: graph_picker

Branch `jmchilton/workflow_run_exposed_step_params_alt_graph_picker`, head `b54ebfabb34`, on the parent spike head `147dac7222a`. Spike only, no PR. Findings and screenshots: [LESSONS_LEARNED.md § Graph picker spike](../../../../../../projects/workflow_applications/LESSONS_LEARNED.md#graph-picker-spike).

## What it does

It replaces the tree picker modal with a graph picker. The modal renders the whole workflow as a read-only `WorkflowGraph`. Clicking a tool node lists that step's parameters, where you can select or deselect them, and each node shows how many of its parameters are picked. Apply sets the whole exposed set, removals included. The parent's tree picker could only add.

Subworkflows are locked:

- **Subworkflow nodes:** a warning-colored header, a lock icon, and "Parameters inside subworkflows can't be picked here". Clicking one explains the lock instead of listing parameters.
- **The tree builder:** it no longer offers subworkflow runtime leaves (`2|1|…`).
- **Subworkflow keys from a `step_param` link or a rerun's recorded keys:** these are dropped, with a red, non-dismissible "will not be sent" alert in the form and a matching banner in the picker. The picker's Apply button also counts them: "Apply (1) - 1 subworkflow parameter(s) not sent".

## How it differs from the parent

- **Same as the parent:** cards, payload, route args, rerun re-show and all server code.
- **Client changes outside the run form:** `Node.vue` and `WorkflowGraph.vue` get an `annotated` prop. With it, `NodeInvocationText` renders `nodeText` for any step, not just workflow inputs.
- **Picker scope:** the picker uses its own workflow store scope (`<workflowId>-step-parameter-picker`), so clicking nodes doesn't move the run form's active step.
- **Tests:**
  - Vitest: 11 tree tests (the subworkflow lock and `diffExposures` were written red first), plus all of `Workflow/Run/` and `Node`: 101 pass.
  - E2E: `test_workflow_run_step_param_graph_picker.py`, 2 tests, both pass under Playwright.
- **Not run:** the parent's 5 E2E tests, which still use the removed "add step parameter" button and will fail on this branch.

The parent worktree is checked out on this alt. Its dangling `.venv` and `node_modules` symlinks were replaced with a real bootstrap.
