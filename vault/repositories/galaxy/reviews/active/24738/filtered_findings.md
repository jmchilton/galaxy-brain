# Filtered findings — #24738 round 0

Reviewed commit `c55d04482f9`.

- **performance P3 2: large quota groups send every member id in one AMQP message.** Speculative and unmeasured. Switching to `broadcast` above a threshold would make every connected client refetch, so the trade isn't clearly better.
- **test challenger P3 3, part one: use `DatasetPopulator.recalculate_disk_usage()`.** Disproved for this class. With Celery off, the endpoint returns 204, and the helper's `wait_on_task` fails with a `JSONDecodeError`. Reproduced on the branch.
- **test challenger P3 3, part two: populator helpers for quota update/delete and group-user add.** Minor. The P2 2 fix adds `_update_quota`/`_delete_quota` to the test class. Moving them into `DatasetPopulator` stays optional.
- **thermo P2 2, sub-point: `userStore` reconnect/config-wait shape diverges from `entryPointStore`.** Re-litigates the follow-up the PR description lists: a shared SSE "connect / wait-for-config / catch-up" composable. The rest of that finding is kept as P3 5.

## Trimmed by John

- 2026-11-11 P2 1: The purge SSE test passes even if purging sends nothing. Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort.
- 2026-11-11 P2 2: No tests for removed users, quota edits and deletes, or group membership changes. Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort.
- 2026-11-11 P3 4: The SSE test mock gives each event type one handler, the latest store's. Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort.
- 2026-11-11 P3 5: The storage-usage watcher grows `userStore` instead of living in its own unit. Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort.
- 2026-11-11 P3 6: Generalize "dispatch an SSE event after commit". Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort.
- 2026-11-11 P3 7: The PR description's NOTE no longer matches the code. Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort, by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort and by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Claude Opus 5.5 at medium effort.
