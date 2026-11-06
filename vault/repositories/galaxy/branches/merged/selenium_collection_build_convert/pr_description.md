Disable Convert Collection until a converter is picked, and add browser tests for building lists and converting a collection's datatype.

![Edit Collection Attributes, Convert tab, nothing picked: Convert Collection is disabled](screenshots/collection_edit_convert_tab.png)

On `release_26.2` that button is never disabled. `SuitableConvertersTab.vue` has had `:disabled="selectedConverter == {}"` since it was added in 2021, and comparing against a fresh `{}` is always false. Clicking it with nothing picked, or a second time after a conversion, posts to `/api/tools/undefined/convert`. The new convert test asserts the button is disabled in both states. Its before-pick check fails without the one-line fix.

| Flow | E2E coverage on `release_26.2` | This PR |
| --- | --- | --- |
| Auto Build List with "Remove file extensions?" off | none | `test_build_list_keep_extensions`: identifiers keep `.fasta` |
| Advanced Build List > Flat List, rename an element | none | `test_build_list_advanced_rename_element`: the renamed identifier is in the built list |
| Edit Collection Attributes > Convert | none | `test_convert_datatype_simple_list`: new collection, same identifiers, converter output checked, source unchanged |
| Convert Collection with nothing picked | enabled ❌ | disabled ✅ |

***This adds the browser coverage 26.2 was missing, plus a fix for the one bug that coverage found. The only product change is the `:disabled` line; nothing else in the UI behaves differently.***

***It targets `release_26.2` because the Convert Collection fix is a bug fix; the tests that pin it come along and merge forward to `dev`.***

***Not fixed here: how `CollectionEditView` reports a failed conversion. The fix stops the request that can't succeed; a real conversion failure is handled as before.***

<details><summary>What each commit does</summary>

1. **Refactor existing tests.** `history_panel_collection_edit(hid)` clicks that collection's pencil instead of the panel's first `.edit-btn`, and the change-datatype steps move into `NavigatesGalaxy.collection_edit_change_datatype`. The dbkey test now explicitly reopens the copy (hid 5) it verifies, which the old selector did only by accident of ordering. `history_panel.collection_menu_edit_attributes` is removed; nothing else used it.
2. **Keep extensions.** Auto Build List with the switch off keeps `sample1.fasta`/`sample2.fasta`. Adds `list_wizard.remove_extensions` and `collection_builder_toggle_remove_extensions`.
3. **Convert.** The first browser test of collection conversion. Adds the Convert tab targets, `collection_edit_convert` and `history_wait_for_new_collection`.
4. **Advanced rename.** Advanced Build List > Flat List renames element 1 to `first`. Adds `list_wizard.element_name`/`element_name_input` and `collection_builder_rename_element`.
5. **Fix.** `:disabled="!selectedConverter?.tool_id"`, which covers the initial `{}`, a multiselect deselect to `null`, and the reset after a click. The convert test asserts disabled before a converter is picked and after the converted collection is `ok`.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- `history_panel.collection_menu_edit_attributes` is removed from `navigation.yml`. It was released, so outside code driving Galaxy could reference it; in Galaxy, only the test this PR rewrites did.
- `NavigatesGalaxy` gains six helpers on a release branch: `history_panel_collection_edit`, `collection_edit_change_datatype`, `collection_edit_convert`, `history_wait_for_new_collection`, `collection_builder_toggle_remove_extensions` and `collection_builder_rename_element`.

</details>

## Context

Part of 🌿 [`galaxy_ui_driver`](https://github.com/jmchilton/galaxy/tree/galaxy_ui_driver), used to build and convert collections when driving Galaxy from scripts. Alternative kept on 🌿 [`selenium_collection_build_convert_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/selenium_collection_build_convert_alt_original_scope) - test-only, without the Convert Collection fix.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep as implemented: the coverage plus the Convert Collection fix the convert test turned up.</summary>

- A first evaluation recommended adding the fix to the otherwise test-only branch; the second kept that scope.
- Strongest left-out candidate: resetting the edit-view tabs when the route switches collections, which can leave the previous collection's converter selected. It predates this PR, isn't reproduced and needs a new switch-collections test, so it's a follow-up.
- Also left out: collapsing the converter's `null`/`{}` empty values (a visible multiselect change, better with a `<script setup>` conversion), two `galaxy_ui_driver` collection tests that need dev-only tool form helpers, and splitting `navigates_galaxy.py`.
- Splitting into a builder PR and an edit PR was weighed; the fix's assertions live in the convert test, so it can't ship ahead of it.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>A first round promoted <code>history_wait_for_new_collection</code> to <code>NavigatesGalaxy</code>; the second found nothing to restructure in the fix.</summary>

- Not acted on: the converter's two empty values and the untyped `clickedConvert(selectedConverter: any)`, both older than this PR and better done with a TypeScript conversion of the tab.
- `navigates_galaxy.py` is 3441 lines (+47 here); splitting it is a separate refactor for `dev`.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>One strengthening: the convert test also asserts Convert is disabled again after a conversion.</summary>

- The before-pick `assert_disabled()` fails against the old `selectedConverter == {}`.
- The after-conversion assertion pins the reset to `{}`. It's stable: the tab stays mounted, so no remount can reset the state for it.
- Each coverage test would fail on a plausible regression: a no-op extension switch gives `sample1`/`sample2`, and a dropped or misplaced rename gives `[sample1, sample2]` or `[first, sample1]`.
- No Vitest: the browser test covers both disabled states, so a mount test would duplicate it.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings on the final branch; an earlier round's finding (the dbkey test verifying the wrong collection) was fixed.</summary>

- The old first-`.edit-btn` selector made the dbkey test check the copy only by accident. Commit 1 opens hid 5 explicitly.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Every change to existing code is in the leading refactor commit; the three test commits only add code.</summary>

- The fix commit has no refactoring: one `:disabled` line plus two assertions that depend on it.

</details>

## John's Checklist

- [x] Did a human read every test and every comment?
- [x] What does the user see when it fails? Convert Collection stays greyed out until a converter is picked. A failing test leaves the framework's screenshot and DOM dump.
  <details><summary>Not changed</summary>

  A real conversion failure still shows its error alongside "Conversion started successfully.", because `clickedConvert` swallows the rejection. That predates this PR; the fix only stops the request that can't succeed.

  </details>
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. The browser tests check results through the API: element identifiers, `file_ext` and the converted content.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. The convert test lands before the fix. The fix commit adds the `assert_disabled()` checks, and the before-pick check is red without the fix.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `test_collection_edit.py` (3, including the new convert test) and the two new `test_collection_builders.py` tests pass under Playwright (headless) and Selenium.
- With the client built without the fix, the convert test fails at the before-pick `assert_disabled()`.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
