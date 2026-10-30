# Test challenges review: galaxyproject/galaxy#24565

- Profile: gx_test_challenger
- Model: Claude Opus 5.5, medium effort
- Reviewed commit: `fc477492afec572160601cd5d60e8d2d0f5b1be6`
- Debrief: [test_challenges_debrief.md](test_challenges_debrief.md)

No bugs noticed in passing.

### P2 1: No API test pins `Total_matches` with `show_shared=false`

The fix relies on the server excluding shared workflows from the `Total_matches` header when `show_shared=false`. `test_index_show_shared` checks returned ids only, and `test_index_total_matches` checks the count only with the default, which includes shared workflows. Nothing would catch the count drifting from the page for the My workflows request.

Suggested fix: in `lib/galaxy_test/api/test_workflows.py::test_index_total_matches`, add a `self._get("workflows?show_shared=false")` request after the existing one and assert `Total_matches == "3"` and three rows (2 own + 1 imported; the shared one excluded).

### P3 1: Drop the two "leaves shared workflows to the server default" unit tests

The published and Shared with me tests in `WorkflowList.test.ts` assert that `showShared` is `undefined`, a non-change. They would fail on a harmless refactor (such as passing `showShared: true` explicitly on the Shared with me tab) without any behavior change. Shared with me listing is already covered by `lib/galaxy_test/selenium/test_workflow_sharing.py`. Keep the My-tab `showShared: false` test as the client-side guard.

### P3 2: Test the invalid-filter behavior rather than the filter config

The new `filterConversion.test.js` case checks that the `my` filter config rejects `shared_with_me`. The PR description promises a behavior: typing `is:shared_with_me` on My workflows shows the "Invalid filters in query" notice and sends no request. Assert that in `WorkflowList.test.ts` instead (set the filter text, expect `#no-workflow-found-invalid`, expect no new `loadWorkflows` call), and drop the config-level case.

## Not recommended

- A Selenium test: reproducing the visible symptom needs more than 24 shared workflows, and a small-share E2E test would pass before the fix because the client already hid shared cards by owner. See the debrief.
