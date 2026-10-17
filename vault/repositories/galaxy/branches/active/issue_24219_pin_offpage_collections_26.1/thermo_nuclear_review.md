# Thermo-nuclear code quality review

Acted on the one structural finding in `32a0990a474` (pushed to `jmchilton`). `_page_hdca_matches` and `_pin_selected_hdcas` are now one base method, `_page_and_pin_hdcas`. It pins against the page it just built, not against `builder.options["hdca"]`, so the page-before-pin ordering is now part of the structure. `_hdca_entries` is declared on the base, each `to_dict` makes one call, and `HdcaEntriesT` moved next to `BaseDataToolParameter`. The collection param now uses `util.listify`. That changes no behavior, because `multiple = False`. The method name in the forward-merge note in `index.md` is updated (not committed).

Not acted on:
- Dead `hdca` slot in the `_classify_hdca` tuple. It is pre-existing, and changing it adds churn in a region that already conflicts on forward-merge.
- The three live/in-history predicates in `_pin_live_hda_inputs`, `_page_and_pin_hdcas` and `_carry_unresolved_inputs` are not unified. The carry predicate uses `value.history != history`, the pins use `history_id`. Unifying them would rewrite pre-existing HDA code on a stable branch.
- The pin eligibility check repeats in Python the SQL filter of `paginated_active_dataset_collections`. There is no shared predicate to reuse, and adding one to the model layer is out of proportion.
- The typed `page_filter` local stays. The mypy ambiguity with `Union[T, list[T]]` is real, and fixing it would mean changing the `paginate` signature.
- The data param still builds `_history_query(trans)` once per HDCA inside its closure. This is pre-existing.
- File size: `basic.py` was 3320 lines on base and is 3345 now. The 1k rule was already broken on base, so it is waived; the user asked not to restructure unrelated code.

Tests: ruff and black are clean. mypy reports 11 errors, the same as base, with none in `parameters/`. `test_data_parameters.py` 20 passed; API `test_tools.py::TestToolsApi -k build` 20 passed; `test_jobs.py -k rerun` 6 passed.

<details><summary>Full review</summary>

**Verdict before fixes: approve with one structural change.** The `_hdca_entries` classifier is the right reusable abstraction. It is shared by the page and the pin, so pinned entries are byte-identical to page entries, and it merged two copies of `_page_hdca_matches` into one. The net diff is small.

1. **Structural, acted on: temporal coupling between page and pin.** `_pin_selected_hdcas` got its page IDs by reading `builder.options["hdca"]` back. That was correct only while it ran right after `_page_hdca_matches` and before `_carry_unresolved_inputs`, which appends carried HDCAs to the same list. The branch had to reorder `DataToolParameter.to_dict` to satisfy that hidden order. Both call sites also built `hdca_entries` locally just to pass it to two calls in sequence. Fix: one method that pages, then pins against the local page entries and returns the unpinned values. The order invariant now lives inside one function, and two locals plus one call per site disappear. The return value is what the 26.2 forward-merge feeds to `_carry_selected_hdca`.
2. **Boundary, acted on: an implicit polymorphic contract.** The base class used `hdca_entries` without declaring it. Both subclasses defined `_hdca_entries` with the same docstring. Fix: declare it on the base with a `NotImplementedError` body and keep the docstring there.
3. **Nit, acted on: `HdcaEntriesT` placement.** It sat between `_carried_state_label` and `_is_connected_value`. It now sits with the HDCA listing helpers, above the base class.
4. **Nit, acted on: `[other_values.get(self.name)]`** is now `util.listify(...)`, the same as the data param.
5. **Not acted on, spaghetti risk:** three near-duplicate "live in this history" predicates, plus the pin's Python copy of the listing's SQL eligibility. Both are pre-existing, and touching them is out of proportion for 26.1.
6. **Not acted on, legibility:** `_classify_hdca` still returns `hdca` in each tuple, and only `_hdca_entries` consumes it (as `_`).
7. **File size:** pre-existing over 1k, and the diff adds about +25 lines net. Waived.
8. **Tests:** at the right layer (API), they use the existing helpers, and they assert pinned entries equal page entries. No change needed.

</details>
