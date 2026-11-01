Run via Claude Opus at high effort.

Decorated the Markdown cell editor with `data-description` attributes and rewrote the E2E test's selectors to address cell 0's controls, assert focus on the exact opening button, explain the one remaining sleep, and capture menu screenshots (commit `0d1ebb49773`).

**The E2E test has NOT been run in a browser.** Real browsers cannot launch on this host (Playwright Chromium/Firefox lack libatk/libgtk). Selectors were checked by reading the templates and by resolving every new `navigation.yml` target with `galaxy.navigation.components.Component.from_dict` in a throwaway venv.

## Test

`TestPages.test_cell_editor_menus_return_focus_after_keyboard_selection` in `lib/galaxy_test/selenium/test_pages.py`.

## Changes

- **DOM decoration (no behavior change)**:
  - `MarkdownEditor.vue`: `data-description="markdown editor mode"` on the BFormRadioGroup. BootstrapVue passes `$attrs` to the group's root div.
  - `CellWrapper.vue`: `data-description="markdown cell"` and `:data-cell-index` on the root, plus `markdown cell toggle button` on the Edit Cell/Collapse button.
  - `CellAction.vue`: `markdown cell actions button` on the button and `markdown cell actions menu` on the menu `<nav>`.
  - `CellAdd.vue`: `markdown cell insert button` on the button and `markdown cell insert menu` on `.cell-dropdown`.
  - `CellOption.vue`: `markdown cell option` and `:data-option-title` on the ButtonPlain root.
  - GButton (galaxy-ui) and ButtonPlain pass the attributes through to their root elements.
- **navigation.yml**: `markdown_cell_editor.cell(index=…)` now has `toggle_button`, `actions_button`, `actions_menu`, `actions_option(title=…)`, `insert_button`, `insert_menu` and `insert_option(title=…)`. `editor_mode_button` stays as XPath, because BootstrapVue's button-style radios hide the `<input>` and the visible `<label>` has to be clicked. It is now scoped under the decorated group. These targets replace the old ones: first match by `[data-title]`, first `.cell-add-options .cell-option`, and XPath on option text.
- **Why scoping matters**: the cloned cell and the inserted cell are both created open (`toggle: true`). Each one adds another Actions button and another hidden menu. The old unscoped selectors and the old `data-title == "Actions"` focus check could pass against the wrong cell.
- **Focus assertion**: now `document.activeElement === <the opening button>` through `execute_script`, which works on both backends. Before, it checked a `data-title` string.
- **Insert button used**: the test now opens cell 0's own "Insert Cell Below" (`CellAdd`) instead of the top-level "Insert" button. It is the same component, and its insertions land after cell 0, so index 0 keeps pointing at the same cell. The option chosen is "Heading 1" instead of "first option".
- **Shared helper**: `_markdown_cell_menu_select_with_key(button, option, menu, key, screenshot_name)` replaces the duplicated open/press/assert steps.
- **Sleep**: `sleep_for(UX_RENDER)` is kept, with a comment. It checks a negative condition: the menu must stay closed after the refocused button could have been activated by the same key press, and there is no element to wait on.
- **Screenshots**: `pages_cell_editor_actions_menu` and `pages_cell_editor_insert_menu` are taken on the Enter pass. No other E2E test covers the cell editor.

## Validation

- vitest (`src/components/Markdown/`, `src/components/Popper/`, `ButtonPlain.test.js`): 22 files and 165 tests passed under node 22.20.0.
- Prettier is clean. ESLint is clean apart from warnings that were already there. One attribute-order error introduced in `MarkdownEditor.vue` was fixed.
- ruff (pinned 0.17.0), black and isort are clean on `test_pages.py`.

## Not done / follow-ups

- Run the test in a real browser under both Selenium and Playwright, ideally with a revert of `5e18f770488`/`1886353dd23` to confirm it fails without the fix.
- No client refactors, since the target is release_26.2.
