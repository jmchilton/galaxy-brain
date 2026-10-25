Add a missing E2E test for switching histories from the history panel's Switch to history button.

The history panel's ⇄ Switch to history button opens a history picker modal, and nothing tested it. The only switch test (`test_history_switch`) goes through the histories list card. This adds `test_history_panel_switch_history`: create a history, open the modal from the panel, pick it, and check that the panel now shows it.

![History panel after switching](screenshots/history_panel_switched_history.png)

***This is test code only - no client or server change. It targets `release_26.2` because missing tests are bugs.***

<details><summary>Details</summary>

- `history_panel_switch_to(history_id)` in `navigates_galaxy.py` clicks the panel button, picks the history in the modal, waits for the modal to close and for the history to become current.
- The upload activity's target-history picker uses the same `SelectorModal`, so its selectors (`upload_activity.history_selector_modal{,_item}`) move to a shared top-level `history_selector_modal` component used by both helpers. The shared selector matches only an open dialog (`dialog.g-dialog[open]`), where the old one matched any `.g-dialog`.
- Selectors use the existing `data-description` and `data-pk` hooks, so no DOM changes were needed.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It changes test code and `navigation.yml` selectors only.

## Context

Split out of 🌿[`galaxy_ui_driver`](https://github.com/jmchilton/galaxy/tree/galaxy_ui_driver), which drives Galaxy through GTN FAQ scenarios. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep scope as implemented.</summary>

- Covering MultipleView's history selection through the same modal is a different interaction (multi-select + confirm) and belongs in its own missing-tests branch.
- Dropping the upload selector sharing would leave duplicate selectors.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>No changes; the test fails if the modal-item click is dropped.</summary>

- One E2E test, no unit/API tests to challenge.
- Uses `dataset_populator` setup, `@selenium_test`, `retry_assertion_during_transitions` and `navigation.yml` selectors.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings.</summary>

Reviewed all four changed files plus the modal components and both driver backends.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>No base-branch refactoring needed.</summary>

The selector-sharing commit is a small refactor following the test commit; splitting it out would not help a reviewer.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Nothing - test-only; a failure names the missing selector or "history <id> to become current", and the final assertion compares the panel's history name.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A. E2E only; it checks the panel name the user sees.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. The test commit leads the selector-sharing commit.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `lib/galaxy_test/selenium/test_history_panel.py::test_history_panel_switch_history` passes under Playwright and Selenium locally.
- `test_upload_activity.py::test_target_history_change` passes under Playwright with the shared selectors.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
