# Re-scope debrief

The first scope evaluation recommended a modest expansion: store `<edit_attributes>` test children as `dict(child.attrib)` in `__parse_param_elem` instead of raw lxml elements. I adopted it as `a462963ff1d`. The previous head is kept as alt `issue_24389_duplicate_test_params_26.1_alt_original_scope` (`497b90bc667`, see `alts/original_scope.md`).

Why:
- The `hasattr(edit, "attrib")` duck-typing in `_comparable_test_input`, added for the Codex finding, existed only because the parser mixed Elements and dicts. That duck-typing is now gone.
- The raw Element was a separate live bug. `ToolTestDescription.to_dict()` couldn't be serialized, so `Tool.parse_tests` cached no tests for any tool using `<edit_attributes>`, and `/api/tools/{id}/test_data` raised. I reproduced it on the branch before the fix.
- All consumers only call `.get()`. The re-scope review searched lib/ and test/ and found no reliance on Element behavior.

Tests: a dedicated JSON round-trip test, red with the old parser (checked in the worktree) and green after. All 3 suites pass: 154 passed, 1 skipped. mypy on the touched files gives no new errors against base, 17 vs 17 pre-existing with the main clone's mypy.

Still out of scope:
- XSD constraint: dropped, because it breaks a working legacy idiom and can't be profile-gated.
- The legacy runtime path below 24.2.
- Moving the composite rename out of `edit_attributes`: that touches upload logic.

Re-scope review: approve. I acted on its test and commit-message suggestions (`subagents/rescope_review.md`).
