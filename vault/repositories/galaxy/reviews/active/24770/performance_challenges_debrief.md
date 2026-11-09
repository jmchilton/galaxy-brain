# #24770 performance challenge debrief

Profile: gx_performance_challenger · Claude Opus 5.5 · low effort · reviewed `8ec2452c3bb` vs `origin/release_26.2`.

All points below come from reading the code. Nothing was measured: the worktree has no `.venv`, and no Postgres-scale data was built.

## What the PR changes, performance-wise

- **Before**: an internal tool's `ToolInputsNotReadyException` turned into an *untracked* delay, so `ready_to_schedule_more` returned True on every monitor pass. That meant a full invocation replay (module rebuild, output recovery) per pass for as long as any member was pending.
- **After**: the delay carries one `SchedulingDependency(HDA, id, ReadinessSnapshot)`. `_any_dependency_satisfied` polls those ids with one PK-indexed `HDA JOIN dataset WHERE id IN (...)` (batched at 500), and the invocation replays only when the snapshot changes. That is a large reduction: it replaces "replay every pass" with "one indexed lookup per pass, and a replay per blocker transition".

## Checked and fine

- `blocking_dataset` reuses `_build_nested_collection_attributes_stmt` (the PG array walk for nested collections), drops `ORDER BY` and applies `LIMIT 1`. PG can stop at the first match, with the scan bounded by the collection's DCEs. `Dataset` is joined because `hda_attributes` triggers `needs_hda_join`, so there is no cartesian FROM.
- `DatabaseOperationTool.check_inputs_ready` no longer reads `dataset_states_and_extensions_summary` per collection. It walks `input_datasets`, which `_collect_input_datasets` already filled with every flattened member. `HDA.dataset` is `lazy="joined"` (`model/__init__.py` ~13545), so `.state` / `.dataset.deleted` add no N+1. The summary was cached on the collection and already computed by `_collect_inputs`, so this costs nothing extra.
- `unpopulated_collection_dependencies` / `blocking_dataset` run only on the raise path, except in the auto-extension case below.
- The monitor query adds no ORM loads, and readiness deps are deduplicated per HDA id.

## Suggestions

1. **The snapshot stores the exact state, so every non-ready transition triggers a replay (P3, speculative).** `Dataset.non_ready_states` is `new, upload, queued, running, setting_metadata`. A typical blocker goes new→queued→running→setting_metadata→ok. Each step changes the `ReadinessSnapshot` and causes a full replay that only re-delays on the same blocker. None of the callers (`require_terminal_states`, `is_pending`, auto-extension wait) distinguish among non-ready states. `DatasetInstance.is_pending` is exactly `Dataset.non_ready_states`, which I checked. Collapsing them to one class, both when building the snapshot and in the monitor comparison, would cut replays per blocker from about 4 to 1. PAUSED, OK/error, extension and deleted flags would still wake the step. Applied at one blocker per step, the saving scales with collection size: a 1000-member collection draining one blocker at a time saves up to about 3000 replays.
2. **Auto-extension path adds a query on every tool execution (observation, not filed).** In `DefaultToolAction._collect_input_datasets`, when `summary.extensions` contains `auto`/`_sniff_`, `blocking_dataset` now runs every time, even when nothing is pending; before, the check was a free set intersection. This is rare (a terminal member left with `auto`). A guard on `summary.states` is not strictly equivalent, because the summary uses `Dataset.state` and ignores HDA `_state` overrides. Not worth a finding.
3. **Two HDA round trips per pass (observation).** Readiness deps and plain HDA deps each issue their own `HDA JOIN dataset WHERE id IN` query. Both are tiny and indexed, so merging them is optional.
4. **One blocker per step (design note, matches PR description).** Picking an arbitrary pending member means up to N replays while an N-member collection drains. That is still bounded by the number of monitor passes, so it is never worse than before. Preferring a blocker that is likely to finish last (e.g. `new`/`queued` over `running`) would mean giving up the `LIMIT 1` early stop. Not recommended without data.

## Measurement plan (if wanted)

- Replay count: build a list of about 500 elements whose members finish slowly (e.g. a `cat` with sleep), feed it to `__FILTER_FAILED_DATASETS__` / `__KEEP_SUCCESS_DATASETS__` in a workflow, and count "Scheduling workflow invocation" / `invoke` entries in the handler log on base vs PR, and then with suggestion 1 applied.
- On Postgres with a large `dataset_collection_element` table, run `EXPLAIN (ANALYZE, BUFFERS)` on the `blocking_dataset` SQL for `list`, `list:list` and `list:list:list` collections. Confirm index scans on `ix_dce_dataset_collection_id` / `child_collection_id` and an early stop under `LIMIT 1`.
- Monitor overhead: time `_any_dependency_satisfied` across about 1k active invocations, each with one readiness dep. It should be about one PK lookup each.

## Addendum: delays with no dependencies still replay on every pass

`WorkflowProgress.record_delay` treats a delay with empty `dependencies` as untracked, so the invocation replays on every pass. In this PR, the population raise sites (`DatabaseOperationTool.check_inputs_ready`, `execute._resolve_collection_ref`, `meta.__expand_collection_parameter`) raise when `populated_optimized` is false. That includes `FAILED` population. They take their dependencies from `unpopulated_collection_ids()`, which returns only `NEW` ids, so a collection whose population failed raises NotReady with `[]` and goes back to being replayed every pass. Behavior is unchanged from base, so this is not a regression. It is a gap in the storm the PR targets: filed as P3 2.
