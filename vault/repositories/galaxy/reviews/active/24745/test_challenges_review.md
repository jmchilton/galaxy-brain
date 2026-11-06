# Test challenges review: #24745

- Profile: `gx_test_challenger` (`_shared/reviewers/gx_test_challenger.md`)
- Model: Opus 5.5
- Effort: medium
- Reviewed commit: `5fad7684e37846e4f5459d67d08d2dc16a735b34`
- Execution: static only. No `.venv` in the worktree, and no test was run. Findings come from reading the code; sketches and test plan are in [test_challenges_debrief.md](test_challenges_debrief.md).

**Verdict:** no blockers. The new tests are real red-to-green tests of the happy paths, and none is silly or weakened. The gaps are PR claims with no test behind them, plus test placement. E2E not warranted.

## Findings

### P2 1: PR's deviation from legacy has no test

The "Deviation from the legacy script" section says library metadata files go at library purge while a live HDA still references the same `Dataset`. No test puts metadata in that situation. `test_delete_library_datasets_keeps_dataset_shared_with_history` already has the exact setup but asserts flags only. By reading, the SQL can't touch the HDA's file (it filters on `lda_id`, and files are named per row), so this pins a behavior rather than catching a known failure. A later change that keys the CTE on the dataset instead would turn it red.

Fix: in that test, call `_add_metadata_file` on both the LDDA and the imported HDA. After the chain, assert the LDDA's row and file are gone and the HDA's are intact. After the HDA's purge, decide what to assert for its row, since `full_delete` may not run while the library association exists (see P2 4).

### P2 2: Multiple versions and multiple files are untested

The docstring says "all versions", and the CTE joins on `library_dataset_id`, but every test has one LDDA with one file. The final `SELECT` joins versions and files on the same key, so anything above 1×1 fans out, and that path never runs.

Fix: test two files on one LDDA plus a second LDDA version. Assert all rows are purged, all files are gone, and each file has one event row.

### P2 3: `metadata_file_events` and repeat-run no-op claims are unasserted

The PR adds an `INSERT` into `cleanup_event_metadata_file_association` and says repeat `--force-retry` runs are no-ops "instead of re-touching (and re-logging) rows". Neither is checked. Removing the events CTE or the `purged IS NOT TRUE` filter would leave the suite green. Sibling tests in this file already assert both patterns (`ld_events`/`ldda_events`, "a reconciled library dataset is not reported again").

Fix: assert one `CleanupEventMetadataFileAssociation` row after the purge, and still one after a second `--force-retry`, with the id absent from `_pgcleanup_action_log`.

### P2 4: API library purge with a surviving HDA or older version is unpinned (possible bug)

`can_purge_dataset` in `services/library_contents.py` requires no other associations, and `full_delete` acts only on the current version's dataset. By reading, purging a library dataset shared with a history therefore leaves the LDDA's metadata file, and since `ld.purged` is now set, plain pgcleanup skips it too. `Dataset.user_can_purge` also stays false while any library association exists. So those files wait for `--force-retry`, while the PR text says they are removed at library dataset purge time. That statement holds for pgcleanup only. Older versions behave the same way. The surrounding `except Exception: pass` would also hide any metadata failure there, and the dataset's own removal with it.

Fix: decide the intended behavior and pin it with an API-level test of the shared case. Not reproduced by running; verification should confirm.

### P2 5: App internals in `lib/galaxy_test/api`, with the fixture copied three times

These two tests are the only ones in the directory that import `galaxy.model` or reach `app.model.session`; the other `driver_or_skip_test_if_remote()` user, in `test_tools.py`, only runs a tool test. They skip entirely against remote servers. `writing_tests.md` places `app`/database access in integration tests, where `self._app` is the idiom. The outcome (file gone) isn't visible through the API, so internals are justified, just not at this layer. Meanwhile the same create-and-write block appears in `test_datasets.py`, `test_library_contents.py`, and `_add_metadata_file`.

Fix: move both to `test/integration/`, in a class not gated on Postgres since neither needs pgcleanup, sharing one `_add_metadata_file`.

### P3 1: Soft delete and retention steps don't assert metadata

`test_delete_library_datasets` checks metadata at the never-deleted step only. Add the same unchanged-state assert after `delete_library_dataset` and after `--older-than 1`. Two asserts, and they prove a soft-deleted entry, which can still be undeleted, keeps its files.

### P3 2: `test_delete_library_datasets_force_retry_metadata_files` setup is roundabout

It purges a file, then rewrites flags and contents to simulate a leftover. Calling the existing `_add_metadata_file` after the first cleanup run gives the same state and drops about 15 lines, plus the duplicated `update_from_file` block.

### P3 3: NULL `purged` legacy rows

`metadata_file.purged` is nullable and the CTE uses `IS NOT TRUE`, but the tests only cover `False`. `test_delete_library_datasets_force_retry_null_purged` shows this file already treats NULL as a real legacy case. Reset to `None` in one retry path.

### P3 4: Fixture is unlike real metadata, and its pre-purge check is weak

`model.MetadataFile(dataset=x, name="bai")` isn't referenced by any `_metadata` entry, whereas real BAM metadata is (`bam_index`). This doesn't affect the purge logic, which selects by FK. But the `exists` asserts before the purge prove little: `get_file_name()` creates a missing file just before the check, so a failed write still passes. One test using `new_bam_dataset` and `hda.metadata.bam_index` would cover a real row end to end.

### P3 5: Branches of `_delete_metadata_files` that no test reaches

- `store_by="id"`: the driver defaults to `uuid` (`driver_util.py:277`), so the `id` naming never runs in `full_delete`. `test_legacy_store_by.py` already configures `id`.
- `ObjectNotFound`: the disk store's `_delete` returns True for a missing file, so disk-based tests can't reach it. Still worth one test of a row whose file is already gone, to confirm purge completes.
- `session is None`: silently skips metadata removal. Either cover the case or justify it, since `model/store/__init__.py:545` can call `full_delete` on freshly imported objects.

### P3 6: Non-disk backends unexercised

The new delete path passes `extra_dir`/`alt_name`/`auth` through whichever backend holds the file, and a non-`ObjectNotFound` error there now aborts the dataset's removal because metadata goes first. `test/integration/objectstore/test_remote_objectstore_cache_operations.py` already purges on a remote store with cache; a metadata assert there would cover it. `TestPgCleanupUserObjectStoreIntegration` covers pgcleanup, but no test covers API purge with `auth` on a user store.

## Bug notes

P2 4 is the only possible bug seen; not hunted further, per the profile.
