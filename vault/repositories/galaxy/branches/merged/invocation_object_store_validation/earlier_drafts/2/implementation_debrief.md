# invocation_object_store_validation — implementation handoff

STATUS: READY

Reject invalid workflow object-store preferences with HTTP 400 before creating a target history; preserve valid single-store and split-store selections.

Independent branch directly from `release_26.2` at `0c70fdd5182c7425efecf7c8e76d6bd313de88b9`. Published head: `f862f9f9f4dbb6732834591da053c42ba48afbce` on `jmchilton/galaxy`. No dependency on the original validation branch or the other extractions; no changes to their refs.

## Validation and review

New API regressions: 3 failed on the release baseline (all returned 200), then 3 passed with the fix, including no-history assertions. Existing selectable-store and mapped split-store integration tests: 2 passed. Installed lint hooks and diff checks passed. Logs: `/private/tmp/invocation-object-store-red.log`, `-green.log`, `-positive-integration.log`, `-hooks.log`.

Independent normal review and test challenge found no changes needed. Scope evaluation recommends retaining this extraction.

46 changed implementation/test lines with reuse of an existing validator; the additional substantial-plumbing/code-size review threshold is not met. API/integration coverage is appropriate for this server request fix; no UI changes. Fork CI has not been assessed.

## Scope and handoff

Validate all three preference fields through the existing selection-policy helper and move their existing mutual-exclusion guard before history creation. Scope review recommends keeping this independent extraction.

Handed off under `branches_implemented_needs_ci`; no PR created. User requested four standalone fixes on `release_26.2`.

[Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenge](test_challenges_debrief.md) · [Scope evaluation](scope_evaluation.md)
