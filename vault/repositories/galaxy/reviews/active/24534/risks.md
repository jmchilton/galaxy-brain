Purging a library dataset now writes `deleted=True` to its current LDDA and every expired version, a persistent data change on purge that rows can't be walked back from, but the purge itself was already irreversible and no API shape changes; otherwise a two-way door.

<details><summary>Risk Details</summary>

- Each purge now marks the current and all expired-version LDDAs deleted; reverting the code would not un-delete rows already written.
- Code or queries that list or resolve a purged library dataset's LDDAs (e.g. version history, admin views) will now see them as deleted.
- Expired versions backed by a different `Dataset` are marked deleted but their datasets are still not purged on disk; only the current LDDA's dataset is checked, as before.
- Library datasets purged before this change keep undeleted LDDAs; no migration backfills them, so old and new purges differ in DB state.
- A failed `full_delete()` is now logged instead of silently swallowed; behavior is otherwise unchanged.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should confirm nothing relies on a purged library dataset's LDDAs staying non-deleted, and decide whether inconsistency with previously purged rows, and leaving expired versions' datasets on disk, is acceptable.

</details>
