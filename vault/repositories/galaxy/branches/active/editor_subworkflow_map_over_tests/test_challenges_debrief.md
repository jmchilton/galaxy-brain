Run via claude-opus-5-5 at high effort.

**READY.** Head `5c91578285f` (one new commit on `b8c7a93e57a`, not pushed). Tests only; no client source changed and no editor bug found.

# Test challenges: editor_subworkflow_map_over_tests

## Scope

The branch adds subworkflow step 37 to `client/src/components/Workflow/Editor/test-data/parameter_steps.json`, plus a `describe("subworkflow map over")` block in `modules/terminals.test.ts`. It changes no source, so every test is effectively a baseline test and must pass on `origin/dev`. It does.

Step 37 is the only fixture step that mixes a dataset input with a `list` collection input and declares a fixed `list` collection output. That gives the block coverage the tool-step fixtures don't have. `terminals.ts` never looks at the step type, so these tests pin how the editor maps a step of this shape. That is the editor behavior #23676 brings the backend in line with.

## Per-test outcome

| Original test | Outcome | Why |
| --- | --- | --- |
| describes an unmapped subworkflow by its declared interface | Dropped; class checks folded into `terminalFactory` "constructs correct class instances" | It restated the fixture (`collectionType` equals the declared `list`) and asserted `mapOver` was NULL on a fresh store. Only the terminal classes it checked were worth keeping, and the factory test already lists every fixture step's terminals. |
| maps the whole step over a list connected to one dataset input | Merged into the next test | Both of its assertions read the same store entry, because the `mapOver` getter returns `stepStore.stepMapOver[stepId]`. Downstream map over in the next test already implies that the step is mapped. |
| adds the map over to every output, not only the one whose step consumes it | Kept, renamed "maps every output over a list connected to one dataset input" | Behavior a downstream step sees: the data output gives `list` and the `list` output gives `list:list`. The connection now goes through `canAccept` first. |
| keeps accepting a plain list on the collection input of a mapped over step | Rewritten into an `it.each` over both connection orders | The `canAccept` check stays. The `localMapOver` and `stepStore.stepMapOver` assertions became checks the editor actually runs: `getInvalidConnectedTerminals()` (which `useTerminal` runs on every rebuild) is empty for both inputs, and downstream map over is `list` / `list:list`. |
| reports the same output types whichever input is connected first | Merged into the same `it.each` (the "collection input first" row) | Same assertions as the previous test with the order reversed, so it became a table row. That row also checks `canAccept` on the second connection. |

The block went from 5 tests to 3. The setup also dropped its unused `stepStore` handle and the `mapSubworkflowOverList` / `connectInnerCollection` helpers. Their replacements are `datasetInput()` / `collectionInput()`, which return rebuilt terminals, and `connectList()`, which asserts `canAccept` before connecting.

## Non-vacuity (temporary source mutations, reverted)

- `InputCollectionTerminal._effectiveCollectionTypes` appends the step's `mapOver` instead of its own `localMapOver`. Both `it.each` rows fail: "dataset input first" at `canAccept`, and "collection input first" at the invalid-connection check, which is what makes that check load-bearing.
- `_otherCollectionType` ignores the producing step's map over. All 3 tests fail at the downstream map-over assertions.

## Other challenges

- **Mocks / SimpleNamespace / restructuring:** none apply. The tests use real Pinia stores and the shared fixture. The only mock is the file's existing module-level `console.debug` filter.
- **Implementation-only assertions:** removed as described above. The remaining assertions use `canAccept`, `getInvalidConnectedTerminals` and a downstream terminal's `mapOver`, all of which the editor components consume.
- **Layout faking:** none.
- **API/integration overlap:** none at this layer. Backend execution semantics belong to #23676's API and framework tests.
- **E2E:** not added. The code under test doesn't depend on step type. `test_map_over_output_indicator` in `lib/galaxy_test/selenium/test_workflow_editor.py` already covers the path from map over to the output badge for a tool step. The remaining risk is whether real API subworkflow payloads match fixture step 37. `SubWorkflowModule.get_all_outputs` reuses the inner steps' output dicts (`extensions`, `collection`, `collection_type`), and the fixture follows that shape. If #23676 changes that payload, a subworkflow version of `test_map_over_output_indicator` would be the place to cover it.

## Results

- `npx vitest run src/components/Workflow/Editor/modules/terminals.test.ts src/components/Workflow/Editor/NodeOutput.test.ts`: 96 pass (94 in `terminals.test.ts`, down from 96 after the 5-to-3 consolidation and with the factory test extended; 2 in `NodeOutput.test.ts`, the other consumer of `parameter_steps.json` through `test_fixtures.ts`).
- `npx prettier --check` is clean on both changed files.
- `npx eslint` has 0 errors. The 2 `no-explicit-any` warnings, at lines 152 and 570, were already there.
- `npx vue-tsc --noEmit` reports no errors.

## Unresolved

Nothing. As the branch record already notes, #23676 still carries its own copy of this fixture step and will conflict in `parameter_steps.json` until it drops that copy on rebase.
