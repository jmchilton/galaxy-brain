Run via Claude Opus at high effort.

**Acted on:** a batch regression. The new validate-first loop ran `populate_module_and_state` once per batch entry, and `queue_invoke` then ran it again per entry: 2N populates where dev did N. Validation now populates once per distinct `param_map`, and input-step modules are built once per step as locals instead of re-injected onto `step.module` for every entry. Fixup squashed into "Validate workflow run requests before creating histories". Head `4b4c7d39b9a` -> `456acb2f1d8`, pushed.

**Not acted on:** the single invocation still populates twice (2 vs dev's 1). When the request creates a history, that costs about one query per workflow step (+50 for a 50-step workflow). There's no query-count test, and none of the other items regress against dev.

## Not acted on

- **Single invocation: 2 populates vs dev's 1.** I tried passing `populate_state=False` to `queue_invoke` when every run config shares a `param_map`. It broke `test_workflow_landing_to_invocation_association` with `AttributeError: 'WorkflowStep' object has no attribute 'module'`. The cause: the second loop commits (new-history `commit()`, `LDDA.to_history_dataset_association(commit=True)`), the session uses default `expire_on_commit`, `workflow.steps` reloads as fresh instances, and the transient `module`/`state` are lost. Removing the double populate means replacing those commits with flushes, which changes transaction semantics. That's John's call, not a perf fixup, so I reverted. The cost is one extra populate per request, about 5-10 ms of CPU for a 52-step `cat1` workflow. When a commit falls between the build populate and `queue_invoke` (a new history, or an LDDA input), the build populate's lazy step loads are expired and loaded again. I measured 171 vs dev's 121 queries for a single invocation into a new history, and 1851 vs 1825 for a batch of 25. That's about +N_steps per request, independent of batch size. With an existing `history_id` nothing commits in between, and the query counts match dev.
- **Query-count/populate-count test.** Nothing in the unit suite can drive `build_workflow_run_configs` without a large mock `trans`. An API test can't patch server internals reliably, since it can run against an external server. A new integration test file just to count calls would be brittle and not cheap. The measurement harness is described below so it can be rerun.
- **Per-input `sa_session.get` plus `get_dataset_collection_instance` for HDCAs.** dev does the same double lookup. It's one identity-map hit plus the manager query.
- **One commit per new history in batch.** Same as dev.
- **1300 `workflow_request_step_states` INSERTs for 25 x 52 steps.** Same as dev, and inherent to the request model.

<details>
<summary>Details</summary>

### Method

I wrote a throwaway API test (untracked, deleted afterwards): a 50-step `cat1` chain with a data input and an int parameter, invoked once with 1 dataset and once with a batch of 25. One run targeted an existing `history_id` and a second used `new_history_name` (one new history per entry). Temporary instrumentation wrapped `populate_module_and_state` (call count and time) and timed `WorkflowsService.invoke_workflow` around `build_workflow_run_configs`. A SQLAlchemy `before_cursor_execute` listener counted queries, filtered to the request thread; the first runs without the filter picked up job-handler and scheduler queries and weren't usable. Each version ran in one sequential session on sqlite, comparing dev's 4 files at `7e16f446410`, the branch head, and the fix.

### Results

| Version | Case | populate calls (time) | build_workflow_run_configs | invoke_workflow total | queries (request thread) |
| --- | --- | --- | --- | --- | --- |
| dev | single | 1 (10 ms) | 3 ms | 22 ms | 113 |
| head `4b4c7d39b9a` | single | 2 (15 ms) | 15 ms | ~25-80 ms (noisy) | 113 |
| fixed `456acb2f1d8` | single | 2 (11 ms) | 13 ms | 25 ms | 113 |
| dev | batch 25 | 25 (116 ms) | 46 ms | 347 ms | 1553 |
| head | batch 25 | 50 (198 ms) | 169 ms | 446 ms | 1529 |
| fixed | batch 25 | 26 (104 ms) | 17 ms | 269 ms | 1529 |
| dev | new history, single | 1 (9 ms) | 66 ms | 92 ms | 121 |
| head | new history, single | 2 (38 ms) | 50 ms | 88 ms | 171 |
| fixed | new history, single | 2 (25 ms) | 19 ms | 46 ms | 171 |
| dev | new history, batch 25 | 25 (122 ms) | 1059 ms | 1331 ms | 1825 |
| head | new history, batch 25 | 50 (231 ms) | 425 ms | 672 ms | 1851 |
| fixed | new history, batch 25 | 26 (117 ms) | 351 ms | 556 ms | 1851 |

The populate counts are exact. Wall times are single runs on a laptop with sqlite. They're noisy, and in the new-history rows they're dominated by sqlite commits, so I don't read dev's slower new-history wall time as a branch win. In the existing-history rows, query counts are equal: the first populate pays about 50 lazy loads (`workflow_step_connection` per step) in every version. In the new-history rows, a commit expires those loads and they're paid again, so branch head and fixed both pay about +50 queries.

`cat1` is about the cheapest tool state there is, so 4-5 ms per populate is a lower bound. On tool-heavy IWC workflows with conditionals or repeats and subworkflows, I'd expect each populate to cost much more, which would make the removed per-entry duplicate correspondingly larger. That's speculative: I didn't measure a heavier tool.

### Code change

`lib/galaxy/workflow/run_request.py`, in `build_workflow_run_configs`:
- `populate_module_and_state` runs only `if param_map not in validated_param_maps`. `param_map` is compared after the legacy `parameter_input` pops. `compute_runtime_state` only reads `step_updates`, so skipping an equal map can't change which error is raised.
- `input_modules[key] = module_factory.from_workflow_step(trans, step)` is built once per input step. It replaces `WorkflowModuleInjector.inject(step)` per entry, which also overwrote `step.module` with a module that never had runtime state computed. `_resolve_data_input` now takes the `module` explicitly.
- Batch-over-datasets (one shared map) drops from 2N to N+1 populates. A batch over step parameters (distinct maps, as in `test_run_batch`) is D+N, where dev was N.

### Wins already on the branch (unchanged)

- The target history is resolved once (`_get_existing_target_history`) instead of `get_mutable` per batch entry.
- Resource-param validation (`get_resource_mapper_function` + options) runs once per request instead of per entry.
- Landing is query-neutral against dev. dev did one `WorkflowLandingRequest` query in `_create_landing_request_association`. The branch does one up front (with the claim/ownership check) and reuses it.

### Patterns checked, no issue

- No unbounded queries were added. Lookups are by primary key, per supplied input, as in dev.
- No new flushes or commits: `stage_addition` + `add_pending_items` is kept.
- No client or polling change.
- No async handler involvement: the service is sync and runs in the threadpool.

### Tests run (one sequential session each)

- `test_landing.py -k workflow`: 12 passed. It failed with the reverted `populate_state=False` attempt and passes on the final code.
- `test_workflows.py -k "test_run_batch or test_run_with_batched_parameter_input or test_invalid_batch_entry_creates_no_history or test_invalid_run_request_creates_no_history or test_invalid_step_parameter_creates_no_history or test_run_with_parameter_input or test_run_with_optional_parameter_input_empty or test_run_with_multiple_text_parameter_input_validated_per_value or test_run_with_dataset_for_collection_input or test_run_with_mappable_collection_type or test_run_with_deleted_inputs or test_run_subworkflow_runtime_parameters or test_run_subworkflow_replacement_parameters or test_subworkflow_parameter_validator_failure or test_run_subworkflow_with_falsy_default_unconnected or ldda or library"`: 39 passed.
- `test/unit/workflows`: 290 passed, 1 skipped.
- `black`, `isort` and `ruff` are clean, and the pre-commit hooks passed on the rebase.

</details>
