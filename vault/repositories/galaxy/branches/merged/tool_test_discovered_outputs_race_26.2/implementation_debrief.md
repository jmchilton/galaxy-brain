# Implementation debrief

**STATUS: READY**

The fix is for a tool test framework race. With the tool request API, `resolve_tool_submission` lists `jobs/{id}/outputs`. If the job has already finished, that list includes discovered `__new_primary_file_*` datasets, which breaks `expect_num_outputs`. The fix skips those datasets.

Commits on `release_26.2` (HEAD `fc70b831522`):
1. Extract `split_declared_job_outputs` from `resolve_tool_submission`. This is a refactor and doesn't change behavior.
2. Add shared helpers `DISCOVERED_OUTPUT_PREFIX`, `discovered_output_name` and `is_discovered_output`. They replace hand-built names in `verify_output_dataset` and `galaxy_test/selenium/framework.py`. This is a refactor too.
3. The fix: skip discovered outputs, with a pure unit test that fails without the fix.

Choices:
- **Unit test only:** a framework or API test can't reproduce the race reliably. `output_filter` test 3 already covers the path end to end.
- **Rescope (user approved):** the shared helpers came out of the first scope evaluation. The original version is in `alts/original_scope.md`.
- **Galaxy core left alone:** core still hardcodes the name format in `output_collect.py`, `store/discover.py` and `model/__init__.py`. Unifying it through `galaxy.util` is a follow-up for `dev`; mention it in the PR body.

Hardening: test challenge (dropped two trivial helper tests), Codex review (clean, run twice), baseline refactor, scope evaluation (keep). Skipped the thermo-nuclear review (about 50 lines, not intricate), E2E polish and screenshots (no UI).

Tests: `test/unit/tool_util/verify/` passed on each commit (157, 157, 158). Pre-commit is clean. Fork CI hasn't been checked.
