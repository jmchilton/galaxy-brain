# Performance review — PR #24738

Profile: [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md). Model: Claude Opus 5.5, low effort. Reviewed commit: `c55d04482f9`.

Verdict: no blocking performance problems. Hot-path additions (commit listener, `adjust_total_disk_usage` queueing) are trivial, dispatch is batched off-thread at ≤1 message/s/process, and the `LIMIT 1` quota probe keeps group edits cheap. Three minor items. Static review only; nothing re-measured. Details and a measurement plan are in [performance_challenges_debrief.md](performance_challenges_debrief.md).

### P3 1: `relabel_quota_for_dataset` runs the affected-users CTE a fourth time per dataset

`lib/galaxy/quota/__init__.py` now runs `quota_affected_users` again after the relabel transaction to get the owner ids. On Postgres the lock statement just before it, `SELECT id FROM galaxy_user WHERE id IN (SELECT user_id FROM quota_affected_users) ORDER BY id FOR UPDATE`, already returns those ids. Cross-device storage moves (`dataset_storage_operations._finalize_cross_device_move`) call this once per dataset, so a bulk move pays one extra HDA/history join per dataset.

Suggested fix: keep the lock statement's result (`owner_ids = conn.execute(text(lock_statement), bind).scalars().all()`) and queue those. Run the separate SELECT only on SQLite, which has no lock statement. These are also the ids that were actually updated, since they come from inside the transaction.

### P3 2: Quota edits on large groups send every member id in one AMQP message (speculative)

`_queue_quota_update` / `_queue_users_and_groups` load all affected user ids (13 ms for 20k per the PR's table). `send_user_quota_updates` then sends them all as one `user_quota_update` control message to every web worker, so a 100k-member group gives a message of about 0.7 MB. Default quotas already take the broadcast path, so the code has a cheaper option available.

Suggested fix: above a threshold (a few thousand ids), queue `broadcast=True` rather than the id list. The client already jitters broadcast refetches. Not measured; only worth doing if large quota groups are realistic on usegalaxy.* servers.

### P3 3: PR description's performance NOTE no longer matches the code

The NOTE says finished jobs and new datasets don't send the event, and that one change can cause two usage requests. In the code, `User.adjust_total_disk_usage` queues an update on every nonzero adjustment: job finish via `_charge_outputs`, `add_dataset(s)`, and purges. `test_user_quota_update_after_job_finishes` asserts that a finished job pushes the event. The client now skips the history-size refetch when live (`refreshStorageUsageUnlessLive`, `watchOwnHistorySize` removed), so it makes one request per change, not two. The performance table also covers only the listener on the busy path, not the batched dispatch or the client request rate that follows from it.

Suggested fix: update the NOTE to describe the current behavior. Optionally add a row to the table counting `/api/users/current` requests and `user_quota_update` messages during a multi-job workflow, dev vs PR.
