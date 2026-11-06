# Test Challenges Review — PR #24704

Profile: gx_test_challenger. Model: claude-opus-5-5, effort low. Reviewed commit: `8c28063331f1c0ed8e3bf9d37ddb10e265e385e1` (vs `origin/release_26.2`). Static analysis only; no tests run (no .venv).

## Summary

Tests are well targeted. Both new API tests use existing helpers (`_upload_yaml_workflow`, `_download_workflow`, `_run_workflow`, `_history_jobs`, `get_job_details`) and share one fixture. Red/green by inspection: without the fix, stored `sel_mult: AA` reaches the filter `"A" in sel_mult` as a string, so output `A` is also created and both `== ["AA", "CC"]` assertions fail. Exact-list equality is strict (no OR-checks or counts). No E2E test needed: the editor-download test exercises the same code path the editor uses for output terminals.

## Findings

### P3 1: Subclass opt-outs are covered only by doctests

`stored_string_is_single_option = False` on `ColumnListParameter`, `DrillDownSelectToolParameter`, `SelectTagParameter` guards against wrapping `"2,3"`-style stored strings. ColumnList and DrillDown get doctests that only call `to_python` directly (implementation-level); `SelectTagParameter` gets nothing. A regression there would break workflows with stored comma-separated `data_column multiple="true"` values, which the doctest catches but no behaviour-level test does. Suggest, if cheap, one API workflow test: stored state `columns: "2,3"` on an existing multi-column tool (e.g. a `data_column multiple="true"` test tool) running and producing the expected column selection; then the to_python doctests could be dropped. Optional given release-branch scope.

## Not flagged

- `SelectToolParameter` doctests (`to_python("x")`, `"None"`) duplicate the API tests' intent but are cheap and document the `""`/`"None"` carve-out; leave.
- `output_filter_select.xml` edits are comment-only; existing tool tests remain valid.
