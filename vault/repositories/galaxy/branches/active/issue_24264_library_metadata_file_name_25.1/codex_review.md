# Codex review (round 2)

Ran an independent Codex review (`codex exec -s read-only`) over `origin/release_25.1...HEAD`, 4 commits. The brief gave only the issue, its traceback and the intended scope. Codex returned one finding. I confirmed it and fixed it in the Baseline tests commit.

- **Fixed:** the baseline API test passed the id returned by `POST folders/{id}/contents` (`ldda.to_dict()` gives the LDDA id) to `GET libraries/datasets/{id}`, which expects a LibraryDataset id. The test only passed because the two ids happened to match. It now uses the listing item's `id`. The API test passes.

<details>
<summary>Full review</summary>

Files reviewed: `managers/datasets.py`, `model/__init__.py`, `services/library_folder_contents.py`, `galaxy_test/api/test_folder_contents.py`, `test/unit/app/managers/test_DatasetManager.py`, `test/unit/data/test_galaxy_mapping.py`, `objectstore/__init__.py`, `objectstore/_caching_base.py`, `objectstore/examples/distributed_disk.xml`, `objectstore/unittest_utils/__init__.py`, `webapps/base/controller.py`, `api/library_datasets.py`, `managers/library_datasets.py`.

1. P2, test-correctness, `lib/galaxy_test/api/test_folder_contents.py:60`: "Use the LibraryDataset ID for the library dataset details request." `_create_dataset_in_folder` returns the LDDA id, but the details endpoint queries `LibraryDataset.id`. If the two id sequences differ, the test looks up an unrelated or nonexistent dataset. Confidence: certain. **CONFIRMED** (`webapps/base/controller.py:516` `ldda.to_dict()`).

</details>
