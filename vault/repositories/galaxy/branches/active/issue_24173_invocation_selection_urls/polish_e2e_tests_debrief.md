Polished invocation URL browser coverage with smart selectors, state-driven waits, viewport setup, and seven verified screenshots; both targeted browser tests pass.

Read the E2E writing and smart component guidance and applied the required polish process to `test_mapped_job_selection_urls` and the existing `test_job_details` screenshot wait.

- All UI selectors live in `navigation.yml`. The mounted-view identity assertion obtains its DOM element from `invocations.state_details` and passes it as a script argument, without a raw selector literal.
- Replaced the existing screenshot sleep with job-information visibility. New dialog captures wait for nested loading messages to disappear.
- The Previous assertion verifies both the URL job ID and displayed dialog job ID using immediate reads inside transition retries. Dialog visibility is awaited separately.
- Captured all three step aliases, Previous navigation, dialog closing, graph navigation, and the existing single-job view.
- The selected step centers the graph at 100%, placing its input under the tool panel. Five normal Zoom Out clicks reach 50% before clicking the input node, using a scoped smart target. This was confirmed with a standalone diagnostic before the final full test; URL selection changed to `input_c`, removed `job`, and retained the same invocation DOM root.
- No shared helper was introduced because the new assertion groups are confined to this test. Assertions were preserved or strengthened.

Validation:

| Check | Result |
| --- | --- |
| Existing `TestWorkflowInvocationDetails::test_job_details` | PASS: 1 passed in 96.70s |
| New `TestWorkflowInvocationDetails::test_mapped_job_selection_urls` | PASS: 1 passed in 82.35s |
| Black check | PASS |
| `git diff --check` | PASS |
| Screenshot inspection | All seven final PNGs opened and inspected; useful and expected |

Both browser tests used Playwright headless, Vite at `http://127.0.0.1:5173/`, and timeout multiplier 2. Logs: `/tmp/issue24173-polish-baseline-e2e.log` and `/tmp/issue24173-polish-mapped-verified-e2e.log`.

Earlier runs exposed the workflow-summary label gap (fixed in product code by the parent/review agents), the clipped graph-node test interaction (fixed above), and an intermittent upload setup timeout. After restarting only the task backend and warming a disposable upload, the complete final mapped test passed without increasing the test's setup timeout. Preliminary captures are preserved under `earlier_drafts/1/screenshots` and `earlier_drafts/2/screenshots`.
