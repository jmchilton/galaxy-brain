# Debrief: tool_form_offpage_collection_selection_lost_on_refresh

Files: raw draft `tool_form_offpage_collection_selection_lost_on_refresh.md`, proposal `proposed_tool_form_offpage_collection_selection_lost_on_refresh.md`.

## Research (verified at origin/dev 7c86d742327)

- Server, `data_collection`: `to_dict` pages HDCAs, then `_carry_selected_hdca` carries only deleted, hidden or foreign HDCAs. A visible in-history HDCA that is off the page goes nowhere.
- Server, `data`: `_pin_live_hda_inputs` pins only HDAs. `_carry_unresolved_inputs` has the same deleted/hidden/foreign condition for HDCAs. Same gap. The writer found this; the raw draft missed it.
- Unwrapping: `from_json` turns `{"values": [...]}` into the bare HDCA through `to_python`. The `data` path records the `batch` flag locally but doesn't keep it, and `map_over_type` is dropped. So `other_values[name]` holds the HDCA. This settles the raw draft's open precondition.
- Client: `ToolForm.onUpdate` posts no `options_pagination` and replaces `formConfig`. History changes (`lastUpdateTime`) and `refresh_on_change` trigger it. `FormData.currentValue` falls back to `formattedOptions[0]` (L187), and the options watcher (L1090) emits it. A dropdown pick isn't cached as a keep-option. Drag-and-drop is, through `handleIncoming` / `normalizeOption`.
- The id_src keep-key collapse is real: keep-options are keyed `${id}_${src}` (FormData.vue L233), so a `keep=True` direct entry and a `keep=True` map-over entry for the same HDCA would collide.
- Attributions: #22643 (mvdbeek, 26.1) added `pinned`. #23865 (mvdbeek, 26.2) added `_carry_selected_hdca`. Both confirmed with `gh` and `git branch --contains`. 26.1's `data_collection` `to_dict` has no carry at all and lists hidden HDCAs on the page.
- Raw draft corrections: `findDataOption` / `itemUniqueKey` exist only on the issue_20657 branch, so the draft's "no client change" basis was dropped (the writer did this). The raw fix also proposed `keep=True` for both entries, which hits the collapse above.

## Repro

Real execution, API level. I added a temporary untracked test to the `issue_20657_input_processing_mode` worktree (HEAD 10ae420a663) and ran it once by itself, after waiting for another session's API run to finish. Then I deleted the file; the worktree is clean. That branch doesn't change `basic.py` or `pagination.py`; the dev-side drift there is unrelated text-param work. With two list collections, `limit: 1`, and the older one selected:

- `__FILTER_EMPTY_DATASETS__` `input`: options = [newer], pinned.hdca = [] (has_more true)
- `cat1` `input1`, `{batch: true, values: [hdca]}`: options = [newer], pinned.hdca = []

The control assertions passed and the pinned assertion failed for both. The UI flow was not run.

## Review changes

- Added a result table up front showing the empty `pinned.hdca` (show-me).
- Replaced the "not yet run" test with the one that was run, covering both inputs, and noted that it fails.
- Marked the UI steps as worked out from the code and not run.
- Table: the `data_collection` carry is 26.2+. Context now says 26.1 lacks that carry.
- Fixed the FormData link (L168 pointed at the computed, not the fallback) and added the watcher link. Added a note on why a dropdown pick isn't kept but a drag-and-drop is.
- The rest stands: approach, alternatives, keep-collapse note, and the out-of-scope `map_over_type` note.

## Leftovers

- The UI flow is unconfirmed: the 51+ collection setup and whether search-selected options behave like load-more ones.
- "A sibling issue" needs its number once `proposed_tool_options_paging_splits_map_over_entry.md` is filed.
- My run sent `map_over_type: null` in the `cat1` value. The issue's test omits it; `to_python` ignores the extra key.
- 26.1 is affected by code reading only.

## Recommendation

Post. The server gap is reproduced for both parameter types, there's no duplicate, and a silent wrong-input run is worth an issue. Assign John: it came out of his issue_20657 branch.
