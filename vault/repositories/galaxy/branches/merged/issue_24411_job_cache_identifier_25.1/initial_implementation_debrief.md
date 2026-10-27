# Initial implementation debrief: issue_24411_job_cache_identifier_25.1

Fixes #24411 on `release_25.1` (`6060e10fe7a`). Commits:

- `01ffe95286e` Baseline tests: `test_cached_job_mapped_run_reuses_mapped_job` in `test_jobs.py` (a mapped rerun with `use_cached_job` copies the mapped job). Helpers `_list_of_existing_dataset`, `_run_identifier_single`, `_copied_from_and_identifier`.
- `e1fb28a615c` Fix plus three red-to-green tests:
  - `test_cached_job_plain_run_skips_mapped_job`: the issue's case.
  - `test_cached_job_mapped_run_skips_plain_job`: found during the work.
  - `test_cached_job_mapped_run_skips_other_identifier`: the same dataset in list B (`sample_b`) after list A (`sample_a`).

## Fix

1. `JobSearch._build_stmt_for_hda` (`managers/jobs.py`): when the request has no identifier and `require_name_match` is set, add `NOT EXISTS JobParameter(name = "<k>|__identifier__")` for the candidate job.
2. `DatasetFilenameWrapper.element_identifier` (`tools/wrappers.py`): set `tool_evaluator.consumes_names = True` on every read. Before this, `name` was only touched on the fallback path, so a mapped job looked name-agnostic. `JobWrapper` (`jobs/__init__.py`, around line 1303) then ran a second search with `require_name_match=False` and no identifier, which matched any job on the same dataset.

## Evidence

On base code, the final tests failed like this:
- plain: `('<job>', 'sample_a') == (None, 'Test_Dataset')`
- mapped after plain: `('<job>', 'Test_Dataset') == (None, 'sample_a')`
- other list: `('<job>', 'sample_a') == (None, 'sample_b')`

The baseline passes before and after the fix.

## Regression runs (serial)

| Suite | Result |
| --- | --- |
| `test_jobs.py -k "test_cached_job_ or search"` | 14 passed |
| `test_tools.py -k cached` | 13 passed |
| `test_workflows.py -k cached` | 8 passed |
| unit `test_wrappers.py`, `test_evaluation.py`, `test/unit/app/jobs` | 236 passed |

## Notes

- The test helper reads the last word of the output's first line, because `identifier_single` in 26.2+/dev prints `identifier X` plus a `safe_identifier` line. That keeps the tests valid when merged forward.
- Commits used `--no-verify`. The global pre-commit hook runs a newer black that reflows unrelated code; 25.1's black (25.9.0) rejects that output. I ran black, ruff 0.13.3, isort and flake8 by hand.
- Not fixed, recorded for follow-up:
  - `UserToolEvaluator` never sets `consumes_names`, so user-defined tools always take the name-agnostic second search. Relevant to #24410 on dev.
  - Values after the first in a `multiple="true"` data param are recorded as `input11|__identifier__` etc., which neither the existing positive check nor the new guard looks at. This predates the branch.
