# Test challenges debrief

Branch had one unit test: `test_resolve_tool_submission_skips_discovered_outputs_of_finished_job`, driving `resolve_tool_submission` through four `requests_mock` HTTP stubs (tool request state, tool request, job, job outputs) to check one loop.

## Changes (amended into the single commit, now `a21117ee072`)

- **Restructured**: extracted module-level `split_declared_job_outputs(job_outputs)` in `lib/galaxy/tool_util/verify/interactor.py`; `resolve_tool_submission` calls it.
- **Rewrote test** as `test_split_declared_job_outputs_skips_discovered_datasets`: plain dicts in, no HTTP mocks. Asserts exact dicts (stricter than key lists).

## Challenges considered, not acted on

- API/framework layer: the bug is a timing race (job finishes before outputs fetched); not deterministically reproducible in tool framework tests. `output_filter` test 3 already covers the end-to-end path when the race hits. Unit test stays.
- E2E: not applicable (test-framework client code).
- No baseline tests needed: single new test for a fix.

## Red/green

- Green: `pytest test/unit/tool_util/verify/` 158 passed.
- Red: with the skip disabled, the new test fails at its assertion (`__new_primary_file_list_output|4__` present in outputs).

Note: worktree has no `.venv`; ran with `extract_next_followups/.venv` python + `PYTHONPATH=lib`.
