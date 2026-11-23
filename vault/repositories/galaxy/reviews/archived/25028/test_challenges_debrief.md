# Test challenges debrief — galaxy#25028

Reviewed commit: cd5a9c371480edfb1814193e0146f20dca52ec18 (no edits made; recommendations only).

## Tests in the PR
- `from_work_dir_glob_output_written.xml` tool tests (strays 0/1/2, output written) — run under plain extended metadata, Pulsar embedded extended metadata, and new Pulsar extended + `rewrite_parameters` config. Good: real regression coverage at the right layer.
- New integration module `test_pulsar_embedded_extended_metadata_rewrite_parameters.py` + job conf: needed, no existing config combines remote extended metadata with `rewrite_parameters`. `test_from_work_dir_output_not_written_is_empty` covers write_output=false, 0 strays (ok, empty).
- Unit tests in `test/unit/app/tools/test_metadata.py`:
  - `test_extended_metadata_from_work_dir_keeps_written_output[0,2]` and `..._single_match` — duplicate the tool tests above exactly (same file contents asserted). Recommend drop.
  - `test_extended_metadata_from_work_dir_output_missing[0,2]` — only coverage of the new ERROR-export paths in `set_metadata_portable` (purged branch / except block). Keep.

## Test plan recommendations
1. Drop the written/single-match unit tests; keep `_output_missing` (and `_run_from_work_dir_output`/`_exported_dataset_state` helpers it uses).
2. Integration covers missing output only with 0 strays and gets `ok`/empty (remote output path pre-created by Pulsar), while unit test asserts `error` for the same logical case. Add write_output=false + stray_files=2 to the rewrite-parameters integration test (parametrize) and note in a comment which outcome is expected end-to-end, so the two layers don't silently disagree.
3. No E2E/Selenium needed: backend job/metadata change with no UI.
