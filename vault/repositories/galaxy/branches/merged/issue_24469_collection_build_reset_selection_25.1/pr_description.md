Fix 🎯 #24469 and 🎯 #24601 — leave history selection mode after building a collection from selected datasets, and keep the selection if the builder is left without creating one.

After Auto/Advanced Build List, the history panel can retain the old dataset selection even though those datasets are now hidden inside the new collection. The result is a stale selection count and checkboxes on the remaining history items.

| Before                                                                                                             | After                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| ![After building a list, selection mode remains with “2 of 1 selected”](https://raw.githubusercontent.com/jmchilton/galaxy/63a19b1a86ca44553ab84b3b798bf3afe069e28f/screenshots/02_before_fix_after_build.png) | ![After building a list, the history panel has left selection mode](https://raw.githubusercontent.com/jmchilton/galaxy/63a19b1a86ca44553ab84b3b798bf3afe069e28f/screenshots/03_after_fix_after_build.png) |

***For Auto/Advanced Build List, selection clears only when the wizard creates a collection; leaving the wizard without creating keeps the selection.*** The wizard bumps a counter on the existing builder selection store (`useCollectionBuilderItemSelection`) on success, and `SelectionOperations` exits selection mode when it changes. The Build Dataset List modal used for an all-in-query selection already cleared selection on its `created-collection` event; both paths now behave the same.

***This changes selection controls in the history panel; it preserves the datasets passed to the collection builder.***

## Risks

This is a reversible UI change with no API or stored-data changes. The success signal goes through a pinia store shared across routes, so any history panel showing selection mode exits it when a wizard creates a collection.

<details><summary>Risk Review Advice</summary>

Check that clearing on success (not on wizard entry) is the desired interaction. An earlier revision cleared on entry and lost the selection on cancel (raised in review, tracked as #24601); this revision replaces that with a store counter.

</details>

## Context

Targets `release_25.1`. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the fix focused on the wizard and all-in-query modal entry points.</summary>

Restoring the modal handler alone would miss the issue's Auto/Advanced Build List reproduction. Clearing only on successful wizard creation needed a small cross-route signal; it reuses the store that already hands the selection to the wizard, so #24601 is folded in rather than left as a follow-up.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Retained behavioral coverage and removed a redundant wizard unit test.</summary>

The leading baseline commit protects selection handoff and navigation. A modal unit test verifies the selection-mode event; existing Auto and Advanced Selenium tests now assert that selection controls disappear after creation. The regression assertions failed without the fix during hardening; the full collection-builder Selenium file passed all eight tests.

</details>

### ✅ Second Frontier Model Review

<details><summary>Static review reported no findings.</summary>

Reviewed the selection component and its history, builder-store, wizard and Selenium interactions during hardening. Tests were verified separately. The later clear-on-success commit for #24601 was not re-reviewed.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>No independent baseline refactor was warranted.</summary>

The production change adds selection-mode resets to the two relevant paths and a success counter to the existing builder selection store. The new selectors and test helper exist to check the resulting UI behavior.

</details>

## John's Checklist

- [x] Did a human read every test and every comment?
- [x] What does the user see when it fails? Stale selection controls and counts after building a collection, as shown above.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes: handoff/navigation, the wizard-success and modal event contracts, with Selenium checking the visible result.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes.
- [x] Are the comments free of excess archeology? Yes; one-line doc comment on the store counter.
- [x] If comments contain some description of previous implementation, bugs, etc. — what purpose do they serve? N/A.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Coverage</summary>

`SelectionOperations.test.js` covers selected-dataset handoff (selection kept on wizard open), the wizard success signal and the all-in-query modal callback. `test_collection_builders.py` checks selection controls after Auto Build List and Advanced Build List, and that selection survives opening the wizard (`test_build_list_open_keeps_selection`).

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
