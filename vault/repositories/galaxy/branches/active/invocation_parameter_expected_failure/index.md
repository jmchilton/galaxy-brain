# invocation_parameter_expected_failure

Status: `ready` — undrafted by John 2026-10-20. PR [#24265](https://github.com/galaxyproject/galaxy/pull/24265) opened 2026-10-19 at John's request, at `eef6efec978`, with title `[26.1] Fix subworkflow parameter validation failing as "unexpected failure"` and `pr_description.md` verbatim (John ticked the human-read item and dropped the footer). Base: `release_26.1` at `b0d6435a432` (#24215 merge; rebased 2026-10-19, no conflicts). Rebased onto `release_26.1` 2026-10-15 at John's request; was `dev` at `c63ffc2ccae`.

Fix invalid subworkflow parameters failing as `unexpected_failure` (regression from #20980, [25.0]) and classify `workflow_parameter_invalid` as an expected failure (info, not error logs). Independent extraction from [issue_20900_invocation_validation](../issue_20900_invocation_validation/index.md).

**[PR description](pr_description.md) · [PR titles](pr_titles.md) · [Polish debrief](polish_debrief.md)** · [Checklist evaluation](checklist_evaluation.md) · [Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Scope evaluation](scope_evaluation.md)

Head: `eef6efec978`.

- `fa256d12a13` — tuple entry (rebase of `2bbeefcc889` via `e6f7bb114c4`, no conflicts).
- `eef6efec978` (was `3e2bc827a99` → `1f3a2434e97`; 2026-10-19 the test switched to plain format2 `validators:` after #24215 bumped gxformat2 to 0.28.0) — added while polishing. A reproducer (parent text → subworkflow text parameter with a regex validator) showed that `InputParameterModule.execute` passed `invocation_step.workflow_step_id`, which is still `None` before flush. Building the pydantic failure model raised, so the invocation failed as `unexpected_failure` with no details and an ERROR traceback; the tuple entry never took effect on this path. #20980 (`656d5a1051c`) introduced this by replacing #19092's `step.id`. The fix uses `invocation_step.workflow_step.id`. The new API test `test_subworkflow_parameter_validator_failure` is red on the unfixed code (`unexpected_failure`) and green with the fix, which logs at INFO.

Tests: workflow unit suite 120 passed, 2 skipped; new API test red→green; ruff passes, and so does the pinned black 26.1.0 pre-commit hook.

## Known limitation / open questions for John

- The child subworkflow invocation is left `new` after the parent fails. The poller re-runs it, which logs an ERROR (`TypeError ... 'NoReplacement'`), and it ends `failed` / `unexpected_failure` (verified by an API probe). The step badges link to it. `release_26.1` does the same. Fix it here or in a separate PR?
- The regression is in `release_25.0` onward. Is `release_26.1` still the target?
- Resolved: the test used to patch the validator into a native export because gxformat2 0.27.0 dropped text-parameter `validators` (galaxyproject/gxformat2#264, fixed by [gxformat2#265](https://github.com/galaxyproject/gxformat2/pull/265)). #24215 bumped `release_26.1` to gxformat2 0.28.0, so the test now declares the validator in format2 and the comment is gone. Re-verified red→green on 2026-10-19 with 0.28.0.
- `test_run_with_validated_parameter_connection_invalid` doesn't reach `workflow_parameter_invalid` (the workflow schedules, and the job errors).

## CI

- `2bbeefcc889` (dev base): all green except `Test Galaxy packages`. That red is an unrelated mypy `no-untyped-call` on `galaxy/security/ssh_util.py:18` (`key.publickey()`), a file this branch doesn't touch.
- `3e2bc827a99` (release_26.1 base): pushed 2026-10-15, superseded before CI settled.
- `1f3a2434e97`: comment-only amend of `3e2bc827a99`, pushed 2026-10-15; superseded.
- `eef6efec978`: rebased onto #24215 with a format2-only test, pushed 2026-10-19; CI pending.

## TICK — 2026-10-20

PR CI on `eef6efec978` green (59 pass, 1 skipped), MERGEABLE/CLEAN. Draft at John's request, so left draft; moved to `draft_ready`.
