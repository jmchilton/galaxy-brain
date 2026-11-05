---
upstream_base_branch: dev
record: galaxy/branches/issue_20900_invocation_validation
---
# Validate workflow invocation requests before side effects

- No PR yet · [branch record](../../../../repositories/galaxy/branches/active/issue_20900_invocation_validation/index.md) · refs [#20900](https://github.com/galaxyproject/galaxy/issues/20900)

Reject bad workflow invocation requests at the API before creating histories or other side effects. Fork head `bcbd2de187c` (2026-11-05): 7 commits on dev `7e16f446410`, rebased and re-hardened after every extraction merged.

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

- `fde4e03dd8d`: baseline tests.
- `cc2099794c5` and `7e670abd636`: behavior-neutral refactors.
- `f4d51ef252a`: validate every batch entry before side effects. This covers parameter type, restriction and validator checks; deleted inputs; dataset-vs-collection checks (by id or URL); sample-sheet URIs; and null replacement/resource params.
- `cf54435a4ef`: landing-request lookup before invocation.
- `2aab3a22916`: untyped collection inputs are no longer saved as `list` (new editor nodes still default to `list`).
- `bcbd2de187c`: collection-type check on collection inputs.

## Decisions

- 2026-10-14/15, John: extract four bug fixes, then four more guards, each standalone off a release branch.
- 2026-10-16, John: keep as reference while smaller PRs come out; do not PR as-is.
- 2026-11-05: extractions all merged; the re-hardened branch moved to `branches_need_decision` on scope (see the branch record's implementation debrief).
- 2026-11-05, John: reject datasets (by id or URL) given to collection inputs; fix tests that mis-declare such inputs.
- 2026-11-05, John: a missing collection type defaulting to `list` is a Galaxy bug; fix it (only new editor nodes default to `list`), then enforce declared collection types.
- Multiple-text per-value validator (`119716e6a2f`) is superseded upstream; drop on rebase, don't extract.
- 2026-11-02, John: no response to the `no_add_to_history` [decision gist](https://gist.github.com/jmchilton/c68c645a8fa6d8da58af9a5e70f060c1); go with 26.1 server-only, abandon the 26.2 generator branch and describe it in the PR as the path not taken. The generator isn't needed by the remaining #20900 work.
