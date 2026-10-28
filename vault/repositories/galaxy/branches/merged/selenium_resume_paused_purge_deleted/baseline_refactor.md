# Baseline refactor

No further refactoring of the base branch was performed. The `navigate_to_storage_dashboard` refactor that the [earlier pass](earlier_drafts/1/baseline_refactor.md) pulled out is still the first commit, and the history is unchanged. Head stays `30f2122cd91`, which matches `jmchilton`.

## Current history (on `b66ec973f2b`, still the `origin/release_26.2` tip)

1. `e4aada751bd` Add navigate_to_storage_dashboard selenium helper. This is the base refactor. `test_history_storage_accessibility` is its base-branch caller.
2. `217e3c152cf` Test resuming a paused job from History options.
3. `53fd9c87e28` Test purging deleted datasets from the Storage Dashboard.
4. `30f2122cd91` Test purging deleted and archived histories from the Storage Dashboard.

## Considered, not split out

- **`storage_dashboard_cleanup(operation)` and the `storage_dashboard.cleanup` selectors.** The re-scope generalized these, but they don't refactor anything in the base: the base has no cleanup-dialog driving code. Their only callers are the tests in commits 3 and 4, so a helper-first commit would add unused code. They stay with their first caller (commit 3).
- **`success_close` selector (commit 4).** Only the histories test uses it.
- **`data-description` hooks** (`HistoryOptions.vue`, `CleanupOperationSummary.vue`) and **`click_history_option_resume_paused_jobs`.** Only new tests use them; the earlier pass reached the same conclusion. The names are unchanged, as instructed.
- **A shared populator helper for setting up a paused job.** `test_resume_paused_job` repeats the setup from `api/test_jobs.py::test_resume_job`: two inputs, then `cat_data_and_sleep`, then `cat1`, then delete the input. Pulling that out first would mean rewriting an API test on a release branch, and the setups differ: the API test posts raw payloads and feeds `hda2` into both inputs. That is too much churn for a "missing tests" PR, so I left it out.
- **Other base consumers of `navigate_to_storage_dashboard`.** I grepped `release_26.2` for `storage_dashboard_link` and `free_space_link`. Only `test_history_storage_accessibility` uses them, and commit 1 already converts it.

## Tests

None were run in this pass because the history was not rewritten. The latest runs at `30f2122cd91` are in the [polish debrief](polish_e2e_tests_debrief.md): both storage-dashboard purge tests pass under Playwright and Selenium. The [re-scope debrief](implementation_rescope_debrief.md) has all four tests passing under both backends at `6d21d8c4d45`. The only difference since then is the polish change to the purge helper and the histories test. That change doesn't touch the code paths of `test_resume_paused_job` or `test_history_storage_accessibility`.
