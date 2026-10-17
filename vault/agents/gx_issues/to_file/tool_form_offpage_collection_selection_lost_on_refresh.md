# Tool form: selected collection from a later option page is lost on form refresh

Raw agent draft (from re-harden of branch `issue_20657_input_processing_mode`, 2026-10-17). Blocks that branch's scope decision — second scope evaluation recommended folding the fix in; parked instead. Polish per PREPARE_TO_FILE.md.

## Bug

Tool form data-collection inputs list options paginated (`/api/tools/{id}/build` options + load-more via `accumulate_with_filter` in `lib/galaxy/tools/parameters/pagination.py`; client merges pages in `ToolForm.vue` `mergeFetchedOptions` / `WorkflowRunDefaultStep.vue`). If the user picks an HDCA that only appears on a later page (scrolled / load-more), then anything triggers a form refresh (`ToolForm.onUpdate` → `formConfig.value = data`, ToolForm.vue ~L233 — e.g. uploading a dataset, changing another param that re-builds), the refreshed options are page 0 only. The selected HDCA is not in them, so FormData's `currentValue` resolves to the first option (`findDataOption` fallback / options watcher re-emits `createValue`). Silent: a different collection runs. If the selection was a map-over (`map_over_type`, `batch: true`) entry it may also flip to direct (one job instead of one per element) — wrong hint, wrong job count, wrong results.

## Root cause

Server pins selections that fall outside the page for datasets but not for visible collections:
- `DataToolParameter._pin_live_hda_inputs` (basic.py ~L2900 on dev) pins live selected HDAs into `pinned`.
- `DataCollectionToolParameter._carry_selected_hdca` (basic.py ~L3161 on dev; absent on release_26.1) only carries deleted / hidden / foreign-history HDCAs. A visible in-history HDCA outside the current page is never pinned.

## Proposed fix (from scope eval, ~15–25 server lines + 1 API test)

In `_carry_selected_hdca`, also pin a visible in-history selected HDCA not on the current page: emit the `_classify_hdca` entries (direct + map-over, carrying `map_over_type`) with `keep=True` into the existing `pinned["hdca"]` list. Client already merges `pinned` and resolves by identity (`findDataOption` / `itemUniqueKey` incl. `map_over_type` on the issue_20657 branch), so no client change expected.

Precondition to verify first: on refresh, `other_values[self.name]` must hold the selected HDCA. If it only holds the batch wrapper (`{batch: true, values: [...]}`) the pin needs `map_over_type` carried through `from_json` → cross-layer, bigger.

Test: API test with `limit: 1`, two+ collections, select the one on page 2 (and its map-over variant), rebuild with that value → response `pinned` contains it (both entries). Optional Selenium/vitest refresh check.

## Affected versions / backport

- Collection option pagination + `_classify_hdca`: release_26.1, release_26.2, dev. Not 26.0 or older.
- release_26.1 lacks `_carry_selected_hdca` entirely (hidden/deleted carry landed later) — fix there may need more; confirm reproduction on 26.1 before targeting it. Likely target release_26.2 (or 26.1 if clean).

## Related

- galaxyproject/galaxy#19234 (map-over choice snapping back to direct — fixed on issue_20657 branch for same-page cases), #20657.
- issue_20657 branch also fixed `accumulate_with_filter` splitting a row's direct + map-over entries across pages (has_more false on final row) — that removed the "map-over half on page 2" variant of this bug; the "whole HDCA on later page" case remains.
- Branch record: vault/repositories/galaxy/branches/active/issue_20657_input_processing_mode/ (codex_review.md "Not acted on", scope_evaluation.md).
