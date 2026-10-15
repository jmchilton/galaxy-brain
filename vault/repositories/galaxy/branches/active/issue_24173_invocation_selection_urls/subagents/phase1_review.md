Implemented the graph readiness correction: centering waits for positive node and viewport dimensions, with an immediate watcher. Reviewer rechecked and confirmed the reported race is addressed; regression validation is recorded in the phase 1 debrief. No recommendations declined.

<details><summary>Full review</summary>

# Phase 1 normal review

Reviewed the current working diff against 88127f42979, including the untracked invocationSelection composable/tests and the latest initial-scroll fix. Job dialog and output wiring are deliberately outside this phase.

## Finding

- **P2 — Wait for actual graph measurements before centering a deep-linked node.** `client/src/components/Workflow/Invocation/Graph/InvocationGraph.vue` computes `scrollToNodeId` from the existence of `stateStore.stepPosition[id]`. `client/src/components/Workflow/Editor/composables/useNodePosition.ts` writes that entry immediately during node setup, before mounting, with zero-valued bounds. Existence therefore does not establish that layout is ready. The graph's `scrollToId` watcher can pan using zero node/viewport dimensions; the subsequent measured rectangle does not change the computed primitive node ID, so there is no retry. `InvocationGraph.onMounted` also suppresses fitting whenever a target is selected. On a cold deep link into a large graph, the target can remain off screen. Require positive node and viewport dimensions, schedule centering after rendering, and cover the transition from unmeasured to measured nodes with an integration test.

## Review observations

Selector precedence, explicit numeric-label handling, safe integer validation, unique-label canonicalization, order_index-based invocation-step lookup, and embedded-view injection boundaries are coherent. Error links now preserve a nested failing step instead of discarding it. Step config fetching responds to programmatic tab activation as well as user tab clicks.

The new tests exercise helper/composable state with a synchronous router replacement mock. They do not mount InvocationGraph, WorkflowInvocationSteps, WorkflowInvocationStep, or the real tabs, so initial centering, input-group expansion, selected-step scrolling, and configuration fetching need behavior-level verification. This is particularly relevant to the finding above; the composable tests alone cannot verify graph readiness.

No code was edited and no commit was created. Existing selection-suite results were supplied by the parent; this review was primarily source-based.

</details>
