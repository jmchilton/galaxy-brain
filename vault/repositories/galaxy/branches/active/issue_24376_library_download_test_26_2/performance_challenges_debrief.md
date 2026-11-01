Run via Opus at default effort.

# Performance challenge debrief

**Top line:** I found no performance problem worth fixing and made no code changes. The three server edits are one-line ORM changes. Statement counts on SQLite show that the job-output discovery path issues exactly the same SQL as before. The model-store import path issues one extra `UPDATE library_dataset_dataset_association` per imported LDDA. That UPDATE is what persists the link the fix needs, so it is not waste. The download change issues no new queries.

## Method

- I wrote a scratch pytest plugin that hooks `before_cursor_execute` and counts INSERT, UPDATE and SELECT statements on the `library*` tables.
- I ran it on four unit tests:
  - `test_model_discovery.py::test_persist_target_library_dataset`
  - `test_model_discovery.py::test_persist_target_library_folder`
  - `test_model_store.py::test_import_export_library`
  - `test_model_store.py::test_import_library_from_dict`
- I ran them twice: against this branch's `lib/`, and against `upstream/release_26.2`'s `lib/` extracted to a scratch directory with the same test files. On the baseline run, 3 of the tests failed on the new link assertions, as expected. The counts were taken before those assertions ran.
- Everything ran on SQLite. I did not use Postgres; nothing here called for measuring at scale.

## Findings

### 1. `discover.py`: `LibraryDatasetDatasetAssociation(library_dataset=ld)`. Same SQL as before.

- `LDDA.library_dataset` is a plain many-to-one. `LibraryDataset.library_dataset_dataset_association` is the `post_update=True` side, and that already breaks the cycle.
- With the link set, the unit of work inserts the LD, then the LDDA with `library_dataset_id` filled in, then the existing post-update `UPDATE library_dataset SET library_dataset_dataset_association_id`.
- Before the fix, the same three statements ran; the only difference was a NULL FK in the LDDA INSERT.
- Measured counts were identical on both runs, for example 1 LD INSERT, 1 LDDA INSERT and 1 LD UPDATE per dataset.
- So large fetches into libraries (`/api/tools/fetch`) get no extra flush, UPDATE or lazy load from this change.

### 2. `model/store/__init__.py`: `ldda.library_dataset = ld` on import. One extra UPDATE per LDDA.

- LDDAs are created and flushed earlier in the import, before `import_folder` builds the LDs. Setting the back-reference afterwards therefore costs `UPDATE library_dataset_dataset_association SET library_dataset_id=…` at the folder's `_flush()`.
- Measured: `test_import_export_library` went from 0 to 1 LDDA UPDATE. The other counts were unchanged.
- **Cost:** about one extra UPDATE per imported library dataset. SQLAlchemy can batch same-shape UPDATEs by primary key within a flush, but I only observed single-row cases.
- **Who pays:** model-store library imports, and extended-metadata fetches into libraries, which go through this import path.
- **Not acted on:** the UPDATE is the write that makes the fix work. The only way to avoid it is to set the link before the LDDA is first flushed, which means reordering the import. That restructuring is not justified on a release branch for one PK UPDATE per dataset on a rarely used path.

### 3. `library_datasets.py` `download()`: `ld.folder` replaces `ldda.library_dataset.folder`. No new queries.

- For correctly linked rows, `ldda.library_dataset` is a many-to-one lazy load by primary key. The LD is already in the identity map because the loop iterates over it, so that load issued no SQL before the change either.
- `ld.folder` is the same folder lazy load as before.
- **Net effect:** neutral for good rows. For broken rows the endpoint used to return 500 and now works.

## Pre-existing, not introduced (not acted on)

- `download()` has N+1 lazy loads: per-dataset LDDA, the folder walk up to the root, and `library_root`. It also keeps a `seen` list with O(n²) membership checks.
- Both predate this branch and are out of scope for a release-branch bug fix.
- They only matter for zips of very large folders; Galaxy's upload/download size limits would bound those first. Noted only as a possible follow-up.

## Speculative

- I did not measure batching at Postgres scale, for example a single fetch of thousands of files into a library through the extended-metadata path.
- Based on the analysis above, I expect the only difference to be the additional LDDA UPDATEs in finding 2.

No query-count test was added. The discovery path has no delta to pin, and a statement-count assertion on the import path would be brittle for little value.
