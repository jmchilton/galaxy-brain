# sample_sheet_vue3 — polish debrief

2026-10-07. Branch went from `4dd34fe8db3` (stacked on #23938) to `ed2a6de8339`, one commit on dev `02a2e659909`.

## Rebase
- #23938 merged 2026-10-07 12:38. Rebased onto dev with no conflicts, which dropped #23938's commits.
- After the rebase: vitest for Collections/Landing/RuleBuilder 150/150, vue-tsc clean, eslint warnings only (pre-existing hyphenation style), prettier clean.
- `ag_grid_36` is still stacked on the pre-rebase `4dd34fe8db3` and needs a restack.

## CI
- Every red on `4dd34fe8db3` failed at "Restore client cache", the fork cache eviction. Those tests never ran.
- Fork CI on `ed2a6de8339` was queued at handoff.

## Checklist (GENERAL + WORKFLOW_RELATED)
- WORKFLOW_RELATED is included because sample sheets are workflow-run inputs.
- No item failed. "Who hits this" has no linked user report; the evidence is the red tests.
- Fixed: removed a stale `// Example Row Data` comment and its commented-out code.
- Not done: a `FetchGrid` watcher test. There's no component test to extend and the fix is one line.

## Strengthening round
- **Compat MODE 3 opt-in.** Removing the wrapper opt-in turns five `SampleSheetGrid` tests red, so it's unit-proven.
  - Removing only the inner `AgGridVue` opt-in keeps the tests green. A probe showed the inner vnode then gets `modelValue` **and** the legacy `value`/`onModelCompat:input` pair.
  - So the inner opt-in keeps that vnode clean rather than being strictly required. The description now says that instead of "both are needed".
  - The `useAgGrid.ts` comment still says both opt out, which is accurate.
- **Required int cleared to `null`.** Added to the parser table and the grid test, because the number editor ag-grid infers from the starting `0` hands over `null`.
  - On dev, `Number(null)` is 0, so validation passed and `parseInt(null)` stored `NaN`.
- **Restricted-int claim.** Narrowed to editors that hand over strings. Required restricted ints already matched on dev through the number editor.
- **Description fixes:**
  - The claim that tests mock `ag-grid-vue3` is now scoped to the `SampleSheetGrid` tests.
  - Added bold lines for "the reshape is the fix" and "MODE 3 reaches all five grids".
- The checklist subagent was not re-run. The test change only added a case and didn't change any verdict; the "unit tests" answer was reworded by hand.

## Left for John
- Rejected edits revert silently, as on dev, and stricter float parsing makes that happen more often. A one-line toast in `setCellValue` would fix it, but it changes visible behaviour, so it's John's call.
- Follow-ups, out of scope: `useGridHelpers` validation for `file_type`/`dbkey` extra columns, and an `AgRowData` union type.
