# Normal review

No blocking findings; acted on nothing. Server change verified against all three `accumulate_with_filter` filters; both paged-option merge sites covered.

Not acted on:
- L1 FormData/FormSelect key options by src+id, so direct and map-over rows share label/track-by key — pre-existing on 26.1 page one; dev fixes it in the larger 20657 map-over UI. Note as known 26.1 limitation in PR.
- L2 `limit == 1` load-more can stall on an all-duplicate page — default limit 50 makes it unreachable.
- N1 `WorkflowRunInputStep`/`WorkflowRunFormSimple` merges could use `mergeDataOptions` — they never see `map_over_type`; pure refactor, out of backport scope.
- N2 private `pageMergeKey` vs `itemUniqueKey` — intentional.
- N3 API test search assumes distinct names — passes; mild.

<details><summary>Full review</summary>

# Normal review (raw) — issue_24221_paged_map_over_options_26.1

Scope: `git log dbe4f2f7e41..HEAD` (3 commits: 2203d0d3d95 baseline, 660ae0a0b5d server, 8a0a1b3307b client). Re-ran unit `test_parameter_pagination.py` (3/3) and vitest `FormData/types.test.ts` (4/4) with node 22.20.0. No API run (debrief reports 13/13; nothing in review needed a re-run).

Verdict: no blocking or high findings. Backport is minimal and correct. Findings below are low/notes.

## Server: `accumulate_with_filter` correctness

Checked all callers (`DataOptionsBuilder.paginate`, the only caller, used at `lib/galaxy/tools/parameters/basic.py:2681` HDA, `:2794` DataToolParameter HDCA, `:3014` DataCollectionToolParameter HDCA):

- HDA filter (`dataset_matcher.hda_match`) returns a single match object or falsy — never a list. Unaffected: the outer `if len(matches) >= limit: break` fires after exactly one append, same as the old inner break.
- DataToolParameter HDCA filter returns a tuple `(hdca, match, subcollection_type)` — single match, unaffected (tuples deliberately not unpacked).
- DataCollectionToolParameter `_classify_hdca` is the only list emitter (0/1/2 entries). Only path with behavior change.

Offsets/has_more walk-through (rows HID desc; `A` emits 2, `B` 1):
- `[B, A]`, limit 2, offset 0 → `[B, A-d, A-m]`, db_offset 2 == total → has_more False. Fixed (was dropping A-m).
- `[A, B]`, limit 1: offset 0 → `[A-d, A-m]` has_more True; offset 1 → `[A-m]` (skip 1) has_more True; offset 2 → `[B]` has_more False. Consistent — offset keeps counting entries, so overshoot never skips anything; it can only re-send already-shown entries, which the client merge now dedups by (src, id, map_over_type).
- Chunk boundary: since the break is now only between rows, `rows_consumed` always reflects fully-emitted rows; the `db_offset` advance comment is still accurate.
- Overshoot bound: at most `limit + 1` entries (only 2-entry rows exist). `MAX_OPTIONS_PAGE_SIZE` clamp effectively becomes 501 — harmless.
- Non-chunked `paginate` branch (`chunked=False`) already `extend`ed full lists, so it was never affected.

Client offset model (`FormData.vue:336`): next offset = `meta.offset + limit`, independent of returned length — matches the server's entry-counting offset, so an overshoot page is followed by a page that starts with a duplicate. Correct given the dedup.

Python syntax: 26.1 `requires-python = ">=3.10"` (pyproject.toml:13), so `X | None` would actually be legal at runtime; the backport nonetheless keeps the 26.1 file's `Optional`/`Union` style, which is the right call for a minimal diff. Only differences vs dev's final pagination.py are typing style, the `make_hdca_entry` docstring/`collection_type` field (dev-only, unrelated) — correctly not ported.

## Client merge sites

Grepped `client/src` for `options_meta` / `${id}_${src}` merges:

| Site | Source of pages | map_over_type possible? | Covered |
| --- | --- | --- | --- |
| `Tool/ToolForm.vue:431` `mergeFetchedOptions` | `/api/tools/{id}/build` | yes | yes (mergeDataOptions) |
| `Workflow/Run/WorkflowRunDefaultStep.vue:203` `mergeFetchedOptions` | tool step build | yes | yes (mergeDataOptions; in-page drop also fixed) |
| `Workflow/Run/WorkflowRunInputStep.vue:151` `_fetchStepOptions` | `searchHistoryContents` (one entry per history item, shaped without map_over_type) | no | not needed |
| `Workflow/Run/WorkflowRunFormSimple.vue:353` `fetchStepOptions` | `searchHistoryContents` | no | not needed |

No other consumers of paged options (`FormElement.vue` only passes `options_meta` through).

## Findings

### L1 (low, note — pre-existing, not a regression) FormData/FormSelect identify options by src+id only, so two entries of one HDCA are indistinguishable once both are listed
- `client/src/components/Form/Elements/FormData/FormData.vue:173` (`currentValue` getter matches `id`+`src`), `:229` (both entries get identical `${hid}: ${name}` label), `:258` (keep-option replacement by `id`), `:409` (`createValue` dedups selected values by `id`).
- `client/src/components/Form/Elements/FormSelect.vue:136-145, 217-222, 256-260` — `trackBy` = `"key"` = `itemUniqueKey` (`src-id`), so vue-multiselect sees two options with the same key.
- Scenario: Extract dataset with a `list` HDCA; dropdown shows two identical rows "5: my list". User picks the second (map-over); emitted value carries `map_over_type: single_datasets`, but the select resolves the displayed selection to the first (direct) row and both may highlight as selected. In multi-select, choosing both keeps only one (`createValue` id dedup).
- This is the same on 26.1 for the first-page case the issue marks ✅ (✅ there means "entry present", not "selection unambiguous"). The backport makes later-page cases reach the same state, i.e. it extends exposure of an existing UX issue rather than creating one. Dev fixed this as part of the larger 20657 map-over UI (`FormDataOptionLabel`, map_over_type-aware `itemUniqueKey`/`findDataOption`).
- Suggested: leave out of this backport (matches the deliberate minimal scope); mention in PR description as known limitation on 26.1, or consider a small follow-up that only makes `itemUniqueKey` include `map_over_type` + adds a "(map over)" label suffix — but that touches FormData selection behavior and wants its own tests.

### L2 (low) A page consisting only of a duplicate can stall infinite-scroll at `limit` 1
- `FormData.vue:365-369` — observer fires only on intersection change.
- Scenario: only when `limit == 1` and the boundary falls mid-row: next page returns just the already-shown map-over entry, merge adds nothing, sentinel stays in view, no new intersection event; user must scroll away/back. With the default limit 50 the follow-up page always carries ≥49 new entries, so not reachable in practice. Pre-fix behavior had the same offset model.
- Suggested: no action; optionally note in debrief.

### N1 (nit) `WorkflowRunInputStep.vue:151` and `WorkflowRunFormSimple.vue:353` keep hand-rolled id/src merges
- Not buggy (history-contents rows never carry `map_over_type`), but they are now the only copies of the pattern `mergeDataOptions` replaced. Swapping them would be a pure refactor; correctly skipped for a minimal backport. Fine to leave for dev.

### N2 (nit) `pageMergeKey` vs `itemUniqueKey` naming split
- `client/src/components/Form/Elements/FormData/types.ts:114-117` — a second, private identity key next to the exported `itemUniqueKey`. Reasonable for 26.1 (avoids changing FormSelect/FormData keying), and the doc comment explains it. On dev the identity was unified into `itemUniqueKey`; the 26.1 divergence is intentional. No change.

### N3 (nit) API test name search relies on distinct HDCA names
- `lib/galaxy_test/api/test_tools.py:740` `page(0, 1, search=ll["name"])` — assumes `_create_hdca` gives the `list` and `list_of_list` different names; if they shared a name the first assertion would fail with `[(flat, None)], True`. Passed per debrief, so names differ; mild fragility only.

## Tests

- Unit test `test_accumulate_keeps_a_rows_matches_on_one_page` covers overshoot, has_more False at end, and mid-row offset resume — the key server cases. Red on old impl per debrief.
- `types.test.ts` covers same-page pair, cross-page pair, dedup, hda/hdca id collision. Red with id+src key per debrief. Good, focused.
- No ToolForm/WorkflowRunDefaultStep-level test that the components call the helper — acceptable; the call sites are one-liners.
- Baseline commit is first and passes on base per debrief; commit messages are clean, no plan refs.

## Review focus checklist

- Reuse: helper placed next to `itemUniqueKey`/`containsDataOption` in `FormData/types.ts` and shared by both forms — good, removes two duplicated merges.
- Python imports: no new imports in methods.
- No dev-only APIs or syntax in the backport.
- No security concerns.

</details>
