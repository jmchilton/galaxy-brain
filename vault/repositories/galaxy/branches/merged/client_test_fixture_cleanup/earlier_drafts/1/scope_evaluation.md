Keep the scope as implemented: correct the shared JobInformation fixture, strengthen its existing rendering assertion, and remove the redundant CollectionProgress JavaScript suite. No expansion or contraction is recommended; retain the independent cleanup branch based on the fixed `d49bea20fac` readability tip so the moving readability lane remains intact.

## As implemented — recommended

The cleanup changes three test files: four string messages become schema-shaped RegexJobMessage objects, two overlapping JobInformation cases become one exact visible-fields/numbering assertion, and CollectionProgress.test.js is deleted. Its four scenarios remain in the TypeScript suite, which also asserts exact bar sets and terminal-job hiding; ToolSuccessMessage remains covered as the only other shared-fixture consumer.

| Pros | Cons |
| --- | --- |
| • Resolves both requested issues. <br> • Removes duplicate execution while preserving the covered behaviors. <br> • Keeps application code and inherited readability commits outside this change. | • Reduces the reported case count, requiring the retained-case mapping for review. <br> • Shared fixture edits require checking both consumers. |

## Narrower: fixture shape only

Correct the JSON fixture while preserving the prior JobInformation cases and leaving CollectionProgress.test.js for a later cleanup. This addresses the immediate nonsense rendering but leaves the duplicate suite and overlapping field assertions unresolved.

| Pros | Cons |
| --- | --- |
| • Smallest immediate edit. <br> • Avoids any removed-case discussion in this branch. | • Completes only one of the two requested cleanups. <br> • Leaves a redundant suite and weaker fixture coverage. |

## Preserve the duplicate until another port review

Correct the fixture and strengthen JobInformation, but keep both CollectionProgress suites until a separate review authorizes deletion. The existing TypeScript coverage already includes every JavaScript scenario, so this additional staging step supplies little value.

| Pros | Cons |
| --- | --- |
| • Retains the current case count temporarily. | • Leaves the second requested issue unresolved. <br> • Repeats equivalent execution despite stronger retained assertions. <br> • Requires another cleanup and review. |

## Broader: migrate JobInformation tests or model more message variants

Convert JobInformation.test.js to TypeScript and/or introduce fixtures for other supported message variants and stronger schema checks. Those could be useful follow-up work but are unnecessary to correct these four shared messages; the existing stream-read diagnostic case remains intact.

| Pros | Cons |
| --- | --- |
| • Could detect future API/fixture drift earlier. <br> • Could broaden variant coverage. | • Adds migration and fixture-design decisions unrelated to this request. <br> • Increases validation and review costs for a small cleanup. |

## Delivery: independent branch from the fixed readability tip — recommended

Deliver the three-file diff independently from `d49bea20fac`; inherited readability commits are its base, not part of this cleanup review. This keeps the lane available for subsequent batches and gives reviewers a fixed comparison point.

| Pros | Cons |
| --- | --- |
| • Preserves the moving readability lane and its history. <br> • Makes this cleanup independently reviewable. | • Branch management must account for the inherited base when delivering the change. |

## Delivery: fold changes into an existing readability commit

Amend or rewrite the relevant readability lane commit rather than retain a separate cleanup branch. This may group related work, but would change an already moving lane and complicate the boundary between the original batch and this request.

| Pros | Cons |
| --- | --- |
| • Groups cleanup with the earlier test-readability work. | • Requires history changes and coordination beyond the authorized cleanup. <br> • Makes the original review boundary less stable. |

## Review context and validation boundary

Normal review approved the implementation without code or security findings. Its documentation correction identifies `error_level: 1` as LOG, not WARNING; this changes the debrief wording, not the implementation scope. The reported focused run passed 15 tests and formatting/lint checks; type checking and independent quality/test-challenge reviews were underway when this scope evaluation was prepared. Their completion belongs to final readiness validation, and no additional test or application scope is needed on the evidence available here.
