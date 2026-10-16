# Checklist evaluation — invocation_no_add_to_history_false_26.1

Reviewed head `050ada8acaea67f141df241523c7fa3f270fb22a` against `release_26.1` (`b2b1e1deeeebf84f16d33fb8831f42987f77267a`), using the supplied complete two-file diff and surrounding server code. No tests were executed in this review; branch notes record 8 passing API cases before the conflict-free rebase. Scope remains the two server fixes only.

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Explicit `false`/`null` now copies cross-history inputs; empty/null `ds_map` alongside `inputs` now runs, while conflicting non-empty maps retain the existing 400 message.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. API requests check target-history contents and HTTP status/error text rather than internal expressions.
- [x] Are the comments free of excess archeology? Yes. No comments are added.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? Definitions remain unchanged; explicit `false`/`null` now copies inputs, empty/null legacy maps alongside `inputs` are accepted, and `inputs: null` can fall back to a non-empty `ds_map`.
- [x] Who hits this in practice and what is the evidence? The published 26.1.1 API-client types require these defaulted fields, pushing typed callers toward the failing payloads; no affected production caller is identified.
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? Yes. Two local value-based checks preserve payload handling; changing `exclude_unset=True` would affect other fields, while generator/schema changes belong to the separate 26.2 branch.

<details><summary>Evidence and review limits</summary>

- `lib/galaxy/webapps/galaxy/services/workflows.py:159` passes `payload.model_dump(exclude_unset=True)` into `build_workflow_run_configs`. Explicit null/false/empty values survive this serialization; omission does not.
- `lib/galaxy/schema/workflows.py:195-217` permits nullable `inputs`, nullable `ds_map` with default `{}`, and nullable boolean `no_add_to_history` with default `False`. The stale no_add_to_history description is intentionally outside this backport's scope.
- `lib/galaxy/workflow/run_request.py:332-335` replaces only two presence checks. `:350-361` already chooses legacy ds_map when inputs is null, explaining the newly accepted fallback. `:416-468` uses the same copy flag for dataset/library/collection inputs.
- `test_run_no_add_to_history` posts four real payload variants and asserts that target history gets one dataset for omission/null/false and none for true. Separate source/target histories make this an observable regression rather than a same-history no-op.
- `test_run_inputs_with_ds_map` posts omitted/null/empty/non-empty maps beside real inputs; it verifies acceptance for the first three and the unchanged 400 error message for the last.
- The sibling 26.2 PR description supplies the concrete minimal TypeScript request, TS2740 failure, and required-default field explanation. This review did not independently rebuild the published package. The backport must not claim it corrects those generated types.
- Existing branch notes record 8 local API passes and relevant fork server/API checks; browser jobs stopped at cache restoration. Those stopped jobs provide no browser coverage. Fresh post-rebase verification remains the parent polish task's responsibility.
- HDA coverage establishes the public bug. Library/collection variants and `inputs: null` with non-empty ds_map are not separately covered by the added tests; surrounding code confirms their behavior, and broader input matrices stay outside this narrow backport.

</details>

Verdict: no code blocker or design decision found. Keep the copy-behavior compatibility risk explicit: a caller that previously sent false/null and relied on the broken opt-out will now see inputs copied. A 26.1-specific PR description must avoid inheriting generator/schema claims from the sibling 26.2 description. Human-read item remains pending.
