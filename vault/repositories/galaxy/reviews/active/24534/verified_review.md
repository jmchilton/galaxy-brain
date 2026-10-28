### P2 1: The existing `*_purged` tests never purge; fold the new current-version checks into them (implementation verified)

`test_delete_library_item_from_hda_purged` and `test_delete_library_item_from_hdca_purged` sit beside the new tests and send `{"purged": True}`. `LibraryContentsDeletePayload` only defines `purge`, and `Model` doesn't forbid extra keys, so pydantic drops the key and both tests only soft-delete. The PR adds a separate purge test next to them instead of fixing them, which leaves the `from_hdca` path untested.

<details><summary>Details</summary>

Asserting on the response doesn't help here. The route returns `LibraryContentsDeleteResponse`, which has no `purged` field, so `rval["purged"] = True` is dropped (`LibraryContentsPurgedResponse` exists but nothing uses it). That is pre-existing and not part of this PR. The only effect of a purge that the API shows is the one this PR adds: `ldda.deleted` (see P2 2).

</details>

<details><summary>Evidence</summary>

- With the old `purged` key, a `show_ldda(ldda_id)["deleted"] is True` assertion fails: `assert False is True`.
- With `purge`, both the `from_hda` and `from_hdca` tests pass.

</details>

Fix the key to `purge`, take `ldda_id` from `show_ld` before deleting, and assert `show_ldda(ldda_id)["deleted"] is True`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 2: Current-version `deleted` is visible through the API, so those checks don't need the ORM (implementation verified)

The PR body says `ldda.deleted` isn't part of the serialized library item. It is still returned by `GET /api/datasets/{ldda_id}?hda_ldda=ldda` (`LibraryPopulator.show_ldda`), for a soft-deleted entry and for a purged one, to the regular non-admin test user. So `test_purge_library_item_retires_current_version` doesn't need `driver_or_skip_test_if_remote()`, which as written makes it skip silently against a remote Galaxy.

Read `ldda_id` from `show_ld` and assert on `show_ldda(...)["deleted"]`. After P2 1, the purge half of that test is covered by the `*_purged` tests. The soft-delete half ("the version stays live") fits in `test_delete_library_item_from_hda`. Its `ld.purged is False` check needs the database, so it moves to the integration test from P3 1.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 3: No test reaches the `full_delete()` branch the PR rewrote (implementation verified)

Every new test creates its item via `from_hda`, so the dataset is shared with a live HDA and `can_purge_dataset` is always False. The two changes inside that branch never run: dropping the `sa_session.add(ld.dataset)` that raised `AttributeError`, and replacing `except: pass` with `log.exception`. Nothing pins the rule the PR description relies on, which is to purge the files only when nothing else references them.

<details><summary>Details</summary>

These tests pin existing behaviour rather than going red-to-green. Use `display?hda_ldda=ldda&raw=true`: the non-raw LDDA display returns a 500 with `'LibraryDatasetDatasetAssociation' object has no attribute 'hid'`. That bug is pre-existing and unrelated to this PR.

</details>

<details><summary>Evidence</summary>

- Both new tests pass.
- The unshared test also passes against the pre-PR service.
- With `full_delete()` stubbed out, the unshared test fails: the error becomes "has been deleted" instead of "purged".

</details>

Cover both sides of the rule:
- An unshared, library-uploaded dataset that is purged has its raw display refused with the "has been purged" error from `ensure_dataset_on_disk`.
- A purged `from_hda` item leaves the source HDA's content retrievable.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at low effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 4: Tests address the library dataset by the LDDA id (implementation verified)

For `from_hda`/`from_hdca`, `POST /api/libraries/{id}/contents` returns LDDA dicts. Their `id` is the LDDA id; the library dataset id is in `library_dataset_id`. `_create_library_content(...)["id"]` is passed to `DELETE .../contents/{id}` and to `LibraryDataset` lookups as if it were the library dataset id. That only works while the two id sequences stay in step. `_add_version` breaks that by inserting an extra LDDA. Every later test on the same server, which `run_tests.sh` shares across classes, then deletes or inspects the wrong library dataset. The PR's two tests pass only because the version test runs last in the file.

<details><summary>Evidence</summary>

- Moved to an integration class with a soft-delete test before it, the version test failed. `_add_version` looked up `LibraryDataset` 3 while only 2 existed: `AttributeError: 'NoneType' object has no attribute 'library_dataset_dataset_association'`.
- Using `library_dataset_id`, both tests pass in the same server.

</details>

Use `["library_dataset_id"]` wherever the tests need the library item id.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered and verified via Claude Opus 5.5 at medium effort.

</details>

### P3 1: The version test belongs in an integration test, not in per-file ORM helpers in an API module (implementation verified)

`_galaxy_app`, `_db_session`, `_decode_id`, `_db_get_library_dataset` and `_add_version` make `test_library_contents.py` the first API test module that writes ORM rows, and they re-implement `IntegrationTestCase._app` / `_decode_id`. `writing_tests.md` steers this kind of database access to `test/integration`, whose tests never skip silently. After P2 2, only the persisted `ld.purged` flags and the expired-version checks still need the database, because no API creates versions.

Move them to `test/integration/test_library_purge.py` on `IntegrationTestCase`, with one soft-delete and one purge case. Drop the helpers and the `from galaxy import model` import from the API module.

<details><summary>Evidence</summary>

- Both integration tests pass.
- The purge test fails against the pre-PR service: `assert False is True`.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at low effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: Comment says a purged entry "can never be undeleted", but nothing enforces that yet (implementation verified)

`DELETE /api/libraries/datasets/{id}?undelete=true` (`api/library_datasets.py::delete`) still sets `library_dataset.deleted = False` without checking `purged`. Refusing that is #24516, which is still open.

Until it lands, an undeleted purged entry points at a deleted current LDDA. Once a sharing HDA is purged, cleanup can then reclaim the files behind a library entry that is still visible; before this PR, the live LDDA vetoed that. So the PR's "any order" note has one ordering hazard.

Reword the comment to state intent rather than a guarantee, e.g. "Purging is meant to be irreversible, so all versions are retired with the library dataset." Alternatively, note in the PR that it should merge with or after #24516.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: Add a `LibraryPopulator.delete_library_item` helper (implementation verified)

Across the reworked tests, `DELETE /api/libraries/{library_id}/contents/{id}` is written out by hand about six times, with or without a `{"purge": True}` body. `LibraryPopulator` has no delete helper for library items. A helper would have made the `purged`/`purge` typo in P2 1 impossible.

Add `LibraryPopulator.delete_library_item(library_id, library_dataset_id, purge=False)`, which asserts a 200, and use it in the tests the PR adds or touches.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>
