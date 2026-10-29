Code-wise this is a two-way door (a new opt-in `pgcleanup.py` action nobody runs unless they ask for it), but running it is a one-way door for data: it irreversibly marks deleted library datasets purged, and chained with `delete_datasets`/`purge_datasets` it removes files from disk.

<details><summary>Risk Details</summary>

- `delete_library_datasets` sets `library_dataset.purged = true`; purged library datasets can no longer be undeleted, so any library-delete done more than `--days` ago becomes permanent on first run.
- On deployments with years of soft-deleted library datasets (e.g. the 2.7 TB in #19766), the first run will make a large backlog eligible for `delete_datasets` and then file removal at once.
- It sets `ldda.deleted = true` on every version of a target `LibraryDataset`; a dataset still shared by a live HDA or another live LDDA is protected only by `delete_datasets`' existing veto, not by this action.
- Retention keys on `library_dataset.update_time`, while `ldda.update_time` is intentionally left untouched so the chained run proceeds; any later code path that bumps `library_dataset.update_time` or relies on `ldda.update_time` changes when data becomes eligible.
- Adds a new action name to the admin CLI surface; renaming or changing its semantics later affects admins' cron jobs.

</details>

<details><summary>Risk Review Advice</summary>

Check that the semantics match the legacy `cleanup_datasets.py` `delete_datasets()` library half closely enough that admins migrating from it see no surprises, and that `delete_datasets` still vetoes datasets with any live HDA/LDDA after this action runs. The `update_time` interplay that allows chaining in one invocation is the subtle part and deserves a careful read.

Consider whether the PR or admin docs should warn that the first run on an old instance will make a large historical backlog permanently unrecoverable, and recommend a dry run first.

</details>
