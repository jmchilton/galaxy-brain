Run via claude-opus-5-5 at high effort.

**ADDRESSED.** The fix is in the right layer. The only real finding was test-side duplication, now removed. Head `764d2bf8882` (not pushed).

# Thermo-nuclear code quality review: editor_subworkflow_map_over_tests

## Scope

Reviewed `git diff 65e6daff233...HEAD` on the two commits: the baseline `690f6bd8bcf` (fixture step 37 plus tests) and the fix `d645ec0eeda` (`terminalFactory` falls back to a subworkflow input's singular `collection_type`). As John decided, the fix stays client-side. `SubWorkflowModule.get_all_inputs` was not touched.

## Findings

1. **Fix layer: no change needed.** The connection menu, node-input drop, linting, `useTerminal` and the internal map-over walks in `terminals.ts` all build terminals through `terminalFactory`. One translation there covers every consumer, so the factory is the right home. The alternatives are worse:
   - Normalizing in `workflowStepStore.addStep` would rewrite server data in the store.
   - Teaching `InputCollectionTerminal` about the payload shape would leak the wire format into the terminal model.
2. **Silent fallback in `declaredCollectionTypes`: kept, simplified.** It prefers `collection_types` over `collection_type`. That order is arbitrary, but harmless: tool inputs send only the plural and subworkflow inputs send only the singular, and the type's doc comments say so. Its four-line `if` body became a single `??` expression, which behaves the same for `[]`, `null` and missing fields.
3. **Type widening: correct as is.** `collection_types` went from required `string[]` to `string[] | null` and optional. The old type was wrong: the server already sends `None` for tool inputs with no collection types. Only the factory reads the field.
4. **Duplicated suite setup: fixed.** The new top-level `describe` copied the `canAccept` suite's `beforeEach`, which builds terminals and loads the steps into the store. Codex's finding 4 declined to fix this. The block is now a nested `describe("subworkflow map over")` inside `canAccept`. That suite already holds the map-over tests on the advanced fixture, so its setup is reused and the copy is gone.
5. **Repeated assertions and connection helpers: fixed.**
   - The two downstream map-over `expect`s appeared in all four tests, so they became `expectEveryOutputMappedOverList()`. That also removed the module-level `LIST_MAP_OVER` / `LIST_LIST_MAP_OVER` constants between the suites.
   - `connectList` (fixed to the list output) and the fix commit's inline `canAccept`-then-`connect` became one `connectAccepted(input, output)`.
   - `listOutput()` and the inline `terminals[...]["output"] as OutputCollectionTerminal` lookups became `collectionOutput(label)`.
   - Each fix-commit test is now one or two lines.
6. **File size: no new crossing.** `terminals.ts` was already 1089 lines on base and is now 1093. `terminals.test.ts` was 1113 and is now 1182. Neither crosses 1k because of this branch.

## Process

- Restructuring the block changes the lines next to the fix commit's added tests, so a fixup made at HEAD would conflict when replayed. I stopped the rebase at the baseline commit (`GIT_SEQUENCE_EDITOR="sed -i '1s/^pick/edit/'"`) and committed the test restructure there with `--fixup`.
- Replaying the fix commit conflicted only on its two appended tests. I re-added them to the nested block in the new helper style.
- I committed the `??` simplification as `--fixup` of the fix commit, then ran `GIT_SEQUENCE_EDITOR=true git rebase -i --autosquash 65e6daff233`.
- Final commits:
  - `f863340af98`: baseline tests and fixture.
  - `764d2bf8882`: fix and its two tests.
- Commit messages are unchanged and still accurate.

## Results

- At HEAD, `npx vitest run src/components/Workflow/Editor/modules/terminals.test.ts src/components/Workflow/Editor/NodeOutput.test.ts` passes 98 tests.
- At `f863340af98` (baseline only, no fix), the same command passes 96.
- At HEAD with `terminals.ts` reverted to base, both fix tests fail, and the other 94 pass.
- `prettier --check` is clean on all four changed files.
- `eslint` has 0 errors. All 4 `no-explicit-any` warnings are on lines this branch didn't change.
- `vue-tsc --noEmit` passes.

## Recommendations (not done)

- `DataCollectionStepInput` is one flat type for two different payloads. Subworkflow inputs also lack the required `fields` and `column_definitions`. A union of tool and subworkflow collection input types, or one shared server-side `InputDescription` contract that the editor types are generated from, would make the two-shapes rule explicit. That is pre-existing and bigger than this branch.
- Codex's note still stands: the fixture's `content_id` is the literal `"subworkflow"`, where the server sends the encoded child workflow ID. No terminal code reads it.
