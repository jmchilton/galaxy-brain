# Review response — mvdbeek, 2026-10-20

Addressed in [`23834d6a475`](https://github.com/jmchilton/galaxy/commit/23834d6a475), [`3d5a45b09d8`](https://github.com/jmchilton/galaxy/commit/3d5a45b09d8) and [`3f058729bad`](https://github.com/jmchilton/galaxy/commit/3f058729bad), the last after a subagent review. Posted 2026-10-20: [review reply](https://github.com/galaxyproject/galaxy/pull/24211#issuecomment-6295528913), [basic.py](https://github.com/galaxyproject/galaxy/pull/24211#discussion_r4327324483), [populate_model.py](https://github.com/galaxyproject/galaxy/pull/24211#discussion_r4327324861).

## Query counts

SQL statements per `DataToolParameter.to_dict`, all values from the batch outside the page, measured with a `before_cursor_execute` listener in the unit harness:

| batch size | old head `fbb1a03a9c8` | new head |
| ---------- | ---------------------- | -------- |
| 1          | 4                      | 4        |
| 10         | 13                     | 6        |
| 50         | 53                     | 6        |

The count is the same for hidden (carried) and visible (pinned) values. The tag lazy-load in `make_hda_entry` kept it O(N) until `3d5a45b09d8` added `selectinload(tags)`.

## Draft: review reply

🤖 *Responding from a Claude agent working on this PR for John.*

Thanks! Pushed 23834d6a475, 3d5a45b09d8 and 3f058729bad.

> **Build cost now scales with the batch size (regression).**

Fixed. Later batch values are bulk-loaded instead of going through `from_json` one at a time: one query per source (HDA, HDCA) plus a tag load. Values already in state are skipped, and `multiple` params return early. Measured in the unit harness, a 50-value batch now runs 6 queries in `to_dict` (was 53), and 10 values run 6 (was 13). Off-page visible values still get an in-Python `hda_match` each in `_pin_live_hda_inputs`, but with no extra queries for direct format matches. Each off-page value still adds a pinned or carried entry, since that entry carries the label this PR adds. Later HDCA values also get labels now. As in `from_json`, collections with deleted elements are skipped, which costs one summary query per later collection.

> **Same-named data params in inactive conditional cases get the active case's batch too.**

Fixed. Only the active case gets `incoming` (details inline).

> **Nothing on the `from_json` → `src_id_to_item` → `_carry_unresolved_inputs` path checks access.**

The batch path now only loads HDAs and HDCAs from the current history or the user's own histories. An API test covers another user's HDA. I left the first value's `from_json` → carry path alone because it isn't new. Happy to tighten it in a follow-up.

> **Tests: … an API test that POSTs a batch of hidden HDAs to `/api/tools/{id}/build` (top level, in a conditional, in a repeat).**

Added on `/api/tools/{id}/build`:
- the top level
- a conditional: the active case is labelled and the inactive case is empty
- a conditional inside a repeat
- another user's HDA
- an HDCA batch
- an HDCA batch with deleted elements

> **Nit: `selected_values` would read better.**

Renamed.

One narrowing compared with the earlier head: `dce` batch values (dropped subcollections) don't get labels. Dropped dataset elements arrive as `hda`, so the drag-and-drop case from the issue is unaffected.

## Draft: inline reply (basic.py loop)

🤖 *Responding from a Claude agent working on this PR for John.*

Done. Values already in state are skipped, `multiple` returns early, and the rest are bulk-loaded, with deleted and errored rows filtered in SQL. The query count no longer grows with the batch size: 6 for both 10 and 50 values.

## Draft: inline reply (populate_model.py cases)

🤖 *Responding from a Claude agent working on this PR for John.*

Done. Only the case matching `__current_case__` gets `incoming`. The API tests assert that the inactive case's same-named param gets no options, both at the top level and inside a repeat.

## Suggested pr_description.md edits (not applied; file has other uncommitted edits)

- Line 17 (bold paragraph): any batch value the history list doesn't show "in the current history or one of your own histories".
- Implementation bullet 3: replace "resolved through `from_json` like the first" with "bulk-loaded in one query per source (HDA, HDCA) plus a tag load, limited to the current or the user's own histories; deleted or errored values, collections with deleted elements and malformed ids are skipped". Add: "Only the active conditional case reads `incoming`."
- Risk Review Advice: the `full_name` keying is now covered by API tests for conditionals and repeats.
- Tests list: add the six `test_tools.py` API tests (`test_build_labels_every_batch_value`, `test_build_labels_every_batch_collection`, `test_build_skips_batch_collection_with_deleted_elements`, `test_build_skips_batch_values_of_other_users`, `test_build_labels_batch_values_in_active_conditional_case_only`, `test_build_labels_batch_values_in_repeat`).
