# Test challenges debrief

I challenged every test on the branch (`origin/release_26.2...HEAD`, commits `13b53a04576` and `360febc0e41`) against `writing_tests.md` and the client README's testing section. Changes are uncommitted in the worktree.

## Changes

- **Added an E2E test**, `test_steps_follow_running_invocation`, in `lib/galaxy_test/selenium/test_workflow_invocation_details.py`. Nothing in a browser had covered the bug before.
  - The workflow is input → `cat_data_and_sleep` with a 20 s sleep, run with `wait=False`.
  - The test opens the invocation's Steps tab, expands step 1, and checks that the header isn't `header-ok` yet.
  - It then waits up to `JOB_COMPLETION` for `header-ok`, and checks that the step's job details are still shown (the step stayed expanded).
  - New selector `invocations.step_header_state` (`[data-step="${order_index}"] .portlet-header.header-${state}`) in `navigation.yml`.
  - It reuses this file's `invocation_open_latest`. I didn't move it, because `invocation_graph_e2e` (on `dev`) moves that helper.
- **Dropped "does not toggle loading"**, in both modes.
  - In the Steps tab it duplicates the component test. As a check, I made the watcher toggle `loading`. `WorkflowInvocationSteps.test.ts` went red, because the step list unmounts and the expanded step collapses.
  - In the Overview, `loading` is only awaited once, in `onMounted`, so a toggle there changes nothing the user can see.
  - It also passed on base by construction.
- **`useInvocationGraph.test.ts`: dataset API now mocked with MSW, not `vi.mock("@/api/datasets")`.** The README prefers MSW.
  - The input-failure test now gets a real 403 from `/api/datasets/{dataset_id}`, which also goes through `rethrowSimpleWithStatus`.
  - I used 403 instead of the old 429 on purpose. The client's rate-limiter middleware retries 429s, which would make the test slow and the fetch wouldn't simply fail. 403 matches the review's persistent-failure scenario: an input the viewer can't read.
  - The race test now holds the handler response on a promise. It changes the summary only after the dataset request has actually arrived, instead of guessing with `flushPromises`.
  - It also checks for the specific `console.error` message, not just any call.
- **`useInvocationGraph.test.ts` cleanup.**
  - `setupComposable` takes optional invocation fields, so the race test no longer builds the composable inline.
  - The repeated workflow, invocation and dataset literals became shared constants.
  - The unused `loading` return was removed.
- **`InvocationGraph.test.ts`: the retry test now covers both polled props.** It's an `it.each` over a new jobs summary and a new invocation. Review fix #4 (also watch `invocation`) had no test before. Reverting the watcher to watch only the summary turns the invocation case red.
- **`sharedPromise.test.ts`: strengthened two `rerunWhileBusy` tests** to check what its docstring promises.
  - Callers made during a run all wait for the rerun to finish.
  - A rejection reaches every caller already waiting, and a pending rerun is dropped.
  - Two mutants now go red that the old tests let through: busy callers returning immediately, and busy callers swallowing the rejection.

## Kept as is

- **`WorkflowInvocationSteps.test.ts`.** It's the issue's proposed regression test. It uses `mount`, not `shallowMount`, because the bug is the parent re-rendering and collapsing its children. It's deterministic and red on base. It also covers the `loading` toggle regression, as shown above.
  - **Decision for John:** the new E2E overlaps it. By the "drop if covered by E2E" rule it could go, but I kept it because it's fast, deterministic and covers timing the E2E can't control.
  - Its store mocks (`workflowStore`, `invocationStore`) stay. They follow the usual Galaxy store-mocking pattern, and the `invocationStore` mock exists to stop per-step polling.
- **The other composable "following polled data" cases** (new summary, invocation-only change, step gets scheduled, unchanged poll writes nothing, input step without a value writes nothing):
  - The two modes take different paths (`stepsPopulated`), so I kept the `describe.each`.
  - These cases can't be written at the API layer, and an E2E test can't reliably set up the races.
- **`stepJobSummaryLookup` unit tests.** It's a pure exported helper with two consumers. The shared-id fixture checks that Job and ImplicitCollectionJobs summaries stay separate.

## Evidence

- **Composable tests against the base composable** (copied to a temp sibling file, then deleted): 11 of 14 "following polled data" cases are red. Three pass on base by construction, because base has no watcher, so a poll writes nothing:
  - "writes nothing on unchanged poll", Steps-tab mode only
  - "input step without a value", both modes
- **Mutation checks**, each restored from `HEAD` afterwards. Each mutation turned the named test red:

  | Mutation | Red test |
  | --- | --- |
  | Drop the rerun loop | race test, both modes |
  | Drop the per-input catch | input-failure test, both modes |
  | Watcher toggles `loading` | Steps component test |
  | Retry watcher watches the summary only | invocation retry case |
  | Two `rerunWhileBusy` mutants (listed above) | strengthened `rerunWhileBusy` tests |

- **E2E.** Run against this worktree's own Galaxy (port 8095, sample test tools) and Vite (port 5185), with a fresh user per test.
  - Playwright: green, and the whole file passes (3/3).
  - Selenium (chromedriver 155): green.
  - **Red on base:** I put the base `useInvocationGraph.ts` and `WorkflowInvocationFeedback.vue` in place temporarily, then restored them from `HEAD`. The test timed out at the `header-ok` wait. The `assert_absent` check passed first, so the page really did load while the job was still running.
  - The first Playwright attempt errored in setup on a cold Vite compile. Every run after that passed.
- **Client tests:** 46 files, 414 tests green (composable, `sharedPromise`, `Graph/`, `WorkflowInvocationState/`, `Workflow/Editor/`).
  - eslint and prettier are clean on the touched files.
  - `vue-tsc --noEmit` reports 0 errors.
  - black, ruff and flake8 are clean on the Selenium file.
  - Node 22.20.0.

## Notes

- `WorkflowInvocationState/JobStep.test.ts` makes real network calls (ECONNREFUSED to port 80) through `JobDetails`. It was already like this and isn't touched by the branch, so I left it.
- The E2E adds about 20 s of tool sleep to the Selenium suite.
- `invocation_graph_e2e` on `dev` also adds selectors to the `invocations` block of `navigation.yml`. Merging forward may hit a trivial conflict there.
