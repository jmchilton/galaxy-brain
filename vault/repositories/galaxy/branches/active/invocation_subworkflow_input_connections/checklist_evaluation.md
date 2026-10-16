# Fresh polish checklist — invocation_subworkflow_input_connections

Reviewed the rebased four-file diff against release_26.2 (base 579ca73440d776002b7099538cef000838687d8e; head bdbbdfcd2cc8a2a80306d0d0f28aa9445c5e3768), surrounding request/runtime/test code, and existing branch review records. No Git operations, test execution, code changes, or publication performed by this reviewer.

## John's Checklist

- [ ] Did a human read every test and every comment? John must check this.
- [x] What does the user see when it fails? HTTP 400 / USER_REQUEST_INVALID_PARAMETER with the subworkflow path and missing input label, e.g. `outer_subworkflow > inner_subworkflow: Subworkflow has disconnected required input 'inner_input'`, before history/invocation creation.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? API tests submit real imported workflows and assert request errors and persistence side effects; positive controls cover defaults/optional/connected inputs.
- [x] Are the comments free of excess archeology? Yes; the new docstring defines the invariant and the updated TODO identifies the remaining import-validation gap.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.
- [x] Which existing workflows change behavior (if any)? Required, unconnected, defaultless subworkflow inputs (including nested and partially connected cases) now reject submission instead of creating invocations that fail during scheduling; optional/defaulted/connected inputs retain their acceptance behavior.
- [x] Who hits this in practice and what is the evidence? Users running workflows with missing parent-to-subworkflow input connections; the existing late-failure regression plus four recorded baseline API reds reproduce acceptance of these invalid graphs, without claiming an externally reported production incident.
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? Existing runtime-only checks discover the error after persistence; duplicating their optional/default predicate risks drift, while broader input/collection validation exceeds this independent structural fix.

## Review verdict

No blocker, required code change, or design decision found. The early recursive validation runs before `_get_target_history`, normalization/materialization, and invocation persistence. The extracted predicate preserves existing runtime semantics, including identity-sentinel detection of explicit false/zero/empty defaults. The runtime partial-connection diagnostic still references the final connection exactly as before; changing it is outside this patch's purpose.

Four negative API cases cover existing/new target history, partial connections, and nested paths. They assert 400/error code/path, no invocations, unchanged existing-history jobs, and no uniquely named new history. Three falsy-default acceptance cases and three existing execution controls cover preserved behavior. This reviewer did not rerun tests; recorded prior evidence is 10 API passes and 193 workflow unit passes / 2 skips. Fresh rebased checks and CI must be recorded separately by the polishing owner.

## Description and record cautions

- Existing `implementation_debrief.md` and `initial_implementation_debrief.md` contain historical base/head/publication statements; preserve them as implementation history, but ensure the current index and final review identify the new head and base.
- Existing index text says fork CI remains unassessed above a later assessment; replace or qualify that current-sounding sentence when updating the index.
- Do not claim browser coverage: recorded browser/startup runs stopped at client-cache restore. Describe API/server evidence and separately diagnose unrelated lint/cache failures.
- The falsy-default tests assert submission acceptance, not successful execution for every falsy value. Existing execution controls cover the ordinary default and optional cases.
- No PR description existed in the reviewed branch folder. Use the required single-line opener, risks, context, agentic checks, and every checklist item above when preparing it. The archived reviews' phrase “final validation reported by the implementation agent” is provenance, not independent proof; cite actual API/workflow results in the PR.
