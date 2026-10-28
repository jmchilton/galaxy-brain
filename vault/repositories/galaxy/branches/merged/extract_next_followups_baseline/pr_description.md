Refactor ahead of 🌿[`extract_next_followups`](https://github.com/jmchilton/galaxy/tree/extract_next_followups) - fixes notebook-to-workflow extraction bugs before #22860 first ships in 26.2.0.

<details><summary>This shouldn't change Galaxy's behavior - <b><i>this only adds tests and refactoring aimed at making our main PR easier to review</i></b>.</summary>

I'm so sorry to give you more to review but John (the human) has deemed the base branch complex and thinks the quality of the main and more important review will go up if we get these more mechanical changes out of the way ahead of time. 
</details>

<details><summary>The main PR for <a href="https://github.com/jmchilton/galaxy/tree/extract_next_followups">🌿<code>extract_next_followups</code></a> will have the sales pitch for the feature and approach but some details are here.</summary>

- It is open as draft #24225 against `release_26.2` and must merge before 26.2.0, because it renames a pages API route that is new in 26.2.
- Copies of one dataset (in-history, or copied in from another history) become one extraction input, wired to its consumers, on both the notebook and the hid extraction paths.
- Report directives that still name the notebook's own objects are dropped with a warning, and the form locks the star on outputs the report uses.
- It restores 26.1 behavior for labels with quotes, and fixes PDF export of the default report's `invocation_inputs()`/`invocation_outputs()` sections.
- It's large: about +984/−773 outside tests. This PR takes the first seven commits.
</details>

## The Refactorings

- Moving the notebook page + history access check onto `PageManager.get_accessible_notebook` is used by 🌿[`extract_next_followups`](https://github.com/jmchilton/galaxy/tree/extract_next_followups) to gate the summary and `from_page_id` extraction with one check instead of two copies in `PagesService` and `WorkflowsService`, and to hand the checked history to `summary_from_page`.
- Dropping the underscore from `get_original_hda`, `get_original_hdca` and `skip_output_assoc_name` (`workflow/extract.py`) is used by 🌿[`extract_next_followups`](https://github.com/jmchilton/galaxy/tree/extract_next_followups) to group copies by their original across the naming, summary and report modules, which already import them.
- Making `GalaxyInternalMarkdownDirectiveHandler.walk_directives` public and typed is used by 🌿[`extract_next_followups`](https://github.com/jmchilton/galaxy/tree/extract_next_followups) to rewrite report directives from outside the handler class.
- Adding `DatasetPopulator.run_cat1` is used by 🌿[`extract_next_followups`](https://github.com/jmchilton/galaxy/tree/extract_next_followups)'s API and Selenium tests to set up their two-inputs-into-cat1 histories. Here the four copies of that setup delegate to it, with call sites unchanged.

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- `get_accessible_notebook` runs the same three steps both callers ran: an accessible-page check, a 400 for a page without a history, and a history access check. The 400's message for `from_page_id` changes from "Workflow report extraction is only available…" to the summary endpoint's "Workflow extraction is only available…".
- `WorkflowsService` gains a `PageManager` constructor dependency, which the DI container provides.
- `summary_from_page` now takes the checked history instead of reading `page.history`. It's the same row, and its only caller is the pages service.
- The renamed helpers were added in #22860. The only importers are the extraction modules and their unit tests, all updated here.

</details>

<details><summary>Risk Review Advice</summary>

The `PageManager` commit is the one to read. Check that both old call sites map onto `get_accessible_notebook` with the same exceptions in the same order. The first baseline commit pins the two 403 cases (another user's private page; a published page whose history is private) before that commit.

</details>

## Context

Groundwork for 🌿[`extract_next_followups`](https://github.com/jmchilton/galaxy/tree/extract_next_followups) (#24225), the follow-up to 🔀 #22860.

## Process

These baseline tests were written ahead of the main change by [John's Implementation Agent](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_workhorse/AGENTS.md#baseline-tests).

Base branch refactoring and rebasing happens automatically during implementation using [John's Refactor Baseline Process](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

This branch was created during John's normal branch polishing process using the [Decompose Baseline Process](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_branches/DECOMPOSE_BASELINE_CHANGES_AND_POLISH.md)

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Nothing new. The same 400/403 responses are pinned by the baseline tests; one 400 message's wording changes, as described above.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. The baseline API tests assert status codes, that no workflow was created, and how the extracted steps connect.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. The first three commits are tests only.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
- [x] This is a refactoring of components with existing test coverage.

<details><summary>Tests</summary>

- `test_workflow_extraction.py`: `from_page_id` extraction returns 403 for another user's private page and for a published page whose history is private, creating no workflow. A notebook report that fails to rewrite returns 400 and creates no workflow. Hid-path extraction wires a tool to an implicitly converted input.
- The refactored helpers are covered by the existing extraction unit tests (`test/unit/workflows/test_extract_*.py`, `test/unit/app/managers/test_workflow_extraction_summary.py`) and by the notebook extraction API tests in `test_pages_history_attached.py`.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
