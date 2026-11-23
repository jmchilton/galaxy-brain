Run via claude-opus-5-5 at high effort.

No refactoring of the base branch was performed.

# Baseline refactor: editor_subworkflow_map_over_tests

## Branch shape

`git diff 65e6daff233...HEAD` has two commits, already in baseline-then-fix order:

- `f863340af98` adds the fixture's subworkflow step 37 and its tests, with no source changes. 96 tests pass on the unfixed editor.
- `764d2bf8882` is the fix: 18 lines across `terminals.ts`, `workflowStepStore.ts` and two appended tests.

## Candidates considered

- **Extracting `declaredCollectionTypes` first, reading only `collection_types`.** Rejected. The helper exists only to hold the singular `collection_type` fallback. Without the fallback it would wrap a single property read, so the extraction would add no abstraction.
- **Correcting `DataCollectionStepInput.collection_types` to optional `string[] | null` first.** Rejected. The old required `string[]` was wrong, since the server already sends `None` for some tool inputs. But the change is a single line with no runtime effect, and the fix's `??` is its only reader. The fix commit's message already says it types both fields. A separate commit would split one type edit across two commits and give reviewers nothing they can't already see.
- **Test-side restructuring.** None needed. The thermo-nuclear review already put the shared helpers (`collectionOutput`, `connectAccepted`, `expectEveryOutputMappedOverList`) and the nested `describe` in the baseline commit. The fix commit only appends two short tests that use them. Codex's finding 4, the duplicated suite setup, was resolved the same way.
- **A tool/subworkflow union type for `DataCollectionStepInput`**, which the thermo-nuclear review recommended. Out of scope. It is pre-existing, larger than this branch, and not needed for the fix. As John decided, server code was left alone.

## Results

The history is unchanged: `f863340af98` (baseline) and `764d2bf8882` (fix). Nothing was committed, and the worktree is clean.

- At `764d2bf8882`, `npx vitest run src/components/Workflow/Editor/modules/terminals.test.ts src/components/Workflow/Editor/NodeOutput.test.ts` passes 98 tests.
- At `f863340af98`, the same command passes 96.
- No files changed, so prettier, eslint and vue-tsc were not rerun. The thermo-nuclear review's results for these commits still hold.
