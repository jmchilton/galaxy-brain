Acted on: no corrective recommendations were necessary; the reviewed UI phase has no high-confidence correctness blocker. Deferred: browser execution, screenshots, and the prescribed test challenge/polish stages remain with the coordinator and implementing agents, rather than being inferred from this read-only review.

# Client phase normal review

Reviewed the unstaged client phase and untracked lineage component/tests in `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24174_invocation_rerun_lineage`, alongside the backend implementation at `3896a4742ba`, using `origin/dev` as the feature baseline. Followed `_shared/REVIEW_FOCUS.md` and the private-report policy. No source edits or commits made.

## Findings and disposition

No actionable high-confidence defects found. There are no rejected or otherwise unacted-on code recommendations from this phase review. API and browser execution was underway in other agents at review time; this report does not claim their checks passed.

## Reviewed behavior

- `WorkflowRerun` passes its current invocation ID independently of request-export contents. Request exports remain independent replay payloads, while the explicit rerun route supplies lineage.
- `WorkflowRun` forwards that optional source to both simple and expanded forms. Switching variants retains the parent prop. Both submit paths add the same `rerun_of_invocation_id` field only when a source exists; ordinary workflow runs omit it.
- The generated API client changes match the backend payload/collection/detail contracts: optional nullable source on the invoke payload, collection boolean marker, and optional nullable detail neighbor links. No unrelated generated-schema churn found.
- The dedicated lineage component reuses `GAlert` and Vue Router links. Missing/inaccessible source and successor IDs produce no corresponding link. An intermediate invocation can show both links, and the source-only/latest-only cases follow independent conditionals.
- Detail integration appears within the existing non-null invocation guard. The existing invocation-ID watcher calls `fetchInvocationById()` explicitly after source/latest routing, so an already-cached original is refreshed and can show its newly created successor.
- Invocation cards use existing badge infrastructure with `is_rerun`; the grid uses its existing text converter abstraction. No per-row detail calls are introduced for the marker.
- Navigation selectors match the existing card ID generation and link data-description attributes.
- Selenium test creates I, reruns I to J with the preferred simple form, then reruns J to K after expanding the form. Each iteration waits for output, reloads, checks the immediate-source URL, follows source and latest links, and verifies the destination. Finally it checks K's card marker. This covers persisted lineage and live Vue routing in both directions, rather than only inspecting request mocks.
- The expanded-form unit test exercises the actual submit action and checks the source field passed to the workflow API abstraction. The focused lineage tests cover absent links, source links, and both-neighbor rendering. E2E provides the planned simple-form propagation coverage.

## Validation boundary

This was source review, including related routing, invocation cache, grid/card rendering, and Selenium helper implementations. No UI tests or browser session were run by this reviewer because the client implementation agent was already executing focused validation; use its debrief and the later E2E/test-challenge stages for execution evidence. Existing backend migration round-trip validation is recorded separately in `backend_review.md`.
