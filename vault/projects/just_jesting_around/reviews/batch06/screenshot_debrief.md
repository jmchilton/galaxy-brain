Screenshots not relevant for this change.

Applied [the screenshot process](../../../../agents/_shared/GX_PROCESS_SCREENSHOTS.md) and read [the E2E writing reference](../../../../research/Component%20-%20E2E%20Tests%20-%20Writing.md), including its screenshot capture and browser-test setup guidance.

The iteration diff against `c51894fcccf93283b4e1a44cb9e90246be3f2283` contains six client unit-test files and one test-data helper. No production component, template, style, navigation selector, or E2E screenshot behavior changes. Storage-related browser coverage exists in `test/integration_selenium/_base_user_object_stores.py` and `test/integration_selenium/test_upload_target_object_store_selection.py`; those paths and the rendered UI remain unchanged.

No screenshots were recorded or added. The relevant evidence for this refactor is the unit-test behavior, fixture equivalence audit, type/lint/format checks, and independent review. There is no screenshot blocker.
