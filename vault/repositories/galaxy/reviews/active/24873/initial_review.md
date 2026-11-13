# Initial review — PR #24873

- Profile: default (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5, effort: medium
- Reviewed commit: `16758fc6136190c2655101b78859f5215195c117` (base `release_26.2`, diff vs merge base)

## Verdict

Small, well-scoped log rewording that implements option 2 of #24837 as proposed. Logic correct; no blockers. Three minor (P3) items: a stale docstring, duplicated pydantic-error cleanup, and a mostly redundant helper unit test. Tests not run locally (worktree has no `.venv`); author reports `test/unit/workflows/` green.

## Correctness notes (no action)

- Only `VALIDATED` and `VALIDATION_FAILED` can reach `_log_workflow_tool_request_state`: the `try` either sets `VALIDATED` or raises, and every other `except` returns early. The `else` branch therefore always carries a reason except when the exception message is empty, where it falls back to `request_state.value`.
- DEBUG line, persisted `ToolRequest.request_state` and statsd metric unchanged, as stated in the PR body.
- The INFO line now includes pydantic's `input_value=...` (a user parameter value, truncated by pydantic). Shown in the PR body, previously DEBUG only; comparable to job command lines Galaxy already logs at INFO. Mentioned for awareness only.
- Log format change on a release branch breaks anything grepping `state=validation_failed`; the issue chose this wording, and the statsd metric still carries the state name.

## Findings

### P3 1 — Docstring still calls the rejection case "quiet"

`_capture_workflow_tool_request_state` docstring (`lib/galaxy/workflow/modules.py` ~2569-2571) says converter-guard / meta-model rejection is minted with `validation_failed` "and the structural payload, quiet". After this PR that case logs its reason at INFO, so "quiet" is now wrong (the issue itself pointed at this word). Suggest e.g. "logged at INFO as not validated with the reason; execution unaffected".

### P3 2 — `_single_line_reason` duplicates existing pydantic-error cleanup

`lib/galaxy/tool_util/linters/tests.py:_cleanup_pydantic_error` already strips the `For further information visit https://errors.pydantic...` lines from the same `RequestParameterInvalidException(str(e))` text raised in `tool_util/parameters/model_validation.py:29`. The new private helper in `workflow/modules.py` re-implements it with a join. Optional: move one helper to a shared place (e.g. `galaxy.tool_util.parameters` / `galaxy.util`) with a `sep` argument and use it from both sites, rather than accreting a second copy. Acceptable to defer given the release-branch target.

### P3 3 — `test_single_line_reason` mostly re-tests what the caplog test pins

`test_capture_validation_failed_info_log_is_not_a_step_verdict` already asserts the reason is present, has no newline and drops the pydantic URL, through the real code path. The direct unit test of the private helper adds only the `None`/`""` cases. Optional: drop it, or keep only the empty-input assertions. Note also that the empty-reason fallback emits `validation_failed`, which the caplog test explicitly forbids in the line — harmless but inconsistent; `"not validated"` alone would need no fallback value.
