Run via Claude Opus at high effort.

# Screenshots successfully obtained

The screenshots come from `test_workflow_run_step_parameter_overrides.py` (11 tests) and `test_workflow_rerun.py::TestWorkflowRun::test_workflow_rerun_prefills_expanded_form`. All 12 passed. Playwright ran headless against one Galaxy on :8099 serving a client built into `static/dist`, with `GALAXY_TEST_SCREENSHOTS_DIRECTORY` set. Each image is cropped from the 1280×1000 viewport to the part that matters. The two Phase C images in `screenshots/` were replaced by fresh captures under the same names, so the links in `subagents/phase_c_merged_picker.md` still work.

## Index

| File | Test | Shows |
|---|---|---|
| `step_parameter_overrides_cards.png` | `test_choose_step_parameters_and_run` | Simple run form, "Step parameters (4)": override cards for Threshold, Mode, Query 2 › Column name and Filter type › Minimum value. Each card shows its step label, "saved: …" and a remove button. |
| `step_parameter_overrides_picker_locked_conditional.png` | same | List picker for steps 3 and 4. The locked Filter type row is hovered, and its tooltip reads "Changing this would change which parameters below apply. Set it in the expanded form." Locked Column rows, "workflow sets to …" hints and Apply (4) are also visible. |
| `step_parameter_overrides_picker_subworkflow.png` | `test_choose_subworkflow_step_parameter` | List picker for the nested workflow. "Step 2: nested" groups its inner step, labeled "nested › Step 2: echo". |
| `step_parameter_overrides_workflow_view.png` | `test_choose_in_workflow_view_and_run` | Pop-out workflow view with tool node "3: echo" selected: green header, "2 of 7 parameters chosen", and the "Step 3: echo" panel. Step 4 says "6 parameters to choose from". |
| `step_parameter_overrides_workflow_view_subworkflow.png` | `test_list_and_workflow_view_share_picked_parameters` | Workflow view with subworkflow node "2: nested" selected. The panel lists "nested › Step 2: echo" with two parameters chosen. |
| `step_parameter_overrides_card_error.png` | `test_server_errors_land_on_their_cards` | After a server rejection: the run alert says "Fix the step parameters marked below", and the Run label card has a red border and "Parameter 'label': Run labels are lowercase". The Threshold card has no error. |
| `step_parameter_overrides_rerun_prefilled.png` | `test_rerun_reshows_step_parameter_overrides` | Rerun of a nested-workflow run: the simple form shows the recorded overrides (0.75 and 3), each marked "original run: …". |
| `step_parameter_overrides_rerun_with_this_changed.png` | `test_rerun_with_this_changed` | Job Parameters on the invocation's Steps tab, with a rerun icon on each overridable row. The Minimum value icon is hovered, showing "Rerun the workflow with this parameter changed". Column and Filter type have no icon. |
| `workflow_rerun_expanded_form_seeded_step.png` | `test_workflow_rerun_prefills_expanded_form` | Reworded legacy-rerun alert at the top of the expanded form: "This is the legacy workflow run form. The original run didn't record which tool step parameters were chosen, so the full form is shown." |
| `step_parameter_overrides_link_expanded_form.png` | `test_link_in_expanded_form_lists_its_parameters` | Linked-parameters warning in the expanded form: "This form can't preset the step parameters the link asks to change. Set them in their steps below:", followed by the two labeled parameters. |
| `step_parameter_overrides_link_preset_and_dropped.png` | `test_link_with_preset_and_unusable_parameters` | Extra image: the simple form opened from a link. Its presets are on cards, and the dropped parameters are listed with their reasons. |

## Changes made to get them

The tooltip for "Rerun with this changed" never appeared, and that was a real bug. `JobParameters.vue` used `v-b-tooltip.hover`, a bootstrap-vue directive this client no longer registers; it was the only `v-b-tooltip` left in `client/src`. Only the browser's native `title` was left. The fix switches it to `v-g-tooltip.hover` and was squashed into "Rerun a workflow with one of a step's job parameters changed" (`45c779f37a0`).

`test_rerun_with_this_changed` now hovers the link before its screenshot, waits for `_.tooltip_inner`, and calls `clear_tooltips()` afterward. The first hover attempt missed because the step's job details keep loading after the parameters render, which moves the link. A `UX_RENDER` sleep before scrolling and hovering fixed it. This change was squashed into the E2E commit (`0c57368d1d5`).

Checks after the change:
- vitest for `JobParameters`, `WorkflowInvocationState` and `JobInformation`: 16 files, 72 tests, all passed.
- vue-tsc, eslint and prettier: clean.
- ruff, black and isort on the test file: clean.
- The changed test passed against a rebuilt `static/dist`.

The bottom five commits are unchanged, so the extraction branch didn't need a re-sync.

## Caveats

- Workflows opened through `workflow_run_open_workflow` get random names; the header in `card_error` reads `fxp1ygss38`. The other crops leave the header out or show a workflow named "Workflow".
- In `picker_locked_conditional` the lock tooltip covers part of the Query 2 › Column name row above it.
- The error text on the card uses Galaxy's standard `FormElement` alert styling, which is light blue. The red border comes from this branch's card.
- There's no separate image for `test_rerun_with_legacy_step_parameters_stays_expanded`. It shows the same reworded alert as `workflow_rerun_expanded_form_seeded_step.png`.
