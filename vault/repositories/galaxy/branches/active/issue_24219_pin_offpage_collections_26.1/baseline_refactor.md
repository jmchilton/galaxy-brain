Split one behavior-preserving refactor commit (shared HDCA page listing on `BaseDataToolParameter`) ahead of a now-small fix commit; the four original commits collapse to two.

Old head: `32a0990a474`. New head: `09a7f2012fe`. `git diff 32a0990a474 09a7f2012fe` is empty (same tree).

1. `406e85c34ab` Share one HDCA page listing across data and collection params (refactor, no behavior change)
   - Adds `HdcaEntriesT`, the `_hdca_listing_visible_only` class attribute (`True` data, `False` collection), and a per-param `_hdca_entries` classifier declared on the base.
   - One base `_page_hdca_matches` replaces the two near-duplicate subclass copies.
   - Keeps base call order in `DataToolParameter.to_dict`: carry unresolved, then page.
   - Entry equivalence: data filter now returns a 1-element list in place of a tuple, and the collection filter returns `None` in place of `[]`. `accumulate_with_filter` handles both the same way, so the pages are unchanged.
2. `09a7f2012fe` Pin selected collections outside the tool form option page (fix, Fixes #24219)
   - Renames `_page_hdca_matches` to `_page_and_pin_hdcas`, adds the `selected` argument and the pin loop that returns unpinned values, and reorders the data call site to page/pin before carry. The collection call site passes `util.listify(other_values.get(self.name))`.
   - Includes both new API tests (`test_build_collection_options_pinned_outside_page`, `test_build_collection_options_pinned_matches_page_entry`) and the `inputs=` kwarg on `_build_tool_param`.
   - basic.py diff is about +31/-10.

Why split: the refactor was about two thirds of the original basic.py churn and is independently reviewable; the fix is now readable on its own.

Verified at the refactor commit: ruff, black and isort are clean. mypy on `basic.py` reports 11 errors, all pre-existing and none in `parameters/`. `test_data_parameters.py`: 20 passed. API `test_tools.py::TestToolsApi -k build`: 18 passed, and the 2 pinned tests don't exist there yet.
Fix commit tree is identical to the previously tested old head (prior runs: 20 unit passed, 20 API build passed).

Follow-up (coordinator): with `basic.py` from refactor commit `406e85c34ab` and the head tests, `test_tools.py::TestToolsApi -k pinned` gives 2 failed (both new collection pin tests) / 1 passed (existing HDA pin) — the new tests are red without the fix commit.
