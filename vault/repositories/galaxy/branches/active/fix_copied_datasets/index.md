# fix_copied_datasets

Status: `author_work`. Base: `dev`. [PR #21806](https://github.com/galaxyproject/galaxy/pull/21806) (open).

Fixes workflow extraction for datasets copied across histories.

[Tracking history](tracking_history.md)

## TICK — 2026-10-11

Live PR #21806 conflicts in workflow/extract.py and both extraction-test layers. These touch extraction semantics; left branch untouched.

## TICK — 2026-10-12

Live draft remains conflicting with actual dev `6831f768a637d148d941a3477db0a14e21573c1d`. Read-only merge-tree confirms substantial conflicts in `lib/galaxy/workflow/extract.py`, `lib/galaxy_test/api/test_workflow_extraction.py`, `test/unit/workflows/test_extract_summary.py`. These require design or behavior reconciliation beyond the automatic small/mechanical-conflict scope. No worktree files, branch refs or PR settings changed; remains author work.
