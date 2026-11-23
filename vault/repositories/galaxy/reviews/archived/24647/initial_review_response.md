Good catch I think. Integration testing agent suggested below seems like a good idea despite the mocking/abstraction busting - probably this is an important test? -John

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via claude-opus-5-5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via claude-opus-5-5 at low effort.
- Review profile [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) was run via claude-opus-5-5 at medium effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_reviews/reviewers/learning_galaxy.md) was run via claude-opus-5-5 at medium effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via claude-opus-5-5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile gx_risk_assessment, claude-opus-5-5 at low effort, reviewed commit 7247fea9983.

Mostly a two-way door: no API, schema, or tool/workflow format change, but the new allowlist rejects extended-metadata imports that touch anything outside the job's own outputs, so any legitimate job path the allowlist misses will now fail jobs on a release branch.

<details><summary>Risk Details</summary>

- Behavior change on `release_26.2`: extended-metadata finish now raises `MalformedContents` for edits to datasets, collections, jobs, library folders, or metadata files not derived from `job.io_dicts(exclude_implicit_outputs=True)`. Any tool or job type that legitimately edits other objects (implicit outputs, dynamically discovered collection elements populated later, data fetch into libraries, set-metadata jobs, `__DATA_FETCH__`/upload variants) would fail where it succeeded before.
- Library-folder access is now gated on `library_folder_manager.can_add_item` for the job's user; jobs run without a user/session, or admin-driven library imports, depend on that check behaving correctly in a `WorkRequestContext`.
- User-defined tools (`GalaxyUserTool`) can no longer set `external_filename` or move datasets to object stores outside the job's own; this intentionally narrows what those tools may do and is a small precedent for user-tool capabilities.
- Metadata-file reuse by uuid is refused unless the uuid belongs to one of the job's outputs; flows that legitimately copy or share metadata files across datasets could break.
- Rollback is cheap (code-only, no migration), and the change only applies to `metadata_strategy` extended/directory-celery paths that use the job-written model store.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should check that the allowlist built in `EditableObjects.__init__` covers every object a real extended-metadata job writes back: implicit outputs, discovered/dynamic collection elements, data-fetch library targets, and set-metadata jobs. Running the extended-metadata integration and data-fetch/library test suites against this branch is the main safeguard against release-branch job failures.

The `GalaxyUserTool` restrictions on `external_filename` and object store changes should also be confirmed as the intended policy, since they define what user-defined tools may do going forward.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24647_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_24647_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24647_review_0) starts from the reviewed commit `7247fea9983`. It adds integration tests that run real jobs under extended metadata and tamper with the model store each job writes to `metadata/outputs_populated`. The tampered stores name another user's dataset, job or collection, or link a user-defined tool's output to a server file, and every job must end in error with the victim unchanged. With the PR's `editable_objects=` argument removed from `finish`, all four tests fail. The branch also blocks `uuid` changes to existing outputs of user-defined tools, and it loads a metadata file uuid's rows once instead of twice.

- [`dda2d1ace28`](https://github.com/jmchilton/galaxy/commit/dda2d1ace28) Test that a job's tampered extended metadata can't edit objects it doesn't own: adds four tampering tests to `TestExtendedMetadataSecurityIntegration` (dataset, job, collection, user-defined tool `external_filename`), using a `mock.patch.object` wrapper around `store.get_import_model_store_for_directory`.
- [`8e90673a485`](https://github.com/jmchilton/galaxy/commit/8e90673a485) Refuse uuid changes to existing outputs of user-defined tools: makes `assert_dataset_attributes_editable` refuse a new `uuid` for an existing dataset, adds a unit forge case, and adds an untampered user-defined tool run as a positive control to the integration test.
- [`4d16bd86879`](https://github.com/jmchilton/galaxy/commit/4d16bd86879) Query a metadata file uuid's rows once during import: `replace_metadata_file` loads the rows once, ordered by id, and uses them for both the editability check and the row to reuse.

</details>

</details>

### P2 1: No integration test shows a real job's refused edit (implementation verified)

All rejection coverage is in `test/unit/data/model/test_model_store.py`, which calls the import directly with a hand-built `EditableObjects`. Nothing tests the wiring in `MinimalJobWrapper.finish`: building `EditableObjects(job, ...)` from a live job, the `GalaxyUserTool` detection, and the job failing through `fail()`. If someone dropped `editable_objects=` from `finish`, every new test would still pass. The new `TestUserDefinedToolExtendedMetadata` only checks that legitimate user-defined tool jobs still succeed.

Suggested fix: add integration tests that run real jobs under extended metadata and tamper with `metadata/outputs_populated` before Galaxy imports it. The review branch adds four to `TestExtendedMetadataSecurityIntegration` in `test/integration/test_extended_metadata.py`. Each test wraps `galaxy.model.store.get_import_model_store_for_directory` with `mock.patch.object`; Galaxy runs in-process and `galaxy.jobs` calls the function through the module. Each test asserts that the job and its outputs end in `error` with a "Model store may not ..." message, and that the victim object is unchanged as its owner sees it.

<details><summary>Details</summary>

- `test_job_cannot_edit_another_users_dataset`: rewrites the `cat1` output entry in `datasets_attrs.txt` to another user's HDA id with `name: pwned`. The victim's name and content must be unchanged.
- `test_job_cannot_edit_another_users_job`: rewrites `jobs_attrs.txt` to another user's job id with `stdout: pwned`. The victim job's `tool_stdout` and outputs must be unchanged.
- `test_job_cannot_edit_another_users_collection`: runs `collection_creates_dynamic_list_of_pairs` and points its `collections_attrs.txt` collection id at another user's list. The victim list's elements must be unchanged. Only dynamic collections reach `collections_attrs.txt`, so a static collection tool can't be used here.
- `test_user_defined_tool_cannot_link_output_to_server_file`: runs a `GalaxyUserTool` once untampered (it must succeed), then again with the output's `dataset.external_filename` pointed at a server file. The job must fail and the output must not contain the file's contents.

The library folder callback (`_can_add_to_library_folder` with a real `WorkRequestContext`) still has no refusal test. It needs a non-admin user and a folder they can't add to.

</details>

<details><summary>Evidence</summary>

All four tests pass at the branch head when run one at a time with pytest. To check that they test something, I removed the `editable_objects=` argument from `finish` and ran them again without committing that change. All four failed, each because the job ended `ok` instead of `error`.

</details>

Fixed on the review branch in [`dda2d1ace28`](https://github.com/jmchilton/galaxy/commit/dda2d1ace28).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: A refused import still commits the objects imported before the refusal (implementation verified)

The import runs with `commit=False`, and the generic `except Exception` in `finish` passes `MalformedContents` to `fail()`. `fail()` refreshes the job and its declared outputs and then commits, with no rollback first. Anything the import had already added to the session is kept. That includes discovered datasets, which never get default permissions, because `set_default_hda_permissions` only runs after a successful `perform_import`. These objects are the job's own, so this is not a bypass. It does leave a stray `ok` dataset in the user's history next to the failed job. Any import exception already did this, but this PR adds a deliberate refusal path.

<details><summary>Evidence</summary>

I ran a throwaway integration test and did not commit it. It ran `multi_output`, which discovers a dataset, and rewrote `jobs_attrs.txt` to another user's job id, so the refusal came in `_import_jobs` after the datasets were imported. The job failed with "Model store may not edit Job 2." Its history then held `(1, 'Multi_Output', 'error')` and the discovered `(2, 'Multi_Output (world)', 'ok')`.

</details>

Suggested fix: make the refusal atomic. Roll back the import's changes before calling `fail()`, either with a savepoint around `perform_import` or with a `rollback()` in the `except` branches.

<details><summary>Details</summary>

The branch does not fix this. A plain `self.sa_session.rollback()` would also discard the `job_messages` that `check_tool_output` set before the import. The import's `_flush` has written those to the open transaction, and `fail()` doesn't set them again. A savepoint (`begin_nested()`) around the import keeps them, but `galaxy.model` only uses savepoints on PostgreSQL elsewhere, so it needs checking on SQLite. Once fixed, the P2 1 tests could also assert that the history has no new contents.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: `allow_dataset_file_edit` doesn't cover `uuid` changes (implementation verified)

For user-defined tools, `assert_dataset_attributes_editable` blocks `external_filename` and `object_store_id` changes, because those choose the file behind a dataset. With `object_store_store_by = uuid`, the dataset `uuid` chooses the file too, and `DatasetAttributeImportModel.uuid` can still change an existing output's uuid. The unique constraint on `Dataset.uuid` blocks collisions with live rows, so the impact is low, but it is the same kind of edit as an object store move. The legacy `uuid`/`dataset_uuid` keys only apply to newly created datasets, so they are not affected.

Suggested fix: when `allow_dataset_file_edit` is false, refuse a `uuid` that differs from an existing dataset's own. The review branch does this and adds a `_forge_uuid_change` case to `test_user_defined_tool_import_refuses_dataset_file_edits`.

Fixed on the review branch in [`8e90673a485`](https://github.com/jmchilton/galaxy/commit/8e90673a485).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 3: The metadata file uuid is queried twice (implementation verified)

When `editable_objects` is set, `replace_metadata_file` runs `select(MetadataFile).filter_by(uuid=...)` for `assert_metadata_file_editable`. It then runs the same query again with `order_by(id).limit(1)` to choose the row to reuse. Every metadata file in an extended metadata import pays an extra round trip, so a job that discovers many indexed outputs (BAM plus `.bai`) pays one extra query per file.

Suggested fix: query once, ordered by id, pass the rows to `assert_metadata_file_editable`, and reuse the first row. The review branch does this.

Fixed on the review branch in [`4d16bd86879`](https://github.com/jmchilton/galaxy/commit/4d16bd86879).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
