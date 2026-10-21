Add browser tests for three history pages that have none: Selection > Change data type, Selection > Change Database/Build, and History options > Export Tool References.

On `release_26.2` no Selenium or Playwright test opens any of them. The only Selection menu entries a browser test drives are the build-list ones, and these two modals don't even have a `data-description` to find them by. The only citations test renders a single tool's references on its tool form. Nothing renders a whole history's references or switches to its BibTeX tab.

| Page | E2E on `release_26.2` | This PR |
| --- | --- | --- |
| Selection > Change data type | none | `test_change_datatype_of_selected_items` ✅ |
| Selection > Change Database/Build | none | `test_change_dbkey_of_selected_items` ✅ |
| History options > Export Tool References (APA + BibTeX) | none | `test_export_tool_references` ✅ |

***This PR is tests only. The Vue changes add five `data-description` attributes and nothing else, so Galaxy renders and behaves the same.***

***It targets `release_26.2` because the new tests cover existing 26.2 behavior. Cleanups to neighbouring, older helpers are left for `dev`.***

***Bulk `change_datatype`/`change_dbkey` already have API tests, and the vitest specs check which Selection options show and how mocked citations render. Nothing exercises these pages against a real server: the menu, its modals and the history panel catching up.***

***These are the Selection modals that apply one picked value, plus the history references page. Tags and hide/delete/purge use other patterns and are better as their own PR.***

Each Selection test uploads three datasets, selects two, applies the change through the modal, then waits for the panel to show the new value. It checks through the API that both selected items changed and the third didn't, so a change that hits the whole history, or nothing, fails. The references test runs the `bibtex` tool. It takes the expected count from `GET /api/histories/{id}/citations` and Galaxy's own citation key from the configuration API. Then, on both the APA and BibTeX tabs, it checks that Galaxy's citation comes first and the tool's is among the rest.

<details><summary>Test helpers</summary>

- `history_panel_change_selected(operation, value)` opens the Selection menu item named `operation`, picks `value` in its modal and confirms. Both Selection tests share it. It reuses `use_bootstrap_dropdown` and `select_set_value`.
- The two modals share one `navigation.yml` component, `history_panel.multi_operations.operation_modal`, keyed by the menu item's `data-description` (the modal's hook is `"<operation> modal"`).
- `history_panel_wait_for_hid_datatype` and `history_panel_wait_for_hid_dbkey` poll an item's panel field until it equals the expected value. The first commit adds the datatype one alone and moves `test_collection_edit.py::test_change_datatype_simple_list` onto it, replacing an inline copy of the same wait.
- `click_history_option_tool_references` opens the page and waits for the references. The new `citations` component has the APA/BibTeX tabs and the references.
- All three tests use `@managed_history`, so they get a fresh history even when the test user is shared across runs.

</details>

## Risks

Risks are minimal - this is test-only coverage plus `data-description` attributes, so it doesn't lock Galaxy into anything hard to change (a two-way door). The new helpers do become part of the published `galaxy.selenium` package, as every `NavigatesGalaxy` helper does.

## Context

The Change data type and Export Tool References tests come from 🌿 [`galaxy_ui_driver`](https://github.com/jmchilton/galaxy/tree/galaxy_ui_driver), which uses them to change data types and export tool references when driving Galaxy from scripts.

Alternative kept on 🌿 [`selenium_history_datatype_citations_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/selenium_history_datatype_citations_alt_original_scope) - without Change Database/Build, and Change data type gets its own modal component and helper instead of the shared `operation_modal`/`history_panel_change_selected`.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep scope: both single-value Selection modals and both references tabs are covered, and every remaining candidate is a <code>dev</code> refactor or a different pattern.</summary>

- A first evaluation recommended adding Change Database/Build; this branch was re-scoped to add it on the shared helper.
- Bulk add/remove tags use a different modal (`StatelessTags`), so they don't reuse `operation_modal` and are better as their own Selection-menu PR. Hide/delete/purge have no modal and already have API coverage.
- The dbkey modal has no `:ok-disabled` like the datatype modal, but that's not a bug: its value starts at and resets to `?`, so OK always sends a valid build.
- A history citations API test is the closest call. The E2E test already drives that endpoint end to end, so it stays a follow-up.
- Deferred to `dev`: having `assert_item_extension`/`assert_item_dbkey_displayed_as` delegate to the new waiters, removing the dead `history_panel_multi_operation_action_click`, and deduping private `_wait_for_and_select` copies in two collection test files.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural problems; the shared <code>operation_modal</code>/<code>history_panel_change_selected</code> pair holds up.</summary>

- The modal's naming contract (`"<menu item data-description> modal"`) is local: menu items and modals live in the same SFC, and the `navigation.yml` comment documents it.
- Rejected: merging the two waiters into one field-parameterized helper (a thin wrapper over a string) and merging the two tests into one parameterized body (what differs reads better in two tests).
- Follow-ups for `dev`: the waiters duplicate the one-shot `assert_item_*` asserts, `.g-modal-confirm-buttons button:last-child` is repeated across components, and `history_panel_multi_operation_action_click` is dead.

</details>

### ✅ Second Frontier Model Review

<details><summary>One finding, confirmed and fixed: the Selection tests now use <code>@managed_history</code>.</summary>

- The tests assert on hids 1-3 of the current history. With a shared test user (`GALAXY_TEST_SELENIUM_USER_EMAIL`), earlier datasets take those hids and a rerun fails the dbkey test's starting check.
- `@managed_history` gives each test a fresh history. Both tests were rerun green under Playwright and Selenium.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>The tests sit at the right layer and can't pass if the operation hits every item or none.</summary>

- Bulk change of dbkey and datatype already has API tests. The E2E tests cover what those don't: the Selection menu, the modals and the panel refresh.
- Each Selection test checks the unselected hid 3 is unchanged; the dbkey test also checks the starting value.
- The references test's expectations come from the history citations and configuration APIs, not hardcoded counts.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>One refactor leads the branch: <code>history_panel_wait_for_hid_datatype</code>, used by the existing <code>test_change_datatype_simple_list</code>.</summary>

- `bfdb81e99e4` applies to `release_26.2` on its own (+5/−3) and passes under Playwright and Selenium.
- The other new helpers have no callers on the base, so they stay with the tests that use them.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Users see nothing new. In the tests, waits time out naming what they waited for (`hid 1 datatype to be [tabular]`, or the modal's/references' selector), and API asserts print the item's details or the rendered references.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. The tests check results through the API, including the unselected item, and take expected references from the API rather than hardcoding them.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. The helper refactor of the existing `test_change_datatype_simple_list` leads; the rest is new coverage.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- These are baseline tests of existing 26.2 behavior; nothing is broken, so there is no red to show.
- Locally, `test_change_datatype_of_selected_items`, `test_change_dbkey_of_selected_items`, `test_export_tool_references` and `test_collection_edit.py::test_change_datatype_simple_list` pass under Playwright (4/4) and Selenium (4/4).

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
