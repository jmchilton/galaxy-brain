# Initial implementation debrief

Branch `issue_24474_collection_input_type_26.2`, based on `release_26.2` (`0fa4dc4c4fa`), implementing [#24474](https://github.com/galaxyproject/galaxy/issues/24474).

```
created .../differential-review/snapshots/20261101T145924Z-implementation-8f11cea7dc92.json
  implementation @ 8f11cea7dc92 vs origin/release_26.2 (merge-base 0fa4dc4c4fa3)
  first snapshot: 3 commits, 6 files, 11 hunks
```

## What changed

- `DataCollectionToolParameter.from_json` now checks the type of the value it binds against the declared `collection_type`, using `CollectionTypeDescription.accepts`. The tool form dropdown and the workflow editor use the same rule. The value can be an HDCA, a DCE's child collection, or a `CollectionAdapter`. A mismatch raises `ParameterValueError`: "a dataset collection of type 'list' was supplied, but this parameter accepts only 'paired'". Untyped inputs are unaffected. `sample_sheet` into `list`, `paired` into `paired_or_unpaired`, and `list` into `list:paired_or_unpaired` stay valid.
- Unexpanded batch values (`batch` truthy or `__class__: Batch`) skip the check. They appear in tool form build state and name the collection being mapped over. Execution expands batches first, so each per-job value is still checked. This also catches a `map_over_type` that splits a collection into the wrong type.
- Workflow runtime step parameters (`check_param(..., allow_collection_map_over=True)`, used only by `WorkflowModule.compute_runtime_state` step updates) also accept collections the input can map over. The invocation maps over them, and the legacy run form relies on this. Collections the input can neither take nor map over get a 400 at request time.

## Coverage of paths

- Legacy `/api/tools` and the tool request API both reject with 400. Tool requests reject at request time, because the check runs in `populate_state_async`.
- A workflow edge that passes an incompatible collection straight through (e.g. an untyped workflow collection input feeding a `paired` tool input) now fails the job at preparation (`_validate_incoming`) with the same message. Before, the job ran with the wrong structure. Rejecting such edges at scheduling time in `map_over.py` is a possible follow-up.

## Tests

- Baseline commit (`4a936050c47`): unit tests for compatible values in `test/unit/app/tools/test_data_collection_parameters.py`, plus `test_build_map_over_collection_input_has_no_error`. All pass on the base.
- Fix commits: unit tests for rejected HDCAs, DCEs and adapters, the batch boundary and `allow_map_over`. API tests: `test_run_rejects_incompatible_direct_collection`, `test_run_rejects_incompatible_collection_element`, `test_run_rejects_incompatible_map_over_type` and `test_tool_request_rejects_incompatible_direct_collection` in `test_tools.py`, plus `test_run_step_parameter_dict_rejects_incompatible_collection` and `test_untyped_collection_input_incompatible_with_tool_fails_job` in `test_workflows.py`.
- Ran the collection-related subsets of `test_tools.py` (69 passed) and `test_workflows.py`. The only failure was `test_run_map_over_with_step_parameter_dict`, which led to the runtime map-over change. Unit suites under `test/unit/app/tools` and `test/unit/workflows` pass.

## Decisions

- Base `release_26.2`: this tightens validation, so input that used to be accepted silently is now rejected. That argues for the newest release rather than 25.1/26.0. The fix only needs `accepts()`, which exists from 26.1 on; older branches have `can_match_type`.
- The check lives in `from_json`, next to the existing deleted-collection checks, because every path calls `from_json` before `validate`.

## Incident

My first draft was lost to a `git stash` race. The Galaxy stash list is shared across worktrees. I stashed `basic.py` to run baseline tests, and the issue_24376 workhorse popped that stash into its own worktree. That agent restored it as a stash entry. I re-applied the change by hand. Following the coordinator's instructions, I compared both leftover stash entries (`dc2137e7`, `c4c78f50`) by SHA: each was my superseded draft. I dropped them. I no longer use `git stash`.
