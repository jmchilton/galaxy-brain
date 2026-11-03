Run via Claude Opus at high effort.

# Polish E2E tests: workflow_step_parameter_overrides

The E2E file's last two sleeps are now waits. Its unscoped popover, tooltip and modal-button selectors are now keyed to the picker's DOM, which the picker commit now decorates. Repeated submit, request-check and rerun steps became helpers. The full file passes, 9/9, against a rebuilt `static/dist`.

2026-11-03. This was a run of `GX_PROCESS_POLISH_E2E_TESTS.md` over `lib/galaxy_test/selenium/test_workflow_run_step_parameter_overrides.py` and its `workflow_run.step_parameters` selectors.

| Branch | New SHAs (bottom to top) |
|---|---|
| `workflow_step_parameter_overrides` over `46db8f9d5b6` | `d018b32d39a` (API 1), `8cb020517ad` (API 2), `9b2d7f3f375` (API 3), `a0a810d90fe`, `42b756d766d`, `017fd49e6cc`, `c54c5a73c93` |

- The API series is unchanged, so `workflow_step_parameter_overrides_api` didn't need a re-sync.
- `42b756d766d` and `017fd49e6cc` changed only their parents.

## DOM decoration

These changes are in `StepParameterTreeNode.vue`, squashed into the picker commit `a0a810d90fe`.

- **Rows**: every picker and workflow-panel row now has `data-description="step parameter row"` and `data-parameter-key`.
  - A parameter row uses the parameter's key. A conditional row uses the node id, which is the conditional's path (e.g. `2/cond`).
  - Before, the key was on the checkbox's `<label>`, or on an inner span for locked rows. The conditional's row had no key at all, because conditionals have no `key`.
- **Lock tooltip**: the `GTooltip` now has `data-description="step parameter lock tooltip"`.
- **Help popover**: its text is now slot content, in a `step parameter help text` span with the parameter's key.
  - `GPopover` moves its element into the enclosing `<dialog>`. A selector scoped to the row therefore can't reach the popover, so the span carries the key itself.

## Selectors (`navigation.yml`)

| Before | After | Why |
|---|---|---|
| `help_popover: .popover-body` | `[data-description="step parameter help text"][data-parameter-key="${key}"]` | The picker has several help popovers: threshold, plus filter type on both echo steps. The old selector found whichever came first in the DOM. |
| `lock_tooltip: .g-tooltip[data-show="true"]` | scoped to `picker_row(key)`, matched by `data-description`, still `[data-show="true"]` | The old selector matched any tooltip shown anywhere on the page. `data-show` stays because a hidden tooltip is `sr-only`, not `display: none`. |
| `picker_locked_conditional`, unkeyed `picker_lock` | `picker_row(key=".../cond")`, `picker_lock(key=...)` | These relied on class structure (`.step-param-conditional > .step-param-row.step-param-locked`) and matched the first locked conditional only. The fixture workflow has two, on `echo` and `echo_connected`. |
| `picker_row` / `picker_parameter` / `picker_help` via `.step-param-row:has(> label[...])` | `[data-description="step parameter row"][data-parameter-key]` | No more `:has()` or class selectors. |
| `workflow_panel_parameter` via `label[data-parameter-key]` | the same row selector, inside the panel | The key moved to the row. |
| `card*` via `.step-parameter-card[...]` | `[data-description="step parameter card"][...]` | The card already had this `data-description`. |
| `picker_apply` / `picker_cancel`: `.g-modal-confirm-buttons button:last-child` | scoped to `[data-description="step parameter picker"]` | Every confirm `GModal` on the page matched before. This follows the existing `permissions_change_required_ok` pattern. Decorating the buttons themselves would need a change to `GModal` in `packages/ui`. |

Kept as they were:
- `workflow_node` / `workflow_node_title` (`#wf-node-step-N .node-title`): the editor's `workflow_editor.node` selectors use the same convention.
- `card_input` (`.ui-input`): the card's `FormDisplay` input.

## Sleeps

- **The filter screenshot**: the `UX_RENDER` sleep became `picker_row(threshold).wait_for_absent()` plus `picker_row(queries/1/column_name).wait_for_visible()`. This also asserts what the filter keeps and what it drops.
- **The "Rerun with this changed" screenshot**: the sleep after `scroll_into_view` was removed. The scroll is an instant `scrollIntoView`, and the link was already waited for.
- I checked both screenshots, and both render complete. No sleeps remain in the file.

## Shared abstractions

All of these are in the test file:
- **`_submit(history_id, known=frozenset())`** submits the form and waits for the new top-level invocation. It replaces `workflow_run_submit()` + `_new_invocation_id(...)`, which appeared 8 times.
- **`_assert_request_overrides(invocation_id, expected)`** returns the request. It replaces 6 copies of the `invocation_to_request` + `step_parameter_overrides` assertion.
- **`_open_rerun(invocation_id)`** is used 3 times.
- **`_assert_rerun_expanded(reason)`** waits for the expanded form and checks the reason text. Both rerun-stays-expanded tests use it.

`test_workflow_rerun.py` opens `workflows/rerun?invocation_id=` the same way three times. That file comes from the parent stack, so I didn't add a `NavigatesGalaxy` method this branch would be the only one to use.

## Screenshots

The file captures 11 screenshots across its 9 tests: empty, picker (filtered, locked conditional, subworkflow), cards, workflow view (plain, subworkflow), rerun prefilled, rerun with a switched case, rerun with this changed, and link preset/dropped. That is adequate coverage for the only tests over this component, and nothing was added.

## Evidence

- **E2E**: 9/9 passed in 317s. That is Playwright, headless, with the client rebuilt into `static/dist`, against a single Galaxy on :8091 that has since been stopped. The squashed HEAD tree is identical to the tree that was tested.
- **Vitest** `src/components/Workflow/Run`: 14 files, 96 tests passed.
- **vue-tsc**: clean. eslint: clean. prettier: clean on `StepParameterTreeNode.vue` and `navigation.yml`.
- **ruff, black, isort**: clean on the E2E file.

## Deferred

- **`data-description` on `GModal`'s confirm buttons**: this needs a change to the shared `packages/ui` component, which is out of scope. The picker-scoped `button:last-child` matches existing usage.
