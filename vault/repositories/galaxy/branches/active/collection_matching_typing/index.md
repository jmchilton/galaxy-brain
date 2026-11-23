---
upstream_base_branch: dev
related_records:
  - galaxy/branches/subworkflow_mapping
  - galaxy/branches/mapping_axes_model
---
# collection_matching_typing

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:collection_matching_typing?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/collection_matching_typing)

## Status

Head `47d70d843f6` (pushed, one commit on `dev` at `65e6daff233`): fully types `galaxy.model.dataset_collections.{matching,structure}`, drops both from the `mypy.ini` red list and narrows the call sites in `tools/execute.py`, `workflow/modules.py` and `workflow/map_over.py`.

No PR.

No CI yet. Locally mypy is clean on the touched modules and their callers, and 423 unit tests pass (`test/unit/data/dataset_collections`, `test/unit/workflows`, two tool execution modules); both ran in a borrowed venv from another worktree, and the full `make mypy` and `tox -e mypy_legacy` were not run.

## Decisions

- Extracted from the standing branch [subworkflow_mapping](../../../../../agents/gx_standing/standing_branches/subworkflow_mapping/index.md) at John's request (2026-11-23) so he can read it on GitHub. It was written against `dev`, not cherry-picked: the typing commits on #23676 (`2cf5712cef7`, `adf1054cb7a`, `3c824c6e146`) are interleaved with the axes model.
- Not behavior-neutral in three small places: unenumerated trees raise `NotImplementedError` where they raised `AttributeError` or a bare `Exception`; the map-over planner skips a nameless step input; `MatchingCollections.structure` no longer sets `when_values` on the shared `leaf`.
- `subworkflow_mapping` and `mapping_axes_model` will conflict with this in `matching.py`, `structure.py` and `mypy.ini` until rebased onto it.
