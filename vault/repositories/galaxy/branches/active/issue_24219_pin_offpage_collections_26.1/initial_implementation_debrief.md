# Initial implementation debrief

Branch `issue_24219_pin_offpage_collections_26.1`, base `release_26.1` (`dbe4f2f7e41`), head `b124a95b52f`.

## What changed

- `lib/galaxy/tools/parameters/basic.py`
  - New module helper `_pin_selected_hdcas(builder, history, values, hdca_entries, *, visible_only)`: a selected HDCA that is live, in this history and listing-eligible (`visible_only` matches the listing query), but not on the returned page, goes to `pinned["hdca"]` as the entries the listing would emit. Returns the unpinned values so `DataToolParameter` can still carry hidden/deleted/foreign ones.
  - Each param gets `_hdca_entries(trans, security, matcher)` returning a classifier HDCA -> entry dicts. Page listing and pin share it, so pinned entries are byte-identical to page entries (incl. `map_over_type`, implicit-conversion name, `column_definitions`).
  - The two `_page_hdca_matches` copies merged into one `BaseDataToolParameter` method taking `visible_only` (data: True; data_collection on 26.1: False, hidden demoted to direct-only by `_classify_hdca`).
  - `DataToolParameter.to_dict` now pages HDCAs before pin/carry so the pin can see the page.
- `lib/galaxy_test/api/test_tools.py`: `_build_tool_param` gains `inputs`; two API tests:
  - `test_build_collection_options_pinned_outside_page` — issue's test, both `__FILTER_EMPTY_DATASETS__` and `cat1` batch; also asserts nothing is pinned when the selection is on the page.
  - `test_build_collection_options_pinned_matches_page_entry` — `collection_paired_test`: pinned `list:paired` (map-over) and hidden `paired` (direct) equal their unpaginated page entries.

## Decisions

- `keep` not set on pinned HDCAs (data param uses `keep=False` like page entries; collection param omits it). Avoids the client keep-cache collapsing a direct + map-over pair keyed by `id_src`.
- When an HDCA is both direct and map-over, both entries are pinned (mirrors the page). Which one the user picked is not recoverable server-side (issue: out of scope, part of #20657).
- Tag filter not re-checked on pin, same as the existing HDA pin.
- No client change and no vitest: `FormData.formattedOptions` already merges non-keep pinned entries into the select.

## Tests run

- New tests red before fix (at the `pinned` assertion), green after.
- `test_tools.py::TestToolsApi -k build` 20 passed; `test_jobs.py -k rerun` 6 passed; `test/unit/app/tools/test_data_parameters.py` 20 passed.
- `TestDataManagerToolsApi::test_build_does_not_leak_hda_from_user_bundle` fails identically on base code (unrelated data-table option).
- ruff, black, mypy (no new errors vs base).

## Open questions

- 26.1 `data_collection` still drops a deleted/foreign selected HDCA (26.2 #23865 carry not on 26.1). Left for scope evaluation.
