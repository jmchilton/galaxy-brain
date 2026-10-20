# Review response — mvdbeek, 2026-10-20

Addressed in [`23834d6a475`](https://github.com/jmchilton/galaxy/commit/23834d6a475) and [`3d5a45b09d8`](https://github.com/jmchilton/galaxy/commit/3d5a45b09d8). Drafts below are not posted.

## Query counts

SQL statements per `DataToolParameter.to_dict`, all values from the batch outside the page, measured with a `before_cursor_execute` listener in the unit harness:

| batch size | old head `fbb1a03a9c8` | new head |
| ---------- | ---------------------- | -------- |
| 1          | 4                      | 4        |
| 10         | 13                     | 6        |
| 50         | 53                     | 6        |

The count is the same for hidden (carried) and visible (pinned) values. The tag lazy-load in `make_hda_entry` kept it O(N) until `3d5a45b09d8` added `selectinload(tags)`.

## Draft: review reply

Thanks! Pushed 23834d6a475 and 3d5a45b09d8.

- **Build cost:** later batch values are now loaded in bulk instead of through `from_json` one at a time: one query for HDAs and one for HDCAs, with tags eager-loaded. Values already in state are skipped, and `multiple` params return early. A 50-value batch now runs 6 queries in `to_dict`, down from 53, and 10 values run 6, down from 13. Visible values off the current page still get an in-Python `hda_match` each in `_pin_live_hda_inputs`, but with no extra queries. Each off-page value still adds a pinned or carried entry, since that entry carries the label this PR adds.
- **Inactive cases:** only the active case gets `incoming` now.
- **Access:** the batch path only loads HDAs and HDCAs from the current history or the user's own histories, and an API test covers another user's HDA. I left the first value's `from_json` → carry path alone because it isn't new. Happy to tighten it in a follow-up.
- **Tests:** added API tests on `/api/tools/{id}/build` for the top level, a conditional (active case labelled, inactive case empty) and a conditional in a repeat.
- **Nit:** renamed to `selected_values`.
- One narrowing: `dce` batch values (dropped subcollections) don't get labels anymore. Dataset elements drop as `hda`, and `release_26.1` never labelled `dce` values either.

## Draft: inline reply (basic.py loop)

Done. Values already in state are skipped, `multiple` returns early, and the rest are bulk-loaded with deleted and errored rows filtered in SQL. The query count no longer grows with the batch size: 6 for 10 or 50 values.

## Draft: inline reply (populate_model.py cases)

Done. Only the case matching `__current_case__` gets `incoming`. The API tests assert that the inactive case's same-named param gets no options.

## Suggested pr_description.md edits (not applied; file has other uncommitted edits)

- Line 17 (bold paragraph): any batch value the history list doesn't show "in the current history or one of your own histories".
- Implementation bullet 3: replace "resolved through `from_json` like the first" with "bulk-loaded in one query per source (HDA, HDCA), limited to the current or the user's own histories; deleted or errored values and malformed ids are skipped". Add: "Only the active conditional case reads `incoming`."
- Risk Review Advice: the `full_name` keying is now covered by API tests for conditionals and repeats.
- Tests list: add the four `test_tools.py` API tests (`test_build_labels_every_batch_value`, `test_build_skips_batch_values_of_other_users`, `test_build_labels_batch_values_in_active_conditional_case_only`, `test_build_labels_batch_values_in_repeat`).
