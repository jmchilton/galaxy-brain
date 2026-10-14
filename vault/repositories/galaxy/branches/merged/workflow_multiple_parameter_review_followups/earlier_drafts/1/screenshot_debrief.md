# Screenshot verification

Screenshots successfully obtained. All five final captures were visually inspected and show the expected controls, values, and layout. No implementation fixes or committed test additions were needed for this verification.

## Capture index

| Screenshot | Verified content |
| --- | --- |
| [Float editor defaults](screenshots/workflow_editor_multiple_float_parameter_range_list_default.png) | Float type; multiple values enabled; separate 0.5 and 1.5 default rows; minimum 0.25 and maximum 2.5 visible together. |
| [Float editor reopened](screenshots/workflow_editor_multiple_float_parameter_range_reloaded.png) | Saved version 2; float multiple setting, both default rows, and both decimal range bounds persist on reopening. |
| [Float runtime form](screenshots/workflow_run_multiple_float_parameter_range.png) | Separate 0.5 and 1.5 runtime rows, Add value control, and valid field state. |
| [Text newline default](screenshots/workflow_editor_multiple_text_newline_default_rows.png) | Imported scalar newline default renders as two editable text rows; comma remains part of the first entry. Browser assertions verify the leading and trailing spaces remain intact. |
| [Text edited runtime form](screenshots/workflow_run_multiple_text_newline_default_edited.png) | After editing the second row and saving, runtime form presents distinct text rows with a comma retained in the first entry; browser assertions verify values are exactly `[' a,b', 'd']`. |

## Process and validation

Read `vault/agents/_shared/GX_PROCESS_SCREENSHOTS.md` and `vault/research/Component - E2E Tests - Writing.md`. Used the Galaxy Playwright test infrastructure against the worktree's existing Vite server on port 5176 and Galaxy backend on port 8083.

The three initial float screenshots came from a successful focused E2E run, but the standard 1,000px viewport clipped range controls. A temporary pytest plugin changed only the capture-process viewport to 1,280 by 1,400 pixels and reran `test_multiple_float_parameter_with_range`, producing the three replacement float captures above. The same plugin added a temporary `test_screenshot_text_newline_default` method using the existing workflow-editor smart-component helpers. It imports a text-list input with scalar default `" a,b\nc "`, verifies the two initial rows, edits the second row to `d`, saves, and verifies the runtime form. This adds visual evidence for the frontend newline normalization without adding committed test scope.

Result: **2 passed in 37.24s**. The sole warning was an unrelated Google SDK deprecation warning. Both tests also passed the existing E2E decorator's accessibility checks. Captures were copied into this branch's ignored `screenshots/` directory and inspected with `view_image`.

No screenshot blocker remains. These images verify editor and runtime presentation, not workflow execution; API and module checks cover submitted-list conversion and persistence separately.
