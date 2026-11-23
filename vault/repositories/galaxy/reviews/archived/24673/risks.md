Risks are low and this is largely a two-way door: there is no API, schema, or tool/workflow contract change and the locks can be reverted cleanly, leaving only the copies' `visible`/`deleted` handling as a behavior that a later change could come to depend on.

<details><summary>Risk Details</summary>

- All new locks are in `copy_from`, `copy_from_job`, and `copy()`, so reverting them needs no data migration. HDAs already repointed to a cached dataset stay valid after a revert.
- Purging the replaced dataset already happens today. A copy that escapes the locks, such as in the expression tool gap the PR describes, still ends up on a purged dataset as it does now.
- Propagated copies now keep their own `visible` and `deleted` values on every `copy_from` path, including expression tools and deferred materialization, not just late cache hits. Copies that were previously re-shown or undeleted by a swap now stay as they were.
- `copy_from` now holds row locks until the cache hit commits, including non-immediate post job actions. Open transactions that reference an output can delay job preparation, and those transactions' own locks can queue behind it.
- One deadlock ordering remains, as the PR notes. PostgreSQL aborts one side, so a request or job that used to succeed can fail with an error under that overlap.
- `SELECT ... FOR UPDATE` and `FOR KEY SHARE` have no effect on SQLite, so that behavior is only exercised by the PostgreSQL tests and the new `unit-postgres` workflow step.
- `copy()` can now reload unmodified attributes of the source HDA mid-operation when the dataset changed underneath it, which callers holding that object could observe.

</details>

<details><summary>Risk Review Advice</summary>

Consider whether `copy_from` should preserve `visible` and `deleted` on every caller, since that is the one behavior that applies beyond the race being fixed. Expression tool and deferred materialization paths get it as a side effect, and on a release branch it should be intended there too.

Also consider lock duration on busy servers: the `FOR UPDATE` is held across post job actions and recurses through copies of copies, so judge whether job preparation stalls or the remaining deadlock are an acceptable trade for no longer leaving items stuck in `queued`.

</details>
