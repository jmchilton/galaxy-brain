# Fresh polish checklist — invocation_completion_action_validation

Reviewed the rebased diff at `163b1b36f6f44bd9bae875f7fa396921fffa483e`, based on `release_26.2` at `579ca73440d776002b7099538cef000838687d8e`; read the affected service, registry, app wiring, API controls, and branch debriefs. Read-only review; no tests run here.

## John's Checklist

- [ ] Did a human read every test and every comment? John must complete this item.
- [x] What does the user see when it fails? HTTP 400 naming the unknown `on_complete` action and listing available actions, before a history or invocation is created.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? The added API regression asserts HTTP 400, the diagnostic, zero workflow invocations, and absence of the uniquely named requested history; no unit tests were added.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.
- [x] Which existing workflows change behavior (if any)? Requests containing an unregistered completion-action name now fail before submission; registered actions, their configuration, and workflows without completion actions retain their existing behavior.
- [x] Who hits this in practice and what is the evidence? API clients submitting a misspelled or unavailable completion-action name; the regression reproduces that request and prior validation records baseline HTTP 200 versus fixed HTTP 400 with neither history nor invocation.
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? The existing registry supplies the names; a hardcoded allowlist would drift and reject discovered hooks, while moving configuration/URI validation into preflight would broaden the contract.

## Findings and limits

No code blocker or design decision found. `_check_on_complete` runs after authentication/workflow access checks and before `build_workflow_run_configs`; every key of every submitted action dictionary is checked against the runtime registry. App singleton registration preserves the same registry instance supplied to the completion monitor, and constructor injection follows the adjacent scheduling-manager pattern. This does not validate hook configuration or change execution behavior.

The app registration is related support, not an unrelated refactor: constructor resolution needs the authoritative application's registry rather than a second instance. No schema, generated asset, frontend, or unrelated source changes are present.

## Validation relevant to final polish

- New regression: `lib/galaxy_test/api/test_workflows.py::TestWorkflowsApi::test_run_with_unknown_on_complete_action_creates_no_history`.
- Existing positive controls: `lib/galaxy_test/api/test_workflow_completion.py::TestWorkflowCompletionEndpoint::test_completion_export_config_accepted` and `test_completion_response_structure`.
- The prior implementation handoff reports baseline red (200), fixed regression green (400/no history/no invocation), both positive controls green, and full installed hooks green. These are historical results, not fresh executions at the rebased SHA.
- The export control proves acceptance and workflow completion; its comment explicitly says the export itself cannot succeed without a configured file source. Do not claim it verifies a completed export.
- A new mock-only registry injection test or loop-iteration test is unnecessary; the API controls construct the real service and test distinct accepted/rejected behavior.

## Tracking / description cleanup

- No `pr_description.md` exists yet. The completed checklist can be used in the requested final description, leaving the human item unchecked.
- `implementation_debrief.md` still says fork CI has not been assessed and identifies old published head `5a3307250474a7371ce3e734995186f7f54e84a8`; `index.md` already records the later CI assessment. Refresh the handoff/current-polish evidence without presenting old checks as checks on the new head.
- `initial_implementation_debrief.md` contains historical uncommitted/not-pushed wording and the old base; preserve as explicitly historical rather than treating it as current state.
- Risk: limited intentional compatibility change for requests with unknown action names, plus app/service DI wiring. The registered-hook and no-hook controls cover acceptance and real service construction. No migration, frontend, or persisted workflow format changes.
- Context: independent extraction from `issue_20900_invocation_validation`, directly targeting `release_26.2`; do not claim it fixes every invocation-validation failure or validates completion-action payloads.

Verdict: ready for final description and the parent's required fresh validation; no narrowly necessary implementation fix identified.
