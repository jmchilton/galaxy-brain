Run via Claude Opus 5.5 at high effort.

# Normal review: keying TES task watches and pending cancels by server and task id

One review covered both branches: the parent's new commit `54d2aa613df` ("Key TES task watches by TES server and task id") and the child's rebase onto it, whose tip commit "Retry cancelling a TES task while its server is unreachable" re-keys the pending cancels (reviewed at child `3bdb3016d00`).

**It found no bugs.** It raised two optional P3s. I acted on half of P3 1, in the child only: `TesCancelRetries.discard` now takes the task id and destination params, as `add` does, so the two can't be handed different keys (child `766334a203e`). Tests: parent 103 passed, child 130 passed, on both heads.

Not acted on:

- **P3 1, the rest: one shared key helper in `util/tes_task.py`** for the parent's `tes_task_key(job_state)` and the child's `PendingTesCancel.tes_url`. Both read `destination_params.get("tes_url")` from the same persisted params. Sharing a helper would mean changing the parent again and rebasing the child for no change in behaviour. With `discard` matching `add`, the child has one place that reads the URL.
- **P3 2: type the URL as `str`, not `str | None`.** `tes_url` is a required destination param, so the `None` key can't come up. Using `params["tes_url"]` would turn a missing URL into a `KeyError` in the thread that receives Pulsar's messages. The `.get()` matches what the child's cancel retries already do.

<details>
<summary>Full review</summary>

I found no bugs: the re-key is consistent on every path in both branches, and I have only two optional P3 suggestions.

Tests pass on both heads: parent `54d2aa613df` 103 passed, child `3bdb3016d00` 130 passed. Ruff is clean on the changed files. I made no edits, checkouts or commits, and found nothing security-sensitive.

**P3 1: The TES URL is read in three places, and `add`/`discard` take it in different forms.**

- Parent: `tes_task_key()` in `lib/galaxy/jobs/runners/pulsar.py:1446` reads `job_state.job_destination.params.get("tes_url")`.
- Child: `PendingTesCancel.tes_url` in `lib/galaxy/jobs/runners/util/tes_cancel_retries.py:37` reads `destination_params.get("tes_url")`.
- Child: `_kill_remote_job` in `pulsar.py:1725` reads it again at the call site, because `TesCancelRetries.discard(tes_url, task_id)` takes a bare URL while `add(task_id, ..., destination_params, ...)` works the URL out from the params itself.

Today these agree because every caller passes persisted destination params. Still, the rule for which server a task belongs to now lives in three places, and the add/discard asymmetry makes it easy for a later caller to discard under a key that differs from the one used to add.

Fix: move `TesTaskKey` and a `tes_task_key(params, task_id)` helper into `util/tes_task.py`. Use it from the parent's `tes_task_key(job_state)` and from `PendingTesCancel`. Make `discard` take the same thing `add` takes (the destination params, or a `TesTaskKey`). The cancel retries could still group by URL internally.

**P3 2: `str | None` in `TesTaskKey` (`pulsar.py:1443`) and `_servers: dict[str | None, ...]` (`tes_cancel_retries.py:58`) is looser than it needs to be.**

`tes_url` is `PARAMETER_SPECIFICATION_REQUIRED`, so `_populate_parameter_defaults` refuses to submit without it, and `tes_client_from_params` asserts it is set. A `None` key can't do useful work. Typing it as optional quietly puts every URL-less job under one `None` key, which is the shared-key problem this change removes.

Fix: use `params["tes_url"]` and a `str` key, or keep `.get()` and assert. Shutdown logging then no longer needs `cancel.tes_url or 'unknown TES URL'`. This is optional, since the current code is harmless.

**Checked and fine**

- **No bare-id lookups remain.** In the parent, all four places that touch the watches use `tes_task_key`: the message thread (`_update_job_state_for_status`), and on the monitor thread `check_watched_item`, its `del`, and `_watch`. In the child, `add` dedupes within one server only, and `discard` is per server. `retry_due` and `_record_attempt` already worked per server, and shutdown logging iterates `pending()` and shows each URL. The unreachable-timeout hand-off (`pulsar.py:1634`) passes `job_state.job_destination.params` to `add`, so it is keyed the same way.
- **One URL per job on every path.** Submit persists `job_destination.params`, with defaults already filled in, via `set_job_destination`. The message thread's `job_pair_for_id` uses `use_persisted_destination=True`, which is `JobDestination(from_job=job)`. Recovery's `__recover_job_wrapper` uses `from_job=job`, and `stop_job` uses `job.destination_params`. All of these are the persisted params. `tes_url` has no default, so nothing fills it in on one path and not another.
  - A trailing-slash difference can only come from two destinations configured differently. That only splits per-server backoff into two groups; it never splits one job's keys.
  - User-property expansion (`get_client_from_wrapper`) works on a copy, so the key is the un-expanded value everywhere. Per-user templated `tes_url` values would share one key, but the existing checks already use un-expanded params, so this revision doesn't introduce that.
- **The rebase resolution in the child's tip commit is correct.** `__init__` keeps `dict[TesTaskKey, TesTaskWatch]` and the new `poll` expression. `_update_job_state_for_status` gates on `tes_status_check_interval` and uses `tes_task_key`, and `check_watched_item` returns early, then uses `task_key` throughout. The range-diff shows that `a7e0fbc9588` changed only in comment context, and that the tip changed only by the intended re-key.
- **The tests are focused and catch regressions.**
  - The parent test drives both threads for two jobs that share an id on two real fake servers. It asserts that the job Pulsar reported is not failed, and that the other job fails with the expected message.
  - The child test covers both old failure modes separately: the second `add` dedupe, then a successful later stop's `discard`. Its final assertion depends on the other server's cancel still being pending.
  - Neither test duplicates existing coverage, and no existing test was weakened.
- **Commit hygiene.** A separate parent commit is right, since that change stands on its own. Folding the child's change into "Retry cancelling a TES task while its server is unreachable" is also right: `tes_cancel_retries.py` is new in that commit, so a separate commit would only rewrite code added the commit before. The commit message gains a short paragraph explaining the keying.
- **Comments.** The comment on `TesTaskKey`, the module docstring of `tes_cancel_retries.py`, and the dropped "Keyed by TES task id" comment are accurate and not redundant.
- **No new imports buried in functions.**

</details>
