# Test challenges debrief (round 2, after re-scope)

Re-checked every test from scratch on the re-scoped branch. Changes:

- Moved one FormData test into the baseline commit, because it passes on base.
- Added a baseline API test. It shows that a `list,list:list` input runs a list:list whole or mapped over. Before this round nothing covered the submission the re-scope makes selectable.
- Deleted `types.test.ts`, whose 8 helper cases failed at import on the parent commits. In its place there are component tests at both `mergeDataOptions` call sites (ToolForm, WorkflowRunDefaultStep), each red on base at its own assertion.
- Added a FormData case for the `findDataOption` fallback.
- No E2E test.

Commits (base `dbe4f2f7e41`):

| old | new | change |
|---|---|---|
| `7c385ebeb27` | `4df74333a48` Baseline tests | adds the dataset-input FormData test (moved) and the API map-over test; message updated |
| `3418449967b` | `43a0d6691f1` server paging fix | content unchanged |
| `7a3efdbea0e` | `621a35204b8` client mergeDataOptions | `types.test.ts` removed; ToolForm and new WorkflowRunDefaultStep tests |
| `e625fd88f5d` | `669e0de55f3` map-over selectable | `findDataOption` unit cases removed; FormData fallback case added |

## Per test

### Python
- **Unit `test_accumulate_pages_single_matches`, `test_accumulate_skips_filtered_rows`** (baseline): kept. They test a pure helper with a tiny fake `query_fn` rather than a mock, and pin that the offset counts matches, not rows. They pass on base `pagination.py` and on HEAD.
- **API `test_build_collection_options_pagination_splits_direct_and_multirun_entries`** (baseline), replaced in the fix by **`..._keeps_direct_and_multirun_entries_together`**: kept. Both use the existing `_create_hdca` / `_build_tool_param` helpers. The local `page()` closure is the only place this request shape is built, so no new populator helper is needed. Red check redone: with base `pagination.py` the fix test fails at its first assertion (`[(ll, None)]` instead of both entries). With the baseline commit's `test_tools.py` on base `pagination.py`, 13/13 pass.
- **API `test_tool_execute.py::test_list_of_lists_direct_or_mapped_over_list_or_nested_list_input`** (new, baseline): this fills a gap. The re-scope makes it possible to submit `{batch: true, values: [{map_over_type: "list", ...}]}` for a collection that *also* matches the input directly. The existing map-over API tests (`test_jobs.py` `identifier_collection` / `is_of_type`, `test_map_over_list_paired_or_unpaired_with_list_of_lists`) all use inputs a list:list can't match directly.
  - The new test runs `collection_list_or_nested_list_input` both ways and contrasts the results.
  - Direct: no implicit collection, and the output says "Nested List".
  - Mapped: one implicit collection, and the output says "Simple Dataset".
  - It uses the `TargetHistory`/`RequiredTool` describers. It passes on base, which is server-only behavior the branch relies on, so it belongs in the baseline commit. It also passes on HEAD.

### Vitest `FormData.test.ts` (component; red-checked with base FormData.vue/types.ts)
- **"resolves a value without map_over_type to the direct entry"** (baseline): kept. Passes on base.
- **"leaves collections on a dataset input unlabelled"**: **moved to baseline**. It passed on pre-fix code, so it pins existing behavior and is not a red test for the fix. It guards that the suffix never reaches dataset inputs.
- **"selecting the map-over entry emits it"**, **"shows only the map-over entry selected for a map-over value"**, **"names what each mapped-over job receives"**: kept. Each is red on pre-fix code at its own assertion:
  - two rows selected instead of one;
  - the direct value emitted instead of the map-over one;
  - labels missing the suffix.
- **"resolves a value with an unlisted map-over type to the direct entry"** (new, fix commit): the component-level replacement for the `findDataOption` "falls back" unit case. It exercises the fallback branch. I first meant it for the baseline commit, but on base it fails at its own assertion: both rows show as selected, which is the bug. So it stays as a red test in the fix commit.

### Vitest `types.test.ts`: **deleted**
Every case failed at import on its parent commit because the helpers are new. As a stand-in red check, I temporarily put the old semantics into the helper bodies and restored them afterwards:
- (A) WorkflowRunDefaultStep's old behavior: src+id key, dedup within the page, first src+id match.
- (B) ToolForm's old behavior: src+id key, dedup only against existing options.

Verdicts:
- `mergeDataOptions` "same page": red under A → **replaced** by the WorkflowRunDefaultStep component test.
- `mergeDataOptions` "map-over after direct": red under A and B → **replaced** by the ToolForm component test. The stubbed page there also repeats the direct entry, which covers dedup.
- `mergeDataOptions` "drops options already listed": green under both → dropped; its assertion is now in the ToolForm test.
- `mergeDataOptions` "datasets vs collections with the same id": green under both. The src in the key comes from base, so this isn't the fix → dropped.
- `findDataOption` (4 cases):
  - "mapped over the same way" and "without map_over_type": duplicate the FormData tests → dropped.
  - "falls back": moved to the FormData level (above).
  - "needs the same src": base identity behavior, green under A → dropped.
  - The helper is only used by FormData, so its component tests now cover the exact-match, fallback and no-map-over-type paths.

### Vitest call-site tests (commit 3; red-checked with base ToolForm.vue / WorkflowRunDefaultStep.vue)
- **`ToolForm.test.js` "keeps a map-over option loaded on a later page"**: existing `[nested]`, stubbed POST `/build` page `[nested, nestedMapped]`, called through `onLoadMore`. On base the map-over entry is dropped, failing at the assertion. Follows the file's existing `wrapper.vm.onUpdate()` style.
- **`WorkflowRunDefaultStep.test.js` (new file) "keeps both entries of a collection loaded on the same page"**: `shallowMount` with testing pinia, stubbed POST `/build`, called through `onLoadMore`. On base, the dedup within the page drops the map-over entry, failing at the assertion. This is the only harness for this component and is kept minimal.

## E2E

None added. Round 1's reason (more than 50 HDCAs and infinite scroll) doesn't apply to the re-scoped bug, so I re-decided.
- One `list:list` on page one reproduces it.
- The client side is selection identity only. FormData tests cover it from the click to the emitted `{batch: true, values: [{src: "hdca", id, map_over_type: "list"}]}`.
- The new baseline API test shows the server runs that exact value mapped over for this tool, unlike the direct value.
- The ToolForm submit path between the two isn't changed by this branch, so an E2E test would only re-check existing wiring. That's not worth a slow Selenium test on a backport.

## Results (HEAD `669e0de55f3`)
- unit `test_parameter_pagination.py`: 2/2 on HEAD and with base `pagination.py`
- vitest Form + Tool + Workflow/Run: 295/295 (node 22.20.0). Was 300: -8 types cases, +1 ToolForm, +1 WorkflowRunDefaultStep, +1 FormData.
- vitest at commit 3 (`621a35204b8`): FormData + ToolForm + WorkflowRunDefaultStep 36/36
- vitest baseline FormData at the baseline commit (base impl): 21/21
- vue-tsc: clean (before deleting `types.test.ts`; only JS test files changed since); eslint/prettier: pass (pre-commit)
- API `test_build_collection_options or test_build_data_options or pagination`: 13/13 on HEAD and 13/13 for the baseline commit's `test_tools.py` on the base server; the fix API test fails at its first assertion on the base server
- API `test_list_of_lists_direct_or_mapped...`: passes on base (baseline commit) and on HEAD
