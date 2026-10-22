P3 1 looks like a nice micro optimization. The commits it offers for P3 2 & 3 makes the test more readable and I would include them. P3 4 and matching commit look like important tests. Can you merge these? None of it blocks though. -John

<details><summary>Automated Review Details</summary>

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile: gx_risk_assessment, Opus 5.5 (claude-opus-5-5), low effort, reviewed commit 7399ba875a9ac05778d177b36b39eabf30cbb9c1.

Mostly a two-way door; the one sticky part is that permissions written to datasets on a release branch persist in the database, so if the defaults applied are wrong (too open or too restrictive) a code revert won't fix already-discovered datasets.

<details><summary>Risk Details</summary>

- Discovered collection elements now get default (often private) permissions where they previously had none; users or tools relying on those elements being publicly accessible may see access changes after upgrade.
- Permissions are persisted per Dataset; rolling back the code leaves rows already written, so correcting mistakes needs a data fix rather than a revert.
- The job-finish path no longer re-applies permissions to precreated outputs (`hdas_by_id`), relying on job-creation time instead; any precreated output path that skipped permissions at creation would now stay without them.
- Dedupe by `Dataset` picks one HDA per shared dataset to derive permissions; if copies differ in history context, the chosen HDA decides.
- Backport to `release_25.1` changes runtime behavior in a stable release, not just a bug-shaped no-op.

</details>

<details><summary>Risk Review Advice</summary>

Confirm the defaults applied match what non-collection discovered outputs already get, so this is closing a gap rather than introducing new policy, and that dropping `hdas_by_id` from the job-finish loop cannot leave precreated outputs unprotected (e.g. outputs created outside the normal job-creation permission path).

Also check the extra query on job finish is bounded by discovered HDAs only and doesn't add noticeable cost for large collections.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24284_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_24284_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24284_review_0), based on the reviewed head `7399ba875a9`, makes four small follow-ups. It skips the discovered-dataset query when a job discovers nothing. It moves the dataset-permission assertions the PR copied between integration files onto `DatasetPopulator`. It points the API test at that helper so it checks every history dataset. It adds an extended-metadata test that runs `all_output_types` under private defaults. No runtime behavior changes beyond dropping the empty query.

- [`97b2f3f37ea`](https://github.com/jmchilton/galaxy/commit/97b2f3f37ea) Skip discovered-dataset permission query when a job discovers nothing — wraps the query, `PermissionProvider` construction, and permission loop in a walrus guard on the discovered id list.
- [`f329708da08`](https://github.com/jmchilton/galaxy/commit/f329708da08) Share dataset permission test helpers via DatasetPopulator — adds `get_dataset_permissions` and `assert_history_datasets_permissions`, and drops the two private `_assert_history_datasets_private` copies.
- [`cc988ef3f69`](https://github.com/jmchilton/galaxy/commit/cc988ef3f69) Check every history dataset in fetched-list default permissions API test — swaps the elements-only loop for the shared helper with public access and a count of 2.
- [`11bd13fa13d`](https://github.com/jmchilton/galaxy/commit/11bd13fa13d) Test default permissions for every output kind under extended metadata — adds `test_all_output_types_get_default_permissions`, which expects 10 private datasets.

</details>

</details>

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

Fixed in [`97b2f3f37ea`](https://github.com/jmchilton/galaxy/commit/97b2f3f37ea).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: Permission assertion helper copied across test files (implementation verified)

`_assert_history_datasets_private` in `test/integration/test_default_permissions.py` is a line-for-line copy of the one #24233 added to `test/integration/test_extended_metadata.py`, and the API test re-implements the same `GET datasets/{id}` → `permissions` loop. Two copies will be forward-merged.

Move it onto `DatasetPopulator`, next to `user_private_role_id`: a `get_dataset_permissions(dataset_id)` accessor and `assert_history_datasets_permissions(history_id, expected_count, access_private)`. Then have both integration files call it.

Fixed in [`f329708da08`](https://github.com/jmchilton/galaxy/commit/f329708da08).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 3: API test checks only the collection's elements (implementation verified)

`TestDatasetCollectionsApi.test_fetched_list_elements_get_default_permissions` only iterates `elements`. The integration helper also asserts the history-wide dataset count and checks every dataset in the history, so it catches stray datasets and anything outside the collection.

Use the shared helper with `access_private=False` (`expected_count=2`).

Fixed in [`cc988ef3f69`](https://github.com/jmchilton/galaxy/commit/cc988ef3f69).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 4: Job-finish permission loop is covered only for `multi_output` (implementation verified)

The reworked loop in `lib/galaxy/jobs/__init__.py` only runs under `metadata_strategy: extended`, and it now skips precreated outputs (`hdas_by_id`) on the grounds that they got permissions at job creation. `TestExtendedMetadataIntegration.test_discovered_datasets_get_default_permissions` (from #24233) covers one precreated output plus one discovered dataset. Other output kinds that are filled or replaced at finish aren't covered: `from_work_dir`, `format="auto"`, `assign_primary_output`, static paired collection elements, and discovered list elements.

Add a private-default case to `TestExtendedMetadataIntegration` (not `TestPrivateDefaultPermissionsIntegration`, which doesn't use extended metadata, so it never reaches this loop). Run `all_output_types` and assert that all 10 history datasets are private.

Fixed in [`11bd13fa13d`](https://github.com/jmchilton/galaxy/commit/11bd13fa13d).

<details><summary>Evidence</summary>

The new test passes on the review branch. It also passes on `2f56e05acff` (before the query rework) with the shared helper applied. So no output kind loses permissions when `hdas_by_id` is skipped. The test adds coverage; it doesn't expose a regression.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>
