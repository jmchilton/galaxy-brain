screenshots not relevant for this change

# Screenshot debrief: issue_23977_client_api_fanout_26.1

Checked tip `f8d58ca20a1` against `origin/release_26.1` (`git diff origin/release_26.1...HEAD`, 44 files, all under `client/src`). Nothing recorded and no tests changed. Galaxy worktree untouched.

## New or modified E2E screenshots?

None. The branch has no changes under `lib/galaxy_test/selenium/`, `lib/galaxy/selenium/` or `navigation.yml`. The request-counting E2E was dropped in the revision and it never took a screenshot.

## UI changes and what the happy path shows

On a Galaxy with no rate limiter and no 5xx errors, every settled screen looks the same as on base.

- **`WorkflowInvocationState.vue`**: the "Loading invocation" alert now also shows while `isLoadingInvocation` is true. That alert is in the `v-else` chain under `v-if="invocation"`, so it only shows when no invocation is rendered. Polling refetches don't bring it back after the first load. The only visible difference is that "Loading invocation" shows during a retry backoff where base showed "Invocation not found." That needs a failed request.
- **`WorkflowRerun.vue`**: shows a new `LoadingSpan` ("Loading workflow rerun data") until the request data loads and `setCurrentHistory` to the original history resolves (`ready`). Base showed a blank area there. On the happy path the spinner is transient and the loaded form is unchanged. If `setCurrentHistory` throws, `ready` stays false and the spinner stays up where base stayed blank. That's an error path and outside this branch's scope. *(Coordinator: fixed. The watcher now catches a `setCurrentHistory` failure, so the existing "Unable to switch" toast shows and the form renders. Test added; folded into commit 5.)*
- **Markdown `HistoryDatasetDetails.vue`**: shows a "Loading Dataset" `LoadingSpan` while the dataset fetch runs and the attribute is missing. Base showed an empty `pre`/`span`. Like the rerun spinner, this only lasts for the first fetch, and the rendered element (`.dataset-peek` etc.) is unchanged once loaded.
- **`DatasetPopoverLink.vue`**: the details are read through `getDataset` while the popover is shown, and an unused history load was removed. The popover markup and its existing loading and error states are unchanged.
- **`useWorkflowCardBadges.ts`**: the badge visibility conditions were refactored into `showInvocationCount` with the same logic. Counts are no longer fetched for cards that hide the badge. Badges render the same in every case.
- **Upload (`utils.js`, `storeProviders.js`)**: a failed `/api/datatypes` request now rejects instead of caching `[]`, which surfaces the existing "Unable to load upload options" alert in `UploadContainer.vue`. Success looks the same.
- **`HistoryExport.vue`, `ObjectPermissions.vue`, grid configs**: only error propagation and `.catch` changes. No markup changes.

## Why no screenshots

- None of these changes alter a settled happy-path screen that an existing Selenium screenshot would capture.
- The two new happy-path spinners (rerun, markdown dataset details) use the standard `LoadingSpan`. They only appear for the length of one local request, so a screenshot of them would be timing-dependent and wouldn't show anything new.
- The real UI changes are the retry/backoff loading states, the end of the "Invocation not found." flash, and the Upload error alert. All of them need 429 or 5xx responses, and CI and local Galaxy can't produce those end to end without changing the server. Per John, no new E2E tests just for screenshots of error or retry paths. Vitest added on this branch covers these states (`WorkflowInvocationState.test.ts`, `WorkflowRerun.test.ts`, `HistoryDatasetDetails.test.js`, `DatasetPopoverLink.test.ts`, `Upload/utils.test.ts`, `storeProviders.test.js`). The Upload alert itself already exists on base (`UploadContainer.test.ts`).

## Existing screenshot tests checked

- `test_workflow_rerun.py` takes `workflow_rerun_ready` after `_assert_history_name_is(original)`. The history switch resolves right before `ready = true` with no await in between, so it can't catch the new spinner.
- `test_pages.py` uses `page_open_and_screenshot`, which sleeps `UX_RENDER` before the shot. A local dataset fetch finishes well inside that, so the markdown dataset spinner is a theoretical timing risk only.
- `test_workflow_invocation_details.py` and `test_invocation_grid.py` take their shots after the invocation has loaded, and loaded rendering is unchanged.
- None of these need changes.

## Environment note

`df -h` showed 3.2 GiB free, so recording wouldn't have been possible anyway: the worktree has no `.venv` or built client. That wasn't the deciding factor, because screenshots aren't relevant here.
