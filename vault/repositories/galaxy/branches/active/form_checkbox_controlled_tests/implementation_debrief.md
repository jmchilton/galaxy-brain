# Controlled checkbox test repair

STATUS: READY — independent review and local checks pass; fork CI pending.

Branch `form_checkbox_controlled_tests` is based exactly on upstream `dev` at `5ff1e46b8c38c704be8da75b4db05b3d56f93f3d`, as the user requested. It fixes the three failures inherited by the invocation selection prep branch. The branch is independent of both invocation selection branches; neither was modified.

The shared GCheckbox deliberately restores its bound model when a controlled parent ignores an update. The failing tests skipped that feedback. Return each asserted emission through the form's value prop before checking the resulting state or toggling again. The select-all checked assertion is retained after parent feedback, and optional-text coverage now also asserts removal and empty restoration of the text field. No runtime code, new mock, skip, or weakened assertion is involved.

The entire diff is **3 test files, +10/-2 lines**, in commit `7db3ecd6783`.

## Validation

- Exact base, unmodified target files: **3 failed / 9 passed**, reproducing all reported assertion failures. Log `/tmp/form-checkbox-tests-red.log`.
- Reviewed patch, same three files: **12 passed**. Log `/tmp/form-checkbox-tests-green.log`.
- Surrounding form-element tests plus shared GCheckbox and GCheckboxGroup: **22 files / 151 tests passed**. Log `/tmp/form-checkbox-related-tests.log`.
- Locked offline dependency install and icon generation passed. Direct Prettier and ESLint checks passed; all applicable normal commit hooks passed. Logs `/tmp/form-checkbox-format.log`, `/tmp/form-checkbox-lint.log`, `/tmp/form-checkbox-commit.log`.
- Full client suite and fresh fork CI are not claimed as green; CI pending.

[Normal review](subagents/normal_review.md) and [test challenge](test_challenges_debrief.md) required no changes. [Scope evaluation](scope_evaluation.md) recommends retaining the implemented scope. The separate preexisting ineffective empty-values loop in FormCheck remains outside this controlled-input repair. [Screenshots are not relevant](screenshot_debrief.md), since the runtime UI is unchanged. No new E2E tests were added; no strict plumbing review is warranted for this 12-line test-only diff.

No PR opened. Hand off under `branches_implemented_needs_ci` after publishing.
