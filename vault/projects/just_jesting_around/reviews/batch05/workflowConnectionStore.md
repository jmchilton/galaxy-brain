# Workflow connection store — iteration 05

Selected originator: `client/src/stores/workflowConnectionStore.test.ts`.

All four cases and 12 assertion statements remain. Both original step payloads omit ids so the store assigns ids 0 and 1. Input/output terminal names and ids are unchanged. The step-index scenario still checks both empty indexes, both populated indexes, then both cleared indexes; the terminal scenario likewise retains the complete add/remove sequence.

`setupTestPinia` replaces another local implementation. Names explain which index is exercised and when it must clear; length assertions operate directly on the connections array. No stateful sequences were split, because their before/add/remove checks verify consistency through the transition.

Reuse search covered the other selected workflow step suite and existing `Workflow/Editor/test_fixtures`. The reusable Pinia setup applies cleanly. The general `createTestStep` fixture requires ids and supplies unrelated default output/position fields, while these inputs intentionally let the store assign ids and contain no outputs. Keep these short sparse payloads rather than introduce a second factory or alter the conditions. No supporting migrations or worthwhile unresolved abstraction remain.

Validation: four cases pass with the 12 original checks retained; scoped ESLint and Prettier pass. No new README rule is warranted.
