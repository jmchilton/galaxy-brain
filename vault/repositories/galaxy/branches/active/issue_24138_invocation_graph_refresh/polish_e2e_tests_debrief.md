# Polish E2E tests debrief

I polished `test_steps_follow_running_invocation`: it now waits for the step header to show `running` instead of checking that it isn't `ok` yet, captures running and completed screenshots, and shares a new file-local "expand step" helper with the file's other two tests.

Scope: `lib/galaxy_test/selenium/test_workflow_invocation_details.py` and the `invocations.step_header_state` selector from `d94c630e49f`. The changes are uncommitted in the worktree.

## Changes

- **Positive running check.** `step_header_state(state="ok").assert_absent()` is now `step_header_state(state="running").wait_for_visible()`.
  - The old check also passed if the header had no state class at all. The new one confirms the page loaded while the job was running, and that the header shows it.
  - The wait uses the `JOB_COMPLETION` timeout, the same as the `ok` wait, so a job that sits in queued on a slow CI worker doesn't fail at the default 10 s wait. A passing run costs nothing extra.
  - This replaces the assertion that `test_challenges_debrief.md` describes, so its red-on-base evidence was for the old check.
  - It's a stronger assertion, not a weaker one. The base still fails either way: if the page loads while the job is queued, the running wait fails; if it loads while the job is running, the `ok` wait fails, as before.
- **Screenshots.** Added `invocation_steps_running_step_expanded` (running header, step expanded) and `invocation_steps_completed_step_expanded` (header ok, same step still expanded). I looked at both images and they show the states they're named for. Both are usable for the screenshots step.
- **Shared helper `invocation_expand_step(order_index)`.** It clicks `step_details` and waits for `step_job_details`. The file repeated that pair three times (`test_job_details`, `test_invocation_step_jobs_with_failed_jobs` and the new test), and all three now use the helper.
  - I kept it in the test class. Only this file uses it, and `invocation_graph_e2e` is already changing `NavigatesGalaxy` around the invocation helpers.

## Checked, left as is

- **Selectors.** Every selector in the test comes from `navigation.yml`, with no raw CSS. I kept `step_header_state` as written. It is the Steps-tab counterpart of `graph_node_state` (`.card-header.header-${state}`) on `invocation_graph_e2e`. `step_details.with_class(...)` could have replaced it, but that would build a CSS class string in the test.
- **Sleeps.** The new test has none. The 20 s `sleep_time` is tool state and already has a comment.
  - The `sleep_for(UX_RENDER)` before the `invocation_step_jobs` screenshot in `test_job_details` was there before this branch, so I didn't touch it.
- **`invocation_open_latest`.** It stays in the test class, because `invocation_graph_e2e` moves it to `NavigatesGalaxy`.
- **`WORKFLOW_WITH_SLOW_STEP`.** It stays local: only this test uses it, and `workflow_fixtures.py` has no slow-step fixture.

## Runs

The runs used this worktree's own Galaxy (8095, sample test tools) and Vite (5185), with the venv borrowed from `invocation_graph_e2e`, a fresh user per test and no `GALAXY_TEST_END_TO_END_CONFIG`. Tests ran one at a time.

- Playwright, new test alone: passed, 56 s. Both screenshots were written.
- Playwright, whole file: 3/3 passed, 110 s.
- Selenium (chromedriver 155), whole file: 3/3 passed, 166 s. All seven screenshots were written.
- black, ruff and flake8 are clean on the file.
- I didn't repeat the red-on-base run, because another agent was editing this worktree at the same time and swapping base files in would have interfered with it. The bullet under "Positive running check" explains why the base still fails.
- The runs were against HEAD `73ace916183` (which includes the coordinator's `rerunWhileBusy` sync-throw fix) plus this test change.
- I added the `JOB_COMPLETION` timeout to the running wait after these runs. It only changes the timeout, so I didn't rerun; lint is still clean.

Both servers were stopped afterwards.
