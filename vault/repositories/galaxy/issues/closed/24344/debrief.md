# Debrief: Edit Attributes saves comment_lines as a string

Source: `edit_attributes_text_metadata_saved_as_string.md` (playwright FAQ loop, `galaxy_ui_driver` test `test_history_dataset_auto_detect_metadata`). Proposal: `proposed_edit_attributes_text_metadata_saved_as_string.md`.

## Research

- Code verified on origin/dev (`5c843e0822e`; relevant files identical to the local checkout): `set_edit` → `spec.unwrap(payload.get(name) or None)`; `comment_lines` on `TabularData` has no `param` → base `MetadataParameter`, so the value passes through unchanged.
- Unit repro (scratchpad `repro.py`, real `Tabular` + `ColumnDataProvider`, no server): `unwrap("3") == "3"`; the provider returns data for int `3` and raises `TypeError: '<' not supported between 'int' and 'str'` for `"3"`.
- Registry scan: `comment_lines` is the editable numeric element with no `param` on 123 datatypes; `columns` on 4 R datatypes is the only other case.
- Duplicates: none. #16303 (closed, fixed by #16304) is related: 23.1 began sending `"comment_lines": "0"`; #16304 only unwrapped single-element arrays.

## Corrections to the source note

- The endpoint it cited (`?data_type=raw_data&provider=column_with_stats`) returns 400 "Conversion" (`test_raw_data_no_converter_returns_400`). The real path is `?data_type=raw_data&columns=[...]` on a plain `tabular`. BED, GFF and VCF go to their own raw providers, so the BED in the source note would not crash there.
- `ColumnDataProvider` is a weak consumer: no client code calls it, and it already breaks on any numeric column (see below). So the pitch is a type-contract bug (the API returns a string where the client's `HistoryDatasetDisplay.vue` types a number), with the provider crash as supporting evidence.

## Review round (one subagent)

- Premise confirmed; no pushback. Fixed `Tabular` → `TabularData`, the read endpoint (`/api/histories/{id}/contents/datasets/{id}`), the "one reader" overstatement (the peek blurb also reads the value, but works with a string), and made the Context wording concrete (an out-of-tree test; #16303/#16304).
- It fixed a real design error in my approach: mapping `None` → `no_value` would break `Tabular.set_meta`, which sets `comment_lines = None` on purpose to mean "unknown". `MetadataCollection.__setattr__` also re-runs `unwrap` on every assignment (spot-checked), so `marshal` must give the same result when run twice and must keep `None`.

## Leftover

- Not driven end to end through the API (the provider crash was shown at unit level; the string storage was seen through the UI in the gxui test). The first implementation test should be an API test.
- A non-numeric form value raising in `marshal` would come back as a 500 from `set_edit`. A friendlier error is worth considering.
- **Separate bug, candidate for its own `to_file/` item:** `ColumnDataProvider.get_data` computes `middle_index = (count / 2) - 1`, a Python 2 leftover that makes the median list index a float. Any numeric-column stats request raises `TypeError: list indices must be integers or slices, not float` even with clean metadata. No API test covers a numeric column.

## Recommendation

Keep internal / fix PR-first. It is a small, real type bug, but its only user-visible crash is on an endpoint that no client calls. A PR that adds `IntParameter` and an API test is shorter to review than an issue plus a PR. Bundling the median fix in the same PR (or filing it separately) would make it worth more.
