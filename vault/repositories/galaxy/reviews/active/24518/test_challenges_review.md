# Test challenges review — PR #24518

Profile: gx_test_challenger. Model: Claude Opus 5.5, low effort. Reviewed commit: 8ee467177ab. Debrief: [test_challenges_debrief.md](test_challenges_debrief.md).

Tests are behavior-level and appropriate; no drops recommended.

### P3 1: Pending-listing test is timing-based and under-asserts
`should keep OK disabled until the files of every selected folder are listed` delays the folder mock with `setTimeout(50)` and polls with `vi.waitFor`. Use a deferred promise the test resolves so the disabled→enabled transition is deterministic, and assert the folder's files are selected after the listing resolves (the reason OK must wait).

### P3 2: New test file duplicates FilesDialog.test.ts setup
`FilesDialogPagination.test.ts` repeats module mocks, MSW setup, mount and row helpers from `FilesDialog.test.ts`. Add as a `describe` block there, or extract shared mount/row helpers.
