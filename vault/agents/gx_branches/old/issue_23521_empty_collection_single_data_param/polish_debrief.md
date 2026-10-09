# issue_23521_empty_collection_single_data_param — polish debrief (stopped at checklist)

Rebased onto `origin/release_26.1` and pushed to `jmchilton` as `eaf5c260ccc` (was `8a34460bfc8` off `dev`, then `3fcc8b1e47b` after the plain rebase). Polishing stopped at step 3: two checklist items fail on a judgement call. No `pr_description.md` or `pr_titles.md` yet.

## Done
- Rebase: one small conflict in `test/unit/app/tools/test_actions.py` imports. `release_26.1` lacks `pytest` and `ProvidesHistoryContext` imports that `dev` had, so `pytest` was re-added.
- Commit message reworded. Dropped "Fixes #23521, #19538 and the post-validation half of #22401". Per `23521_current_case_theory.md` this guard doesn't fix #23521, and #19538 belongs to `issue_23521_conditional_case_resolution`. Issue lists were removed from the code and unit-test comments too.
- Found a live API route. #22406 (in 26.0/26.1) already rejects a bare HDCA in `DataToolParameter.from_json`, but `{"src": "dce"}` pointing at a subcollection element, such as one pair of a `list:paired`, gets through. Added API test `test_tools.py::test_nested_dce_rejected_for_single_data_param`.
  - On `release_26.1` code it fails with a 400 that reads `Error executing tool with id 'cat1': Expected [<HDA(1)>, <HDA(2)>] to be hashable`, the `wrap_values` TypeError collected by `tools/execute.py`.
  - On the branch it passes with the named message.
- Local results:
  - Unit `test_actions.py`: 11 passed. The new unit test fails on base code.
  - API: 5 passed. These are the new test plus `test_hdca_rejected_for_single_data_param_in_conditional`, `test_can_map_over_dce_from_larger_list_paired`, `test_run_dbkey_filter_nested_collection_dce` and `test_identifier_multiple_reduce_in_conditional`.
  - ruff, black, isort, flake8 and pre-commit all clean.
- Fork CI: runs on `3fcc8b1e47b` were cancelled by the re-push. Runs on `eaf5c260ccc` were all queued when polishing stopped, with no reds.

## Why stopped (questions for John)
1. **Layer.** The obvious alternative is to extend #22406's check in `DataToolParameter.from_json` (`basic.py`, beside the HDCA rejection, keeping its `batch_wrapper` exemption) to a DCE with `child_collection`. The API, rerun and tool-request paths all go through `from_json`. Workflow runs never reduce into a non-multiple data param: `_find_collections_to_match` always maps over (`modules.py:735-736`). No path was found that reaches the action-level guard while skipping `from_json`, apart from the unit test calling `DefaultToolAction.execute` directly. The options are:
   - (a) move the check to `from_json`;
   - (b) keep the action-level guard as a backstop;
   - (c) do both.
   Under (a), the unit test (0/1/2-element HDCA straight into the action) loses its reason to exist.
2. **Evidence of users hitting it.** The only reproduction is a hand-built `src: dce` request. There's no user report now that #23521 is ruled out. Is it still worth a `[26.1]` PR as a 400-message cleanup? Before the change it's already a 400, just with an opaque message.
3. **Branch name.** `issue_23521_empty_collection_single_data_param` no longer fits: the branch neither fixes #23521 nor is about empty collections. Rename it (e.g. `reject_nested_dce_single_data_param`) before opening?
