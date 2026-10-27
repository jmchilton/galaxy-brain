# Normal review: folder contents fixes (`394f52fedb0`, `1cf0f10b00f` -> `078ff13cbc3`)

Verdict: both fixes are correct, minimal and fit release_26.2. Acted on one item: in `_get_contained_datasets_statement` the outer join plus `IS NOT NULL` filter became an inner join, matching the sibling `get_readme`. This was folded into the upload-race commit, giving new head `078ff13cbc3`. No real bugs found.

## Not acted on

- **Defaulting the description for fetch-created folders:** not needed. `None` is already a legal state. `LibraryFolder.description` is nullable, and `CreateLibraryFolderPayload.description` and `FolderLibraryFolderItem.description` are both `str | None`. Existing rows already hold NULL, so a producer-side default would not fix them. Widening the response schema is the root fix.
- **Reordering the legacy producer** (`upload_common.__new_library_upload` links the LDDA late): agree with the implementer that the reader has to tolerate this anyway. Reordering would be a larger change to legacy code on a release branch.
- **The unit test only covers the admin path** (`MockTrans.user_is_admin = True`): the non-admin path goes through the same base statement. `_filter_by_dataset_access` outer-joins from the LDDA, and before the fix it also let the unlinked LD through, because `NOT EXISTS ... dataset_id = NULL` is true. The inner join now drops it before that filter runs. Not worth extending the mock for this.
- **vue-tsc not run** for the `string | null` client type: the only consumer is `FolderDetails.vue`, through `buildFields`, which skips falsy values and is typed generically. CI covers this.

## Details

**Bug 1: `folder_description: str | None`**
- This is a root fix and is consistent with the neighbouring folder schemas. It is not an API break: the response field was declared `str` but could hold None in the DB, and that case returned a 500.
- The `schema.ts` line has the same shape that openapi-typescript emits for a required nullable field (`folder_description: string | null;`, compare `readme?: string | null` for the defaulted one).
- The API test `test_index_folder_without_description` creates the folder through fetch without a description. It checks both the parent listing (`description is None`) and the subfolder metadata. It is meaningful, because the old schema rejects None. It reuses the existing `_create_folder_in_library`, `_assert_index_count_is_correct` and `dataset_populator.fetch`.
- Removing the E2E workaround is correct, and the E2E now exercises the fix.

**Bug 2: unlinked LD in the contents listing**
- `_get_contained_datasets_statement` has one caller, `get_contents`. The filter sits in the base statement, so `get_count` (`total_rows`), pagination, search, `include_deleted` (admin and non-admin MODIFY path) and dataset-access filtering all see the same rows. `get_readme` already used an inner join. Search over `ldda.name`/`ldda.message` would never have matched an unlinked LD anyway.
- **Change made:** `outerjoin(...)` plus `.where(library_dataset_dataset_association_id.is_not(None))` became `.join(...)`. The semantics are the same, because the FK points LD->LDDA. It is one clause fewer and mirrors `get_readme`. The comment is kept to one line. Efficiency: an inner join on the FK is no worse than the outer join, and it may let the planner prune more.
- **Unit test** (`test/unit/webapps/galaxy/services/test_library_folder_contents_service.py`): deterministic, and it asserts both the item list and `total_rows`. I re-checked red/green after my change. On the pre-fix `folders.py` it fails with `AttributeError: 'NoneType' object has no attribute 'dataset'`, and it passes with the inner join. An API/integration test can't hit the race deterministically, so a unit test is the right level here.
- **`MockTrans.get_current_user_roles`:** mirrors `ProvidesUserContext.get_current_user_roles`. Several tool tests define their own ad-hoc versions on local mocks. The shared one is consistent and harmless, because nothing else on `MockTrans` defined it.
- **Imports and comments:** imports are at the top of the files and comments are one line.
- **Release suitability:** small and no API breaks. Both bugs exist on release_26.1 as well, per the implementer's debrief.

**Tests run (after the change, against 8092, which was restarted via the script)**
- New unit test: red on the pre-fix `folders.py`, green after.
- `lib/galaxy_test/api/test_folder_contents.py`: 17 passed.
- `TestUploadActivityDataLibrary` (Playwright): 3 passed.
- ruff, black, isort and pre-commit: clean.
