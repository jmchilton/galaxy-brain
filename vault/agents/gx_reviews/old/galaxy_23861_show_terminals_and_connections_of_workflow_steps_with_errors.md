# galaxy#23861 - Show terminals and connections of workflow steps with errors

- Author: mvdbeek
- Base: `dev` (merge-base `b437cb3f0d6`, current with origin/dev at review time)
- Reviewed head: `f9948fd6c7f`
- Worktree: `~/projects/worktrees/galaxy/pr/23861`
- Fixes #7141
- Status: review drafted, unposted

## Summary

`Node.vue` used `v-else` on the node body, so any step with `errors` showed only the red `GAlert`
and no `NodeInput`/`NodeOutput`. No terminals meant connections to/from a missing tool were never
drawn. Fix: render the body when `!errors || hasTerminals`, where `hasTerminals` is computed from the
existing `inputs` / `outputs` computeds (which already synthesize `valid: false` placeholder terminals
from `connectionStore` connections). Alert loses `rounded-bottom` when a body follows.

Tests: two vitest cases in `Node.test.ts` (missing tool with / without connections) and
`test_missing_tools` Selenium extended to wire `input1 -> missing -> cat1` and
`assert_connection_invalid` both edges.

## Verdict

Approve. Small, correct, reuses the existing invalid-terminal machinery rather than adding a new
path. Red-to-green Selenium coverage of the actual bug. Findings below are low.

## Findings

### Low 1 - Change applies to every errored node, not just missing tools (unmentioned, untested)

`client/src/components/Workflow/Editor/Node.vue:117`, `:297`

`errors` = `props.step.errors || stateStore.getStepLoadingState(id)?.error`. Two other sources now
also get a body:

- Subworkflow steps whose inner workflow has a missing tool. `_workflow_to_dict_editor`
  (`lib/galaxy/managers/workflows.py:1558`) sets `errors: module.get_errors()`, and
  `SubWorkflowModule.get_errors` (`lib/galaxy/workflow/modules.py:843`) returns a list of
  "`<tool_id>` is not installed" for nested missing tools. Those steps have *real* inputs/outputs, so
  before this PR their whole body and all connections were hidden; now they render normally under
  the alert.
- Steps with a loading-state error (tool-state rebuild failure in the editor).

Both look like improvements (same bug, arguably worse for subworkflows since valid connections
vanished), but the PR description frames it as missing-tool only. Worth a sentence in the
description; optional unit case with a step that has `errors` plus real `inputs`/`outputs`.

### Low 2 - No separator rule between placeholder inputs and outputs

`Node.vue:269` `showRule` checks `props.step.inputs?.length > 0 && props.step.outputs?.length > 0`.
For a missing tool both are `[]`, so the node shows red `input1` directly above red `out_file1` with
no `.rule`. Using the computed `inputs.value` / `outputs.value` (the same ones `hasTerminals` uses)
would make the missing-tool node look like any other. Cosmetic; take-or-leave.

### Nit - unit tests partly restate CSS

`Node.test.ts` asserts `rounded-bottom` presence/absence. The meaningful assertions are the
`NodeInput`/`NodeOutput` props (`valid: false`) and `.node-body` absence without connections; the
class checks are fine but low-value. Not worth asking to change.

## Checked / no issue

- Reuse: fix leans entirely on existing `inputs` / `invalidOutputs` computeds; no new abstraction
  needed and none accreted.
- `isDragging: ref(false)` added to `provide` in the test helper - needed because the new cases use
  `mount` and `NodeOutput` injects it.
- `useConnectionStore("mock-workflow").$patch({ stepToConnections: ... })` matches
  `getConnectionsForStep` (`client/src/stores/workflowConnectionStore.ts:88`).
- No Python imports touched; Selenium change only adds YAML + two assertions.
- Did not run vitest (worktree has no `client/node_modules`); Selenium not run per policy.

## Draft PR comment

> *Posted by Claude (AI assistant) on behalf of jmchilton - not written by them personally.*
>
> Looks good - reusing the existing invalid placeholder terminals is the right fix, and the Selenium
> test exercising both edges is nice. Two small things, neither blocking:
>
> 1. `errors` also comes from subworkflow steps whose inner workflow has a missing tool
>    (`SubWorkflowModule.get_errors`) and from editor loading-state errors. Those steps have real
>    inputs/outputs, so this PR also makes their body and connections reappear - an improvement, but
>    maybe worth a line in the description (and optionally a unit case with errors + real terminals).
> 2. `showRule` still checks `props.step.inputs` / `props.step.outputs`, which are empty for a
>    missing tool, so the red placeholder inputs and outputs render with no separator. Switching it to
>    the computed `inputs` / `outputs` would make the node look like the others. Cosmetic.
