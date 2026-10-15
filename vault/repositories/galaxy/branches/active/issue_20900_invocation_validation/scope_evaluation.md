# Scope evaluation — invocation validation rebase

Retain the requested rebase scope; no scope change is required. Reconcile `issue_20900_invocation_validation` with the four polished standalone fixes and current upstream behavior, then report remaining extraction ideas for a later decision. This recommendation concerns task boundaries only: inherited test failures remain, so it does not declare the broad validation branch ready for review or merge.

## Requested scope

Rebase the broad validation work over the polished fixes while preserving their reviewed behavior, retaining current upstream multiple-parameter handling, and resolving conflicts introduced by that reconciliation. Explain useful further splits without implementing them, as requested by the user.

| Pros | Cons |
| --- | --- |
| Keeps branch reconciliation separate from new feature work. | Leaves the original validation branch substantial. |
| Preserves review attribution and enables independent upstreaming of the four existing fixes. | Requires an explicit later decision on further extractions. |
| Addresses the user's requested operation and planning question directly. | Does not resolve all inherited failures. |

## Extract four more fixes immediately

Additionally extract invalid preferred object-store IDs, unknown completion actions, workflow-incompatible tool checks, and disconnected required subworkflow input checks. These are existing behaviors in the broad source branch and plausible future slices, but the user requested ideas rather than implementation of additional branches.

| Pros | Cons |
| --- | --- |
| Produces smaller, separately reviewable upstream changes. | Expands the present request beyond the requested rebase and advice. |
| Removes several independent request-field and structural checks from the central refactor. | Adds separate tests, reviews, handoffs, and reconciliation work before the requested operation is complete. |
| Can proceed later without the complete data resolver refactor. | Independent guards must not claim full request atomicity or universal absence of side effects. |

## Also fix all inherited mapping, caching, and replacement regressions

Expand the work to diagnose and repair all known inherited failures in `test_mapping_and_subcollection_mapping`, `test_workflow_resume_with_mapped_over_collection_input`, `test_workflow_rerun_with_use_cached_job_hides_output`, and `test_run_replace_params_over_default`. These failures are reported by the main task's validation work; this scope evaluation does not independently assess their causes or correctness.

| Pros | Cons |
| --- | --- |
| Could move the broad validation branch toward a reviewable state. | Broadens a reconciliation request into substantial behavioral repair. |
| Removes known blockers before eventual upstreaming of the remaining core. | Blurs inherited failures with regressions introduced by the rebase. |
| Allows deeper validation of the core resolver changes. | Needs a separate implementation and validation scope; no readiness claim is warranted now. |

## Evidence and boundaries

The existing implementation debrief documents all four suggested future checks, so their behavior is not newly invented; the recommendation to package them independently is a scope inference from their code dependencies. The multiple-text per-value validator is already upstream through merged multiple-parameter work and should not become another extraction. The source debrief's validate-before-side-effects architecture, parameter checks, and data-resolution concerns remain the central work; splitting smaller guards does not establish that the remainder is correct.

No production changes or additional extractions were performed for this evaluation.
