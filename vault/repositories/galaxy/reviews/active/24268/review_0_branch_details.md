`pr_24268_review_0`, branched from the reviewed commit `a6772eccffe`, applies the verified review findings one commit per finding:

- FormDrilldown's selection moves into GRadioGroup/GCheckboxGroup, so the single-select tree becomes a named radiogroup.
- A single-select drilldown case is added to the Selenium tool-form harness.
- CopyModal and HistoryImport radio tests are rewritten to drive the DOM.
- GRadioGroup and GCheckboxGroup gain a `description` prop, which InstallationSettings now uses.
- LabelSelector's deep selector is replaced with a class.
- The MarkdownEditor switch is renamed "Editor mode".
- Styling-class assertions are removed from two tests.
- ThemeSelector test state is isolated.

`legendClass` (#24260) is untouched.

- `3932ef3ab8b` Let GRadioGroup/GCheckboxGroup own FormDrilldown selection. This drops the drilled `name` and `handleClick` props, `setElementValues` and the `:value="true"` trick. `FormElement` passes its title id as `aria-labelledby`, and a new test checks the named radiogroup.
- `91c5ee8939c` Cover single-select drilldown in the tool form harness. This adds `("gx_drill_down_exact", 1)` to `DEFAULT_TOOL_TESTS` (not run locally).
- `6f0b2f94db6` Drive CopyModal and HistoryImport radio tests through the DOM. The two CopyModal radio cases are merged into one mounted test, and the HistoryImport test asserts the literal legend and the file input.
- `43fdf8416d8` Add a description prop to GRadioGroup and GCheckboxGroup. The prop renders help text under the options and links it with a generated `aria-describedby`. InstallationSettings uses it in place of a hand-placed `<small>`.
- `0ec36c9f7f7` Space LabelSelector radios with a class, not a deep selector. `<GRadio class="my-1">` replaces `:deep(.g-radio-group-options)`.
- `1058d659014` Name the MarkdownEditor mode switch "Editor mode". Both `aria-label` and the tooltip title change, and the test follows.
- `06bcd5b8145` Drop styling-class assertions from MarkdownEditor and FilterMenu tests. This removes the `d-inline-block`, `g-outline`, `g-blue`, `g-small` and per-radio `g-radio-button` checks.
- `d079c3da661` Reset ThemeSelector test state per case and drop a duplicate label check. A `beforeEach` resets the shared refs and mocks, and the duplicate `legend.text()` check in InstallationSettings is dropped.
