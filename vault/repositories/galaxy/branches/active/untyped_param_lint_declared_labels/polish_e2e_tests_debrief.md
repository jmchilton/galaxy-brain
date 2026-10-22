# Polish E2E tests debrief (re-harden, release_26.1)

On the `release_26.1` base, `test_best_practices_extract_untyped_rename_parameter` passes under both Playwright and Selenium. It already met every polish rule, so there are no code changes or fixups. History is unchanged (`c6bee9917cf`) and nothing was pushed.

## Checks

- **Selectors:** there are no raw CSS/DOM selectors; everything goes through `navigation.yml`. The test's 26.1 dependencies are all present on the base:
  - `confirm_dialog.ok_button`
  - `LintSection` `data-lint-status`
  - `Lint.vue` `linting formal inputs`
  - `WorkflowGraph.vue` `LoadingOverlay` (`.galaxy-loading-shade`) inside `#workflow-canvas`
  - `open_in_workflow_editor(auto_layout=...)`
  
  The added `canvas_loading` selector matches the DOM on 26.1.
- **Sleeps:** none in the test. `auto_layout=False` also skips the `UX_RENDER` sleep inside `open_in_workflow_editor`.
- **Shared abstractions:** none needed. On 26.1, `canvas_loading.wait_for_absent()` has a single caller. The second caller (`test_open_and_run_workflow_by_exact_title`) exists only on dev. The selector pair `section_formal_inputs`/`item_formal_input` mirrors the existing `input_metadata` pair.
- **Screenshots:** the test captures `workflow_editor_best_practices_untyped_parameter` (warning; the "Step 2 replaceme" fix link shows) and `..._extracted` (legacy-params item ok; new `1: replaceme` text input node on canvas). I checked both Playwright images by eye.
  - Cosmetic: with no auto layout, the extracted input node partly overlaps the tool node. This doesn't affect the assertions.
- **Decorator:** `test_rendering_rules_workflow_1` still has `@selenium_only("Not yet migrated to support Playwright backend")`. The new test has no `@selenium_only`.

## Runs (one at a time)

- **Setup:**
  - Worktree gunicorn on 8197, with a fresh scratch sqlite DB and data dir. The worktree's `database/` had been migrated on the dev base, so on the 26.1 code it failed with alembic `RevisionNotFoundError`. I left it untouched.
  - Tools from `test/functional/tools/sample_tool_conf.xml`.
  - Vite on 5197 (node 22.20.0), `GALAXY_TEST_EXTERNAL=http://localhost:5197/`.
  - No end-to-end config, so each test registers a fresh user.
- **Playwright** (headless): PASSED in 31.7s.
- **Selenium** (chromedriver 156 from the selenium-manager cache, headless unset): PASSED in 37.3s.
- I stopped both servers afterwards.

## Housekeeping

- Deleted local branch `backup/untyped_param_pre_challenge2` (`00e338284ae`).

## Final commits (unchanged)

```
f3775945b2e Baseline tests for editor untyped workflow parameter lint
37846773cb9 Baseline tests for run form rename replacement parameters
98e3404ed2e Extract replacement parameter names with one capture-group helper
00bc82bf130 Don't flag rename parameters backed by a parameter input in editor lint
77afe064534 Add E2E test that extracting an untyped rename parameter clears lint
c6bee9917cf Only report rename post job action replacement parameters
```
