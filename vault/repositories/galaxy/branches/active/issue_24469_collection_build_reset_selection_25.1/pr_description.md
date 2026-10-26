Fix 🎯 #24469 — leave history selection mode when building a collection from selected datasets.

After Auto/Advanced Build List, the history panel can retain the old dataset selection even though those datasets are now hidden inside the new collection. The result is a stale selection count and checkboxes on the remaining history items.

| Before                                                                                                             | After                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| ![After building a list, selection mode remains with “2 of 1 selected”](https://raw.githubusercontent.com/jmchilton/galaxy/63a19b1a86ca44553ab84b3b798bf3afe069e28f/screenshots/02_before_fix_after_build.png) | ![After building a list, the history panel has left selection mode](https://raw.githubusercontent.com/jmchilton/galaxy/63a19b1a86ca44553ab84b3b798bf3afe069e28f/screenshots/03_after_fix_after_build.png) |

***For Auto/Advanced Build List, selection clears when the wizard opens, so cancelling the wizard also leaves selection mode off.*** The selected datasets are handed to the builder before selection clears. The Build Dataset List modal used for an all-in-query selection clears selection when creation succeeds.

***This changes selection controls in the history panel; it preserves the datasets passed to the collection builder.***

## Risks

This is a reversible UI change with no API or stored-data changes. The main tradeoff is losing the history selection when cancelling Auto/Advanced Build List.

<details><summary>Risk Review Advice</summary>

Check that clearing on wizard entry is the desired interaction, including cancellation. Clearing only after a successful wizard build would require communication back to the history panel across routes; this release-branch fix uses the existing selection-mode reset.

</details>

## Context

Targets `release_25.1`. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the fix focused on the wizard and all-in-query modal entry points.</summary>

Restoring the modal handler alone would miss the issue's Auto/Advanced Build List reproduction. Clearing only on successful wizard creation requires broader cross-route plumbing; the cancellation tradeoff is stated above.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Retained behavioral coverage and removed a redundant wizard unit test.</summary>

The leading baseline commit protects selection handoff and navigation. A modal unit test verifies the selection-mode event; existing Auto and Advanced Selenium tests now assert that selection controls disappear after creation. The regression assertions failed without the fix during hardening; the full collection-builder Selenium file passed all eight tests.

</details>

### ✅ Second Frontier Model Review

<details><summary>Static review reported no findings.</summary>

Reviewed the selection component and its history, builder-store, wizard and Selenium interactions during hardening. Tests were verified separately.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>No independent baseline refactor was warranted.</summary>

The production change adds selection-mode resets to the two relevant paths. The new selectors and test helper exist to check the resulting UI behavior.

</details>

## John's Checklist

- [x] Did a human read every test and every comment?
- [x] What does the user see when it fails? Stale selection controls and counts after building a collection, as shown above.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes: handoff/navigation and the modal event contract, with Selenium checking the visible result.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes.
- [x] Are the comments free of excess archeology? Yes; no comments added.
- [x] If comments contain some description of previous implementation, bugs, etc. — what purpose do they serve? N/A.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Coverage</summary>

`SelectionOperations.test.js` covers selected-dataset handoff and the all-in-query modal callback. `test_collection_builders.py` checks selection controls after Auto Build List and Advanced Build List.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
