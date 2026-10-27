# Re-scope debrief

First hardening's scope eval (`earlier_drafts/2/scope_evaluation.md`) recommended expanding: advisor still refused 26.1/26.2 tools. John chose expand (2026-10-27). Original scope kept as `upgrade_advice_structured_like_alt_original_scope` @ `fd124f4219e` ([alt](alts/original_scope.md)).

## Added (on `fd124f4219e`)
- `bc791f9d427` 21.09 `add("")` → `21_09_fix_from_work_dir_whitespace` (was KeyError).
- `92aee5eaabc` skip migrations whose `to_version` ≤ tool profile (was `<`). **Behaviour change:** a tool already at 24.2/26.0 no longer gets that profile's advice.
- `7be0b105400` `_find_all` honours its xpath (23.0 optional-text advice was dead).
- `73af3361b18` `ProfileMigration26_1`/`26_2`, `latest_supported_version` 26.2. Codes: `26_1_fix_invalid_citation` (#22799), `26_1_fix_empty_multiple_test_value` (#22894), `26_2_consider_optional_boolean_unset` (#23414), `26_2_consider_tool_provided_metadata` (#23404, niche), `26_2_consider_tabular_assertion_separator` (#23593). `validate_test_cases_for_tool_source` gained `profile` kwarg; `AbstractTool`'s nested opt-in check extracted to `output_objects.output_uses_tool_provided_metadata` and shared.

## Review
Normal review ([subagents/rescope_review.md](subagents/rescope_review.md)) split the bug fixes into their own red→green commits and removed the duplicated opt-in logic. 204 tests passed (upgrade, linters, parameter test cases). Not acted on: two-deep bare `structured_like` gets no advice (linter errors already); `use_latest_profile` hardcodes "26.1"; 24.2 and 26.1 advice can both fire for one test case.
