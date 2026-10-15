# Screenshot debrief — issue_24093_batch_element_labels_26.1

**Screenshots successfully obtained.**

The fix is server-side but visible in the tool form. The branch's new E2E test captures the relevant state; no existing test screenshots this field in batch mode.

| File | Source | Shows |
|---|---|---|
| `screenshots/tool_form_batch_dropped_collection_elements.png` | `test_tool_form.py::TestToolForm::test_batch_input_labels_dropped_collection_elements` (Playwright, `self.screenshot(...)` after the label assertion) | `cat1` "Concatenate Dataset" in Multiple datasets mode with two dropped `forward` elements, both chips server-labelled: `2: (hidden) forward`, `5: (hidden) forward`. Pre-fix the second read `Selected: forward` (issue screenshot). |

Captured during the E2E polish run (before the thermo-nuclear refactor, which was behaviour-preserving; the test was re-run green after it). Screenshots are gitignored and kept locally.
