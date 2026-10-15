# Strict code quality review

The review is complete. One P2 route lifecycle regression was identified and corrected with the parent agent's authorization. No outstanding structural blocker or scope change is recommended. Full browser, screenshot, and final typecheck outcomes remain the parent session's responsibility.

## Review scope

Reviewed all tracked and untracked issue #24173 changes against base `88127f42979`, including selection parsing/provision, invocation graph and list integration, named card tabs, job filtering/pagination/dialogs, dataset and collection expansion, Share/error consumers, route/layout lifecycle, component regressions, and the mapped-job Selenium scenario. Read the strict review prompt, shared review/security policies, branch plan, initial implementation debrief, normal implementation reviews, and test challenge debrief. Source review preceded modifications; changes were coordinated with the parent and browser-polish agent to avoid disrupting feature navigation.

## Finding and disposition

**P2 — Scope query-preserving component lifetime to the consolidated invocation route.** The initial `Analysis.vue` change used `route.path.startsWith("/workflows/invocations/")` to retain the routed component across query changes. This also covered the existing `/workflows/invocations/report?id=...` route. That route renders `InvocationReport.vue`, which fetches its report once during setup and provides the invocation id nonreactively. Navigating from report A to report B would update its props and export/edit targets while retaining A's report content. This was a concrete sibling-path regression and a lifecycle policy leaking across the intended boundary.

**Addressed.** The consolidated `workflows/invocations/:invocationId/:tab?` record now explicitly opts into `meta.reuseOnQueryChange`; Analysis consults that metadata instead of a URL prefix. The route owns its reuse policy, while the shared layout applies it directly. Other invocation routes retain their established full-URL component key. Added `Analysis.test.ts`, mounting the actual Analysis layout with a real memory router and small routed pages. It checks component identity across step/job query replacement, remounting on main-tab navigation, and remounting between two legacy report ids. The fixture isolates layout lifetime from unrelated report APIs and invocation polling.

## Structural assessment

- The selection composable is a useful ownership boundary: query parsing and canonical serialization are centralized; only the routed invocation provides synchronization; embedded invocations explicitly mask inherited selection context. Typed tab names and integer/unique-label resolution keep the URL contract understandable.
- The chosen scoped workflow-state store reuses the graph's existing active-node state rather than adding a competing selected-step model. Resolving invocation records by `order_index` consistently fixes the prior array-position assumption across the touched consumers.
- Graph scrolling now waits for positive viewport and node measurements. Keeping this in WorkflowGraph's existing scroll-to API is appropriate; feature-specific URL parsing has not leaked into the shared graph.
- GenericItem's controlled expansion interface is a reusable extension to the existing dataset/collection card boundary. It preserves an undefined/uncontrolled mode for other consumers and forces data loading for off-screen explicit targets.
- Job filtering remains with JobStep and paging/modal presentation with JobStepJobs. Existing local behavior remains available without route ownership. The optional selected-job value and explicit selection-enabled flag distinguish an empty controlled selection from an uncontrolled embedded modal; deleting that distinction would regress closing behavior.
- The keyed card-tab rebuild plus teardown/rebuild guards deserve scrutiny, but are justified here. The current shared GTabs API assigns registration indices by append order and emits index clamps while children unregister. A conditional output tab arriving later therefore changes the correspondence between semantic tab names and actual children, while teardown can accidentally reselect an old card. The local adapter contains these known index-lifecycle constraints, with real-GTabs regressions covering initial config links, tab clicks, collapse/re-expansion, disposal, inactive-card isolation, and output arrival. A shared semantic-identity redesign would broaden impact to every GTabs consumer; no equally safe smaller simplification was identified. No global overhaul is recommended for this issue.
- No touched file crosses from below 1,000 lines to above 1,000 lines. WorkflowInvocationStep remains 465 lines, WorkflowGraph 366, and Analysis 178. Existing `any`-typed step/config data and timeout code are pre-existing; this feature does not require unrelated type churn.
- URL updates replace history within a tab and retain main-tab routing behavior. Named selectors avoid interpreting numeric labels as step positions. Report notebook `id` state remains separate from selection keys.

## Validation

- Targeted command: `NODE_OPTIONS=--no-experimental-webstorage pnpm exec vitest run src/entry/analysis/modules/Analysis.test.ts --maxWorkers=1` — **1 file / 1 test passed**.
- Prettier check of Analysis.vue, Analysis.test.ts, and router.js — passed.
- Source-level review of the production route metadata confirms the opt-in is on the consolidated invocation route alone.
- Prior feature test results are recorded in `test_challenges_debrief.md`; they were reviewed, not claimed as rerun by this reviewer. Parent owns consolidated validation after all concurrent changes.

No source commits were created by this reviewer. No review recommendations were declined.
