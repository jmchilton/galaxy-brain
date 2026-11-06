# Codex review

Codex (read-only, `git diff origin/release_26.2...HEAD` at `694243b1448`) reported two findings. Both were confirmed against the code and fixed, then folded into "Test changing the data type of selected history items"; head `062c9b2c1de`. `test_change_datatype_of_selected_items` passes under both Playwright and Selenium.

Not acted on: nothing.

<details>
<summary>Findings and triage</summary>

1. **P2, test reliability: CONFIRMED, fixed.** `history_panel_change_datatype_of_selected` called `select_set_value` once the modal was present. `SingleItemSelector.vue` renders its Multiselect only when `items.length` is non-zero (datatypes come from `DatatypesProvider` asynchronously), and `select_set_value` uses `find_element` for `.multiselect__select` without waiting. If the datatypes request is slow, that is a missing-element error on either backend. Fix: added `change_datatype_modal.item_selector` (`${_} .single-item-selector`) and wait for it to be visible first. It is not named `selector` because `select_set_value` reads a component's `.selector` attribute.
2. **P3, reuse: CONFIRMED, fixed.** The test opened multi-select and selected each hid by hand, which duplicated `NavigatesGalaxy.history_panel_wait_for_and_select`. It now calls `history_panel_wait_for_and_select([1, 2])`.

Coverage notes: all changed files plus surrounding Citation, GModal, SingleItemSelector, selenium framework and driver files. Codex did not run browser tests.

</details>
