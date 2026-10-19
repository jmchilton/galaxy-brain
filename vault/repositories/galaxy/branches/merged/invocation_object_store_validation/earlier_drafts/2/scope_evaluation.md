Expand modestly: complete the early validation of invocation storage-routing options by moving the existing prohibition on caller-supplied `effective_outputs` alongside the preferred-store checks, before target-history creation. Preserve its current truthiness semantics and error text, retain the three existing preference checks, and add request-level coverage of this adjacent rejection and the relocated general/split conflict rule; this needs no general invocation-preflight refactor.

## As implemented: early preferred-store validation

All three explicit preference fields use the existing selection-policy validator before histories are created, and the existing general/split mutual-exclusion rule moves with them. The code already covers selectable distributed stores through the same policy used by histories and users, although the new negative regression runs only with selection disabled.

| Pros | Cons |
| --- | --- |
| • Consistent policy for all three fields.<br>• Existing valid general/split integration controls pass.<br>• Standalone, small production change. | • The adjacent storage-routing `effective_outputs` rejection still occurs after history/input preparation.<br>• No new regression protects the relocated conflict guard. |

## Recommended: complete storage-routing validation before history creation

Move `if payload.get("effective_outputs")` and its existing `RequestParameterInvalidException` from the run-config loop into the early storage-validation block. Add an API regression with a truthy caller-supplied effective-output declaration that asserts the existing HTTP 400/message and absence of the requested new history; cover general-plus-output and general-plus-intermediate conflicts similarly, ideally with valid selectable IDs under the existing object-store integration fixture so the test isolates the conflict rule.

| Pros | Cons |
| --- | --- |
| • Fixes another observable side effect in the same touched storage-routing block.<br>• Preserves accepted requests and existing policy/error semantics.<br>• Protects both moved early-rejection paths through real requests. | • Adds a small production movement and several test cases.<br>• Requires fresh request regression and existing split/nested storage positive checks. |

<details>
<summary>Why this belongs with the preferred-store fix</summary>

`InvokeWorkflowPayload` exposes `effective_outputs` immediately beside the three preferences (`lib/galaxy/schema/workflows.py`), so this is a reachable request option. Its current guard is immediately before the preference block removed from the run-config loop. Internally, `workflow_run_config_to_request` derives effective outputs from subworkflow outputs when split storage is used; callers must continue to be rejected from supplying that metadata. Moving the existing guard does not change internal `WorkflowRunConfig` construction or that derived-output calculation. Keep omitted/null/empty values accepted exactly as today rather than introducing new schema semantics.

The earlier normal review and challenge identified no necessary expansion and correctly observed that the preference predicates remain unchanged. The old scope evaluation compared the narrow fix mostly with wholesale preflight; this evaluation explicitly considers the reachable adjacent storage-routing check instead. Existing preference and positive integration results remain useful, but do not establish the added effective-output rejection's lack of history side effects.
</details>

## Alternative modest expansion: broaden policy coverage without changing production code

Add distributed-store rejection cases for an unknown ID and the existing nonselectable `dynamic_s3` backend, across all three preference fields, while retaining the positive selectable controls. This usefully demonstrates the general policy already implemented, and is worthwhile if inexpensive in the integration fixture, but it leaves the adjacent late effective-output check unfixed.

| Pros | Cons |
| --- | --- |
| • Exercises configured-store rejection rather than only globally disabled selection.<br>• No additional production behavior. | • Primarily strengthens evidence for an existing contract.<br>• Does not resolve the adjacent late-validation side effect. |

## Smaller: add preference checks but leave conflicts late

Keep only the new per-field validation and restore the old location of the exclusivity guard. This saves little and knowingly leaves another invalid storage-selection request creating a history.

| Pros | Cons |
| --- | --- |
| • Slightly fewer moved lines. | • Splits related validation across phases.<br>• Preserves avoidable history creation for invalid combinations. |

## Larger: validate every run option before mutation

Move resource-parameter validation and other request checks into a complete preflight stage, potentially involving input resolution and tool state. Those request features have distinct dependencies and can be addressed separately; they are not required to finish the contiguous storage-routing checks.

| Pros | Cons |
| --- | --- |
| • Could eliminate additional invalid-request side effects. | • Expands into unrelated parameter/resolution behavior.<br>• Introduces more design decisions than the concrete adjacent storage fix needs. |

## Review basis

Read the revised scope process, current head `90ef0b0382b6614a1bcea0204300d813baa2091e`, complete two-file implementation diff, original and polish handoffs/checklists, normal review, test challenge, archived scope evaluation, request schema, shared selection validator and object-store policy, run-config serialization and subworkflow effective-output derivation, and the distributed-store integration fixture/positive tests. This is a scope evaluation; no implementation or test execution was performed.
