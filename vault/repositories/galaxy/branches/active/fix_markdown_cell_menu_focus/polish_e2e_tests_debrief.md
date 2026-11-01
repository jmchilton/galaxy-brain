Run via Claude Opus at high effort.

I extended the cell editor E2E test to check that keyboard Move Down and Move Up keep focus on the moved cell's actions button, reusing the existing `navigation.yml` targets and helper (commit `bcab00b9482`). Nothing else needed polishing since round 1.

**The E2E test has NOT been run in a browser.** Real browsers cannot launch on this host. Round 1 is in [earlier_drafts/1/polish_e2e_tests_debrief.md](earlier_drafts/1/polish_e2e_tests_debrief.md).

## Test

`TestPages.test_cell_editor_menus_return_focus_after_keyboard_selection` in `lib/galaxy_test/selenium/test_pages.py`.

## Changes

- **Move steps.** These run after the existing Enter and Space Clone/Insert loop. By then the cells are `[Starter, Heading(Space), Clone(Space), Heading(Enter), Clone(Enter)]`. Inserted and cloned cells are created open, so index 1 has a visible actions button.
  - **Move Down with Enter:** opens cell 0's actions menu and picks "Move Down". It asserts that the menu closes, stays closed after the commented `UX_RENDER` sleep, and that `document.activeElement` is `cell(index=1).actions_button`. Without the fix, Popper's `close()` refocuses cell 0's button, which now belongs to the Heading cell that swapped in, so the assertion fails.
  - **Move Up with Space:** moves the Starter cell back from index 1 and expects focus on `cell(index=0).actions_button`. This covers the other direction and the Space keyup path, where the newly focused button must not be activated by the same key.
- **Helper:** `_markdown_cell_menu_select_with_key` gets an optional `focused` target, defaulting to the opening button, plus a docstring. `screenshot_name` now defaults to `None`.
- **Selectors:** no new ones. `cell(index=…).actions_button / actions_menu / actions_option(title=…)` already exist, and `data-option-title` comes from `CellOption`'s `title` ("Move Down" and "Move Up" render for index 0 of 5 and index 1).
- **Sleeps:** none added. The Move steps share the helper's single commented `UX_RENDER` sleep, which checks a negative condition (the menu must not reopen).
- **Screenshots:** none added for Move. It uses the same actions menu that is already captured as `pages_cell_editor_actions_menu`.
- **DOM decoration / client refactor:** neither was needed. The target is release_26.2.

## Validation

- ruff 0.17.0 (check and format), black and isort are clean.
- I checked the selectors and the cell order by reading `CellEditor.vue`, `CellWrapper.vue` (CellAction only renders when `toggle` is set), `CellAction.vue` (the Move option `v-if`s) and `CellAdd.vue` (emits `toggle: true`).

## Not done / follow-ups

- Run the test under both Selenium and Playwright on a host with a working browser. Reverting `006f64d6c37` should make the Move Down step fail on the focus assertion.
