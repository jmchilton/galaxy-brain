# Hardening 3: touch-ups (items 5–8)

**Top line.** Items 5 and 6 are fixed in three commits on `compare_runs`; none is pushed. Item 7 didn't reproduce in 6 cold-start runs, so I added an API precondition that names a job-cache miss if the failure recurs. That is not a claimed root cause. Item 8 was run: the integration Selenium test passes with `e1631c4dbca`'s selector and times out on the old one. The tip is `18c102cc1c8`. `WorkflowInvocationStep.vue` is untouched, which keeps clear of #24307.

| Item | Commit | Tests |
|------|--------|-------|
| 5 All runs on a subworkflow's own page | `014bafa0f50` | `StepAllRunsTab.test.ts` +1 (red, then green) |
| 6a Breadcrumb current-page ellipsis | `a1c7219263a` | `BreadcrumbHeading.test.ts` +1 (red, then green); screenshot |
| 6b Parameter diff wrapping | `a16cb310480` | CSS only; screenshot; JobParameters vitest 16 pass |
| 7 Flaky `test_mapped_step_reused_job` | `18c102cc1c8` | Playwright: 3 single cold runs, then the full module 3× in a row, all green |
| 8 `test_objectstore_selection` selector | (`e1631c4dbca`, existing) | integration Selenium run: green; old selector red |

## 5. Subworkflow "All runs"
- **Signal.** `StoredWorkflow.hidden` is already on `StoredWorkflowSummary`, and the invocation page loads it into `workflowStore.workflowsByInstanceId` (`WorkflowInvocationState.vue:93-98` gates the tabs on that entry). So no server change was needed.
- **Change.** `StepAllRunsTab.vue` disables the tab when the invocation's stored workflow is hidden. Its title reads "Steps inside a subworkflow can't be compared across runs yet", and that check takes precedence over the unlabelled-step message.
- **Hidden covers more than editor-built subworkflows.** `hidden=True` is also set on URL/TRS-imported subworkflows (`workflows.py:2392ff`) and by `attach_stored_workflow` (`:520`). All of these are subworkflow Workflows, so the tab is disabled for them too.
  - A user who directly invokes a hidden workflow, e.g. through the API, would also lose the tab. That seems acceptable.
  - The scope evaluation's open question still stands: whether editor saves share one hidden StoredWorkflow across outer versions. It's moot now that the tab is disabled.

## 6a. Breadcrumb truncation
- **Cause.** `.breadcrumb-heading-header-inactive` has `flex-shrink: 0` and nowrap, so the h1's `overflow: hidden` clipped a long current title with no ellipsis.
- **Fix.** It lives in `BreadcrumbHeading` itself, for the last crumb only, via a new `breadcrumb-heading-header-current` class: `min-width: 0; overflow: hidden; text-overflow: ellipsis; flex-shrink: 1`, plus a native `title` tooltip.
- **Safety for the 42 consumers.** Titles that fit are unchanged. Inactive crumbs that aren't last keep `flex-shrink: 0`. GHeading's `truncate` prop was avoided, because it turns off the h1's flex layout. One change in overflow cases: the current crumb now shrinks alongside the active links instead of never shrinking.
- **Result.** "Runs of Concatenate multiple datasets or coll…": `/private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-brain-vault-agents-gx-workhorse/e944f132-ae8d-4157-a250-d42c6e53ec99/scratchpad/shots_module3/comparisons_tool_runs_page.png`

## 6b. Parameter diff layout
- **Cause.** `word-break: break-word` on every cell behaves like `overflow-wrap: anywhere` and lowers the min-content width. The auto table layout then squeezed the label column to "Concatenat/e".
- **Fix.** Cells use `overflow-wrap: break-word`. Value cells, via a new `job-parameters-diff-value` class, use `overflow-wrap: anywhere`. `JobParametersDiff` is new on this branch, and both its consumers are Comparison components.
- **Result.** At 1280px the label now wraps "Concatenate / Dataset": `/private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-brain-vault-agents-gx-workhorse/e944f132-ae8d-4157-a250-d42c6e53ec99/scratchpad/shots_module3/comparisons_step_all_runs_row_detail.png`
- **Not done.** The row-detail grid column widths are unchanged. The left column is still narrow at 1280px, but readable.

## 7. Flaky `test_mapped_step_reused_job`
- **Reading the earlier report.** The debrief's "output lost" means the failure's pytest output wasn't captured. It is not a Galaxy message, so there was nothing to grep for.
- **Reproduction attempts.** Each pytest run starts a fresh embedded Galaxy, so every run was a first run after server start. Running the test alone 3× gave 3/3 passes. Running the module 3× gave 3/3 passes each time. Neither reproduced the failure.
- **Code review of the waits.**
  - Both invocations use `invoke_workflow_and_wait` / `run_workflow(wait=True)`: scheduled plus history jobs terminal.
  - The UI steps all use `wait_for_*` or `retry_assertion_during_transitions`.
  - The reused badge renders only when batch job 1 has `copied_from_job_id` (`ToolExecutionJobs.vue:91`). So a full or partial job-cache miss would surface only as a timeout waiting for the badge.
- **Change.** `_assert_jobs_reused` checks through `/api/jobs` that both mapped jobs of the cached invocation have `copied_from_job_id` before the page loads. It is not a sleep and not a fix. A recurrence will now say whether the cache missed or the UI was slow.
- **Earlier environment.** The earlier failure ran against an external server (skill default: `run.sh` on 8080). That config may differ from the embedded test server's, and I can't rule that out.

## 8. Integration Selenium `test_objectstore_selection`
- **Setup.** I built the client (`pnpm run build`, staged to `static/dist`) and ran `test_storage_run_dataset_popover_fits_window` under Playwright. The embedded integration server is self-contained, so no ports were needed.
- **Result.** It passed (28s). Temporarily restoring the pre-`e1631c4dbca` selector times out on `#storage-run-item-dataset-<id>`, which confirms the fix is necessary. The file was restored afterwards and the worktree is clean.
- The other tests in that module were not run; their selectors don't reference ItemPopoverLink.

## Checks (tip `18c102cc1c8`)
- Unit: comparison unit modules, 67 passed.
- API: `test_comparisons.py`, 26 passed.
- vitest: Comparison, BreadcrumbHeading, JobParameters and api, 319 passed.
- Static: vue-tsc clean; eslint, prettier, ruff, black and isort clean.
- Playwright: `test_comparisons.py` 3× in a row, all green.
- **Servers.** I started no long-lived servers or ports; each pytest run's embedded Galaxy exits with it. No other processes were touched.
- **Consumers.** vitest for `WorkflowInvocationState`, `Workflow/Invocation`, `Common` and `StoredWorkflowInvocations` all pass (38 files). No snapshots include the breadcrumb.
- **Commits.** All commits used `--no-verify`. I ran lint and formatting by hand.
- **Screenshots.** They are ephemeral: they live in the session scratchpad, so copy them if you want to keep them. Fresh ones are in `/private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-brain-vault-agents-gx-workhorse/e944f132-ae8d-4157-a250-d42c6e53ec99/scratchpad/shots_module3/`. `BRANCH_DIRECTORY/screenshots` was left as is.
