# Thermo-nuclear code quality review

Acted on one finding in `3147227b128`: `_carry_selected_hdca` no longer builds a throwaway `kinds` dict to choose `map_over_type`. It takes the first `_classify_hdca` entry, which is the direct match when one exists, and uses an early return in place of the nested `if`. Behavior is unchanged. `test_tools.py -k build_` 20 passed (plus the known base failure `test_build_does_not_leak_hda_from_user_bundle`), `test_jobs.py -k rerun` 7 passed, black/ruff clean, mypy no errors in `basic.py`.

Not acted on:
- Shared `_carry_hdca_entry` helper for this method and `DataToolParameter._carry_unresolved_inputs`: the duplication is three lines. A new module-level helper on a stable branch adds forward-merge friction against 26.2's `_carry_selected_hdca`.
- Computing `history_query` once in `to_dict` and passing it to both `_page_hdca_matches` and the carry: this would change `_page_hdca_matches`'s signature on 26.1. The extra `HistoryQuery` is only built when a foreign HDCA is selected.
- Single tests helper for the repeated `keep` / `(not in current history)` asserts: too small, as `test_challenges_debrief.md` already decided.
- `basic.py` file size: already 3343 lines on base and grows by about 23. It does not cross the 1k threshold. Decomposing it is out of scope for a 26.1 fix.

<details><summary>Full review</summary>

Scope: `origin/release_26.1...87338280d79`. `basic.py` +23, `test_tools.py` +46, `test_jobs.py` +22.

Overall: the change is small and placed in the right layer. It is a sibling of `_page_hdca_matches`, and it reuses `make_hdca_entry`, `_carried_state_label` and `_classify_hdca` rather than adding new matching logic. It adds no new flags or modes. It is one call site in `to_dict`, next to the paging call. There is no structural regression.

1. Code judo, acted on: the `kinds` dict-and-ternary in `_carry_selected_hdca`.
   `kinds = {kind: sub for kind, _, _, sub in matches}` followed by `None if "direct" in kinds else kinds.get("multirun")` rebuilds an ordering that `_classify_hdca` already guarantees. Its docstring says direct entries come first, and a direct entry's subcollection type is always `None`. The first entry's subcollection type is therefore the answer, and the dict, the `or []` and the ternary can all go. An early return also removes a nesting level. The old docstring explained the client's one-`keep`-per-id rule. That reasoning belongs in the debriefs, so the docstring now just says "one entry".

2. Boundary: `trans` is threaded in only to rebuild `self._history_query(trans)`, which `_page_hdca_matches` also builds internally. The cleaner shape is to hoist `history_query` into `to_dict` and pass it to both. On 26.1 that means changing a signature for a negligible cost. Not acted on.

3. Duplication: `make_hdca_entry(builder.security, v, f"({state}) {v.name}", keep=True, ...)` now appears in `_carry_unresolved_inputs` (data param) and `_carry_selected_hdca` (collection param). A `_carried_hdca_entry(builder, value, **kw)` helper would remove it. That fits a dev cleanup better, because 26.2 has the same pair. Not acted on.

4. Untyped params (`trans`, `history`, `dataset_collection_matcher`, `value`): these match the surrounding methods (`_page_hdca_matches`, `_classify_hdca`), so typing only this one would be inconsistent. Not acted on.

5. Tests: both reuse existing helpers (`_build_tool_param` gained `inputs=`, `_create_hdca`, `__history_with_ok_collection`, `build_for_rerun`). The `inputs` kwarg is the minimal extension. No issues.

6. Forward merge: 26.2's `_carry_selected_hdca(builder, history, value)` has a different signature and condition, so the merge will conflict no matter what. The resolution should keep 26.2's wider condition (hidden/deleted, since 26.2 lists visible only) plus this branch's classification for `map_over_type`. The early-return form does not make that harder.

</details>
