# Filtered findings — #24738 round 0

Reviewed commit `c55d04482f9`.

- **performance P3 2: large quota groups send every member id in one AMQP message.** Speculative and unmeasured. Switching to `broadcast` above a threshold would make every connected client refetch, so the trade isn't clearly better.
- **test challenger P3 3, part one: use `DatasetPopulator.recalculate_disk_usage()`.** Disproved for this class. With Celery off, the endpoint returns 204, and the helper's `wait_on_task` fails with a `JSONDecodeError`. Reproduced on the branch.
- **test challenger P3 3, part two: populator helpers for quota update/delete and group-user add.** Minor. The P2 2 fix adds `_update_quota`/`_delete_quota` to the test class. Moving them into `DatasetPopulator` stays optional.
- **thermo P2 2, sub-point: `userStore` reconnect/config-wait shape diverges from `entryPointStore`.** Re-litigates the follow-up the PR description lists: a shared SSE "connect / wait-for-config / catch-up" composable. The rest of that finding is kept as P3 5.
