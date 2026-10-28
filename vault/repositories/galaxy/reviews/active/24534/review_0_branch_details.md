Branch `pr_24534_review_0`, built from `1bf150cceb0`, reworks the PR's tests and leaves production behaviour unchanged.

- The existing `*_purged` tests sent `purged` instead of `purge`, so they never purged. They now purge and check through the API that the current version is retired.
- The ORM-backed current-version test is replaced by those API checks.
- Two new tests pin the purge rule from both sides: an unshared dataset has its files purged, and a dataset shared with a live HDA keeps them.
- The database-level checks move to an integration test that reuses `IntegrationTestCase` helpers. It has one soft-delete case and one expired-version purge case.
- Tests now address library items by `library_dataset_id` instead of the LDDA id.
- The comment that overstated undelete protection is reworded.
- A `LibraryPopulator.delete_library_item` helper replaces the hand-built DELETE calls.

Commits:

- `ed0bb77e198` Fix purge key in *_purged library contents tests, assert LDDA retired: switches `{"purged": True}` to `{"purge": True}` and asserts `show_ldda(...)["deleted"]` on the `from_hda` and `from_hdca` paths.
- `e49e36a74f8` Check current-version retirement through the API: drops `test_purge_library_item_retires_current_version` and moves its "soft delete keeps the version live" check into `test_delete_library_item_from_hda`.
- `90556d23f13` Test the dataset purge branch of library item purge: adds `test_purge_library_item_purges_unshared_dataset` (raw display refused as purged) and `test_purge_library_item_keeps_shared_dataset` (source HDA content still served).
- `999f12414fd` Move library version purge test to an integration test: moves the test to `test/integration/test_library_purge.py` and removes the per-file app/session helpers and the `galaxy.model` import from the API module.
- `10ebd89b799` Reword purge comment: undelete of purged entries isn't refused yet: "can never be undeleted" becomes "is meant to be irreversible" until #24516 lands.
- `19e31271914` Add LibraryPopulator.delete_library_item: adds the helper, which asserts a 200, and uses it in every touched test.
- `0e3cc72c574` Address library items by library_dataset_id, not the LDDA id: touched API tests and the integration test use the create response's `library_dataset_id`.
- `04dad6322cf` Pin that a soft delete leaves library versions live: adds an integration soft-delete case that restores the dropped `ld.purged is False` check, plus `ldda.deleted is False` for the current and expired versions.
