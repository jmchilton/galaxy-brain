# Test challenges review — PR #24534

- Profile: [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md)
- Model: Claude Opus 5.5 (`claude-opus-5-5`); effort as set by coordinator
- Reviewed commit: `1bf150cceb0` (base `origin/dev`)
- Debrief: [test_challenges_debrief.md](test_challenges_debrief.md)

Both new tests are red-to-green and target the right behavior. No unit/Vitest tests; no E2E needed. Findings are about coverage of the changed `full_delete()` branch and test placement.

### P2 1: Existing `*_purged` tests never purge; fold new assertions into them

`test_delete_library_item_from_hda_purged` and `test_delete_library_item_from_hdca_purged` (same file) send `{"purged": True}`. `LibraryContentsDeletePayload` only defines `purge` and `Model` ignores extra keys, so both just soft-delete. The PR adds new purge tests beside them instead of fixing them. Fix the key to `purge`, and move the PR's current-version assertions there — that also covers the `from_hdca` path the PR doesn't test.

### P2 2: Current-version `deleted` is observable via the API; drop ORM reads for it

`LibraryDatasetDatasetAssociation.to_dict()` exposes `deleted`, and `GET /api/datasets/{ldda_id}?hda_ldda=ldda` (`library_populator.show_ldda`) doesn't gate on `ldda.deleted`. Capture `ldda_id` with `library_populator.show_ld(...)` before deleting, then assert `show_ldda(ldda_id)["deleted"]`; the delete response already reports `purged`. That lets `test_purge_library_item_retires_current_version` run against remote Galaxy instead of skipping, and leaves ORM access only for the expired-version setup that truly needs it (no API creates versions; `replace_dataset` is never passed).

### P2 3: The `full_delete()` branch the PR rewrote is untested

Every test item is `from_hda`, so its dataset is shared with a live HDA and `can_purge_dataset` is always False — the removed `sa_session.add(ld.dataset)` and the new `log.exception` path never run. Add:
- a library-uploaded dataset (`library_populator.new_library_dataset`), purged, then `GET /api/datasets/{ldda_id}/display?hda_ldda=ldda` refused (`ensure_dataset_on_disk` checks `dataset.purged`);
- the inverse safety property the PR body leans on: purging a `from_hda` item leaves the source HDA's content retrievable (`dataset_populator.get_history_dataset_content`).

These are baseline tests (green on dev too) but pin the purge-on-request contract the PR argues for.

### P3 1: Per-file app/DB helpers duplicate `IntegrationTestCase`

`_galaxy_app`, `_db_session`, `_decode_id` re-implement `IntegrationTestCase._app` / `_decode_id` (`lib/galaxy_test/driver/integration_util.py`); this is the first API test module to write ORM rows, and `writing_tests.md` steers DB access to integration tests ("this type of usage should be avoided"). Either move `test_purge_library_item_retires_all_versions` to an integration test using the existing helpers, or lift an app-or-skip accessor plus `_decode_id` onto `ApiTestCase` so it's shared rather than copied per file.

### P3 2: Add a delete-item populator helper

`DELETE /api/libraries/{library_id}/contents/{id}` now appears ~6 times in the file; a `LibraryPopulator.delete_library_item(library_id, item_id, purge=False)` helper would tidy the reworked tests (and would have made the `purged`/`purge` typo in P2 1 impossible).
