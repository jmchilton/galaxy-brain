# Thermo-nuclear code quality review

No commits. I reviewed the cherry-picks (`3311cf2dd1f`, `62058ed38ed`) for backport correctness and the branch's own code (`fd4963c2021` and the tests) for structure. I found no structural regression and no cheap, contained win that is worth the churn on a stable branch.

Not acted on:
- **Shared carried-HDCA helper (dev follow-up).** `DataToolParameter._carry_unresolved_inputs` and `DataCollectionToolParameter._carry_selected_hdca` repeat the same carry check (`deleted or not visible or other history`) and both build the entry with `make_hdca_entry(..., f"({state}) {name}", keep=True)`. The data-param copy also never passes `subcollection_type`. So a `multiple` data param that carries a non-`list` HDCA loses `map_over_type`, the same bug class as `fd4963c2021`. That code predates this branch, and `origin/dev` has the same gap. Fix both together on dev with one helper that also classifies.
- **Second `_history_query(trans)` in the carry.** Deduplicating it means hoisting `history_query` into `to_dict`, which changes the signature of the cherry-picked `_page_hdca_matches`. The extra query is only built on the carry path. Not worth it.
- **Merge-up conflict.** `_carry_selected_hdca` now takes `(builder, trans, history, dataset_collection_matcher, value)`, and 26.2 takes `(builder, history, value)`, so the merge-up will conflict for certain. Resolve it by keeping the 26.1 classified version, which carries the `map_over_type` fix forward.
- **Behavior note on `fd4963c2021` (intended).** When the param has `column_definitions` and the carried HDCA's columns don't fit, `_classify_hdca` drops the direct match and leaves only multirun. The carried entry then gets `map_over_type` where it had none before. That is consistent with how listed HDCAs behave. When an HDCA matches both ways, the carry picks direct, the same as 26.2.
- **Redundant `subcollection_type if kind == "multirun" else None` in `_page_hdca_matches`.** Direct entries already have `None`. The line is cherry-picked/pre-existing code, so I kept it identical to 26.2.
- **Untyped `trans` / `history` / `dataset_collection_matcher` / `value`.** These match the sibling methods. Typing only this one would be inconsistent.
- **File size.** `basic.py` was 3343 lines on base and is 3314 at head, a net shrink. `test_tools.py` and `test_jobs.py` were already over 1k lines. No threshold crossing.
- **Cosmetic tweaks** (tuple-unpack style, an early return in the carry): these would only widen the textual diff against 26.2. Skipped.

<details><summary>Full review</summary>

Range `dbe4f2f7e41..13c7352f165` (head). Diffstat: 6 files, +170/-100.

## Cherry-picks (backport correctness)

- Removed `History.active_visible_dataset_collections`, `DatasetCollectionManager.history_dataset_collections`, and `DataCollectionToolParameter.match_collections` / `match_multirun_collections`. A grep of `lib/`, `test/`, `client/src`, and `templates/` finds no remaining callers. The `match_collections` calls left in `meta.py` and `workflow/modules.py` go to `DatasetCollectionManager.match_collections`, which is a different method and still exists.
- Removed the `visible_only` kwarg from `History.paginated_active_dataset_collections` and `_paginated_dataset_collections`. No caller in `lib/` or `test/` still passes it. The cache key drops the flag consistently.
- `_classify_hdca` loses its `hdca.visible` gate. That is correct now that the listing is visible-only. Hidden HDCAs only reach the classifier through the carry, where map-over classification is what we want.
- `make_hdca_entry` docstring updated for `keep` on collection carries. Accurate.
- Known, and kept for merge-up parity: the `(deleted)` label is effectively unreachable because `from_json` raises on deleted HDCAs. `value.history != history` lazy-loads the relationship where `history_id` would do.

## Own code: `_carry_selected_hdca` classification (`fd4963c2021`)

- Right layer. It reuses `_classify_hdca`, `_carried_state_label`, and `make_hdca_entry`, and adds no new matching logic, flags, or modes. It is one call site next to the paging call.
- `matches[0]` relies on the documented ordering in `_classify_hdca`: direct comes first, and direct has no subcollection type. The comment states that invariant. This is acceptable and simpler than the earlier `kinds` dict.
- `_history_query(trans)` is only built when a carry applies, because it sits inside the guard. Cost is negligible.
- Code-judo candidate considered: one `_hdca_option(builder, hdca, name, subcollection_type, keep=None)` used by both `_page_hdca_matches` and the carry, plus the data-param carry. That would remove the triplicated `make_hdca_entry` construction, but it rewrites cherry-picked code. Deferred to dev (see the not-acted list).

## Tests (`7bee3166e32`, `c5f2b4503bd`, `13c7352f165`)

- `_build_tool_param(inputs=...)` is the minimal extension of the existing helper. `_carried_hdca_option` removes the repeated find/count/`keep`/label block in three tests. Good.
- The hidden map-over test sends no `map_over_type`, so it proves the server derives it. The other-history map-over test sends the client's realistic payload. Both cases are covered.
- The rerun test in `test_jobs.py` repeats the inline `matching`/`keep` asserts, mirroring the cherry-picked hidden rerun test next to it. Kept identical in shape for consistency with upstream.

## Size / spaghetti

- No new conditionals in unrelated flows. Net shrink in `basic.py` and `model/__init__.py`.

</details>
