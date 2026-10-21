Add the missing browser test for inserting two subworkflows from the workflow editor's Workflows panel, and fix the test helper that couldn't do it.

```text
workflow_editor_add_subworkflow("first")
  click Workflows activity        → panel opens
  type "first", insert            → node "first" added, panel stays open
workflow_editor_add_subworkflow("second")
  click Workflows activity        → panel CLOSES (the button toggles)
  wait for the panel's list       → TimeoutError
```

No test inserted a second workflow. `test_editor_embed_workflow` inserts one, so the helper's unconditional click on the activity button never toggled the panel shut, and nothing noticed it also typed onto whatever the search box already held. ***This PR changes no Galaxy behavior: the panel staying open after an insert is the intended UX for adding several workflows, and `navigation.yml` only gains test selectors. It targets `release_26.2` and is labeled a bug because these helpers drive the editor for 26.2 release QA, and the gap is in the release's test coverage and helpers, not in the editor.***

`test_editor_embed_two_workflows` inserts two different workflows into a parent, saves, and checks through the API that the saved workflow has exactly those two subworkflow steps. With `navigates_galaxy.py` reverted to `release_26.2`, it fails on the second insert: the panel is closed and the wait for `.workflow-scroll-list` times out.

- **Fix:** `workflow_editor_search_for_workflow` clicks the Workflows activity only when the panel is absent, and clears the search before typing. Without `clear()` the second search holds both names and matches nothing. The test still passed 3 of 3 times on Playwright without it, but with a 2s pause before the lookup it fails with "…titled [second]". So `clear()` removes a race rather than being independently red.
- **Refactor, its own leading commit:** the add-subworkflow and add-steps helpers click the action inside the card titled exactly NAME, instead of the first insert/copy action in the panel after a 1s sleep. ***It rides along because the new test needs it to be reliable: the panel's search is debounced 800ms and then fetches, and an instrumented Selenium run took about 1.6s per insert before the list filtered, so the 1s sleep raced it and the first card could be the wrong workflow once a second one is in play.*** The existing callers (`setup_subworkflow`, `test_editor_insert_steps`, `test_conditional_subworkflow_step`) pass at the refactor commit or at HEAD.

<details><summary>Helper changes in detail</summary>

- `navigation.yml` gains `workflow_editor.workflow_activity_panel`, `workflow_activity_search` and `workflow_activity_list`, replacing the raw `.activity-panel input` / `.workflow-scroll-list` strings.
- `_workflow_editor_panel_card_titled` lists the panel's cards and returns the one whose title equals NAME. An exact match is the right card whether or not the debounced search has applied, so there is no "wait for the list to filter" step. A substring wait would pass on a stale list (`child extended` while searching `child`), and the panel's search also matches tags and owners, so not every result's title contains the search text.
- The lookup and click run inside `retry_call_during_transitions`, because cards re-render while the search reloads them.
- The post-open sleep becomes a wait for the search input; `add_subworkflow` waits for the new node to be visible instead of present-then-sleep. `add_steps` keeps its sleep: copied steps keep their own labels, so there's no single node to wait on.
- `clear_tooltips` now hovers the search input. Without the sleep, hovering the list's center could land on a card's "Last updated" badge before the list loaded and wait on its tooltip.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It only changes a test and test helpers.

## Context

Part of 🌿[`galaxy_ui_driver`](https://github.com/jmchilton/galaxy/tree/galaxy_ui_driver), used to drive the editor for 26.2 release QA; this is one of the helper fixes it carries, landed with the test that needs it.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Kept as built: the fix, the test, and the exact-title refactor the test needs.</summary>

- Checked every other activity-panel helper for the same toggle bug. The Inputs panel and toolbox helpers already guard on the panel being absent; the rest are clicked once, or after `home()`.
- Declined: a shared "open editor activity panel" helper (only two simple sites share the pattern), dropping the refactor (the test would race the debounce), and a client change to close the panel after an insert (staying open is intended).
- Left for `dev`: sharing the card-by-title lookup with the workflow list's helpers, nesting the panel selectors in `navigation.yml`, removing the unused `workflow_editor_click_option(s)`.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Dropped a redundant stale-element catch; nothing else needed changing.</summary>

- The card lookup caught stale elements itself, inside a call already wrapped in `retry_call_during_transitions`, which treats them as transitions. The catch is gone.
- Kept: the exact-title lookup with no fallback, `workflow_editor_search_for_workflow` staying public, and `add_steps`' sleep.
- Checked: a missing card fails after one wait, not after re-waiting on every retry, since a timeout isn't treated as a transition.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Strengthened the final assertion; red without either half of the fix.</summary>

- The assertion compared a set of subworkflow names, so inserting the first child twice would pass. It now compares sorted lists.
- Red with the helper reverted to base (panel closes). Removing only `search.clear()` was red against the earlier first-card helper; with the exact-title lookup it's a race (see above).
- API setup with random names, UI only for the editor interaction.

</details>

### ✅ Second Frontier Model Review

<details><summary>Codex raised two problems with an earlier "wait until the list filters" version; the exact-title lookup replaced it.</summary>

- A substring wait could release on the previous search's results and insert the wrong workflow.
- Results that match by tag or owner would never satisfy an all-titles-contain-NAME wait.
- Matching the card by exact title answers both.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Split the exact-title refactor out ahead of the 5-line fix.</summary>

- The refactor commit leaves the base bug in place; existing callers pass there and the new test still fails there.
- The fix commit is the panel guard, its selector and `search.clear()`.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? A timeout naming the step, e.g. "Workflows panel with a workflow titled [NAME]", or pytest's diff of the saved subworkflow names.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A. No unit tests; the E2E test checks the saved workflow through the API.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. The refactor leads; the test can't precede the fix it needs.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? None; only test helpers change.
- [x] Who hits this in practice and what is the evidence? Test authors and the `galaxy_ui_driver` 26.2 QA driver, whenever they insert more than one workflow from the editor panel.
- [x] Were simpler or existing approaches considered? Yes: the bare fix without the refactor races the debounced search, and a client change would alter intended UX in a release.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `lib/galaxy_test/selenium/test_workflow_editor.py::TestWorkflowEditor::test_editor_embed_two_workflows`: passes on Playwright and Selenium.
- Existing helper callers `test_editor_embed_workflow`, `test_editor_insert_steps` and `test_conditional_subworkflow_step`: pass on Playwright.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
