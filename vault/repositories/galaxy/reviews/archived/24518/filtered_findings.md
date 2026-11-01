# Filtered findings

- **gx_test_challenger P3 2: new test file duplicates `FilesDialog.test.ts` setup.** Filtered because it re-litigates a decision the PR description states: the tests are a separate file because `FilesDialog.test.ts` already makes about 80 mocked requests and a spec file stops getting responses after 100.
- **gx_performance_challenger P3 1: per-file `formatRows()` makes recursive-listing selection O(F²).** Filtered as pre-existing code the PR only re-indents. A good candidate for a follow-up on `dev` (add the listed files in bulk and format once), but not for this release-branch fix.
- **gx_risk_assessment.** No P-labeled findings. Its advice (confirm page-scoped select all is the intended UX, and check a non-paginated source manually) is for John, not for posting.
