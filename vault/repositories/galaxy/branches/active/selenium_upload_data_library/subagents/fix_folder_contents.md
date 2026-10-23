# Fix: folder contents 500s

Head `1cf0f10b00f` (base `d2d1dcd883c`, release_26.2). There are two fix commits after the `start()` commit. origin/dev has the same code in all touched files, and no upstream PR fixes either bug.

## 1. Folder without description (`394f52fedb0`)

- **Cause:** `LibraryFolder.description` is nullable. Folders created through the fetch API without a `description` store None (`tools/__init__.py` `create_library_folder` → `FolderManager.create`). So does `POST /api/folders` with `description: null`. `LibraryFolderMetadata.folder_description` was a required `str`, so `GET /api/folders/{id}/contents` failed pydantic validation and returned 500.
- **Fix:** the schema now says `folder_description: str | None`. This matches the neighbouring `FolderLibraryFolderItem.description` and the model column. The client API schema line is now `string | null`; the openapi-typescript generator gives the same output. Only `FolderDetails` reads the field client-side, and `buildFields` already skips falsy values.
- **Test:** `test_folder_contents.py::test_index_folder_without_description` fetch-creates a subfolder with no description and lists it. It was red before the fix (500, pydantic `folder_description` error in the server log) and is green after.
- **E2E cleanup:** the `description` workaround and its comment are gone from `_create_and_populate_library`.

## 2. Mid-import 500 (`1cf0f10b00f`)

- **Cause:** the legacy library upload in `upload_common.__new_library_upload`, which import-from-directory uses, runs in this order:
  1. commits the `LibraryDataset`;
  2. copies permissions;
  3. creates and commits the LDDA;
  4. several commits later, sets `ld.library_dataset_dataset_association_id`.

  In between, `_get_contained_datasets_statement` outer-joins the LDDA, so the unlinked LD is returned. `_serialize_library_dataset` then hits `None.dataset`.
- **Fetch API is not affected.** It links the LDDA before its single commit. A fetch repro polled folder contents about 3.7k times during an import and saw no 500. The earlier E2E draft hit the race through `populate_library_folder_from_import_dir`.
- **Fix:** the contents query now excludes LDs whose `library_dataset_dataset_association_id` is NULL. It does this in the base statement, so `total_rows` and pagination stay consistent. The filter covers admins and non-admins.
- **Skip vs pending:** skipping is right. An LD without an LDDA has no name, ext, state or size. Once the link is committed the entry shows up in its queued state.
- **Producer left as is:** I didn't reorder the producer; that's a bigger change to legacy code. The reader has to tolerate an unlinked LD anyway.
- **Test:** `test/unit/webapps/galaxy/services/test_library_folder_contents_service.py` is deterministic. It builds a linked LD/LDDA plus an LD with no LDDA through the model session, then calls `LibraryFolderContentsService.index`. It was red before the fix (`AttributeError: 'NoneType' object has no attribute 'dataset'`) and is green after.
- **Shared test helper:** I added `MockTrans.get_current_user_roles`, which mirrors `ProvidesUserContext`.
- No E2E workaround for this bug was left on the branch.

## Tests

- New API test: passed.
- `test_folder_contents.py`: 17 passed.
- New unit test: passed.
- `test/unit/webapps/galaxy/services` + `test/unit/app/managers`: passed. The 7 SSE async tests only fail under `-p no:asyncio` and pass without it.
- `TestUploadActivityDataLibrary`: 3 passed under Playwright and 3 passed under Selenium.
- Lint (ruff, black, isort) and pre-commit: clean.

## release_26.1

Both bugs exist on release_26.1. It has:

- `folder_description: str`, with the serializer passing `folder.description` straight through;
- the same outer join in `_get_contained_datasets_statement` and the same `ldda.dataset` dereference;
- the same late LD→LDDA link in `upload_common`;
- the same fetch-folder creation path.

## Env notes

- On arrival, 8092 was crash-looping. Workers were being killed by the macOS objc fork-safety abort. I restarted it with `OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES`.
- My repro script regenerated the API key of `test@bx.psu.edu` on 8092. Tests use the master key, so this had no effect on them.
