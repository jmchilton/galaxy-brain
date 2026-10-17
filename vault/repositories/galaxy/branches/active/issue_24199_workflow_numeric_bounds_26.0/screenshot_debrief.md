# Screenshot debrief

**Screenshots successfully obtained.** Branch head `8df2892c73f`; before shots from base `release_26.0` (`a6544be047d`) source.

## How

- This worktree's own Galaxy (8097) + Vite (5187); stopped by PID after.
- E2E: the two branch-modified Selenium tests (`test_int_parameter_minimum_validation`, `test_float_parameter_maximum_validation`) already call `self.screenshot(...)`; ran both with `GALAXY_TEST_SCREENSHOTS_DIRECTORY` — 2 passed. No test changes needed or made.
- Remaining cases (bounds 1–5 slider, Default Value field, inverted bounds) have no E2E test covering a screenshot; captured by driving the browser (Playwright MCP) against three workflows imported via API: `count` int with in_range 1–5, min-only 4, and inverted 5–1.
- Before shots: temporarily checked out base versions of `FormNumber.vue`, `modules.py`, `workflow_parameter_input_definitions.py`, restarted Galaxy, captured, then `git checkout HEAD --` those files. `git status` clean afterwards; no stash.

## Index (`screenshots/`, gitignored)

| File | Shows |
|---|---|
| `e2e_workflow_run_int_parameter_below_minimum.png` | E2E: min-only int (min 4), entered 3 → "3 is out of range! (3 < 4)", field 4 |
| `e2e_workflow_run_float_parameter_above_maximum.png` | E2E: max-only float (max 3.14), entered 3.2 → alert, field 3.14 |
| `before_run_form_bounds_1_5_out_of_range.png` | Base run form: plain field, no slider; 7 accepted silently |
| `before_run_form_bounds_1_5_submit_error.png` | Base: only feedback is server error on submit, "Value ('7') must fulfill (1 <= value <= 5)" |
| `after_run_form_bounds_1_5_slider.png` | Branch run form: range slider next to field |
| `after_run_form_bounds_1_5_out_of_range.png` | Branch: 7 → "7 is out of range! (7 > 5)", clamped to 5, slider at max |
| `before_run_form_min_only.png` | Base: min-only, 2 accepted, no warning |
| `after_run_form_min_only_clamped.png` | Branch: 2 → "2 is out of range! (2 < 4)", clamped to 4 (no slider — needs both bounds) |
| `before_editor_default_value_out_of_range.png` | Base editor: Default Value plain field holds 9 with bounds 1–5 |
| `after_editor_default_value_slider.png` | Branch editor: Default Value gets slider (empty-required state) |
| `after_editor_default_value_out_of_range.png` | Branch editor: 9 → "9 is out of range! (9 > 5)", clamped to 5 |
| `before_editor_inverted_bounds_load.png` | Base editor: inverted 5–1 loads with no sign of a problem |
| `after_editor_inverted_bounds_load_modal.png` | Branch: "Issues loading this workflow" modal lists step error "Workflow input 'count' has a minimum (5) greater than its maximum (1)." |
| `after_editor_inverted_bounds_node_error.png` | Branch: node rendered red with same message after Continue |
| `before_run_form_inverted_bounds.png` | Base run form: "Uncaught exception in exposed API method:" (500) |
| `after_run_form_inverted_bounds.png` | Branch run form: clear message naming input and bounds (400) |

## Observations (not acted on)

- Empty required bounded field: slider thumb sits mid-track while the number box is empty (`after_run_form_bounds_1_5_slider.png`, `after_editor_default_value_slider.png`). Existing FormNumber behavior for empty values, now reachable from workflows. Cosmetic.
- Turning on "Specify a default value" for a bounded input briefly shows a raw-dict node error (`"Parameter 'default': an integer or workflow parameter is required"`) until a value is typed. Not checked on base for that exact moment; likely pre-existing (field is required, empty).
- Inverted-bounds load marks the workflow "(unsaved changes)" after the issues modal; base did not (no modal). Clicking a node also marks it dirty on base, so the dirty marker itself is pre-existing behavior; worth a glance, not a blocker.
- The step error clears once the node is edited (as noted by the caller); only a reload shows it again. Matches design.
- E2E shots: corrected field has red border + green check, as noted in the E2E polish debrief; transient render state.
