Toward 🎯 #20900 — reject invalid invocation storage-routing options before creating a target history.

Invocation requests can accept an unselectable preferred object store, while other invalid storage options are rejected only after the requested history has been created. Apply the existing store-selection policy and move the related request guards ahead of run setup.

| Request option | With this fix |
| --- | --- |
| Unselectable general, output or intermediate store | HTTP 400 from the existing selection-policy validator; no new target history |
| General store combined with output/intermediate store preferences | Existing mutual-exclusion error before history creation |
| Caller-supplied nonempty `effective_outputs` | Existing rejection before history creation |
| Valid selectable general or split stores | Existing storage routing |

***This validates storage options submitted through the invocation API; valid workflows keep their existing storage routing.***

***The scope is early storage-routing validation, including caller-supplied effective outputs; broader invocation preflight and internally derived effective outputs retain their existing handling.***

## Risks

API callers using invalid storage preferences now receive HTTP 400 immediately; invalid routing options no longer leave a newly created target history.

<details><summary>Risk Details</summary>

- Previously accepted unselectable identifiers must be replaced with a selectable store or omitted.
- Requests with multiple independent errors can report a storage error earlier.
- Existing truthiness and general/split exclusivity rules must stay intact, including valid mapped and nested routing.

</details>

<details><summary>Risk Review Advice</summary>

Review the shared preference-validator reuse and the relocated request guards before history construction. Compare configured general, split, mapped and nested integration controls to confirm that valid jobs still reach the intended stores.

</details>

## Context

Independent extraction from 🌿[issue_20900_invocation_validation](https://github.com/jmchilton/galaxy/tree/issue_20900_invocation_validation), targeting `release_26.2`. The effective-output guard completes the adjacent storage-validation boundary without introducing a general preflight framework.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the complete early storage-routing boundary together.</summary>

The current scope evaluation considers retaining the expanded guard, adding configured-backend negative cases, reverting the movement, and universal preflight. Existing policy reuse and real storage-routing controls support the present boundary.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>The complete diff has no remaining structural blocker.</summary>

The selection policy remains in its existing validator; request guards stay explicit at the pre-mutation boundary. No new preflight abstraction is introduced.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Six negative API cases and four configured-store integration controls cover rejection and valid routing.</summary>

Tests reuse the existing raw-invocation helper. Original invalid-ID requests returned HTTP 200; the effective-output no-history assertion fails on the original scope. General/split conflicts are compatibility controls that already passed there.

</details>

## John's Checklist

- [x] Did a human read every test and every comment? Requires John.
- [x] What does the user see when it fails? HTTP 400 with the shared selection-policy or existing routing error, before a requested history is created.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes; real API requests assert rejection and persisted side effects.
- [x] Are the comments free of excess archeology? Yes; no comments added.
- [x] If comments contain some description of previous implementation, bugs, etc., what purpose do they serve? N/A.
- [x] Which existing workflows change behavior (if any)? Invalid explicit storage preferences, conflicting general/split preferences and caller-supplied effective outputs fail before history creation; valid workflows retain storage routing.
- [x] Who hits this in practice and what is the evidence? Invocation API callers submitting these options; six API regressions cover rejection without stray histories.
- [x] Were simpler or existing approaches considered? Yes; reuse the shared selection validator and move existing routing guards. Narrower scope retained the demonstrated history side effect; universal invocation preflight needs separate design.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>API regressions and configured-store positive controls</summary>

Run `TestWorkflowsApi.test_run_with_unselectable_object_store_creates_no_history` and `TestWorkflowsApi.test_run_with_invalid_storage_routing_creates_no_history` in `lib/galaxy_test/api/test_workflows.py`.

Implementation validation at the published head: **6 negative API cases passed** after helper cleanup, and **4 object-store integration cases passed**, covering default/general, split, mapped and nested routing. Fresh polish verification: **6 API cases and 8 integration controls passed**, including normal and extended metadata configurations. Black, isort and whitespace checks pass. Fork CI remains queued; these local results do not imply completed fork CI.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
