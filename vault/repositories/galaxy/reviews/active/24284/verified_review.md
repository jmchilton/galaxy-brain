### P3 1: Unconditional SELECT when a job discovers nothing (implementation verified)

Most extended-metadata jobs have only precreated outputs, so `hdas_by_key` is empty, but the job-finish block still runs `select(HistoryDatasetAssociation).where(id.in_([]))` and builds a `PermissionProvider` (whose `job.io_dicts()` walks the job's input associations). SQLAlchemy doesn't short-circuit an empty `IN`: it renders an empty-set subquery and makes the round trip. The old code issued no discovered-dataset queries in that case, and this commit is about cutting queries at job finish.

Guard the block on a non-empty id list, with the query, the provider, and the loop inside the guard (`lib/galaxy/jobs/__init__.py`, ~L2173).

<details><summary>Details</summary>

```python
if discovered_hda_ids := [
    inspect(hda).identity[0] for hda in object_import_tracker.hdas_by_key.values()
]:
    discovered_hdas = self.sa_session.scalars(...)
    permission_provider = PermissionProvider(job.io_dicts()[0], self.app.security_agent, job)
    for hda in {hda.dataset: hda for hda in discovered_hdas}.values():
        permission_provider.set_default_hda_permissions(hda)
```

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: Permission assertion helper copied across test files (implementation verified)

`_assert_history_datasets_private` in `test/integration/test_default_permissions.py` is a line-for-line copy of the one #24233 added to `test/integration/test_extended_metadata.py`, and the API test re-implements the same `GET datasets/{id}` → `permissions` loop. Two copies will be forward-merged.

Move it onto `DatasetPopulator`, next to `user_private_role_id`: a `get_dataset_permissions(dataset_id)` accessor and `assert_history_datasets_permissions(history_id, expected_count, access_private)`. Then have both integration files call it.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 3: API test checks only the collection's elements (implementation verified)

`TestDatasetCollectionsApi.test_fetched_list_elements_get_default_permissions` only iterates `elements`. The integration helper also asserts the history-wide dataset count and checks every dataset in the history, so it catches stray datasets and anything outside the collection.

Use the shared helper with `access_private=False` (`expected_count=2`).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 4: Job-finish permission loop is covered only for `multi_output` (implementation verified)

The reworked loop in `lib/galaxy/jobs/__init__.py` only runs under `metadata_strategy: extended`, and it now skips precreated outputs (`hdas_by_id`) on the grounds that they got permissions at job creation. `TestExtendedMetadataIntegration.test_discovered_datasets_get_default_permissions` (from #24233) covers one precreated output plus one discovered dataset. Other output kinds that are filled or replaced at finish aren't covered: `from_work_dir`, `format="auto"`, `assign_primary_output`, static paired collection elements, and discovered list elements.

Add a private-default case to `TestExtendedMetadataIntegration` (not `TestPrivateDefaultPermissionsIntegration`, which doesn't use extended metadata, so it never reaches this loop). Run `all_output_types` and assert that all 10 history datasets are private.

<details><summary>Evidence</summary>

The new test passes on the review branch. It also passes on `2f56e05acff` (before the query rework) with the shared helper applied. So no output kind loses permissions when `hdas_by_id` is skipped. The test adds coverage; it doesn't expose a regression.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>
