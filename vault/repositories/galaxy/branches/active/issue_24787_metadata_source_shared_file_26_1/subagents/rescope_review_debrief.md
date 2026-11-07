Fixed the NULL uuid regression and guarded `cleanup_datasets.py`. Left the leak cases and the nits, and didn't extend repair to CRAM.

Not acted on:

- CRAM: set metadata gives a shared CRAM output its own file, but `CRAM.set_meta` skips indexing when an override temp file exists, so the new file holds the input's index bytes. Tampered unshared indexes behave the same way, so this is existing behaviour. Debriefs must not say re-detect repairs CRAM.
- Leaks: rows of API-purged HDAs and stale rows on separated outputs keep a file on disk. This loses no data, which is the right way for the guard to fail.
- `--dry-run` logs "keeping" for rows purged together, a harmless warning follows when both go in one run, and the guard's read runs in a transaction during removals. Nits.
- No LDDA test on the separation path, and no test of two rows purged in one run.

<details><summary>Details</summary>

Run via Opus 5.5 at medium effort. Verified by running on Postgres and SQLite except where noted.

- **MEDIUM-HIGH, fixed.** `cleanup_datasets.py` unlinked a file a live row named, then `get_file_name()` recreated it empty. Added `_metadata_file_named_by_live_row` and `test_cleanup_keeps_metadata_file_a_live_row_names`, which fails with the guard removed.
- **LOW-MEDIUM, fixed.** `uuid.UUID(None)` in `_uuid_in_use` raised for a NULL uuid.
- **Checked:** CHAR(32) hex matches `.hex`; every `RemovesMetadataFiles` action sets only `deleted`, so the guard checks both flags; rows commit before removal; `store_by: id` skips the guard.

</details>
