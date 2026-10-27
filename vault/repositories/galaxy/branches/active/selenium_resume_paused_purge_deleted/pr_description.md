Add the missing 26.2 browser tests for History options > Resume Paused Jobs and for all three Storage Dashboard > Free up disk space operations.

| Flow | E2E coverage on `release_26.2` | This PR |
| --- | --- | --- |
| History options > Resume Paused Jobs | none (the menu's `history/resume_paused_jobs` controller route is untested; the API covers only per-job `jobs/{id}/resume`; `History.resume_paused_jobs` is unit-tested only) | `test_resume_paused_job`: deleting a waiting job's input pauses it, undeleting alone leaves it paused, and the menu item takes it to ok in the panel |
| Free up disk space > Deleted datasets | none (only the landing page is opened, for accessibility; API: `test_storage_cleaner.py`) | `test_purge_deleted_datasets_from_storage_dashboard`: review, select all, confirm; the deleted dataset is purged, the kept one isn't, and disk usage drops to the kept size |
| Free up disk space > Deleted histories | none (API: `test_storage_cleaner.py`) | `test_purge_deleted_and_archived_histories_from_storage_dashboard`: the deleted history is purged and the archived one is untouched |
| Free up disk space > Archived histories | none (API: `test_storage_cleaner.py`) | same test: the archived history is purged and unarchived, and the current history isn't purged |

| Paused | Resumed |
| --- | --- |
| ![paused](screenshots/history_panel_paused_job.png) | ![resumed](screenshots/history_panel_resumed_job.png) |

| Review | Confirm | Purged |
| --- | --- | --- |
| ![review](screenshots/storage_dashboard_deleted_datasets_review.png) | ![confirm](screenshots/storage_dashboard_deleted_datasets_confirm.png) | ![purged](screenshots/storage_dashboard_deleted_datasets_purged.png) |

***This is test-only. The two client changes are non-visual `data-description` attributes on the existing Resume Paused Jobs menu item and the cleanup cards. New helpers are test-driver code only.***

***It targets `release_26.2` because these flows have no browser coverage in the release, and missing tests are bugs.***

***The vitest specs mock the server and `test/integration/test_storage_cleaner.py` covers the storage API without the UI; these tests drive the real dialogs against a real server and check the result through the API.***

<details><summary>What each commit does</summary>

1. **`navigate_to_storage_dashboard` helper.** `test_history_storage_accessibility` uses it in place of two inlined `home()` + masthead clicks.
2. **Resume Paused Jobs test.** Adds `data-description="resume paused jobs"` in `HistoryOptions.vue` and `click_history_option_resume_paused_jobs`. The input is undeleted through the API so the test only drives the menu item under test.
3. **Deleted datasets test.** Adds `data-description="<operation id> cleanup"` on `CleanupOperationSummary`'s card, the `storage_dashboard.cleanup` selectors and `storage_dashboard_cleanup(operation)`, which drives review → select all → confirm for any cleanup id.
4. **Deleted and archived histories test.** Reuses the same helper for the other two operations; adds `success_close` to dismiss the result dialog.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- `NavigatesGalaxy` gains three helpers on a release branch: `navigate_to_storage_dashboard`, `storage_dashboard_cleanup` and `click_history_option_resume_paused_jobs`.
- `navigation.yml` gains `storage_dashboard.cleanup`.
- `test_resume_paused_job` reuses the 15s `cat_data_and_sleep` setup from `api/test_jobs.py::test_resume_job`; if the API calls before the delete took longer than that, the job would run instead of pausing.

</details>

## Context

Part of 🌿 [`galaxy_ui_driver`](https://github.com/jmchilton/galaxy/tree/galaxy_ui_driver), used to resume paused jobs and free disk space when driving Galaxy 26.2 from scripts. Alternative kept on 🌿 [`selenium_resume_paused_purge_deleted_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/selenium_resume_paused_purge_deleted_alt_original_scope) - covers only deleted datasets, through a dedicated `storage_dashboard_purge_deleted_datasets` helper. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep as implemented: one generic cleanup helper covering all three Free up disk space operations.</summary>

- A first evaluation recommended generalizing the deleted-datasets helper and covering the other two operations; that's the current scope.
- Left out: Explore usage's per-item Permanently Delete / Undelete (a different component, no shared code), and a driver-level enabled wait (better as a `dev` PR).
- Splitting Resume Paused Jobs from the Storage Dashboard work was weighed; each half is small.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Approve, no changes.</summary>

- Raised, not acted on: a `Literal` type for `operation` (no canonical Python cleanup-id type to reuse), and folding the `no_items` wait into the helper (it would hide the test's UI assertion).

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>All four tests kept as written.</summary>

- Setup and result checks use populators; the UI drives only the behavior under test.
- The `state == "paused"` check after the undelete is a real precondition: undeleting alone doesn't resume.
- The histories test checks each cleanup leaves the other history alone.

</details>

### ✅ Second Frontier Model Review

<details><summary>One finding (the 15s paused-job race), not acted on.</summary>

- Losing it needs three back-to-back API calls to take over 15s; `api/test_jobs.py::test_resume_job` has run the same setup in CI. Raising the sleep would slow every run.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>The <code>navigate_to_storage_dashboard</code> refactor leads; test commits only add code.</summary>

- New selectors and helpers with no caller on the base stay in their test's commit.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment?
- [x] What does the user see when it fails? Users see no change. The tests fail on named waits (e.g. `usage to drop the purged dataset`) or pytest assertions on job state and `purged`/`deleted`/`archived` flags, plus the framework's screenshot and DOM dump.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They drive the UI and check results through the API, including negatives: the job stays paused after undelete, and kept datasets/histories survive.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. The `navigate_to_storage_dashboard` refactor leads; the rest add new coverage.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- All four tests pass locally under Playwright (headless) and Selenium, and fork CI's Selenium jobs pass at the branch head.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
