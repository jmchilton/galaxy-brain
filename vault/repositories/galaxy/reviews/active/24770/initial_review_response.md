



<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_reviews/reviewers/learning_galaxy.md) was run via Claude Opus 5.5 at medium effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile gx_risk_assessment, Claude Opus 5.5, low effort, reviewed commit 8ec2452c3bb.

Risks are mostly two-way: the change is internal to workflow scheduling (no API, schema, or workflow-format change), but it lands on release_26.2 and changes when delayed invocations are re-evaluated, so a mistake shows up as stalled invocations in production rather than as a test failure.

<details><summary>Risk Details</summary>

- An invocation now sleeps until one chosen blocking HDA's (state, extension, deleted, dataset deleted) snapshot changes. Any readiness-relevant change outside that tuple (e.g. another member failing, metadata finishing without a state change) is not noticed until the blocker moves, so a step can wait longer than before. The PR description acknowledges this for failures.
- `DatabaseOperationTool.check_inputs_ready` no longer reads collection state summaries. It relies on collection members already being flattened into `input_datasets`. If any caller passes collections without flattened members, `require_dataset_ok` / pending checks for those collections are silently skipped and the tool runs on non-ready inputs.
- The auto/_sniff_ extension check now asks for a member in a non-ready or paused state with the unresolved extension, instead of any non-ready member. A collection whose unresolved members are all terminal now proceeds to the datatype lookup instead of waiting. The semantics change, not only the tracking.
- `ToolInputsNotReadyException` raised without `dependencies` (other tools, other call sites) still becomes an untracked delay retried every pass. Behavior there is unchanged, but the busy-loop fix only covers the call sites this PR touched.
- `SchedulingDependency` and friends move from `galaxy.workflow.modules` to `galaxy.workflow.scheduling_dependencies`, with no re-export. Out-of-tree importers (scheduler plugins) break on a point release.
- `ToolInputsNotOKException` `id` annotation changes from `str` to `int`. Type-only, but it is on an exception that reaches API error payloads.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should focus on `scheduling_manager.py`'s new readiness polling and the `input_readiness_dependencies` / `blocking_dataset` pair: confirm every way a blocked step can become runnable (or fail) changes the snapshot of the selected HDA, and that a missing row (purged/deleted HDA) correctly wakes the invocation. A wrong answer here stalls invocations indefinitely instead of failing them.

Also confirm that every path into `DatabaseOperationTool.check_inputs_ready` flattens collection members into `input_datasets`, and that the change to the `auto`/`_sniff_` extension check (only non-ready or paused members with that extension block) is intended for a release-branch fix. Because this targets 26.2, the module move without a compatibility re-export is worth a deliberate decision.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24770_round_0_rev_1) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_24770_round_0_rev_1`](https://github.com/jmchilton/galaxy/tree/pr_24770_round_0_rev_1) (rebased onto PR head `c44640e7442`) tightens the readiness-snapshot mechanism without changing its design. The snapshot query now lives once in `galaxy.model.dataset_collections.readiness`, and the monitor calls it. Snapshots treat all non-ready states as one value, so a blocker moving queued → running no longer replays the invocation. Pick-value (`require_ready`) connection waits now record snapshots too, so a paused input stops replaying every pass. The collection blocker search requires `states` and has typed input. Tests now cover snapshot wakes on deletion, missing rows and batching, prove that the running member (not the errored one) wakes the auto-extension wait, and cover the element/adapter branches. HDA-column wake assertions are isolated from the history-audit trigger. All edited test files pass: `test_scheduling_manager.py` (15), `test_workflow_progress.py` (14), `test_input_readiness.py` (10). Each new test was red-checked against a deliberately broken implementation.

- [`30f85cb4b46`](https://github.com/jmchilton/galaxy/commit/30f85cb4b46) Test readiness snapshot wakes on deletion, missing rows, batches — parametrized monitor test for state, HDA deleted, dataset deleted and missing-row changes, plus a 501-dependency batch test. (P2 2)
- [`81d820e5b65`](https://github.com/jmchilton/galaxy/commit/81d820e5b65) Define readiness snapshot query once, next to ReadinessSnapshot — adds `readiness_snapshots(session, ids)` with shared column helpers used by `blocking_dataset` and the monitor. (P3 2)
- [`f1cc0c0c706`](https://github.com/jmchilton/galaxy/commit/f1cc0c0c706) Assert the running member, not the errored one, wakes auto-extension wait — completes the running member and asserts a wake and failure; adds `SchedulingHarness.restore_history_update_time()` so HDA-column wakes exercise the snapshot. (P2 1)
- [`25080a76f30`](https://github.com/jmchilton/galaxy/commit/25080a76f30) Ignore moves between non-ready states in readiness snapshots — normalizes `Dataset.non_ready_states` to one sentinel in the single snapshot constructor. (P3 3)
- [`327827e646d`](https://github.com/jmchilton/galaxy/commit/327827e646d) Track connection HDA waits by readiness snapshot — `replacement_for_connection` attaches `dataset_readiness(...)` to both HDA dependencies; requires `25080a76f30`. (P3 1)
- [`aa21d1d218b`](https://github.com/jmchilton/galaxy/commit/aa21d1d218b) Split known-blocked dataset tracking from collection blocker search — `dataset_dependencies(dataset)` for known-blocked datasets; `input_readiness_dependencies(value: ReadinessInput, *, states, extensions=None)`. (P3 4)
- [`318b5e6014f`](https://github.com/jmchilton/galaxy/commit/318b5e6014f) Test blocker search through collection elements and adapters — direct test over a DCE, `DCECollectionAdapter`, `PromoteDatasetToCollection` and `PromoteDatasetsToCollection`. (P3 6)

</details>

</details>

### P2 1: Auto-extension wait test can't detect a wrong blocker (implementation verified)

`test_unresolved_extension_waits_on_any_pending_member` (collection with `error` and `running` members, extension `auto`) only asserts that the step waits without replays. If the blocker search picked the `error` member, its snapshot would never change and the test would still pass. In production that regression means the step never wakes.

<details><summary>Details</summary>

Related: wake assertions driven by HDA-column updates (`extension`, `_state`) in `test_waiting_collection_is_retried_only_after_input_changes` and the paused-override test can also be met by the history-audit trigger. `history_dataset_association` UPDATEs bump `history.update_time`, which the monitor checks on its own. As written, those assertions don't isolate the readiness snapshot.

</details>

After the wait, complete the running member's `Dataset` row (that table has no audit trigger). Then assert the invocation wakes and fails on the unresolved `auto` extension. For the HDA-column cases, reset the history audit to the last observed time before the attempt.

<details><summary>Details</summary>

Red-check: adding `ERROR` to the `states` filter in `DefaultToolAction` makes the strengthened test fail. The review branch adds `SchedulingHarness.restore_history_update_time()` and uses it in the HDA-column cases. With the snapshot's extension masked, the `auto` extension-wake case still passes without the restore and fails with it, which confirms the trigger was driving that wake.

</details>

Fixed on the review branch in [`f1cc0c0c706`](https://github.com/jmchilton/galaxy/commit/f1cc0c0c706).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 2: Monitor snapshot wakes on deletion, missing rows, and batching are untested (implementation verified)

`WorkflowRequestMonitor._any_dependency_satisfied` wakes when `deleted` or `dataset_deleted` changes, when a blocker's row disappears, and it queries in batches of 500. No test exercises any of these. A wrong answer here stalls invocations rather than failing them.

Add synthetic `SchedulingDependency(HDA, id, dataset_readiness(hda))` cases to `test_scheduling_manager.py`. Cover state, HDA `deleted`, `Dataset.deleted` and deleted-row changes, plus a test with more than 500 dependencies.

<details><summary>Details</summary>

Red-check: dropping the missing-row check and the deleted fields from the comparison fails the `deleted`, `dataset_deleted` and `missing` cases.

</details>

Fixed on the review branch in [`30f85cb4b46`](https://github.com/jmchilton/galaxy/commit/30f85cb4b46).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 1: Paused inputs on `require_ready` connections still replay every pass (implementation verified)

`WorkflowProgress.replacement_for_connection` still records `SchedulingDependency(DependencyType.HDA, id)` without a snapshot when an input `is_pending_or_paused` (pick-value's `require_ready`). The legacy HDA check counts any state outside `Dataset.non_ready_states` as satisfied, and `paused` is outside it. So a paused input wakes the invocation on every monitor pass, the replay this PR removes for internal tools.

Attach `dataset_readiness(...)` to both HDA dependencies in `replacement_for_connection`. This requires P3 3: without normalization, pending connection waits would wake on every non-ready transition, more often than on base. Once non-ready states are normalized (P3 3), ordinary pending waits still wake only when the input leaves the non-ready states, as before. Paused waits wake only when the paused state changes.

<details><summary>Details</summary>

Tests: `test_paused_dataset_delays_with_readiness_dependency_when_ready_required` (progress level) and `test_paused_readiness_dependency_waits_until_resumed` (monitor level). The existing pending-dataset test now asserts the snapshot.

</details>

Fixed on the review branch in [`327827e646d`](https://github.com/jmchilton/galaxy/commit/327827e646d).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: Readiness snapshot shape is defined in three places (implementation verified)

`ReadinessSnapshot` is built from Python in `dataset_readiness()` and from SQL in `blocking_dataset()`. It is built a third time from a separate hand-written select in `_any_dependency_satisfied`, which assembles the tuple positionally and runs its own 500-id batching loop. All three must agree. When they drift, recorded and polled snapshots never match, and the step replays on every pass.

Keep the column list and a `readiness_snapshots(session, hda_ids)` query (batching included) in `readiness.py` next to `ReadinessSnapshot`. Use it from both `blocking_dataset` and the monitor, which reduces the monitor block to a comparison loop.

<details><summary>Details</summary>

The failure mode of drift is replays, not stalls, hence P3 rather than P2.

</details>

Fixed on the review branch in [`81d820e5b65`](https://github.com/jmchilton/galaxy/commit/81d820e5b65).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at low effort, [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort, and [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_reviews/reviewers/learning_galaxy.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: Every non-ready state transition of the blocker triggers a full replay (implementation verified)

The snapshot stores the exact effective state. A blocker moving new → queued → running → setting_metadata therefore replays the invocation at each step, and each replay only re-delays on the same blocker. No wait in this PR (`require_terminal_states`, `KeepSuccessDatasetsTool.is_pending`, the auto-extension wait) treats non-ready states differently. `Dataset.non_ready_states` matches `is_pending` exactly, and `paused` sits outside both.

Normalize states in `Dataset.non_ready_states` to one sentinel when building a snapshot. Paused, terminal states, extension and deletion changes still wake.

<details><summary>Details</summary>

Test: `test_readiness_snapshot_ignores_moves_between_non_ready_states` sets queued, then setting_metadata, then ok, and asserts exactly one wake. It fails without the normalization.

</details>

Fixed on the review branch in [`25080a76f30`](https://github.com/jmchilton/galaxy/commit/25080a76f30).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 4: `input_readiness_dependencies(value: Any, states=None)` contract is loose (implementation verified)

The helper dispatches on runtime type over `Any`. With `states=None`, the collection branches return the first member even when it is ready, which is correct only when the caller already knows the value is blocked. Recording a ready blocker makes the step wait for a change that never comes, until the timedelta fallback. Today's callers avoid this: the HDA call sites pass known-blocked datasets, and the one collection caller passes `states`. Nothing in the signature enforces that.

Split the two uses. Add `dataset_dependencies(dataset)` for datasets the caller already found blocking. Make `input_readiness_dependencies(value: ReadinessInput, *, states, extensions=None)` require `states`, with `ReadinessInput` a union of the accepted types.

<details><summary>Details</summary>

The `CollectionAdapter` branch should keep dispatching on `adapting`. It should not switch to `dataset_instances`: `DCECollectionAdapter.adapting` is the DCE, which routes to the child collection's SQL `LIMIT 1` search, while `dataset_instances` would load every member HDA into Python.

</details>

Fixed on the review branch in [`aa21d1d218b`](https://github.com/jmchilton/galaxy/commit/aa21d1d218b).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at low effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 6: Element and adapter branches of the blocker search are unexercised (implementation verified)

Every test passes a whole HDCA. The `DatasetCollectionElement` and `CollectionAdapter` branches of `input_readiness_dependencies` are never reached, although `DefaultToolAction` hands adapters to it.

Add a direct test that runs the search over a DCE, a `DCECollectionAdapter`, `PromoteDatasetToCollection` and `PromoteDatasetsToCollection`, and asserts the running member's id and snapshot.

<details><summary>Details</summary>

Red-check: breaking either the DCE child-collection routing or the adapter list walk fails the test.

</details>

Fixed on the review branch in [`318b5e6014f`](https://github.com/jmchilton/galaxy/commit/318b5e6014f).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>
