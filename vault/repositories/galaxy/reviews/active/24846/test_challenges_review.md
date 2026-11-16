# Test challenger review — PR #24846

- Profile: gx_test_challenger
- Model: Claude Opus 5.5, effort: low
- Reviewed commit: `00be733f7cc9a515c7a994399a80268b1892fda9`

Verdict: tests are behavior-level and appropriate for a tiny release fix. Two minor gaps. Details in [test_challenges_debrief.md](test_challenges_debrief.md).

### P3 1 — CuratedWorkflowList fix is untested

`CuratedWorkflowList.vue` gets the same `getFilterText(..., filterText.value)` change as `WorkflowList.vue`, but only `WorkflowList` gets a component test. Add a mirror case to the existing `client/src/components/Workflow/List/CuratedWorkflowList.test.ts` (type plain text, apply a filter, assert input value and the query sent).

### P3 2 — Filtering unit test uses a hand-built filter set

The new `filtering.test.js` block builds its own `Filtering` that mimics the workflow list config. Constructing it from the real factory (`workflowFilters.ts` / `curatedFilters.ts`) would bind the regression to the config actually shipped, so a future `autoFilterKey` change there is caught. Optional.
