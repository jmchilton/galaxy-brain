# Initial review — #24770 (default profile)

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Claude Opus 5.5; effort: as set by coordinator (not exposed to the agent)
- Reviewed commit: `8ec2452c3bb` (diff vs `origin/release_26.2`)

## Verdict

Approve-able. The mechanism is sound: a delayed step records one blocking HDA plus a snapshot of (effective state, extension, deleted, dataset deleted), and the monitor wakes only when that snapshot changes in the DB. Comparing against the DB (not "is it ready yet") makes it fail-safe: a stale or mismatched snapshot causes an extra replay, never a missed wake. No P1/P2 bugs found. Findings are P3 reuse/consistency points.

Verified:
- `test/unit/workflows/test_input_readiness.py`, `test_scheduling_manager.py`, `test_workflow_progress.py`: 30 passed on the PR head.
- Red check: the new `test_input_readiness.py` (with the PR's test support files) against base `lib/`: all 9 cases fail at the "no replay" assertion — the tests catch the regression.
- `DatabaseOperationTool.check_inputs_ready` dropping its per-collection summary loop is safe: `_collect_input_datasets` flattens every collection member into `inp_data` (`collection.dataset_instances`), and `HDA.dataset` is `lazy="joined"`, so per-member `.state` adds no N+1.

Behavior notes (not findings, PR body covers them):
- An `auto`/`_sniff_` member that is *paused* now delays the step (`ToolInputsNotReadyException`) where base fell through to `Extension 'auto' unknown` and failed. Matches how `replacement_for_connection` treats paused inputs with `require_ready`.
- An `auto` member that already finished unresolved, alongside a non-`auto` running member, now fails immediately rather than after the running member finishes. Same end state, earlier.
- Only one blocker per step is tracked, so a failure in another input is noticed late; explicitly accepted in the PR description.

## Findings

### P3 1: Paused inputs on ordinary connections still replay every iteration

The PR adds snapshot-based wakes for tool-internal readiness checks, but the sibling path in `WorkflowProgress.replacement_for_connection` (lines touched by this PR) still records `SchedulingDependency(DependencyType.HDA, id)` with `readiness=None` for `is_pending_or_paused` inputs. The monitor's legacy HDA check treats any state not in `Dataset.non_ready_states` as satisfied, and `paused` is not in that list, so a paused input on a `require_ready` connection wakes the invocation on every monitor pass — the exact replay this PR removes for internal tools.

Probe (scratch test using the PR's `SchedulingHarness`, HDA with `Dataset.state="paused"`): `_any_dependency_satisfied` returns `True` for the legacy dependency and `False` for `SchedulingDependency(HDA, id, dataset_readiness(hda))`.

Suggested fix: in `replacement_for_connection`, build both HDA dependencies (`replacement` and `pending_dataset_instance`) with `dataset_readiness(...)`, or via `input_readiness_dependencies(...)`, so one mechanism covers both paths. That could also let the `readiness is None` HDA branch in `_any_dependency_satisfied` go away. Fine as a follow-up if the author wants to keep the release-branch diff narrow.

### P3 2: Readiness snapshot shape is defined three times

`ReadinessSnapshot` is built from Python in `dataset_readiness()`, from SQL in `blocking_dataset()` (`coalesce(HDA._state, Dataset.state)`, `extension`, `deleted`, `coalesce(Dataset.deleted, False)`), and again from a separate hand-written SQL select in `WorkflowRequestMonitor._any_dependency_satisfied` (constructing the tuple positionally). The effective-state expression also appears a fourth time as the existing `case(...)` in the same function. These must agree exactly: if the producers and the monitor ever disagree, a step either replays forever or, worse, never wakes until the timedelta fallback.

Suggested fix: keep the snapshot's column list and the "fetch snapshots for these HDA ids" query in `galaxy/model/dataset_collections/readiness.py` (e.g. a `readiness_columns()` helper used by `blocking_dataset`, plus `current_readiness(session, ids)` used by the monitor), so the snapshot is defined in one place next to `ReadinessSnapshot`.

### P3 3: `input_readiness_dependencies(value: Any, ...)` is a loose isinstance dispatcher

- Typed `Any` across HDA, `DatasetCollection`, `DatasetCollectionElement`, and `CollectionAdapter`; a `Union` of the accepted types would document the contract and let mypy check callers.
- With `states=None`, the collection branch (`blocking_dataset`) and the unflushed-collection recursion return the *first* member even if it is already ready. That's only correct when the caller already knows the value is blocked (today's callers pass a known-blocked HDA, or pass `states`). Recording a ready blocker would make the step wait for a change that never comes, until the timedelta fallback. Consider requiring `states` for collection-like values, or splitting into `hda_dependency(hda)` and `collection_blocker(collection, states, extensions)`.
- The `CollectionAdapter` branch inspects `adapting` (list vs. single object, then `element.hda`); every adapter already exposes `dataset_instances`, which would remove that special-casing.

### P3 4: Layering — `galaxy.exceptions` and core `galaxy.tools` modules now depend on `galaxy.workflow`

`lib/galaxy/exceptions/__init__.py` ships in the `galaxy-util` package (`packages/util`) and now type-imports `galaxy.workflow.scheduling_dependencies` (in `galaxy-app`). It is under `TYPE_CHECKING`, and `mypy.ini` sets `ignore_missing_imports`, so package mypy degrades to `Any` instead of failing. Separately, `galaxy.tools`, `tools.actions`, `tools.execute`, and `tools.parameters.meta` gain runtime imports from `galaxy.workflow`. On base, the only `galaxy.tools` → `galaxy.workflow` imports are in error-report plugins and recommendations. The new module holds tool-input concepts (blocking HDA plus snapshot) more than workflow ones.

Suggested fix: move `DependencyType`/`SchedulingDependency` next to `ReadinessSnapshot` in `galaxy.model`, or a small tools-level module, which `galaxy.workflow` re-exports. Alternatively, type `ToolInputsNotReadyException.dependencies` as an opaque `tuple[Any, ...]` in `galaxy.exceptions`.

## Test coverage notes

Good: workflow-level tests through the real `CoreWorkflowSchedulingPlugin` and a real DB, covering nested collections, `auto`/`_sniff_`, error outcomes, `keep_success_collection`, paused HDA override, and independent branches. Moving `SchedulingHarness` into `workflow_support.py` reuses existing scaffolding rather than duplicating it.

Not covered (low risk, no finding): the `>500` id batching and missing-row paths in the monitor, the PostgreSQL ARRAY-walk branch of `_build_nested_collection_attributes_stmt` with the added columns (the tests use SQLite), and the new `unpopulated_collection_dependencies` call sites in `tools/execute.py` and `tools/parameters/meta.py`. Those reuse the existing `DATASET_COLLECTION` mechanism.
