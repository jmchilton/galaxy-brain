- `kind/refactoring` — the PR is mainly typing of four collection modules; the two latent-bug fixes ride along in code it rewrites.
- `area/dataset-collections` — `galaxy.model.dataset_collections.{matching,structure,type_description,registry}`.
- `area/workflows` — map-over planner (`workflow/map_over.py`, `workflow/modules.py`) and the empty-list linked-match failure in workflow steps.
- `area/tool-framework` — `tools/execute.py` (`_structure_for_output` DCE identifier source).

The labeler would also add `area/testing` (unit and framework tests); dropped as not central.
