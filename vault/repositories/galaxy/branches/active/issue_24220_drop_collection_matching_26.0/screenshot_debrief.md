# Screenshot debrief

Screenshots obtained. They show before and after for the three drops named in #24220, at head `6abce38796f`.

## How

- No existing E2E test drags onto a tool form input, and none takes a screenshot of one. `test_history_multi_view.py` only drags into the history picker. No test was added or changed. These screenshots are ad hoc captures, not test output.
- One Galaxy instance (gunicorn on 8095, scratch sqlite, `test/functional/tools/sample_tool_conf.xml`) served two Vite dev servers. "After" (5185) ran this worktree's client. "Before" (5186) ran a scratch copy of the client with the changed client files reset to `origin/release_26.0`. Both used the same server and the same history: `1: pair (paired)`, `2: samples (list:paired)`, `3: mixed (list:paired_or_unpaired)`.
- The drag was synthetic: Playwright dispatched `dragstart` on the history item, then `dragenter`/`dragover` on `.form-data` (screenshot `_1_dragover`), then `drop` (screenshot `_2_dropped`). Each shot covers the `#center` panel only.
- I also checked the "after" drop of `list:paired` onto `paired_or_unpaired` in the `/build` request. It sent `batch: true, map_over_type: "paired"`, so the form maps over the collection instead of passing it in directly.

## Index (`screenshots/`)

| Scenario | Before (`release_26.0`) | After (branch) |
|---|---|---|
| `list:paired_or_unpaired` (hid 3) dropped on `collection_paired_test` (`paired` input) | `before_paired_input_drop_list_paired_or_unpaired_{1_dragover,2_dropped}.png`: green highlight, value becomes `3: mixed` (wrong: the dropdown does not list it) | `after_paired_input_drop_list_paired_or_unpaired_{1_dragover,2_dropped}.png`: warning highlight + alert "mixed list of paired and unpaired dataset collection is not a valid input for paired type dataset collection parameter."; value stays `2: samples` |
| `paired` (hid 1) dropped on `collection_paired_or_unpaired` (`paired_or_unpaired` input) | `before_paired_or_unpaired_input_drop_paired_*`: refused, alert "dataset pair dataset collection is not a valid input for paired_or_unpaired type ..." | `after_paired_or_unpaired_input_drop_paired_*`: accepted, value `1: pair (paired)` |
| `list:paired` (hid 2) dropped on `collection_paired_or_unpaired` | `before_paired_or_unpaired_input_drop_list_paired_*`: refused, alert "list of pairs dataset collection is not a valid input for paired_or_unpaired type ..." | `after_paired_or_unpaired_input_drop_list_paired_*`: accepted, mapped over, value `2: samples (list:paired)` |

## Caveats

- The alert shows only while dragging. After the drop, `onDragLeave`/`clearHighlighting` clears it, so the alert appears in `_1_dragover` shots only.
- The form gives no visible map-over indicator for an accepted collection drop. The `/build` payload above is the only evidence of map-over.
- In the "before" shots the Atkinson Hyperlegible font failed to load: Vite returned 403 for the symlinked `node_modules` outside the scratch root. Only the font looks different.
- No implementation or test changes were made. The Galaxy worktree is clean.
