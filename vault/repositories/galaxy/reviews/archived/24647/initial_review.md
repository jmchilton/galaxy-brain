# Initial review: default profile

- Profile: `_shared/reviewers/default.md`
- Model: claude-opus-5-5, medium effort
- Reviewed commit: `7247fea9983` (PR #24647, base `release_26.2`)

## Summary

The PR adds `EditableObjects`, built from the job row before the import. It holds the job, its outputs (HDAs and LDDAs), its output collections and their elements, and the datasets behind them. Every `allow_edit` lookup by database id in `ModelImportStore` now goes through `_assert_editable` before the `sa_session.get`. That covers dataset instances, `dataset.id` rebinding, DatasetCollection, HDCA, Job and LibraryFolder. Metadata file uuids that belong only to other datasets are refused. User-defined tools also lose `external_filename` and object-store moves.

I walked every id-keyed path in the importer:

- `_import_datasets`
- `handle_dataset_object_edit`
- `_import_collection` for DCs and HDCAs
- `_import_libraries`
- `_import_jobs`
- the `find_hda`/`find_hdca`/`find_dce` tracker lookups
- `_normalize_job_parameters`

The tracker lookups only resolve objects the import itself registered. Those registrations go through the new checks, so they don't reopen the hole. I found no remaining id-keyed path that skips the check.

Legitimate flows look intact:

- `__SET_METADATA__` never uses the extended strategy (`get_metadata_compute_strategy`), so its input-editing doesn't hit the new rule.
- `ExtendedDirectoryMetadataGenerator.load_metadata` is sessionless.
- Data fetch to library folders goes through the new `can_add_to_library_folder` hook.

The abstraction is small, lives next to `ImportOptions`, and is opt-in. Other callers keep their old behavior. Overall this is a clean, well-scoped hardening change. The gaps are about test depth more than correctness.

## Findings

### P2 1: No integration test exercises a refused edit

The unit tests in `test/unit/data/model/test_model_store.py` drive `EditableObjects` directly against a mock app. The new integration class `TestUserDefinedToolExtendedMetadata` only re-runs the existing user-defined-tool happy-path tests under `metadata_strategy = "extended"`. Nothing checks that a real job finishing through `MinimalJobWrapper.finish` is refused. That flow covers the `EditableObjects` construction from a live `Job`, the `functools.partial(self._can_add_to_library_folder, job)` wiring, the `GalaxyUserTool` detection, and the resulting job/output state. The same is true of the job wrapper's `_can_add_to_library_folder` (real `WorkRequestContext` plus `library_folder_manager.can_add_item`). It is only tested through a lambda stub. The existing `TestExtendedMetadataIntegration.test_fetch_data_library` exercises it on the allowed path only, and likely as a library-admin-capable user.

Suggested fix: add a test to `TestExtendedMetadataSecurityIntegration` in `test/integration/test_extended_metadata.py`. It already runs with extended metadata and `store_by=uuid`. The test should rewrite a finished job's `metadata/outputs_populated` to name a dataset the job doesn't own, for example an HDA from another history or user. Then it should drive the import through the job wrapper, or through `store.get_import_model_store_for_directory` with `EditableObjects(job)` against the real app. Assert that the import raises or the job errors, and that the unowned object is unchanged. One straightforward setup keeps job working directories (`cleanup_job: never`) and replays the import with `self._app`. A second case should forge a non-permitted library folder id for a non-admin user. John asked for this test as part of verification.

### P3 1: A refused import may still commit the objects imported before the refusal

`MalformedContents` from `_assert_editable` is caught by the generic `except Exception` in `finish` and handed to `fail()`. The import now runs with `commit=False`. `fail()` refreshes the job and its declared outputs, then calls `self.sa_session.commit()`, and nothing rolls back first. Any objects the import had already added to the session are flushed with the failure state. That includes discovered HDAs, new collections and new library datasets. The new HDAs never get their default permissions set, because `set_default_hda_permissions` runs only after a successful `perform_import`. None of these objects are unowned, since everything edited before the refusal was in the editable set, so this is not a bypass. It does leave stray, permission-less datasets in the user's history after a deliberately forged or buggy store. Any import exception already did this, but the PR adds a deliberate refusal path. A `self.sa_session.rollback()` before `fail()` in that `except` would make refusal atomic. The integration test from P2 1 can assert that history contents are unchanged. Needs verification that a rollback doesn't disturb `fail()`'s own `refresh(job)` and output handling.

### P3 2: `allow_dataset_file_edit` doesn't cover `uuid` changes

`assert_dataset_attributes_editable` blocks `external_filename` and `object_store_id` changes for user-defined tools, because those decide which file backs a dataset. With `object_store_store_by = uuid`, the dataset `uuid` decides the file path too. Both `DatasetAttributeImportModel.uuid` and the legacy `uuid`/`dataset_uuid` keys handled near `_import_datasets` (`if self.import_options.allow_edit: dataset_instance.dataset.uuid = ...`) can still change an existing output's uuid. The unique constraint on `Dataset.uuid` blocks collisions with live rows, so the practical impact is low. Still, it is the same kind of edit as an object-store move. For consistency, refuse a uuid change on an existing dataset when `allow_dataset_file_edit` is false. Precreated outputs export their own uuid, so legitimate stores never change it.

### P3 3: User-defined-tool detection is a string compare when a type already exists

`user_defined_tool = bool(job.dynamic_tool and job.dynamic_tool.tool_format == "GalaxyUserTool")` re-derives a fact that the toolbox already encodes as `UserDefinedTool`. `create_tool_from_source` instantiates that class for `GalaxyUserTool` sources, and `self.tool` is available in `finish`. Elsewhere in the same file, `prepare` gates on `not dynamic_tool.public` (the `is_unprivileged_tool` notion). Prefer `isinstance(self.tool, UserDefinedTool)`, or one helper shared with `prepare`. That keeps a single definition of an "untrusted tool" for future rules that, like this one, apply only to user-defined tools.

### P3 4: Two of the new unit tests are trivial

`test_import_accepts_sessionless_string_ids` and `test_import_edits_library_folders_the_user_can_add_to` exercise `EditableObjects.assert_editable` directly. The latter only checks that a lambda is called. They don't test any import behavior or the real permission check. The parametrized forge tests already cover the import paths well. If P2 1 adds a library-folder integration case, the lambda test can go. Fold the string-id case into a forge test that imports a store written sessionlessly.

### P3 5: The metadata file uuid is queried twice

`replace_metadata_file` now runs `select(MetadataFile).filter_by(uuid=...)` for the editability check, then runs the same query again with `order_by(id).limit(1)` to pick the row to reuse. Fetching the rows once, ordered by id, and using that list for both the check and the "first row" choice removes a query per metadata file and keeps the two decisions consistent.

## Notes (not findings)

- The PR description says the `external_filename` restriction applies only to user-defined tools "for now", because data fetch needs it for linked uploads. A follow-up could invert this, allowing file edits only for data-fetch jobs with `link_data_only` instead of exempting all admin-installed tools. That would better match the "compromised Pulsar node" threat named in the description. It is recorded here as a decision called out explicitly in the PR, not as a finding.
- For outputs that are already populated collections, `EditableObjects.__init__` walks every element (`element.hda`, `.dataset`), which may lazy-load per element. Precreated output collections are normally empty until the import populates them, so I don't expect this to matter in practice.
