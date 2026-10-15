Addressed both findings: step tabs rebuild when their available names change, and teardown-driven model updates are ignored during rebuild, collapse, and disposal. Reviewer rechecked the fixes and confirmed the source addresses both findings. Real-GTabs regression results are recorded in the phase 2 debrief. No recommendations declined.

<details><summary>Full review</summary>

# Phase 2 normal implementation review

Reviewed the tracked and untracked implementation against base `88127f42979`, the local issue proposal, plan, phase 1 notes, REVIEW_FOCUS.md, and SECURITY_REPORTS.md. Source review covers the route provider, graph, Steps cards, job filters/pages/dialogs, dataset/collection outputs, Share, error consumers, and GenericItem compatibility. Phase 2 tests were being adjusted by the implementation agent during this review; no competing source edits or test execution were performed. GitHub issue reread failed because the API was unreachable, so the complete local proposal was used.

## Findings

- **P2 — Ignore teardown-driven tab updates before they reselect the old card.** `client/src/components/WorkflowInvocationState/WorkflowInvocationStep.vue:156` writes every `selectedTab` model update into the shared selection. `GTabs.unregisterTab` (`client/packages/ui/src/components/GTabs.vue:82`) clamps its active index and emits an update while its GTab children unmount. After clicking Config, the card retains `localTab = config`. Collapsing the selected card or selecting another graph step unmounts these children; removing Jobs from a three-tab card clamps index 2 to 1. The old card's setter then selects its own step again and writes Outputs. In the Steps list this can reopen the just-collapsed card; graph navigation can return to the old card. Guard updates during card/GTabs teardown and cover a real Config-tab selection followed by collapse and by graph-step replacement. This lifecycle interaction is not exercised by tests that emit directly from stubs.

- **P2 — Keep named card tabs aligned when outputs first become available.** `WorkflowInvocationStep.vue:144` assumes registration order Jobs, Outputs, Config, but its conditional Outputs GTab can mount later during polling of a running step. GTabs appends newly registered tabs, leaving actual registration order Jobs, Config, Outputs. Consequently the controlled name-to-index mapping activates the wrong pane and writes the wrong `step_tab`; a later output link can select Config while claiming Outputs. Keep registration order stable or derive the mapping from stable tab identities. Cover an initially output-free running step whose polled details acquire outputs while the card remains mounted.

## Other observations

The scoped provider and explicit disabling in embedded WorkflowInvocationState components preserve local behavior. Numeric label handling, alias precedence, order_index lookup, initial workflow-readiness gating, current-route Share links, report notebook id preservation, mapped-job filtering/pagination, and active-card output scoping are coherent on source inspection. No source mutation or commit was made by this reviewer. Follow-up implementation/testing should confirm both lifecycle findings with real GTabs rather than relying on direct v-model event emission.

</details>
