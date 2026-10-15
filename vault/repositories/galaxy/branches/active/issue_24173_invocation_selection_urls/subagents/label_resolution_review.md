# Label resolution follow-up normal review

The follow-up review identified two reproducible P2 regressions in the initial pending-label guard. Both are now addressed through the parent-approved complete cached workflow boundary. All 26 focused selector tests pass. No scope change is recommended; browser and final type/build checks remain parent-session responsibilities.

## Review scope

Reviewed current invocationSelection.ts and its revised real-router/Pinia tests, prior branch review context, the workflow store cache and graph/list loading boundaries. Summary responses provide ids/types rather than labels; invocation records supply workflow_step_label and order_index but can arrive incrementally before scheduling completes. The id/order_index join is correct and independent of array order. New tests appropriately model the actual summary shape and reversed invocation records.

## Findings

**P2 — Pending incoming label must not veto an explicit local selection.** Both directions of synchronization return while awaitingLabel is true. On an unscheduled invocation with an unresolved incoming `step_label`, choosing an already available graph/list step changes the selected node without updating the URL. The original job/output parameters remain attached to the pending label. If invocation metadata later resolves that label, the incoming watcher can replace the user's subsequent choice. A temporary regression using the real memory router and Pinia selected step zero after loading a summary with an unresolved label: expected `{step_number: "1"}`; actual URL remained `{step_label: "pending", job: "old-job"}`.

**P2 — Label readiness must not gate workflow output restoration.** awaitingLabel is evaluated outside the selection-view boundary and causes the incoming watcher to return on `/outputs`. An unrelated or stale step label therefore prevents a valid workflow output from expanding while scheduling remains active. A temporary real-router regression opened `/outputs?step_label=pending&output=counts` on a new invocation: expected selected output `counts` and canonical query `{output: "counts"}`; actual selected output remained undefined.

## Structural remedy and disposition

Implemented `workflowStore.getFullWorkflowCached(summary.id, summary.version)` for complete workflow labels on Overview/Steps. Those views already load the same deduplicated full-workflow promise through useInvocationGraph before clickable nodes render. Complete workflow metadata is the canonical source for step labels, existence, and uniqueness, including steps not yet represented in invocation scheduling records. Selection URL normalization waits until this data is available, and output/report views stay outside that dependency. This removes the scheduling-state label mode and its competing local-versus-pending selection semantics instead of adding override flags. The watcher calls the canonical action without inspecting private cache keys. Its cleanup callback prevents stale async completion after workflow/view changes or disposal. A narrow `SelectionStep` response shape keeps the label boundary explicit. The existing graph/list reports shared load errors. This is an implementation refinement within the agreed issue scope.

## Validation and disposition

Both review concerns were reproduced RED against the initial invocation-label guard in a temporary real-router/Pinia suite (2 failures / 23 skipped). That duplicate suite was removed afterward. The parent then authorized implementing the cached full-workflow remedy; the browser agent was notified before the source edit and received a stable-source signal afterward. No competing E2E run was started.

The permanent real-router/Pinia suite now serves a real MSW editor-style workflow download through the real workflow store action, while the instance summary deliberately omits labels. It retains all selector precedence, malformed selector, embedded, report, output, and retained graph-selection checks. New/updated scenarios cover an async full download with no scheduled invocation steps, unknown label cleanup independent of scheduling, explicit local selection after an unresolved invocation label, unrelated step labels on workflow outputs without any full-workflow fetch, and a late download response after disposal. The disposal test checks scoped node state and absence of router.replace after unmount; Vue Router itself intentionally resets currentRoute when its last mounted app is removed, so comparing its old query after disposal would test the wrong contract.

Final command: `NODE_OPTIONS=--no-experimental-webstorage pnpm exec vitest run src/composables/invocationSelection.test.ts --maxWorkers=1` — **1 file / 26 tests passed**. Log: `/tmp/issue24173-label-quality-tests.log`. Prettier checks on both changed composable files and `git diff --check` passed. Because this follow-up changed more than three test cases, the parent was notified to archive the earlier test-challenge debrief and run a fresh challenge. Root owns final full typecheck/build and the mapped browser regression.

Both findings are addressed; no recommendations declined. No commits created by this reviewer.
