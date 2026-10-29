Run via Claude Opus 5.5 at high effort.

# Polish E2E tests: extraction_hid_copies_pdf_sections_26.1

**Top line:** `test_extract_collection_with_in_history_copy` now asserts the rendered form (one input-collection card listing both the source's and the copy's hids) through two new `workflow_extract` navigation.yml selectors, and screenshots it after the card loads; squashed into the E2E commit, new head `352a092d820` (not pushed).

## Changes

- **navigation.yml** (`workflow_extract`), placed after `tool_card_checkbox_checked`, between lines 26.2 leaves alone:
  - `input_collection_card: '[data-step-type="input_collection"]'`
  - `input_collection_item_by_hid: '[data-step-type="input_collection"] [data-hid="${hid}"]'`
- **Test** (still right after `test_extract_with_copied_inputs`):
  - Keeps the copy response so it has the copy's hid.
  - Waits for an item with each hid (source, copy) inside the input-collection card, then asserts exactly one such card.
  - Screenshot `workflow_extract_collection_with_copy` is taken after those waits. It used to fire inside `extract_workflow_and_download` straight after `navigate_to_workflow_extraction`, which waits only for the always-present form root, so it could catch the loading alert.
  - Then name, submit, `get_workflow_by_name` and the existing workflow-structure asserts (1 step, `list` input). It drops `extract_workflow_and_download` only because that helper navigates and screenshots itself.
- Process checklist:
  - **Selectors:** the test had none of its own. New ones are in navigation.yml.
  - **Shared abstractions:** the new selectors are reusable. No new helper is needed, since the pattern is used once.
  - **Sleeps:** none added in the test.
  - **Screenshots:** present, now of the loaded state.
  - **DOM decoration:** not needed. `data-step-type` (card) and `data-hid` (ContentItem) are already rendered.
  - **Client refactor:** none (26.1 target).

## Why this matters

The old test checked only the extracted workflow, while its docstring claimed "share one input card". Now the UI claim itself is pinned. On base, the card lists the source HDCA once per copy and never the copy's hid, so the copy-hid wait fails there, ahead of the 400 the old test relied on. That's red by reasoning; not run on base.

## Not acted on

- **Sleeps in pre-existing helpers:** `extract_workflow_submit` (`UX_TRANSITION`, then an immediate API lookup) and `navigate_to_workflow_extraction`. They're base code, and 26.2 moves them into `navigates_galaxy`, so editing them on 26.1 means merge-forward conflicts and backport churn.
- **Raw selectors in older tests:** the `f'[data-job-id=...] input[id^=...]'` strings in `test_extract_cat1_workflow` / `test_extract_toggle_job_subset`. Not this branch's code; same reason.

## Merge-forward

- `git merge-file` (26.1 base → `origin/release_26.2` → branch) is conflict-free for both navigation.yml and the test file.
- On 26.2:
  - Every helper used resolves: `navigate_to_workflow_extraction` / `extract_workflow_set_name` / `extract_workflow_submit` in `navigates_galaxy`, and `get_workflow_by_name` in `ExtractsWorkflows`.
  - The card still sets `data-step-type` and renders `GenericHistoryItem` → `ContentItem` `data-hid`.
  - 26.2 has no existing input-card selector to reuse.
- The landing-order note from the test challenge still applies: land #24225 on 26.2 first.

## Tests run

- Playwright, headless, managed server on port 8796: `test_workflow_extraction.py::TestWorkflowExtractionSelenium::test_extract_collection_with_in_history_copy` **1 passed** (56s).
  - The screenshot shows one "Input Dataset Collection" card listing hid 1 and hid 6.
  - The worktree's `.venv` is another worktree's venv (`issue_24476_parsed_output_filters_26_1`). With `PYTHONPATH=lib`, though, the new selectors resolved, and copy hid 6 appears only with this branch's summary code. So both the test and the managed server ran this worktree's `lib`.
- The old SHA `d4a9284f451` was rewritten by the autosquash; the E2E commit is now `352a092d820`. Earlier debriefs cite the old SHA.
- black, ruff and the pre-commit hooks pass (on commit and during the rebase).
