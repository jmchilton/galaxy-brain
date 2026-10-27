No refactoring of the base branch was performed.

Candidates evaluated (fix commit `4a7dfd2c555`, ~30 lines of non-test code):

- `ElementIdentifierMapper.identifiers_by_dataset_id` (`lib/galaxy/tools/wrappers.py`): only caller is the new `UserToolEvaluator` line. Existing mapper users (`evaluation.py:511`, `parameters/wrapped.py:108`) look up per-dataset via `identifier()` and wouldn't be simplified by it. A pre-fix commit would add unused infrastructure.
- `element_identifiers` param on `setup_for_runtimeify` / `to_cwl`: threading an always-`None` param ahead of the fix is plumbing with no consumer; splitting adds a commit reviewers must read without payoff.
- `to_cwl` `properties["element_identifier"]` hunk: not behavior-preserving even without the new param - base never emitted `element_identifier` for `DatasetCollectionElement` inputs either, so it belongs to the fix.

History unchanged: `414a1fcb686` (Baseline tests), `4a7dfd2c555` (fix).
