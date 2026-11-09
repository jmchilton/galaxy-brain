### P2 1: Auto-extension wait test can't detect a wrong blocker (implementation verified)

`test_unresolved_extension_waits_on_any_pending_member` (collection with `error` and `running` members, extension `auto`) only asserts that the step waits without replays. If the blocker search picked the `error` member, its snapshot would never change and the test would still pass. In production that regression means the step never wakes.

<details><summary>Details</summary>

Related: wake assertions driven by HDA-column updates (`extension`, `_state`) in `test_waiting_collection_is_retried_only_after_input_changes` and the paused-override test can also be met by the history-audit trigger. `history_dataset_association` UPDATEs bump `history.update_time`, which the monitor checks on its own. As written, those assertions don't isolate the readiness snapshot.

</details>

After the wait, complete the running member's `Dataset` row (that table has no audit trigger). Then assert the invocation wakes and fails on the unresolved `auto` extension. For the HDA-column cases, reset the history audit to the last observed time before the attempt.

<details><summary>Details</summary>

Red-check: adding `ERROR` to the `states` filter in `DefaultToolAction` makes the strengthened test fail. The review branch adds `SchedulingHarness.restore_history_update_time()` and uses it in the HDA-column cases. With the snapshot's extension masked, the `auto` extension-wake case still passes without the restore and fails with it, which confirms the trigger was driving that wake.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 2: Monitor snapshot wakes on deletion, missing rows, and batching are untested (implementation verified)

`WorkflowRequestMonitor._any_dependency_satisfied` wakes when `deleted` or `dataset_deleted` changes, when a blocker's row disappears, and it queries in batches of 500. No test exercises any of these. A wrong answer here stalls invocations rather than failing them.

Add synthetic `SchedulingDependency(HDA, id, dataset_readiness(hda))` cases to `test_scheduling_manager.py`. Cover state, HDA `deleted`, `Dataset.deleted` and deleted-row changes, plus a test with more than 500 dependencies.

<details><summary>Details</summary>

Red-check: dropping the missing-row check and the deleted fields from the comparison fails the `deleted`, `dataset_deleted` and `missing` cases.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 1: Paused inputs on `require_ready` connections still replay every pass (implementation verified)

`WorkflowProgress.replacement_for_connection` still records `SchedulingDependency(DependencyType.HDA, id)` without a snapshot when an input `is_pending_or_paused` (pick-value's `require_ready`). The legacy HDA check counts any state outside `Dataset.non_ready_states` as satisfied, and `paused` is outside it. So a paused input wakes the invocation on every monitor pass, the replay this PR removes for internal tools.

Attach `dataset_readiness(...)` to both HDA dependencies in `replacement_for_connection`. This requires P3 3: without normalization, pending connection waits would wake on every non-ready transition, more often than on base. Once non-ready states are normalized (P3 3), ordinary pending waits still wake only when the input leaves the non-ready states, as before. Paused waits wake only when the paused state changes.

<details><summary>Details</summary>

Tests: `test_paused_dataset_delays_with_readiness_dependency_when_ready_required` (progress level) and `test_paused_readiness_dependency_waits_until_resumed` (monitor level). The existing pending-dataset test now asserts the snapshot.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: Readiness snapshot shape is defined in three places (implementation verified)

`ReadinessSnapshot` is built from Python in `dataset_readiness()` and from SQL in `blocking_dataset()`. It is built a third time from a separate hand-written select in `_any_dependency_satisfied`, which assembles the tuple positionally and runs its own 500-id batching loop. All three must agree. When they drift, recorded and polled snapshots never match, and the step replays on every pass.

Keep the column list and a `readiness_snapshots(session, hda_ids)` query (batching included) in `readiness.py` next to `ReadinessSnapshot`. Use it from both `blocking_dataset` and the monitor, which reduces the monitor block to a comparison loop.

<details><summary>Details</summary>

The failure mode of drift is replays, not stalls, hence P3 rather than P2.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at low effort, [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort, and [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_reviews/reviewers/learning_galaxy.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: Every non-ready state transition of the blocker triggers a full replay (implementation verified)

The snapshot stores the exact effective state. A blocker moving new → queued → running → setting_metadata therefore replays the invocation at each step, and each replay only re-delays on the same blocker. No wait in this PR (`require_terminal_states`, `KeepSuccessDatasetsTool.is_pending`, the auto-extension wait) treats non-ready states differently. `Dataset.non_ready_states` matches `is_pending` exactly, and `paused` sits outside both.

Normalize states in `Dataset.non_ready_states` to one sentinel when building a snapshot. Paused, terminal states, extension and deletion changes still wake.

<details><summary>Details</summary>

Test: `test_readiness_snapshot_ignores_moves_between_non_ready_states` sets queued, then setting_metadata, then ok, and asserts exactly one wake. It fails without the normalization.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 4: `input_readiness_dependencies(value: Any, states=None)` contract is loose (implementation verified)

The helper dispatches on runtime type over `Any`. With `states=None`, the collection branches return the first member even when it is ready, which is correct only when the caller already knows the value is blocked. Recording a ready blocker makes the step wait for a change that never comes, until the timedelta fallback. Today's callers avoid this: the HDA call sites pass known-blocked datasets, and the one collection caller passes `states`. Nothing in the signature enforces that.

Split the two uses. Add `dataset_dependencies(dataset)` for datasets the caller already found blocking. Make `input_readiness_dependencies(value: ReadinessInput, *, states, extensions=None)` require `states`, with `ReadinessInput` a union of the accepted types.

<details><summary>Details</summary>

The `CollectionAdapter` branch should keep dispatching on `adapting`. It should not switch to `dataset_instances`: `DCECollectionAdapter.adapting` is the DCE, which routes to the child collection's SQL `LIMIT 1` search, while `dataset_instances` would load every member HDA into Python.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at low effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 5: `galaxy.exceptions` (galaxy-util) now imports `galaxy.workflow` (implementation verified)

`lib/galaxy/exceptions/__init__.py` ships in `packages/util`, which on the base branch imports no other Galaxy package. It now has a `TYPE_CHECKING` import of `galaxy.workflow.scheduling_dependencies` (galaxy-app). This works only because `ignore_missing_imports` degrades the import to `Any`.

Type `ToolInputsNotReadyException.dependencies` opaquely (`Iterable[Any]`) in `galaxy.exceptions`. The raise sites still build typed `SchedulingDependency` lists through the helpers.

<details><summary>Details</summary>

Both reviews also flagged the new runtime imports from `galaxy.tools` into `galaxy.workflow.scheduling_dependencies`, and suggested moving `SchedulingDependency` into `galaxy.model`. That move doesn't address `galaxy.exceptions`, since `galaxy.model` lives in galaxy-data, not galaxy-util. `galaxy.tools` and `galaxy.workflow` share the galaxy-app package, and the new module imports only `galaxy.model`, so there is no cycle. The relocation is left for `dev` if wanted rather than done on `release_26.2`.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at low effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 6: Element and adapter branches of the blocker search are unexercised (implementation verified)

Every test passes a whole HDCA. The `DatasetCollectionElement` and `CollectionAdapter` branches of `input_readiness_dependencies` are never reached, although `DefaultToolAction` hands adapters to it.

Add a direct test that runs the search over a DCE, a `DCECollectionAdapter`, `PromoteDatasetToCollection` and `PromoteDatasetsToCollection`, and asserts the running member's id and snapshot.

<details><summary>Details</summary>

Red-check: breaking either the DCE child-collection routing or the adapter list walk fails the test.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>
