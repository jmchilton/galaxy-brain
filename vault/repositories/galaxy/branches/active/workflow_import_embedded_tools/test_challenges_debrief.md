Retained the API regression tests, restored the first-tool baseline assertion for user tools, and strengthened admin imports to verify preserved earlier metadata and connections. Corrected the native admin fixture's required annotation and format version. All 10 import variants pass; both corrected admin cases reproduce the reported constraint failure on the base workflow manager.

## Changes

- The user matrix now checks both embedded tool classes when the first step is a user tool, and checks `cat1` when the first step is stock. This preserves the original baseline assertion while supporting stock-first cases.
- Admin cases now check the connection from the first step, the earlier workflow output or rename action, and the final output and embedded admin tool definition.
- Added the standard top-level `annotation` and `format-version` fields to the native admin fixture. Without the annotation field, fixed imports reached a later, unrelated required-field error.

## Test design

Read `doc/source/dev/writing_tests.md`. These are backend import and persistence tests, so the existing workflow API suite is the appropriate layer. They use `WorkflowPopulator` import/download helpers and `DatasetPopulator.user_tool_execute_permissions()` rather than duplicated HTTP calls. No mocks, unit-test substitutes, external services, or browser layout are involved.

Browser coverage would duplicate the import API behavior: this branch changes no upload form, editor interaction, or client rendering. No Selenium/Playwright test is needed.

## Verification

- The first commit, `7bc2781a561` (`Baseline tests for embedded user tool workflow imports`), passed both final-output and earlier-annotation cases before implementation (`/tmp/24471-baseline.log`).
- All six new user regression variants failed with `NOT NULL constraint failed: workflow_step.workflow_id` before the fix (`/tmp/24471-red.log`). The wider user tool run passed 26 tests after the fix (`/tmp/24471-green.log`).
- Both corrected native admin cases reproduced the same constraint failure with the exact `origin/release_26.1` workflow manager loaded through a temporary import hook (`/tmp/24471-admin-red.log`: 2 expected failures). Live implementation files were not modified.
- The completed fixture and stronger assertions pass all 10 import variants (`/tmp/24471-challenge-green.log`: 10 passed, 397 deselected, 2 warnings). The warnings concern existing `pkg_resources` namespace declarations.
- Black's check on the modified test file passes. No tests were removed or weakened.
