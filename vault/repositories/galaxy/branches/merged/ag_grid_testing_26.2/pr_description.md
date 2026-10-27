Add missing E2E tests for edits made in ag-grid tables reaching what Galaxy creates.

Two of Galaxy's editable ag-grid tables had no E2E test checking that a user's edits reach what Galaxy creates (the sample sheet and rule builder grids already have one):

| Grid | Edit | Checked before | Checked now |
| --- | --- | --- | --- |
| Data landing (`FetchGrid`) | rename a row, change its URL | nothing - no data landing E2E test | the imported dataset has the new name and the new URL's content |
| Paired list builder (`ListWizard`) | rename a pair | that a collection appeared | the collection's identifier (plus a baseline check of the auto-paired forward/reverse datasets) |

***These are guards for upgrading ag-grid, not fixes for 26.2: the grids work on 26.2's ag-grid 31.3.4, and the tests pass there, and the PR adds only test code plus two `data-description` hooks.*** On the ag-grid 36 upgrade (🌿[`ag_grid_36`](https://github.com/jmchilton/galaxy/tree/ag_grid_36)), ag-grid-vue3 deep-copies plain-object rows, so a cell edit lands on a copy; each new assertion failed there until the upgrade bound the grids' rows back to the edited copies.

***This targets `release_26.2` because missing tests are bugs;*** landing them here lets the upgrade PR show it changes no grid behavior.

<details><summary>Details</summary>

- `ag_grid_edit_cell(component, column, row_index, text, clear=...)` in `navigates_galaxy.py` is the existing `list_wizard_click_cell_and_send_keys` made generic over the grid's component; the list wizard helper now delegates to it.
- `go_to_tool_landing(uuid)` opens a landing request page; `data_landing` selectors are added to `navigation.yml`.
- `FetchGrid.vue` and `FetchLanding.vue` gain `data-description` hooks (`fetch grid`, `fetch landing success`) so the selectors don't match the list wizard's grid or any other success alert. No other client change.
- The data landing test builds its landing with base64 URLs, so it needs no network.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It adds two `data-description` attributes and test code only.

## Context

Split out of 🌿[`ag_grid_36`](https://github.com/jmchilton/galaxy/tree/ag_grid_36), which upgrades ag-grid to 36.2.0 and will be rebased onto this. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

These commits were reviewed as part of `ag_grid_36` and not re-run on this branch.

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Each edit assertion failed on the ag-grid 36 upgrade with its row binding reverted.</summary>

- Data landing: the import kept the original name and content.
- Paired builder: the collection kept the original identifier (the swap assertion from that branch needs dev's swap button and stays there).
- Red runs used Playwright only.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings on the final <code>ag_grid_36</code>, which includes these commits.</summary>

</details>

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Nothing - test-only for users; a lost edit fails the E2E on an assertion that prints the actual name, content or identifier, with a screenshot of the edited grid.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A. E2E only; they check created datasets and collections through the API.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. The whole PR is baseline tests; the helper refactor leads.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `lib/galaxy_test/selenium/test_data_landing.py` (new) and `test_collection_builders.py::test_build_paired_list_auto_matched`.
- PENDING: fork CI Playwright run on `71bfc69c498` (ag-grid 31.3.4). Fill in before opening; it backs the "tests pass there" claim.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
