Make the E2E helpers that open, run, bookmark and delete a workflow by name act on the workflow titled exactly that name, and test each one against a newer workflow whose title it prefixes.

***This is test infrastructure only: the one client change is a `navigation.yml` selector the new test waits on. Galaxy's workflow list behaves the same.***

On `release_26.2` each `NavigatesGalaxy` by-name helper searches the workflow list for NAME and clicks the first hit. The search matches substrings and the list is newest first, so once `NAME (copy)` exists the helpers act on the copy. Red runs of the new tests with the old helpers, against `NAME` and a newer `NAME (copy)` (bookmark and delete under Playwright):

| Helper | `release_26.2` | This PR |
| --- | --- | --- |
| `workflow_index_open_with_name(NAME)` | opens `NAME (copy)` in the editor 😬 | opens `NAME` ✅ |
| `workflow_run_with_name(NAME)` | opens the run form of the copy's id 😬 | opens `NAME`'s ✅ |
| `workflow_bookmark_by_name(NAME)` | bookmarks the copy 😬 | bookmarks `NAME` ✅ |
| `workflow_delete_by_name(NAME)` | deletes the copy 😬 | deletes `NAME` ✅ |

Nothing caught this because the existing check, `assert_wf_name_is`, uses `in`, and `NAME` is in `NAME (copy)`. The new tests compare the title, URL id and API ids exactly.

***Delete needed more than a better match.*** Every workflow card renders its own hidden dropdown menu, so the global `delete_button` selector matches every card's item and clicks the first. Delete now takes its menu item from the matched card.

***The Playwright adapter's `find_elements` now takes one snapshot, like Selenium's; it returns the same elements whenever the list is stable.*** The new lookup polls it while the search re-renders the list, where the old count-then-fetch could stall 30s per vanished element.

***It targets `release_26.2` because the scripts driving 26.2 QA use these helpers; no existing Galaxy test trips the bug, so it lands as missing coverage.***

<details><summary>How the helpers pick a card</summary>

Open, run, bookmark and delete share `_workflow_card_action(name, target)`. It opens the list, searches for NAME, waits until every listed title contains NAME (ignoring case, like the server's `ilike` search), then clicks `target` in the card titled exactly NAME. If no title matches exactly but only one card is left, it uses that card: `workflow_create_new` stores an "Unnamed Workflow"-prefixed title, and `test_edit_name` relies on the contains match. The lookup and click retry during transitions, because cards stay mounted under a loading overlay while the search reloads them.

The wait matters because the search input is debounced: right after typing, the list still shows unfiltered workflows.

Known limits. In both cases the helper times out naming the workflow instead of clicking the wrong one:
- a search hit that matches NAME only by tag, owner or annotation keeps the wait from settling;
- an exact title pushed to page 2 by 24 or more newer matches is never seen.

No caller reaches either case; the tests use random names.

</details>

<details><summary>Playwright <code>find_elements</code> takes one snapshot</summary>

The Playwright adapter's `find_elements` took `locator.count()` and then fetched `nth(i).element_handle()` for each index. If the list shrank in between, each missing index waited out Playwright's 30s default timeout. The new card lookup polls `find_elements` exactly while the search re-renders the list, so it now takes one `element_handles()` snapshot, which is what Selenium's `find_elements` does.

The race was reproduced in a standalone Playwright script. The existing `test_has_driver.py` contract tests (Selenium, Playwright, proxy) pass.

</details>

## Risks

Risks are minimal - test helpers and one Playwright adapter method, nothing that locks Galaxy into a hard-to-change choice (a two-way door).

## Context

Part of 🌿 [`galaxy_ui_driver`](https://github.com/jmchilton/galaxy/tree/galaxy_ui_driver), used to open, run, bookmark and delete workflows by name when driving Galaxy from scripts. Alternative kept on 🌿 [`workflow_open_exact_title_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/workflow_open_exact_title_alt_original_scope) - fixes only open and run, without bookmark, delete or the Playwright `find_elements` change.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep all four by-name helpers on one title-matched lookup, with the Playwright <code>find_elements</code> fix in the same PR.</summary>

- The first evaluation widened the scope from open/run to bookmark/delete, which found the wrong-workflow delete.
- Splitting out the 3-line `find_elements` fix was considered and not recommended: the new lookup polls through exactly the race it removes, and it touches no file the sibling branches touch.
- The same race in `find_elements_by_selector` and `assert_disabled` is left as a follow-up; nothing here calls them.
- Exact-only matching was rejected: `workflow_create_new` callers and `test_edit_name` rely on the contains match.
- Working around colons in search terms was left out: titles like `GTN Training: X` open fine on 26.2.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural regression; one single-use wrapper inlined.</summary>

- `_workflow_card_titled`, a pure wrapper with a name nearly identical to `_workflow_card_named`, was folded back into `_workflow_card_action`.
- Kept: the pagination and tag-match limits (they fail loudly), the canvas wait in the test rather than in the helper (it would touch ~15 callers), and `card.find_element(*target.element_locator)` inline. A Target-aware scoped finder is a reasonable dev-side follow-up.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Both E2E tests kept; a history-flavored comment removed; no test added for the <code>find_elements</code> change.</summary>

- Each test is red on the old helpers at its own assertion, and each half of the bookmark/delete test is red on its own.
- The explicit `workflow_index_open()` at the start of the bookmark/delete test is redundant for the new helpers but keeps the red check honest: the old bookmark/delete helpers don't navigate, so without it they wait on the home page instead of failing at the assertion. Every other test in the file starts the same way.
- A red test for the `find_elements` race would need DOM churn timed into one call (flaky) or a patched `Locator` (tests the implementation). `test_has_driver.py` covers the contract on all three backends.

</details>

### ✅ Second Frontier Model Review

<details><summary>Two findings: the case-sensitive wait is fixed; pagination and tag matches stay as documented limits.</summary>

- The wait compared titles case-sensitively while the server's search uses `ilike`, so `NAME` beside `name (copy)` timed out. Now case-insensitive.
- A tag/owner/annotation-only match, or an exact title past the first page, makes the helper time out rather than misclick. No caller reaches either.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>The <code>_workflow_card_action</code> extraction, a dead-assignment cleanup and the driver fix lead the branch; the fix and test commits stack on them.</summary>

1. Extract `_workflow_card_action` from the open/run-by-name helpers (no behaviour change).
2. Drop a dead `name = self.workflow_index_open_with_name(name)` in the undo/redo test (it rebound `name` to `None`).
3. Snapshot Playwright `find_elements`.
4. Open/run the card titled NAME, then its test.
5. Bookmark/delete the card titled NAME, then its test.

Routing bookmark/delete through the helper in the base wasn't behaviour-preserving (it adds navigation), so it stays with its fix.

</details>

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? A timeout naming the workflow, e.g. `search results with a workflow titled or uniquely containing [NAME]`, instead of a click on the wrong workflow; a wrong pick in the tests shows as an id or URL mismatch.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A. No unit tests added; the E2E tests check the editor title, URL ids and API state.
- [x] Are baseline tests in their own leading commits (if applicable)? N/A. The refactor and driver fix lead; each fix is followed by its red-to-green test.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? The `find_elements` comment names the count-then-nth stall so nobody reintroduces it.
- [x] Which existing workflows change behavior (if any)? None; test helpers only.
- [x] Who hits this in practice and what is the evidence? Tests and scripts that create workflows whose titles prefix each other; the red runs above.
- [x] Were simpler or existing approaches considered? Yes. Exact-only matching breaks callers that rely on the contains match; see Scope Evaluation.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `test_workflow_editor.py::TestWorkflowEditor::test_open_and_run_workflow_by_exact_title`: with all helper fixes reverted the editor opens `NAME (copy)`; with only the run fix reverted the run form opens the copy's id. Passes under Playwright and Selenium.
- `test_workflow_management.py::TestWorkflowManagement::test_workflow_bookmark_and_delete_by_exact_title`: under Playwright with the old helpers, fails at `bookmarked_ids == [workflow_id]` (the copy was bookmarked); with only the old delete, fails at `remaining_ids == [copy_id]` (the copy was deleted). Passes under Playwright and Selenium.
- `test_workflow_delete`, `test_workflow_bookmark_filtering` and `test_edit_name` pass under both backends; the undo/redo tests, `test_parameter_regex_validation` and `test_simple_execution` pass under Playwright.
- `test/unit/selenium/test_has_driver.py` and `test_smart_components.py` pass.
- Local runs were on `release_26.2` before its latest rebase (clean, no conflicts); CI covers the rebased head.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
