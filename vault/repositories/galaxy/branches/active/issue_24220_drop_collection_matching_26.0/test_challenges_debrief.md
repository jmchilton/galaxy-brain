# Test challenges debrief (post re-scope)

Scope: tests this branch adds on top of `issue_24218_can_map_over_parity_26.0` (`d45d2fdb3bc`): `FormData.test.ts` drop tables + `sample_sheet` column-definition tests, and `test_tools.py::TestToolsApi::test_can_map_over_dce_on_collection_param`. Fresh pass; round-1 results in `earlier_drafts/1/` used only for reference. Nothing dropped or weakened. One gap filled (DCE refusals), split across the baseline and fix commits.

Commits after rebase: `622d604a43e` baseline, `cae496c3483` extract helper, `4854433d9cd` collection match fix, `8d7d6d1a078` DCE map-over, `9e7b3cb7ac9` column definitions on direct drops only, `4e52bb43c07` empty `collectionTypes`.

## Changes

- **Dropped collection elements had no refusal rows.** Every DCE row was an accept, so nothing showed `canAcceptSrc` refusing a DCE by its child's collection type. Added `refuses a dropped element holding a %s on a %j input`:
  - `paired` on `["list"]` — baseline (refused before and after).
  - `paired_or_unpaired` on `["paired"]` — in the collection match fix commit; the old suffix check accepted it (`"paired_or_unpaired".endsWith("paired")`).

## Challenges kept as-is

- **No separate `collectionMatch.test.ts`.** `matchCollectionType` is pure and could be table-tested directly, but the component tables already drive it through both callers (`canAcceptSrc` on dragenter/drop, `toDataOption` for the emitted value) and assert the emitted payload. A unit table would restate the same rows without exercising the two gates that drifted (the empty-`collectionTypes` bug was a gate disagreement a helper test wouldn't catch).
- **Component tests, not API.** The bug is client-side matching; the server can't observe it. The one server fact the client relies on (a `dce` + `map_over_type` on a collection param) is pinned by the API test.
- **No mocks / SimpleNamespace.** `droppedHdca` / `droppedCollectionElement` are typed `EventData` builders; `dropOnCollectionInput` asserts exactly one emit on accept and none on refusal.
- **Refusal alert matched with `stringContaining`.** Exact text depends on `collectionTypeToText` prose; the column-definition refusal (fixed string) is matched exactly. Left as is.
- **API test helpers.** Uses populators (`create_list_in_history`, `create_nested_collection`, `wait_for_jobs`, `get_history_collection_details`) and the class's `_run`; no raw HTTP repeated. The hand-built `list:list:list` with two inner lists stays: `create_list_of_list_in_history` makes one inner list, so 2 jobs couldn't show which level was mapped. Unchanged, so not rerun.
- **Column-definition gap not pinned:** a direct `sample_sheet` drop without any `column_definitions` on a column-defined input (refused by `columnDefinitionsCompatible`). Pre-existing behavior the branch doesn't change; the "other columns" row covers the refusal path.

## Red/green check (FormData.test.ts, source swapped per commit via `git show`)

| Tests at | Source at | Result |
|---|---|---|
| baseline | baseline (= `d45d2fdb3bc`) | 28/28 pass |
| helper extract | helper extract | 28/28 pass |
| match fix | helper extract | 10 red (7 accept rows, 3 refusal rows incl. new DCE row), all `AssertionError` at `toEqual` |
| DCE map-over | match fix | 2 red (element `list:list` on `list`; element `list` on `paired_or_unpaired`) |
| column defs | DCE map-over | 1 red (`list:list` mapped over column-defined `sample_sheet`) |
| empty types | column defs | 1 red (`list` on `[]`) |

Each commit green on its own source. API test is in the baseline and passes on 26.0 (pins server behavior; round-1 run, unchanged since).

## E2E

None added. Round 1 said Selenium couldn't drive the drop; corrected reasoning: there is a `drag_and_drop` helper on both backends (`has_driver.py` via seletools, `has_playwright_driver.py`), used by the workflow editor. But neither dispatches `dragenter`, and `FormData.vue` reads drag data in `onDragEnter` (`dragData` is empty on `drop` without it). An E2E would need a new history-item→tool-form drop helper that fires `dragenter`; changing the shared helper risks workflow-editor tests. Not worth it on a 26.0 backport when the component tables and the API test pin both halves of the contract. Follow-up candidate: a `tool_form_drop_history_item` helper + one map-over drop E2E on dev.

## Verification

- `vitest run src/components/Form src/components/Workflow`: 337/337.
- `vue-tsc --noEmit` clean; prettier clean; eslint 2 pre-existing `any` warnings.
- No Python changes this round.
