# Normal review 2 (re-scope: LDDA back-reference fix)

Run via Opus at default effort. The review found nothing to fix and no security problem. I acted on the test suggestions:
- Pinned the import-side fix on a model-store round trip with a new assertion in `test_import_export_library`.
- Extended `test_extended_metadata.py::test_fetch_data_library` to show the fetched LDDA. That path imports outputs through the model store. I ran it locally and it passes.
- In `test_show_fetched_ldda`:
  - it now uses `ld["ldda_id"]` directly,
  - it asserts `parent_library_id`, which needs the link,
  - I added one-line docstrings to both API tests and a return annotation on the helper.

Not acted on:
- **The discover.py fix has no unit pin.** The serializers don't export `ldda.library_dataset`, so an export/import unit test can't see it. It is pinned by the API test `test_show_fetched_ldda`, which fails without it, through the default job-finish path. The PR text should say so.
- **Rows created before the fix stay broken outside `download()`:**
  - `LDDA.to_dict`
  - `security.can_access_library_item`
  - the `check_folder_contents` join (fails closed)
  - `update_parent_folder_update_times`

  A data migration doesn't belong on `release_26.2`. Record this for the PR, with an admin backfill:
  `UPDATE library_dataset_dataset_association SET library_dataset_id = ld.id FROM library_dataset ld WHERE ld.library_dataset_dataset_association_id = library_dataset_dataset_association.id AND library_dataset_dataset_association.library_dataset_id IS NULL`.
  A dev-side migration is a possible follow-up.
- **The `allow_edit` import guard** (`if ldda.library_dataset is None`). No real flow combines the two, and the line above already reassigns `ld.library_dataset_dataset_association` the same way.

<details><summary>Full review</summary>

Verdict: nothing must be fixed. The change builds the ld<->ldda pair the same way as `upload_common.py:189-201` and `HDA.to_library_dataset_dataset_association`.

Should-fix
1. The discover.py fix has no unit test of its own. The `test_model_discovery.py` assertions go through export/import, and `LDDA._serialize` / `LibraryDataset._serialize` never serialize `ldda.library_dataset`, so they pin only the import fix. Say this in the commit or PR text, or assert on the in-memory LDDA. Also add the assertion to `test_import_export_library`.
2. The extended-metadata import path isn't exercised end to end. Run `test_extended_metadata.py::test_fetch_data_library`, or better, add a `show_ldda` or download there.
3. Rows created before the fix stay broken outside download() (`LDDA.to_dict`, `can_access_library_item`, `check_folder_contents`, `update_parent_folder_update_times`). Don't migrate on a release branch. Document it, give admins a backfill, and optionally queue a dev migration.

Nits
- `get_library_contents_with_path` already returns `ldda_id`, so drop the `show_ld` call. Assert something tied to the link.
- `test_download_fetched_dataset` passes with only the `ld.folder` workaround. Docstrings would make clear which test pins what.
- Return annotation on `_fetch_pasted_to_new_library`.
- store/__init__.py:860 in the `allow_edit` path could move an existing LDDA's back-reference. That matches the existing forward assignment, and no flow combines the two.

Checked and fine
- **Sessionless export:** the assignment is a plain attribute, no serializer follows `ldda.library_dataset`, and there are no cycles or duplicates.
- **SQLAlchemy cycle:** `post_update=True` on `LibraryDataset.library_dataset_dataset_association`, with the same insert ordering as upload_common.
- **Other creation sites:** upload_common and the HDA→LDDA copy already set both sides. `LDDA.copy(target_folder=)` has no callers.
- **`ld.folder` in download():** identical to `ldda.library_dataset.folder` whenever the link exists, and it also works for old rows.
- **Downstream effects** (`check_folder_contents`, folder update times, the expired-datasets join) are corrections, not regressions.

</details>
