---
upstream_base_branch: dev
record: galaxy/branches/issue_20900_invocation_validation
---
# Validate workflow invocation requests before side effects

- No PR yet · [branch record](../../../../repositories/galaxy/branches/active/issue_20900_invocation_validation/index.md) · refs [#20900](https://github.com/galaxyproject/galaxy/issues/20900)

Reject bad workflow invocation requests at the API before creating histories or other side effects. Fork head `07377e10531` (2026-10-15), 24 commits on dev `88127f42979`; now 1927 behind dev.

## Children

All eight extracted PRs merged; every merge commit is in `dev` (checked 2026-11-04 at `7e16f446410`).

- [`invocation_missing_input_404`](../../../../repositories/galaxy/branches/merged/invocation_missing_input_404/index.md) — [#24171](https://github.com/galaxyproject/galaxy/pull/24171) · `merged` · `extracted` — 404, not 500, for nonexistent HDA/LDDA/LD/HDCA inputs; 26.1.
- [`invocation_unknown_scheduler`](../../../../repositories/galaxy/branches/merged/invocation_unknown_scheduler/index.md) — [#24169](https://github.com/galaxyproject/galaxy/pull/24169) · `merged` · `extracted` — 400 for unknown scheduler IDs; 26.1.
- [`invocation_object_store_validation`](../../../../repositories/galaxy/branches/merged/invocation_object_store_validation/index.md) — [#24197](https://github.com/galaxyproject/galaxy/pull/24197) · `merged` · `extracted` — 400 for invalid storage routing before history creation; 26.2.
- [`invocation_tool_compatibility`](../../../../repositories/galaxy/branches/merged/invocation_tool_compatibility/index.md) — [#24209](https://github.com/galaxyproject/galaxy/pull/24209) · `merged` · `extracted` — Reject workflow-incompatible tools before invocation setup; 26.2.
- [`invocation_completion_action_validation`](../../../../repositories/galaxy/branches/merged/invocation_completion_action_validation/index.md) — [#24202](https://github.com/galaxyproject/galaxy/pull/24202) · `merged` · `extracted` — Validate completion actions and required export config; 26.2.
- [`invocation_subworkflow_input_connections`](../../../../repositories/galaxy/branches/merged/invocation_subworkflow_input_connections/index.md) — [#24203](https://github.com/galaxyproject/galaxy/pull/24203) · `merged` · `extracted` — Reject disconnected required subworkflow inputs; consistent runtime gaps; 26.2.
- [`invocation_parameter_expected_failure`](../../../../repositories/galaxy/branches/merged/invocation_parameter_expected_failure/index.md) — [#24265](https://github.com/galaxyproject/galaxy/pull/24265) · `merged` · `extracted` — Invalid subworkflow parameters fail with real reason (#20980 regression); 26.1.
- [`invocation_no_add_to_history_false`](../../../../repositories/galaxy/branches/abandoned/invocation_no_add_to_history_false/index.md) — `abandoned` · `extracted` — Server fixes plus client-type generator; 26.2. Path not taken.
- [`invocation_no_add_to_history_false_26.1`](../../../../repositories/galaxy/branches/merged/invocation_no_add_to_history_false_26.1/index.md) — [#24671](https://github.com/galaxyproject/galaxy/pull/24671) · `merged` · `extracted` — Honor `no_add_to_history: false` and empty `ds_map` (server only); 26.1.

## Remaining in the standing branch

- Validate-before-side-effects restructure: step runtime state computed before history creation (`3ee9cce9cf0`, `c5ee084841d`).
- Parameter type/restriction checks on input modules (`d6d7befdcd1`).
- Landing-request lookup check (`7b6ec3613e0`, `ff3919c0f39`); step named in missing-input errors (`a63e098d602`).
- Dataset-vs-collection, collection-type, deleted-input checks: blocked; valid collection mapping currently fails.
- Inherited API reds: `test_mapping_and_subcollection_mapping`, `test_workflow_resume_with_mapped_over_collection_input`, `test_workflow_rerun_with_use_cached_job_hides_output`, `test_run_replace_params_over_default`.

## Decisions

- 2026-10-14/15, John: extract four bug fixes, then four more guards, each standalone off a release branch.
- 2026-10-16, John: keep as reference while smaller PRs come out; do not PR as-is.
- Multiple-text per-value validator (`119716e6a2f`) is superseded upstream; drop on rebase, don't extract.
- 2026-11-02, John: no response to the `no_add_to_history` [decision gist](https://gist.github.com/jmchilton/c68c645a8fa6d8da58af9a5e70f060c1); go with 26.1 server-only, abandon the 26.2 generator branch and describe it in the PR as the path not taken. The generator isn't needed by the remaining #20900 work.
