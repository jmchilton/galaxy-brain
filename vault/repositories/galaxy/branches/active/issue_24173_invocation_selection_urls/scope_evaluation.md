Retain the user-approved prep/feature split and the complete issue #24173 selection contract; no further scope change or user decision is recommended. The independent prep is now five commits ending at `60dc8ddf598`, while this feature is 1,442 changed lines across 24 files above prep and ends at `a0482b43e0c`. GenericItem's new expansion API remains together with its first production consumers, and the final combined tree is identical to pre-extraction head `43167c36a4c`.

## As implemented: complete selection feature above independent prep — recommended

The feature owns routed step index/number/label selectors, named card tabs, mapped-job dialogs and pagination, step/workflow output expansion, readable sharing, and subworkflow error targets. Scoped selection, complete cached workflow labels, route lifetime compatibility, and focused unit/browser coverage support that requested behavior; independent lookup/readiness fixes and baseline tests are delivered by prep.

| Pros | Cons |
| --- | --- |
| • Preserves the full issue contract and the user's approved split.<br>• Keeps new APIs beside their consumers.<br>• Exact final-tree equality preserves earlier combined-feature acceptance evidence. | • Feature still spans several presentation boundaries.<br>• Depends on prep integration.<br>• Prep's fresh validation and final handoff records must complete. |

## Reduce feature to step selectors and defer jobs/outputs

Deliver only step selection, tab naming, and sharing, leaving mapped jobs and outputs for a later change. This reduces one review surface at the cost of removing central examples from the requested issue.

| Pros | Cons |
| --- | --- |
| • Smaller immediate feature patch. | • Drops failed-job and result-sharing use cases.<br>• Splits an already implemented coherent contract.<br>• Would require a new user decision and revalidation. |

## Recombine prep and feature

Return the independent fixes and tests to the original combined branch. The combined behavior would remain identical, but this reverses the user's explicit organizational choice.

| Pros | Cons |
| --- | --- |
| • Removes a stacked integration dependency. | • Violates the requested split.<br>• Restores a larger review diff.<br>• Provides no additional user capability. |

## Expand to shared semantic tabs or job-only invocation links

Redesign GTabs around semantic identities, or infer an invocation step from a standalone job id. Prior review considered the shared tab direction and accepted the local compatibility boundary; the issue explicitly leaves job-only invocation linking for follow-up.

| Pros | Cons |
| --- | --- |
| • Could simplify other conditional-tab consumers.<br>• Could improve additional entry links. | • Broadens API, migration, and regression obligations.<br>• Not required to satisfy the current contract.<br>• No unresolved review finding requires expansion. |

## Move unused interfaces into prep

Extract GenericItem controlled expansion or selection/tab state before its production callers. The user rejected this boundary, and the completed split deliberately keeps those changes feature-side.

| Pros | Cons |
| --- | --- |
| • Reduces the numerical feature diff. | • Leaves new interfaces without consumers.<br>• Violates the approved split.<br>• Adds integration overhead without simplifying ownership. |

<details><summary>Assessment basis and evidence applicability</summary>

Read the shared scope procedure, archived prior scope review, extraction/initial debriefs, prior implementation/review findings, and both actual commit ranges. This is a scope review rather than repeated correctness work or another test run. Prior findings about geometry, tab registration/disposal, route reuse, and label metadata were implementation corrections within the original contract, and no unresolved expansion or contraction was proposed. The new user direction is the already-approved extraction, not a reduction of delivered capability.

Verified original and rebased feature heads both resolve to tree `83035b1de9443da8e780488afb0d933aaee65729`; a direct diff is empty. Existing combined-feature tests/screenshots therefore remain applicable to identical content. Prep is +158/-46 across 12 files; the dependent feature is +1398/-44 across 24 files. Independent prep validation, challenge, browser evidence, and final tracking handoff remain responsibilities of their owners and are not claimed complete here.

</details>
