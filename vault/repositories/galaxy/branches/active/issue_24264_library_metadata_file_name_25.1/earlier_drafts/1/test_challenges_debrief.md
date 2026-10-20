# Test challenges debrief

No test changes. Both tests hold up, so no commits were made. Branch is still `ef71554b95f` (baseline), `5531e4fd5da` (fix), `b0b6805bba0` (listing).

## Unit test: `test_library_dataset_to_dict_dataset_in_unknown_backend`

- **Tests behavior, not implementation.** It checks the public `LibraryDataset.to_dict()` output, not the helper.
- **No mocks.** It uses a real `DistributedObjectStore` (`get_example("distributed_disk.xml")`) and a real bam index metadata file, and follows the existing `test_nested_collection_attributes` metadata pattern. No SimpleNamespace or mocks to replace.
- **Not covered elsewhere, and not worth moving up a layer.** Reproducing it in an API test isn't possible. An integration test would need a distributed object store config and a direct DB edit of `object_store_id`. That's much heavier for the same assertion. The unit layer fits.
- **Red for the right reason.** I put the model file back to the baseline commit, and the test fails with the issue's exact error, `TypeError: attribute name must be string, not 'NoneType'` at `model/__init__.py` `get_file_name`. It passes on HEAD.
- **Proportionate.** One test for a small fix. I didn't add HDA/LDDA variants, because they share the same `get_file_name_if_locatable` path.

## API test: `TestFolderContentsApi::test_index` (baseline commit)

- It pins `file_ext`, `state` and `date_uploaded` in the folder listing against `GET /api/libraries/datasets/{id}`. That guards the listing refactor in commit 3, which replaced `to_dict()` with direct LDDA fields. It passes before and after, which is right for a baseline test.
- **Helpers.** It uses the existing `_create_dataset_in_folder` and `_assert_index_count_is_correct`. `GET libraries/datasets/{id}` is called once, so no new helper. `LibraryPopulator.show_ld` takes a different route (`libraries/{lib}/contents/{id}`), and the test compares against that route on purpose.

## Listing commit (no new test)

It's a behavior-preserving refactor that also stops creating metadata files on read. The baseline API test covers the output. No test can fail on it alone, because once the fix commit is in, `to_dict` no longer crashes.

## E2E

None needed. This is a backend crash fix and the listing UI fields don't change.

## Results

- `pytest test/unit/data/test_galaxy_mapping.py -k unknown_backend`: 1 passed on HEAD, and it fails with the issue's `TypeError` when the model file is reverted to baseline.
- `pytest lib/galaxy_test/api/test_folder_contents.py::TestFolderContentsApi::test_index`: 1 passed.
