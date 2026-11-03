Run via Claude Opus at high effort.

# Polish E2E tests, round 2: workflow_step_parameter_overrides

The dropped and linked step parameter lists now have per-item `data-description` targets, so the link tests check each item and its reason. The card helpers use SmartTarget methods, a new `_open_link` helper replaces four URL builds, and an unneeded wait in `test_link_in_expanded_form_lists_its_parameters` is gone. The full E2E file and #24177's `test_workflow_rerun_prefills_expanded_form` pass, 12/12, against a rebuilt `static/dist`.

2026-11-03. This was a fresh run of `GX_PROCESS_POLISH_E2E_TESTS.md` over `46db8f9d5b6..HEAD`, after the re-scope and the round-2 test challenges. It covers `test_workflow_run_step_parameter_overrides.py` (11 tests), the `navigation.yml` selectors, `workflow_run_ensure_expanded` and the one-line `test_workflow_rerun.py` change.

| Branch | Commits, bottom to top |
|---|---|
| `workflow_step_parameter_overrides` over `46db8f9d5b6` | `58a86dec561` (baseline), `b682078c173` (refactor), `0919ef03fb4` (API 1), `3bfb3a7732c` (API 2), `d7952c3ab81` (API 3), all unchanged; `5e6187a5833` (picker), `b34f7eb324c` (workflow view), `d0131cfc9d3` (rerun with this changed), `bf924da1cde` (E2E) |

- The bottom five commits are unchanged, so `workflow_step_parameter_overrides_api` didn't need a re-sync.
- The workflow view and rerun commits changed only their parents. The squashed tree is identical to the tree before the autosquash.

## DOM decoration

These changes went into the picker commit `5e6187a5833`.

- **Dropped list** (`WorkflowRunStepParameters.vue`): each `<li>` now has `data-description="dropped step parameter"`, next to its existing `data-parameter-key`.
- **Linked list** (`WorkflowRunForm.vue`, the expanded form's alert): each `<li>` now has `data-description="workflow run linked step parameter"`.

Before, the test read the dropped alert's whole text. It couldn't tell which reason belonged to which parameter, so it didn't check reasons at all. The two dropped parameters in the link test take different paths through `resolveStepParameterKeys`:

- `2/cond/pattern` isn't in the saved conditional case, so it gets "no such parameter in the workflow's current state".
- `2/column` is a `data_column`, so it gets "Options depend on a data input".

## Selectors (`navigation.yml`)

| Before | After | Why |
|---|---|---|
| `step_parameters.dropped` (the whole alert) | `step_parameters.dropped_parameter(key)` | See above. The test no longer used `dropped`, so I removed it. |
| `linked_step_parameter: ... li[data-parameter-key]` | `[data-description="workflow run linked step parameter"][data-parameter-key]` | No tag selector, and it matches `dropped_parameter`. |

Kept as they were:

- **`card_input` (`.ui-input`) and `card_error` (`.ui-form-error-text`)** are inside the card's `FormDisplay`. They mirror the existing `tool_form.parameter_input` and `parameter_error` selectors. The card's input name is generated (`step_parameter_N`), so the `tool_form` selectors can't be reused.
- **`picker_apply` and `picker_cancel`** keep `.g-modal-confirm-buttons button:last-child` and `:first-child`, scoped to the picker. Four other `navigation.yml` entries use the same pattern. Round 1 declined decorating the buttons, which would mean changing `GModal`, and nothing has changed since.

## The round-2 additions

- **`test_server_errors_land_on_their_cards`** is in good shape.
  - The error is one subworkflow deep (`1/1/advanced/label`), and the tool's expression validator runs only on the server.
  - The test checks the error card, the absent error on the other card, the alert, clearing the error on change, and the request after resubmitting.
  - All its selectors are `navigation.yml` targets, and it has a screenshot. I changed nothing beyond the shared helpers.
- **`test_link_in_expanded_form_lists_its_parameters`**:
  - The test waited for the simple form's `cond/min` card before switching to the expanded form. Nothing needed it. `self.get` is a full page load, and `workflow_run_ensure_expanded` waits for the run button. `test_link_with_preset_and_unusable_parameters` already checks the simple form's preset. Without the wait, the test passed 3 times out of 3.
  - The `cond/min` item now also asserts its label, "Minimum value". Before, the test only checked that the item was there.
  - The second `workflow_run_ensure_expanded` call runs with the runtime settings panel already open, because the first call opened it and its toggle persists. So this test also exercises the helper fix.
- **The new assertions in other tests** (`advanced/label` in `test_choose_step_parameters_and_run`, `saved: 0.5` in the link test) use existing targets. They needed no change.

## `workflow_run_ensure_expanded`

The fix clicks the runtime settings button only when the expand link is absent. I checked it against `WorkflowRunFormSimple.vue`:

- The expand link is always rendered when the panel is open.
- The panel's open state comes from `usePersistentToggle`, keyed by the hashed user id. The hash is an async SHA-256, computed as soon as the user loads. The form renders only after `currentUser` is set and the workflow's run data has arrived, so in practice the persisted state is already applied when the helper checks for the link.

Reading the button's `aria-pressed` instead would check the same state less directly. I kept the fix as it was.

## Shared abstractions and waits

- **`_set_card_value`** now calls `card_input(key).wait_for_and_clear_and_send_keys(value)`, instead of clearing and typing into the raw element.
- **`_assert_card_value`** now reads `card_input(key).wait_for_value()`, instead of `get_attribute("value")`. It still retries during transitions.
- **`_open_link(workflow_id, step_parameter_overrides)`** quotes the argument and opens the run form. It replaces 4 copies of the URL build.
- **The rerun-with-this-changed test** now clicks with `rerun_with_this_changed(path="cond/min").wait_for_and_click()`. Before, it clicked an element it had found before taking the screenshot and checking the other links.
- **No sleeps** remain in the file.
- `self.get("workflows/invocations/...")` and `workflows/rerun?invocation_id=` stay as direct URLs. `NavigatesGalaxy` has no helper for either, and `test_workflow_rerun.py` opens the rerun page the same way.

## Screenshots

The file takes 13 screenshots across its 11 tests. Both round-2 tests take one: `step_parameter_overrides_card_error` and `step_parameter_overrides_link_expanded_form`. I checked both, and they render completely: the error card with its alert, and the expanded form's alert listing both linked parameters.

## Evidence

- **E2E**: 12/12 passed in 471s on the squashed HEAD `bf924da1cde`. That is the 11 tests in the override file plus `test_workflow_rerun.py::TestWorkflowRun::test_workflow_rerun_prefills_expanded_form`.
  - I used Playwright, headless, against a single Galaxy on :8097 serving a `static/dist` rebuilt from the changed client. I've since stopped that Galaxy.
  - Before squashing, the four changed tests passed (4/4). `test_link_in_expanded_form_lists_its_parameters` then passed twice more on its own.
- **Vitest** `src/components/Workflow/Run`: 15 files, 104 tests passed.
- **vue-tsc**: clean.
- **eslint**: 0 errors on the two changed components. The 8 warnings in `WorkflowRunForm.vue` were there before this branch.
- **prettier**: clean on both components and `navigation.yml`.
- **ruff, black and isort**: clean on the E2E file.

## Deferred

- **`data-description` on `GModal`'s confirm buttons**, for round 1's reason.
