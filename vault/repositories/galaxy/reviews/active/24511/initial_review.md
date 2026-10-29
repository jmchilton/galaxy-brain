# Initial review — PR #24511

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Claude Opus 5.5 (`claude-opus-5-5`), effort low
- Reviewed commit: `46102a0d363` (base `origin/release_25.1`, 20 commits)
- Tests not run (static review).

## Verdict

Careful, well-split PR; the incremental-charge model ("charge a dataset when it lands in a user's history, refund it when the user's last HDA of it is purged, skip `Dataset.uncharged_states`") is sound and the new `sole_dataset_sizes` / `adjust_disk_usage_for_datasets` / `dataset_holders` helpers are a real reusable abstraction. One remaining copy path (collection-operation tools) still refunds bytes that were never charged (same bug class the PR targets), and the legacy per-HDA `quota_amount` rule still lives beside the new one. No P1s found.

## Findings

### P2 1: Collection-operation tool outputs copied from another user's datasets aren't charged, but are refunded on purge

`DatabaseOperationTool` paths (`lib/galaxy/tools/__init__.py` ~3734-4099, e.g. `_get_new_elements`, zip/unzip, filter, relabel; and `model_operations.py` ~194 for skipped outputs) create outputs with `HDA.copy(...)` + `history.stage_addition(...)` + `add_pending_items()` (quota=False). No charge happens, and no job `finish()` follows since these tools execute in-request. If the input collection's elements belong to another user the output copies are free. A likely route (traced statically, not reproduced): copy another user's published collection into your history via the API with `copy_elements: false` (the `else` branch in `DatasetCollectionManager.copy`, so its elements stay the other user's HDAs — uncharged and, correctly, not counted by recalculation), then run e.g. `__FILTER_FAILED__`/`__RELABEL_FROM_FILE__` on it in your own history. `_get_new_elements` copies those elements into your history: recalculation now counts them, incremental usage doesn't, and purging them hits `sole_dataset_sizes`, which sees no other HDA of the dataset for this user and refunds the size -> negative drift. The PR covers sibling copy paths (`HDAManager.copy`, collection copy, history copy, workflow input copies, cached jobs, imports) but not this one.

Suggested fix: call `history.charge_added_datasets(<new element HDAs>)` once in the model-operation execute path (the copies of the user's own datasets cost one holder query and charge nothing). Worth an integration test mirroring `test_copies_of_another_users_datasets_are_counted` using e.g. `__FILTER_FAILED__` on another user's published collection.

### P3 1: Legacy per-HDA charge rule still lives beside the new one

The PR says 08b7e30ba26 makes charging and purging "share one rule", but `HDA.quota_amount()` / `purge_usage_from_quota()` remain and are still used by `History.add_dataset(quota=True)` (callers: `HDAManager.create`, `materialize`, `workflow/modules.py:1037` input copy, `controllers/async.py`) and the legacy `controllers/history.py:purge_deleted_datasets`. `History.add_datasets`' optimized `quota` branch sums `get_total_size()` with no dedupe at all, though its only caller (`add_pending_items`) passes `quota=False`. Routing `add_dataset(quota=True)` and `purge_deleted_datasets` through `charge_added_datasets` / `mark_purged`, and dropping the dead `add_datasets` quota branch, would leave one rule and remove the per-HDA `history_associations` scan. Reasonable as a follow-up if the release-branch scope should stay tight.

### P3 2: `hda.purged or` clause in `HDAManager.copy` has no effect

`lib/galaxy/managers/hdas.py`: `if hda.purged or hda.user is not history.user: history.charge_added_datasets([copy])`. `HDA.copy()` sets `copy.purged = self.purged`, and `sole_dataset_sizes` drops purged HDAs and returns `{}` before querying, so the clause changes nothing. Readability only: dropping it makes the "copy of the user's own dataset is free" comment the whole story.

## Notes (not findings)

- Checked and dropped: outputs of a job deleted while running go `DISCARDED` and aren't charged, but `finish()`/`fail()` on a `DELETED` job runs `__update_output(clean_only=True)`, which `full_delete()`s the dataset (marks it purged), so a later HDA purge refunds nothing. A refund window remains only if the user purges before the runner reaches `fail()`, or on runners that never call back after a stop; not raised as a finding.
- Postgres recalculation now applies `new - snapshot` on top of the current row. The two scalar subqueries are uncorrelated (InitPlans, evaluated once on the statement snapshot), so after a lock wait the UPDATE re-reads only the outer `disk_usage`; the reasoning in the comment holds. No Postgres-specific test of the race, which is understandable.
- `User.calculate_and_set_disk_usage` still calls `sa_session.expire(self, ["disk_usage"])`, which would silently drop a pending `ClauseElement` adjustment made earlier in the same session. No current caller seems to do both in one session; worth a guard if one ever does.
- `fail()` uses `total_size is None` as the "not yet charged" marker. Any code that calls `get_total_size()` on a running output before failure would make it look charged. Nothing obvious does today since `quota_amount` now short-circuits on `uncharged_states`.
- Tests: new integration tests in `test_recalculate_user_disk_usage.py` compare incremental vs. recalculated usage per scenario — the right shape. No assertions removed or weakened.
- Imports are top-level throughout.
