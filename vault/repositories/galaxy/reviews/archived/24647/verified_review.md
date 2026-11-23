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

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 3: The metadata file uuid is queried twice (implementation verified)

When `editable_objects` is set, `replace_metadata_file` runs `select(MetadataFile).filter_by(uuid=...)` for `assert_metadata_file_editable`. It then runs the same query again with `order_by(id).limit(1)` to choose the row to reuse. Every metadata file in an extended metadata import pays an extra round trip, so a job that discovers many indexed outputs (BAM plus `.bai`) pays one extra query per file.

Suggested fix: query once, ordered by id, pass the rows to `assert_metadata_file_editable`, and reuse the first row. The review branch does this.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
