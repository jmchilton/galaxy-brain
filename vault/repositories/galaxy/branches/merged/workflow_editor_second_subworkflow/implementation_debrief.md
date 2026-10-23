# Implementation debrief — workflow_editor_second_subworkflow

STATUS: READY. No open decisions. Base `release_26.2` @ `65132d40dac`; head `ad783d6d3e9`; +55/−15 across 3 files. Not rebased onto the newer `origin/release_26.2`.

## Final branch

1. `d86b65c6487` Target editor Workflows panel cards by exact title. A refactor that changes no behaviour for a single insert:
   - selectors for the panel's search box and list;
   - the add-steps and add-subworkflow helpers click the action inside the card whose title is exactly NAME;
   - sleeps replaced by waits for the search input and the new node;
   - the tooltip hover moved onto the search input.
2. `fb6fc797919` Insert a second subworkflow from the editor's Workflows panel. This is the fix (7d):
   - click the activity button only when the panel is absent, since the button toggles the panel;
   - `search.clear()` before typing.
3. `ad783d6d3e9` Test inserting two subworkflows from the editor's Workflows panel (`test_editor_embed_two_workflows`).

## Choices

- **Exact-title card lookup, with no fallback.**
  - Polish first replaced the 1s sleep with a wait for "every title contains NAME". Codex then showed two problems with that:
    - A stale list could still pass the wait (`child extended` while searching for `child`).
    - Results that match only by tag or owner blocked the wait forever.
  - Exact-title matching avoids both. It is also correct before the 800ms debounced search applies.
  - All three callers pass the stored title.
- **Separate from `workflow_open_exact_title`.** That sibling has a lookup of the same shape but keeps a fallback on purpose. A shared helper would couple the two merges, so it is listed as a dev follow-up.

## Hardening path

Every step in the hardening process ran:
- **Challenge:** the final assert compares sorted lists instead of sets, so it catches a duplicate insert.
- **Polish:** new selectors, waits instead of sleeps, and the tooltip hover fix that Selenium needed.
- **Codex:** two P2 findings, both fixed with the exact-title lookup.
- **Thermo:** dropped a redundant stale-element catch.
- **Baseline:** split the refactor out ahead of the fix; the tree is unchanged.
- **Scope:** keep as is.
- **Screenshots:** not relevant, since the only client change is test selectors in `navigation.yml`.

## Tests

- **Red check.** At the refactor commit, without the fix, the new test fails: the second insert closes the panel. Reverting only `clear()` also fails, on a stale search.
- **Final code.**
  - `test_editor_embed_two_workflows` passes on Playwright and Selenium.
  - `test_editor_embed_workflow` and `test_editor_insert_steps` pass on Playwright, including at the refactor commit.
- CI not yet observed.

## Notes

- **`galaxy_ui_driver` restack.** Dropping 7d from `galaxy_ui_driver` after this merges is no longer a clean drop, because the helper was rewritten. It needs a restack.

## Deferred (dev)

- A shared card-by-title helper with `workflow_open_exact_title`.
- Nest the Workflows panel selectors in `navigation.yml`.
- Remove the dead `workflow_editor_click_option(s)`.
- The sleep in `setup_subworkflow`.
