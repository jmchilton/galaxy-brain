Follow-up to 🔀 #20980 - a subworkflow parameter that fails its validator fails the invocation with its real reason again, logged at info instead of as a server error.

#19092 added validators to workflow parameters. If a parent workflow passes a value into a subworkflow parameter and that parameter's validator rejects it, the failure is only found while the subworkflow is scheduling. Since #20980 ([25.0]), that path crashes while building its own failure message, so the user gets a generic error and the admin gets a traceback. With a parent `text` input feeding a subworkflow `text` parameter that must match `^moo`, run with `cow`:

| | `release_26.1` | This branch |
| --- | --- | --- |
| Invocation message | Invocation scheduling failed because an unexpected failure occurred. | Workflow parameter on `2:nested` → `1:inner_text` failed validation: Parameter 'input': must start with moo |
| API `reason` | `unexpected_failure`, `details: null` | `workflow_parameter_invalid`, with details and step path |
| Scheduler log | `ERROR` "Failed to schedule … ValidationError" for the subworkflow and the parent, then `ERROR` "Failed to execute scheduled workflow." with a pydantic `ValidationError` traceback | `INFO` "Failed to schedule … Failure reason: reason=FailureReason.workflow_parameter_invalid, failed_step_id=4, details=Parameter 'input': must start with moo" for both (then the subworkflow re-run noted below) |

Two one-line changes:

- `InputParameterModule.execute` passes `invocation_step.workflow_step_id`, which is still `None` before the step is flushed. The failure model requires an int, so building it raised. #19092 passed `step.id` here; #20980 switched it to the unflushed id. It now uses `invocation_step.workflow_step.id`, like the tool-step emitter of the same reason.
- `workflow_parameter_invalid` joins `FAILURE_REASONS_EXPECTED`, the list of user-actionable reasons the scheduler logs at info rather than error. #19092 added the reason after #18594 created that list, and it was never added. With the default `sentry_event_level: ERROR`, these user errors are reported to Sentry as if they were server bugs.

***This doesn't hide anything from users: the invocation still fails, and the reason and details are still recorded and shown. The new list entry only lowers the server log level, as it already does for `step_input_deleted`, `when_not_boolean` and the other expected reasons.***

***It also doesn't move validation earlier (that's #20900). Top-level parameter values are already rejected with a 400 at submission; this only changes how failures found during scheduling are reported.***

***Not fixed here: the subworkflow's own (child) invocation is left `new` after the parent fails, so the scheduler re-runs it by itself. That re-run logs an `ERROR` with a traceback, and the child invocation, which the step badges link to, ends as `unexpected_failure`. `release_26.1` does the same. Fixing how failed subworkflow invocations are closed out touches every failure reason, so it's left for a separate PR.***

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). No API or schema changes; one failure now reports its existing reason, and one reason logs at a lower level.

<details><summary>Risk Review Advice</summary>

`workflow_parameter_invalid` has a second emitter, for tool steps whose runtime state has validation errors (`modules.py`, the `step_errors` path). That emitter already worked, so for it the only change is the log level. It can also fire when a stored tool state goes stale after a tool upgrade, which is an author or admin problem rather than bad user input. Those failures are still recorded on the invocation and logged at info with details, but they stop reaching Sentry. Check you're comfortable with that.

</details>

## Context

Follow-up to 🔀 #20980 ([25.0]), which switched this emitter to the unflushed step id, and to 🔀 #19092, which added the validators and the failure reason. 🔀 #21982 ([26.0]) added `step_input_deleted` to the same list on a release branch. Extracted from 🌿[issue_20900_invocation_validation](https://github.com/jmchilton/galaxy/tree/issue_20900_invocation_validation), toward 🎯 #20900, as an independent fix. Targets `release_26.1` as a regression fix.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep this small and separate from #20900's request-time validation.</summary>

Folding in #20900's earlier request validation would couple a reporting fix to changes in when requests are accepted, which need their own review. Dropping the change would leave user errors logged as server errors. The evaluation covered the classification line. The step id fix came later, when a reproducer showed the classification never took effect for subworkflow parameters, and it stays within the same goal. Closing out the orphaned child invocation affects every subworkflow failure reason and is left out. A dedicated log-level test was judged disproportionate; the new API test covers the user-visible behavior.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? The parent invocation shows "Workflow parameter on <step path> failed validation: <validator message>" instead of "an unexpected failure occurred." The child subworkflow invocation still shows the unexpected failure (see above).
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. The API test runs a real nested invocation and checks only what the API returns (state, reason, details, step path). It fails on `release_26.1` with `unexpected_failure`.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? Workflows whose subworkflow parameter validator rejects a value from the parent now fail with `workflow_parameter_invalid` instead of `unexpected_failure`. Scheduling, acceptance and outputs are unchanged.
- [x] Who hits this in practice and what is the evidence? Authors who nest subworkflows with validated parameters (#19092), on 25.0 and later. It's reproduced by the new API test; I have no production log for this exact path. #20900 links a Sentry event from bad parameter values reaching a production server.
- [x] Were simpler or existing approaches considered? Yes. Both changes are one line and reuse existing mechanisms: the expected-reasons list (as #21982 did) and the step id the sibling emitter already uses. Moving validation earlier is #20900's job.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
- [x] Instructions for manual testing are as follows:

<details><summary>Tests and manual steps</summary>

- `lib/galaxy_test/api/test_workflows.py::TestWorkflowsApi::test_subworkflow_parameter_validator_failure` uploads a parent workflow whose `text` input feeds a subworkflow `text` parameter, adds a `^moo` regex validator to the exported native subworkflow, and invokes it with `cow`. It asserts the invocation failed with `workflow_parameter_invalid`, the validator message, step path `[1]` and step `0`. With the `modules.py` change reverted it fails on `'unexpected_failure' == 'workflow_parameter_invalid'`.
- Manually: in the editor, give a subworkflow's text parameter a regex validator, connect it to a text input on the parent workflow, and run the parent with a value that doesn't match. The parent invocation should report the validator message on the subworkflow's parameter step. The Galaxy log should show two `INFO` "Failed to schedule" lines (the subworkflow step, then the parent's subworkflow step). A later `ERROR` from the child invocation's re-run is expected; it also happens on `release_26.1`.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
