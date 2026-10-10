# Readability batch 28

Four originators, one test per commit, then one range review. Workflow Editor `Index` is a follow-through selection from batch 27; the other three were drawn with seed `2610928`. [Manifest](readability_batch_28.yml).

## Originators

| Selected test | Result | Cases |
| --- | --- | ---: |
| Workflow Editor `Index` | Removes the three unnecessary `.name` writes on imported components and the stale comment calling them required. Three mount paths become one `mountEditor(props)`, with per-case mounting, an `it.each` over the four attribute trackers, local step/activity/modal helpers and selector constants. Mocks now reset and restore per case. Before, spy history leaked between cases, so deleting a save-as emit still passed. The navigation case also checks no confirmation is emitted before a change. [Review](reviews/batch28/Editor-Index.md). | 30 → 30 |
| GAlert | Local mount/visibility/countdown helpers and selectors; `nextTick()`, auto-unmount; assertions unchanged. [Review](reviews/batch28/GAlert.md). | 8 → 8 |
| JobElements | Auto-unmount replaces the module wrapper and manual unmount; selector builder; cast removed. [Review](reviews/batch28/JobElements.md). | 6 → 6 |
| WorkflowList | Deterministic `getFakeWorkflowSummary` rows replace the random `Workflow/testUtils.ts` generator, deleted with no other consumer. Typed mock, shared mount helpers, `expectConfigurationRequest`. A vacuous second `showDeletedButton.exists()`, on a wrapper captured before the click, now re-finds the button. [Review](reviews/batch28/WorkflowList.md). | 4 → 4 |

## Reuse and follow-through

Closes batch 27's follow-up: no `.name` writes on imported components remain in client tests. The README guidance proposed for it was dropped, since the pattern is now gone. Two README example-table rows were corrected: "Stub with methods" described an `expose` option Index.test.ts never used, and "Stub with factory" pointed at the old `ToolForm.test.js`, now `.ts`.

Review follow-ups, not blocking:
- Nine Index cases assert during the initial workflow load. That can't produce a false pass, but `mountLoadedEditor()` would make the four trackers deterministic.
- The download-URL assertion hard-codes the workflow ID.

## Validation and review

48 cases across 4 suites pass, unchanged from baseline. Each commit's tests pass at that commit, shuffled with seed `280101`; full client vue-tsc passes at the tip; ESLint, Prettier and hooks pass. [Independent review](reviews/batch28/review.md) approved all four test commits and spot-checked the README rows.

Commits: `9320a3ee34e` (Index), `27cc2970ca2` (GAlert), `56d3a97269a` (JobElements), `6e590ea8b82` (WorkflowList), `841d83bc78f` (README).
