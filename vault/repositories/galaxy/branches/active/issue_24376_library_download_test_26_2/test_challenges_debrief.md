Run via Opus at default effort.

# Test challenges debrief

I redid the challenge over the whole branch after the re-scope: the E2E download test, the two new API tests, the unit assertions in `test_model_discovery.py` and `test_model_store.py`, and the integration assertion in `test_extended_metadata.py`. The tests hold up. I changed one thing: a populator helper for the download endpoint.

Commit: `7771e277294` "Add a LibraryPopulator helper for library dataset downloads" (pushed to `jmchilton/issue_24376_library_download_test_26_2`).

## Changed
- **`LibraryPopulator.download_library_datasets_raw(ld_ids, archive_format="zip")`.** `libraries/datasets/download/{format}` was built by hand three times in `test_libraries.py`: twice in the existing `test_download_uses_download_extension` and once in the new `test_download_fetched_dataset`. All three now use the helper. It follows the populator `_raw` convention and returns the `Response`. The three download tests pass.

## Fail-without-the-change checks
- **Unit assertions, store import side.** I reverted `ldda.library_dataset = ld` in `store/__init__.py`. All three new assertions then failed at the assertion itself (`assert None is <LibraryDataset>`): the two in `test_model_discovery.py` and the one in `test_import_export_library`. I restored the line, and the tests pass.
- **Integration `test_fetch_data_library`.** With the same revert, it fails at the new `show_ldda` call with a 500 from `GET /api/datasets/{id}?hda_ldda=ldda`. That is the bug the assertion is meant to catch. The previous debriefs had not checked this one.
- **API tests.** The re-scope recorded that both failed with a 500 before the fix. `test_show_fetched_ldda` depends on the `discover.py` change. `test_download_fetched_dataset` fails only when both `discover.py` and the `ld.folder` walk are reverted, because either one alone makes it pass. I did not rerun these.
- **E2E test.** It needs the `download-btn` id fix: without it, `wait_for_and_click` times out. Before the branch the method never ran. I reasoned this through and did not run it.
- No "Baseline tests" commits apply. Each assertion pins behavior the branch changes.

## Considered and not changed
- **The unit assertions duplicate the integration and API coverage.** I kept them. Each is a one-line addition to an existing round-trip test, not a new test. It is the only fast check on the `store/__init__.py` import path, and they run in about a second. The integration test needs a server and extended metadata.
- **The unit tests use no mocks**, so there is nothing to swap for dataclasses or no-op implementations.
- **`_fetch_pasted_to_new_library`.** This test-class helper is used by the two new tests. It is built on the existing `_setup_fetch_to_folder` and `dataset_populator.fetch`. I left it local because nothing else needs a pasted fetch into a fresh library. `LibraryPopulator.fetch_to_folder` takes a folder id rather than the library, so it would not shorten the helper.
- **Move the E2E setup onto `/api/tools/fetch` now that it works.** That would exercise the path the client's Upload activity uses. I kept the legacy upload path. The API test already covers fetched datasets, and leaving the E2E test alone avoids rerunning flaky browser tests. Keeping both creation paths covered is also mildly useful.
- **No new unit test for the `library_datasets.py` `ld.folder` change.** It only matters for rows created before the fix, which the fixed code can no longer create through the API. Testing it would mean building a broken LDDA by hand in the database. The re-scope already confirmed by revert that it is needed for such rows.
- **More E2E coverage.** None needed. The button wiring is covered by the existing E2E test, and the server fix is covered by the API tests.
