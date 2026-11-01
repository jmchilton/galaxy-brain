# Test challenges review — PR #24495

Profile: gx_test_challenger · Model: claude-opus-5-5 · Effort: low · Reviewed commit: d3a03e397a7a4be40bea03e3a2dbc133122218ee

Debrief: [test_challenges_debrief.md](test_challenges_debrief.md)

Both new unit tests are behavioral, use a shared real fixture, and earn their place. No drops recommended.

### P2 1: No API test for the upload regression the PR fixes

The issue (#24488) is that uploads of such a tar failed by every route, but tests only cover `get_fileobj_raw` and `FilePrefix`. Add one test in `lib/galaxy_test/api/test_tools_upload.py` that uploads `test-data/tar_with_stray_zip_end_record.tar` via the fetch API (existing `dataset_populator` helpers) and asserts state ok, `extension == "tar"`, and file size unchanged. Guards against other `is_zipfile` call sites in the upload/sniff pipeline regressing the user-visible behavior.
