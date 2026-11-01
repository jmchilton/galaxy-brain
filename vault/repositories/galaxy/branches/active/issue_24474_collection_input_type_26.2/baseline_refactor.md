Run via Opus 5.5 at low effort.

No refactoring of the base branch was performed.

The history is unchanged, and HEAD is still `97445bc95ec`. Round 1 already moved the `HistoryQuery` type-string split (`394b2bfb762`) ahead of the fix. Its report is `earlier_drafts/1/baseline_refactor.md`.

## Re-scope commits reviewed (`b6791d07a7c..HEAD`)

None of the re-scope commits contains a change that also makes sense on the base:

- `lib/galaxy/workflow/map_over.py` adds three things: the `IncompatibleCollectionInput` exception, a new `elif` branch in `_find_collections_to_match` that raises it, and the `_rejects_incompatible_collection` predicate. The last commit names that predicate. All three are new behavior for collections that don't match. The base has no unmatched-collection branch, so there is nothing to extract ahead of the fix.
- `lib/galaxy/workflow/modules.py` wraps `MapOverPlanner.plan_map_over` in a `try/except` that turns the new exception into `FailWorkflowEvaluation`. Without the exception, the wrapper would be dead code on the base.
- `lib/galaxy/tools/parameters/basic.py` now keeps the `collection` object instead of only `collection_type`, so it can compare sample sheet columns. That method was added by this branch's own fix commits, so it doesn't exist on the base. It could be folded back into those commits, but only for a cosmetic gain, which is the same reasoning round 1 used for the "Reuse HistoryQuery" follow-up.
- `lib/galaxy/workflow/run_request.py` got checks in `0595e98bba3` and `c3f93b1ee0b`, and `66e7474a571` removed them again. The net diff from the base is zero.
- The rest are tests and a fixture fix (`rename_based_on_input_collection.gxwf-tests.yml`). That fixture fix is needed only because the branch now rejects a list passed to a paired input, so it belongs with the fix.

## Verification

At HEAD `97445bc95ec`, `PYTHONPATH=lib pytest -p no:postgresql -p no:warnings test/unit/app/tools/test_data_collection_parameters.py test/unit/workflows -q` gave 313 passed, 1 skipped.
