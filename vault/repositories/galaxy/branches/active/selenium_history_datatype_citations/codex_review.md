# Codex review (re-harden)

Fresh Codex run (read-only, `git diff origin/release_26.2...HEAD` plus per-commit patches at `2816a7b7dbe`) reported one finding. Confirmed and fixed; head `50dc4ccb773`. Both selection tests are green under Playwright and Selenium.

Not acted on: nothing.

This overrides the earlier test-challenge and polish calls to leave `@managed_history` off "because no other test in the file uses it". That reasoning didn't account for the shared-user mode below. `test_history_options.py` already uses the decorator.

<details>
<summary>Findings and triage</summary>

1. **P2, test isolation: CONFIRMED, fixed.**
   - **Problem:** `test_change_datatype_of_selected_items` and `test_change_dbkey_of_selected_items` add datasets to the current history but assert on hard-coded hids 1–3.
   - **When it breaks:** when `GALAXY_TEST_SELENIUM_USER_EMAIL`/`_PASSWORD` is set (e.g. via `GALAXY_TEST_END_TO_END_CONFIG`), `login()` reuses one user and its current history, so earlier datasets take hids 1–3. A rerun of the dbkey test then fails its `genome_build == "?"` start check. The same shared-user trap is recorded in local E2E notes.
   - **Fix:** `@managed_history` on both tests. It creates a fresh, named history and deletes it afterwards. Each decorator is folded into its own test's commit.

Coverage notes: full diff, all four commit patches, Citation/GModal/SingleItemSelector/useRankedSearch, the navigation component resolution, and both driver backends' element code. Browser tests were not executed by Codex.

</details>
