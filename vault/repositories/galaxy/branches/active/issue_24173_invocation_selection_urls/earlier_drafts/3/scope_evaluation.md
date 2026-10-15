Keep the scope as implemented for issue #24173; no scope change or user scope decision is recommended. The full step, mapped-job, and output URL contract is the requested feature, and the supporting graph, tab, route-lifecycle, and order_index work is necessary to make that contract usable. Browser validation, E2E polish, screenshots, and final consolidated checks remain handoff gates owned by the coordinating agent; their unfinished status does not justify reducing the feature or expanding its design.

## As implemented: complete invocation selection URLs — recommended

The routed invocation owns selection query parsing and serialization for the three step selectors, named card tabs, mapped-job dialogs, and step/workflow outputs; Overview, Steps, Share, and subworkflow error jumps participate. Embedded views remain local, query changes preserve the invocation component, and report query behavior, imported-step lookup, graph measurements, and dynamic tab lifecycle are handled within the affected boundaries.

| Pros | Cons |
| --- | --- |
| • Meets the issue's explicit examples and consumer changes.<br>• Shared selection ownership keeps related interactions consistent.<br>• Includes compatibility safeguards required by persistent component lifetime. | • Touches several existing presentation components.<br>• Local GTabs lifecycle guards require focused regression coverage.<br>• Full browser and screenshot gates must finish before READY. |

<details><summary>Review basis and boundary</summary>

Read the live issue body and comments through GitHub, branch plan and initial debrief, both implementation and normal-review records, test challenge debrief, strict code quality review, and the current implementation surface against base 88127f42979, including new untracked files. This is a scope assessment, not another correctness review or test run. The phase reviews found graph measurement readiness, conditional tab registration order, and teardown-driven model updates; the challenge strengthened integration coverage and adjusted lifecycle handling; the strict review narrowed query reuse to the consolidated route through route metadata. These are corrections needed to deliver the requested scope rather than separate feature proposals. No reviewer proposed an unresolved expansion or contraction.

The issue explicitly leaves the standalone job page's invocation row bare because resolving a job's step is a follow-up. Retaining that behavior is therefore consistent with scope. The route-only provider, shared graph scrolling boundary, optional GenericItem expansion control, and targeted order_index lookups are supporting changes, not a broad redesign. Report notebook switching and legacy report remounting are compatibility requirements of changing route lifetime.

At review time, the test challenge records 44 focused client tests passing and the strict review records one additional real-layout regression passing; the coordinator reports a clean full typecheck before that layout test. E2E setup/polish and screenshots are still in progress. Those results must be recorded by their owners; this document does not claim that browser acceptance has passed.

</details>

## Contract only for steps, with jobs and outputs deferred

Deliver the three step selectors, Overview/Steps positioning, named card tabs, and sharing first, leaving mapped-job dialogs and output expansion for a later change. This reduces the initial review surface but removes several central acceptance examples.

| Pros | Cons |
| --- | --- |
| • Smaller feature and browser matrix per delivery.<br>• Fewer job/output component changes initially. | • Fails the requested single failed-job and result-link use cases.<br>• Splits an already implemented shared contract.<br>• Requires rework and an explicit user decision rather than completing current validation. |

## Same feature split into multiple deliveries

Keep the complete design but ship the route/step contract and then job/output integration as separate dependent changes. The implementation phases already provide conceptual review boundaries; turning them into separate deliverables would change release sequencing rather than the final capability.

| Pros | Cons |
| --- | --- |
| • Smaller individual reviews.<br>• Can isolate deployment risk if requested by maintainers. | • Temporary partial support for the documented URL contract.<br>• Additional branch, integration, and validation overhead.<br>• No review finding currently requires this split. |

## Expand to a shared semantic GTabs redesign

Replace the shared UI library's position-based tab identity with semantic identities, then simplify invocation card integration around that new contract. The strict review explicitly considered this direction and accepted the local compatibility guards instead.

| Pros | Cons |
| --- | --- |
| • Could remove the invocation's registration-order adapter.<br>• May benefit other conditional-tab consumers. | • Broadens risk and migration work across unrelated callers.<br>• Requires independent library design and regression coverage.<br>• Not required for issue #24173; optional follow-up only. |

## Expand job links to resolve a step from a job alone

Make a standalone job page's invocation link select its job automatically, or accept invocation URLs containing only a job id and resolve the owning step. The issue explicitly identifies this as a follow-up because that consumer lacks a step selector.

| Pros | Cons |
| --- | --- |
| • Improves another entry point into an invocation.<br>• Avoids requiring callers to know the step. | • Adds lookup, loading, and failure behavior beyond the proposed contract.<br>• Potential API/data dependency absent from the existing consumer.<br>• Optional follow-up; not a reason to hold this feature. |

## Replace the query contract with one step key or nested paths

Use one overloaded step value or introduce deeper routes for step/job/output selection. These are architecture alternatives discussed in the issue rather than useful reductions to the current implementation.

| Pros | Cons |
| --- | --- |
| • One key or path may appear shorter in simple links.<br>• Nested routes could encode some hierarchy. | • One key loses explicit index/number/label meaning or makes numeric labels ambiguous.<br>• Paths compete with existing invocation tab routing.<br>• Requires redesign without solving an unresolved implementation constraint. |

## Keep only standalone job and dataset links

Retain the existing standalone object views and omit in-context selection URLs. This is the lowest implementation effort alternative, but it does not address the issue's purpose.

| Pros | Cons |
| --- | --- |
| • Uses existing navigation with minimal feature work. | • Loses run, step, and mapped-job context.<br>• Cannot share the requested graph/card/output state.<br>• Does not satisfy issue #24173. |
