# Scope evaluation

**Recommendation: expand (modestly).** Route the existing hand-rolled tool/workflow-form boolean setters (`RunsToolTests._set_boolean_value` in `framework.py`, `_toggle_workflow_run_boolean` in `test_workflow_rerun.py`) through the new `tool_form_set_switch`, so the branch adds a shared switch helper with real consumers instead of a third parallel pattern. Keep the workflow-editor parameter-definition clicks out unless they verify trivially. Both reviews flagged the overlap and deferred it as a follow-up; the process treats that as part of the work.

Branch is +41 lines (under 100), so no decomposition section.

## As implemented

New `cat1` E2E test for the "re-use jobs with identical parameters" switch, plus `tool_form_set_switch` (label click, post-click assert), `tool_form_set_use_cached_job`, and the `parameter_switch_label` / `parameter_data_select_value` nav targets.

| Pros | Cons |
|---|---|
| - Minimal, purely additive, low risk on release branch<br>- Green on Playwright + Selenium, red without the switch | - Adds a third way to flip a form boolean beside `_set_boolean_value` and `_toggle_workflow_run_boolean` (both JS-click hidden input)<br>- Helper has a single caller |

## Expand: consolidate tool/workflow-run boolean setters (recommended)

Make `_set_boolean_value` and `_toggle_workflow_run_boolean` delegate to `tool_form_set_switch`.

| Pros | Cons |
|---|---|
| - New helper gets real consumers; matches reviewers' reuse preference<br>- Real-user label click instead of JS click across tool-test-driven Selenium runs<br>- Small (~10 lines) | - Changes click mechanics for every tool-XML Selenium test using booleans; need a run of a couple of those plus `test_workflow_rerun` on both backends<br>- Workflow run form must render `.custom-control-label` (same `FormBoolean`, likely but verify) |

<details>

`_set_boolean_value` takes string values (`"true"/"1"/"yes"`); keep that parsing and pass a bool. If any consumer turns out to not render the label (or the label click is intercepted), drop that consumer rather than fall back to JS click.

</details>

## Expand further: also workflow-editor parameter-definition checkboxes

`test_workflow_editor.py` (~513, 568, 636) JS-clicks `parameter_definition|optional|...` checkboxes unconditionally.

| Pros | Cons |
|---|---|
| - Removes remaining hand-rolled JS clicks on these switches | - Those are toggles without target state; conversion needs care<br>- Editor forms are a different surface; more test runs; drifts from "missing test" scope |

## Expand: port gxui `tool-run --reuse`

| Pros | Cons |
|---|---|
| - Parity with `galaxy_ui_driver` | - gxui tooling isn't on `release_26.2`; belongs on `galaxy_ui_driver` |

## Contract: drop the generic helper, inline in test

| Pros | Cons |
|---|---|
| - Even smaller | - Loses reusable piece reviewers asked for; opposite of process guidance |
