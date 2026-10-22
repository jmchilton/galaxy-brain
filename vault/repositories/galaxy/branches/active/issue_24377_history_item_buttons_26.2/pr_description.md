Fix 🎯 #24377 - restore the history item button tooltip checks that have been a no-op since 2022.

`TestHistoryDatasetState._assert_buttons` has returned without checking anything since the legacy history panel went away (399c6e91948, 2022-09), so the dataset state tests pass however the history item buttons look. Nothing exercised the selectors since, and four of the five buttons drifted:

| Button | Selector before | Tooltip expected before | Current UI |
| --- | --- | --- | --- |
| display | `.display-btn` ✅ | View data ❌ | View |
| edit | missing ❌ | Edit attributes ✅ | `.edit-btn`, Edit attributes |
| delete | `.delete-btn` ✅ | Delete ✅ | Delete |
| info | `.params-btn` ❌ | View details ❌ | `.info-btn`, Dataset Details |
| download | `.download-btn` ✅ | Download ❌ | `Download (<size>)` |

This PR fixes the selectors and tooltips, restores the loop, and extends the checks to the discarded and deferred states the tests already set up. ***It changes no user-visible behavior: the only client change is a new class on galaxy-ui `GCollapse`, with no styles attached, so the Tool Shed frontend and other `GCollapse` consumers are unaffected.***

Restoring the hovers exposed a race: the item body is clipped while `GCollapse` animates open, so a hover right after expanding can miss. `GCollapse` now adds `g-collapse-shown` once the open transition ends, and `history_panel_click_item_title(wait=True)` waits for it. ***The wait lives in the shared helper, so every caller that expands an item (about 20 call sites) now gets a settled body, not just this test.*** The class is registered as a galaxy-ui public class, so renaming it fails `publicClasses.test.ts` first.

***This targets `release_26.2` because missing tests are bugs and it was found in 26.2 release testing;*** the same stub is on `release_26.1` and `dev`.

<details><summary>Details</summary>

- Discarded datasets: the edit button's "This dataset is not yet editable." tooltip never shows, because `vGTooltip` skips `aria-disabled` elements. That's a separate UI bug; the test asserts `aria-disabled="true"` instead.
- The dbkey test's `UX_RENDER` and `JOB_COMPLETION` sleeps are replaced by waits on the dbkey dropdown and the updated dbkey text, and the trailing `UX_RENDER` sleep in the download check is dropped (the new helper wait covers it).
- The stale `rerun` tooltip entry is dropped; no test checks that button.
- `schema.ts` gains only the `details_expanded` line; it isn't fully regenerated, to avoid pulling in drift that predates this PR.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). The new helper wait changes timing for every `history_panel_click_item_title(wait=True)` caller; ***The wait returns at once when the body has already settled, so it only adds time where a hover or click could otherwise hit a clipped body;*** only full CI runs every caller.

## Context

Alternative kept on 🌿[`issue_24377_history_item_buttons_26.2_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/issue_24377_history_item_buttons_26.2_alt_original_scope) - test-only, with no client change; it waits out the expand inside this test on `GCollapse`'s inline style and leaves discarded/deferred unchecked. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Re-scoped once to put the settle wait in the shared helper behind a <code>GCollapse</code> marker; round 2 kept that scope.</summary>

- Round 1 replaced a test-local inline-style wait with the galaxy-ui marker plus helper wait, and added discarded/deferred checks.
- Kept out: fixing the disabled edit tooltip (needs a GTooltip-aware framework tooltip helper affecting every tooltip test), an `assert_aria_disabled` helper (two callers), extending the wait to other "details shown" helpers (no caller hits that race), full `schema.ts` regeneration, and the `history_panel_create_new` sleep.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Rewrote three <code>GCollapse</code> vitest cases that passed on base so every case now fails there at its own assertion.</summary>

- Each case reaches a positive state first; the two close cases merged.
- The "shown when mounted open" case moved into the package's `publicClasses.test.ts` registry, with a README table row.
- E2E red without the branch: tooltip assertions fail on the text, `info`/`edit` on their selectors, and the helper wait times out without the marker.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings on the re-scoped branch.</summary>

It read the changed files, `GCollapse` and its consumers (including the Tool Shed frontend), `vGTooltip`, `GButton`, both driver backends, and ran the focused vitest files.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Moved the <code>GCollapse</code> marker and helper wait into their own commits ahead of the fix.</summary>

Both commits are safe on the base alone, and the fix commit no longer adds a test-local wait that a later commit deletes. Final tree is byte-identical to the pre-refactor head.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Nothing - test-only for users; a wrong tooltip or selector fails the E2E at `assert_tooltip_text`, and a `GCollapse` regression fails vitest.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They toggle props and fire `transitionend` on the root and a child, and check the rendered class.
- [x] Are baseline tests in their own leading commits (if applicable)? N/A. The branch restores tests; the `GCollapse` tests ship with the class they cover.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `client/packages/ui/src/components/GCollapse.test.ts` and `publicClasses.test.ts`: 8/8 pass; the 4 new cases fail on base.
- `lib/galaxy_test/selenium/test_history_dataset_state.py`: 4/4 under Playwright and under Selenium.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
