**Overall: PASS.** Evaluated head `3e2bc827a99` (base `release_26.1`) against GENERAL.md + WORKFLOW_RELATED.md by a fresh subagent (second pass, after the `modules.py` fix). Human-read item left for John. Known gap: the pre-existing child-invocation ERROR (`NoReplacement`) still fires after the fix; out of scope.

An earlier pass on `e6f7bb114c4` also passed but wrongly cited `test_run_with_validated_parameter_connection_invalid` as reaching this reason. A reproducer then showed the parameter-input emitter crashed into `unexpected_failure`, which led to commit `3e2bc827a99`.

## Galaxy PR checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Invalid subworkflow parameters now show "Workflow parameter on <step path> failed validation: Parameter 'input': must start with moo". Before, users saw a generic "unexpected failure" with no details.
  <details>

  - Before: `workflow_step_id=None` makes the pydantic model raise. `run.py:111-115` (`except Exception`) stores `unexpected_failure` with no details and logs ERROR plus a traceback. `InvocationMessage.vue:201-202` shows "an unexpected failure occurred.".
  - After: `run.py:102-104` stores the real reason. `InvocationMessage.vue:209-213` renders the step path and details. The scheduler logs `reason=... failed_step_id=... details=...` at INFO (`run.py:264`).
  - Still ERROR: the scheduler later picks up the child invocation (`new` with a handler set, `poll_active_workflow_ids`) and it fails with `TypeError: ... 'NoReplacement'`. The base does the same. Correction (verified by an API probe after this evaluation): the child invocation, which the message's step badges link to, ends `failed` with `unexpected_failure` and no details. Only the parent shows the real reason.
  </details>
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. The API test runs a real nested invocation and asserts only API-visible results: state, reason, details, step path and step index.
  <details>

  - Red→green: with the `modules.py` fix reverted it fails on `'unexpected_failure' == 'workflow_parameter_invalid'`; with the fix it passes.
  - The INFO vs ERROR log level from the tuple change isn't asserted; it's shown only in the run logs.
  - `workflow_step_id == 0` is the subworkflow step's `order_index` as the API returns it, matching the neighboring test.
  </details>
- [x] Are the comments free of excess archeology? Yes. Both comments explain how the test is built.
  <details>

  - "The parent input has no validator, so the value is only checked when the subworkflow schedules." Accurate. Directly submitted values are validated at request time (`run_request.py:402-404`).
  - "Format2 inputs can't declare validators, so add one to the exported native subworkflow." Accurate for gxformat2 0.27.0.
  </details>
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## Workflow-related

- [x] Which existing workflows change behavior (if any)? A subworkflow parameter input whose validator rejects a value from the parent now fails with `workflow_parameter_invalid` and details instead of `unexpected_failure`. All `workflow_parameter_invalid` failures now log at INFO instead of ERROR.
  <details>

  - Emitter 1, `modules.py:1802-1809` (`InputParameterModule.execute`): fixed by commit 2. Before the fix it never produced this reason.
  - Emitter 2, `modules.py:3097-3101` (tool-step runtime state errors that aren't a deleted input): already used `step.id`, so only its log level changes. Not exercised by tests. It also covers stored tool state that became invalid (e.g. after a tool upgrade), an author/admin problem that will no longer reach Sentry, though it is still recorded on the invocation.
  - `sentry_event_level` defaults to `ERROR` (`config_schema.yml:2487-2489`).
  - Top-level values submitted directly were already rejected at request time with a 400. Unchanged.
  </details>
- [x] Who hits this in practice and what is the evidence? Authors of workflows that nest a subworkflow whose parameter inputs have validators (#19092). Evidence: a local reproducer plus the new test. No production log for this exact path.
  <details>

  - In #20900 mvdbeek links a Sentry event where a text parameter got an integer via `planemo run`. Which path and reason it hit is unconfirmed.
  - `invocation.py:95-100`: user-actionable reasons recorded on the invocation belong in the tuple.
  </details>
- [x] Were simpler or existing approaches considered? Yes. Each change is one line and reuses an existing mechanism.
  <details>

  - Tuple entry follows precedent: #21982 added `step_input_deleted` on a release branch. The tuple came from #18594, and #19092 added the reason without adding it to the tuple.
  - Step id: `invocation_step.workflow_step.id` is what the sibling emitter uses (`step.id`). Flushing to fill `workflow_step_id` would be heavier and change transaction behavior.
  - Not pursued: a dedicated log-level test (disproportionate), expanding into #20900 request-time validation (couples to acceptance policy), and fixing the child-invocation `NoReplacement` ERROR (a general subworkflow-failure issue).
  </details>
