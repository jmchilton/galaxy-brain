# Polish E2E tests debrief

Fixed the load race in `test_best_practices_extract_untyped_rename_parameter`, added a check that the input node was extracted, and added before and after screenshots. All of this is in commit `58662e4c8e2`, on top of `8a932a4da04`. It is not pushed.

## Changes

- **Load race (real, fixed):** `Index.vue` `onAttemptRefactor` returns early through `blockedWhileLoading()` while `loadingWorkflow` is true, and the only sign of that is a toast. The confirm dialog for the fix still opens and the test still clicks OK, but the refactor is silently dropped and the section stays `warning`.
  - The test-challenge note said the fix link might be disabled. That is not quite right: the formal-inputs `LintSection` never gets `requires-save`, so the link is always enabled.
  - Fix: `editor.canvas_loading.wait_for_absent()` right after opening. This is the same pattern `test_open_and_run_workflow_by_exact_title` already uses.
- **`auto_layout=False` is idiomatic:** `test_connecting_display_in_upload_false_connections`-style tests already use it.
  - It also avoids the `UX_RENDER` sleep inside `open_in_workflow_editor`.
  - With auto layout, `hasChanges` would be set and `onAttemptRefactor` would add a "save changes and continue?" confirm.
  - I added a one-line comment explaining this.
- **Stronger test:** after the confirm, the test now waits for `editor.node._(label="replaceme")`. This proves the extract actually ran before the test checks the lint status.
- **Screenshots:** `workflow_editor_best_practices_untyped_parameter` (warning) and `workflow_editor_best_practices_untyped_parameter_extracted` (ok, new input node shown).

## Checked, no change

- There are no raw CSS/DOM selectors. Everything goes through `navigation.yml`.
- I didn't add a new shared abstraction. The new selectors mirror the existing `best_practices` section/item pairs. `canvas_loading.wait_for_absent()` now has 2 callers, both inline one-liners. A `workflow_editor_wait_for_loaded()` helper, or folding the wait into `open_in_workflow_editor`, could be a later cleanup, but it would touch many unrelated tests.
- The test itself has no sleeps.

## Runs (one at a time, worktree gunicorn on 8197 + Vite on 5197, `GALAXY_TEST_EXTERNAL=http://localhost:5197/`)

- Playwright (headless): PASSED in 23s. I checked the screenshots: lint is ok and the `1: replaceme` text input node is present.
- Selenium (chromedriver 156 from the selenium-manager cache on PATH, headless `auto`): PASSED in 41s.
- Pre-commit hooks were clean. Both servers were stopped afterwards.
