# Test challenges debrief

Scope: tests this branch adds on top of `issue_24218_can_map_over_parity_26.0` (`d45d2fdb3bc`) — `FormData.test.ts` drop tables and `test_tools.py::TestToolsApi::test_can_map_over_dce_on_collection_param`. Nothing dropped or weakened; two tests strengthened, folded into the baseline commit.

Commits after rebase: `59d9f797cc3` baseline, `6691da71d7b` collection match fix, `b77da23dfd5` DCE fix.

## Changes

- **`dropOnCollectionInput` helper** (FormData.test.ts): refusals now also assert no `input` was emitted; accepts assert exactly one new `input`. Before, a drop that both alerted and emitted (or emitted twice) would pass.
- **`test_can_map_over_dce_on_collection_param`**: it only checked job/implicit-collection counts, never that the jobs ran. Now it waits for both jobs to finish ok (`wait_for_jobs`), and checks the implicit output is `list:list` with outer identifiers `test0`/`test1`, i.e. mapped over the DCE's children, not the parent `list:list:list`.
  - `get_history_collection_details(..., wait=False)` / `wait_for_jobs` rather than `wait_for_history`: histories with collections built by `create_nested_collection(collection=[hdca ids])` stay `queued` (copied-collection rows in `new`), so a history wait times out even when jobs are ok. Pre-existing populator behavior, not this branch.

## Challenges kept as-is

- **Component tests, not unit tests of `matchCollectionType`**: tables drive drag/drop through `FormData.vue` and check the emitted value, so they cover `canAcceptSrc` + `toDataOption` together. A separate `collectionMatch.test.ts` would only restate those rows.
- **Not API-layer**: the bug is client-side matching, so the server can't observe it. The one server fact the client relies on (DCE + `map_over_type` on a collection param) is pinned by the API test.
- **Hand-built nested collection in the API test**: `create_list_of_list_in_history(collection_type="list:list:list")` makes one inner list only, so 2 jobs vs 1 can't show which level is mapped. Kept the two-inner-list build.
- **No mocks/SimpleNamespace** to replace; `droppedHdca`/`droppedCollectionElement` are typed `EventData` builders.

## Red/green check

- Baseline commit: FormData tests 24/24 pass on baseline source; API test passes on 26.0 (pins server behavior).
- Fix commit tests on baseline source: 9 red (7 accept rows, 2 refusal rows), all at the `toEqual` assertion.
- DCE commit tests on fix-commit source: 2 red (element holding `list:list` on `list`; element holding `list` on `paired_or_unpaired`).

## E2E

None added. No existing Selenium/Playwright test drags history items onto tool-form inputs; the form uses HTML5 drag events fed via `eventStore`, which Selenium action chains don't drive reliably. Client tables + API test cover both halves. Candidate follow-up if a history→tool-form drag helper is built.

## Verification

- `vitest run src/components/Form src/components/Workflow`: 330/330.
- `vue-tsc --noEmit` clean; prettier clean; eslint 2 pre-existing `any` warnings.
- `ruff`/`black` clean; API `-k test_can_map_over_dce_on_collection_param` passes.
