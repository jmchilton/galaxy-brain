Driver final gates: tip `3fea81e4cd891cb7956898210def1d9bd50a7285` passes combined30cases shuffled500101, full canonical client vue-tsc and applicable hooks/lint/format. Deferred reload strengthening passes and its missing-await mutation fails correctly; production restored. Conditional gates below are satisfied.

Recommendation: retain the four originating test rewrites, including the stronger deferred-reload check within the existing permissions scenario. No supporting file, shared helper, production, or documentation changes are warranted by this batch.

Scope reviewed against base `15ba2c4a57710c6b0715adbda5319465cfc44cc9`, canonical three-originator tip `20e39b6308ba67a3ba2e899a87d3c500bfdc6291`, and the permissions worker's documented deferred follow-through. The driver will record the final four-originator SHA and combined gates. This report evaluates scope separately from correctness review.

## As implemented: four existing originators

Keep GDateTime's typed local-Date scenarios, FormSection's shallow capability fixtures and control names, PageRevisionView's mode/action matrices and typed props, and datasetPermissions' typed response plus clearly separated initial-load/save/reload phases. The pending reload assertion strengthens one existing scenario and a finally block ensures completion even on failure; it does not create a separate feature or source scope.

| Pros | Cons |
| --- | --- |
| All original cases and assertions retained; thirty cases remain thirty | Requires combined typecheck after fixture typing changes |
| Existing helpers and lifecycle utilities solve the observed gaps | Shallow fixtures intentionally cover parent seams rather than full child behavior |
| Deferred follow-through tests a meaningful async completion guarantee | Permissions test gains a few explicit phase/assertion lines |

No supporting counters or ownership fields should change. Only the four selected originators advance after a successful push and final ownership audit.

## Contract to mechanical mount and query changes

Drop mode/date tables, action-label checks, response typing, and deferred reload completion assertions. This would reduce the patch but leave several concrete readability gaps and allow the async wait claim to be satisfied by immediate rejection even when the caller stops awaiting the reload.

| Pros | Cons |
| --- | --- |
| Smaller, mostly mechanical diff | Leaves meaningful repeated scenarios and broad fixture types |
| Less new test arrangement | Does not catch the missing-await mutation demonstrated by the worker |

## Expand fixture/helper or sibling cleanup scope

Introduce a shared workflow-step/page/response fixture or audit related permissions/toast tests. This batch needs only one small response fixture, one deliberately shallow step/output identity, and existing date/event/lifecycle helpers; no repeated cross-file setup requires a new abstraction or supporting edit.

| Pros | Cons |
| --- | --- |
| A future audit could standardize broader patterns | No demonstrated shared consumer of the save-callback response contract |
| Could reduce a few local lines later | Would hide scenario values or falsely imply a full graph model |

## Expand to production typing or async implementation changes

Narrow the production JavaScript FormSection props, replace broad workflow models, or change permissions loading/toast behavior. Those may be separate tasks, but current tests express their exact public boundaries and no production defect requires a fix here; the missing-await experiment is a temporary mutation used to challenge the test, restored afterward.

| Pros | Cons |
| --- | --- |
| Broader production types might help future work | Not required to validate these local fixtures or existing behavior |
| Could support a separate feature investigation | Changes behavior and ownership beyond this readability iteration |

## Expand to screenshots or new E2E coverage

Screenshots not relevant for this change. Applied GX_PROCESS_SCREENSHOTS to the actual selected diffs: no production component, style, browser test, screenshot step, or fixture changes introduce new visual behavior. Existing page Selenium revision/diff coverage complements exact component event/diff scenarios; date emission, capability props and deferred async completion remain meaningful local contracts.

| Pros | Cons |
| --- | --- |
| Existing browser scenarios can document user-facing pages | No changed UI appearance or screenshot artifact to validate |
| E2E can complement real backend ownership flows later | Adds infrastructure and timing without resolving a present batch gap |

The existing README guidance already covers native mounts, visible scenarios, canonical field types and lifecycle ownership. No new marginal advice or documentation expansion is needed.
