# Test challenges debrief — PR #24415

Profile gx_test_challenger, claude-opus-5-5, low effort, reviewed commit 84910093a8c. Tests not run (worktree has no `.venv`).

## Tests in the PR

- `test/unit/app/tools/test_expression_basics.py::test_expression_error_message_names_the_javascript_error` — runs real `do_eval` (no mocks), checks the extracted line starts with `TypeError` and drops script positions. Keep: pure string helper, cheap, exercises the line-picking logic the API test can't pin. The `"<input>" not in message` check only means something if the raw cwl-utils error actually contains `<input>`; assert that on `str(exc.value)` first so the negative assertion can't pass vacuously.
- `lib/galaxy_test/api/test_unprivileged_tools.py::test_run_reports_expression_error` — right layer (user-visible `misc_info`), uses existing populators/helpers. `": TypeError"` would also match if the full stack trace leaked; add a negative check that position lines (`at `/`<input>`) aren't in `misc_info` so the API test pins the user-facing message shape.

## Gaps

- The new `except ExpressionTemplateError: raise` passthrough in `global_tool_logs` (unwrapped re-raise) has no direct test in the diff. Covered indirectly only if some existing test already sends an `ExpressionTemplateError` through job building; otherwise a test asserting the original message reaches `misc_info` unwrapped is cheap.
- E2E: not needed; message is backend text surfaced via dataset info.

## Recommendations

See test_challenges_review.md.
