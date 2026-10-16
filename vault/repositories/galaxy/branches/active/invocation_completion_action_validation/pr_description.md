Toward 🎯 #20900 — reject unknown workflow completion actions and unusable required export configuration before creating invocation state.

A request with a misspelled completion action or an export action missing its required destination can currently return HTTP 200 and create a history and invocation. Report these submission errors immediately, while leaving destination access and export execution to completion time.

| Submitted `on_complete` action | With this fix |
| --- | --- |
| Unknown action name | HTTP 400 names the action and lists registered actions |
| `export_to_file_source` with null, list or scalar configuration | HTTP 400 requires an object |
| Export configuration with missing, null, non-string or blank `target_uri` | HTTP 400 requires a nonempty string destination |
| Valid export, config-free notification or no action | Existing acceptance and completion handling |

Rejected requests create neither the requested target history nor a workflow invocation.

***This gives invocation API callers immediate feedback about completion-action names and required export configuration; valid workflows retain their completion handling.***

***Validation checks configuration shape, not whether a destination exists or is accessible; optional export options and destination/execution failures retain their existing handling.***

Action names come from the runtime registry, including discovered hooks. Each hook can validate its submitted configuration; existing subclasses inherit an accepting default.

## Risks

Previously accepted unknown actions and malformed required export configuration now produce HTTP 400 at submission, establishing a stricter API contract.

<details><summary>Risk Details</summary>

- Callers must correct unknown names and supply an object with a nonblank string `target_uri` for export.
- Requests with multiple errors can receive a completion-action error earlier.
- Hook authors can override the new optional validation method; it must not execute the action or resolve its destination.
- Validating a URI string does not guarantee an export can complete later.

</details>

<details><summary>Risk Review Advice</summary>

Review shared-registry dependency wiring and the validation call before run-config creation. Check that the base method preserves existing subclasses and that export validation does not change optional format/boolean semantics or perform destination I/O. Notification, valid-export and no-action cases provide acceptance controls.

</details>

## Context

Independent extraction from 🌿[issue_20900_invocation_validation](https://github.com/jmchilton/galaxy/tree/issue_20900_invocation_validation), targeting `release_26.2`. The expanded scope completes the adjacent required-configuration check while keeping action-specific rules in their owning hooks.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep hook-owned required-configuration validation with the name check.</summary>

The current evaluation compares the complete submission boundary with optional-option strictness, destination resolution, repeated-action semantics and the smaller names-only change. Those alternatives require additional contracts or restore accepted unusable requests.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>The shared registry and optional hook method keep validation ownership clear.</summary>

No blocking structural findings. Export owns its required payload rules; a central export special case or new coercing configuration model would duplicate policy or change option semantics.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Real API cases cover malformed exports, unknown actions and accepted notifications.</summary>

Eight malformed-export requests returned HTTP 200 on the original baseline. Regressions assert HTTP 400 and no invocation/history side effects. Tests reuse the existing raw-invocation helper, and existing completion units plus valid-export/no-action controls cover adjacent behavior.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? Requires human author to check.
- [x] What does the user see when it fails? HTTP 400 names the unknown action or invalid export configuration before a requested history or invocation is created.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes; real API requests check responses and persisted side effects, with notification/export/no-action positive controls.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes; two notification compatibility cases precede the production changes.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.
- [x] Which existing workflows change behavior (if any)? Requests with unknown action names or malformed required export configuration now fail at submission; valid requests retain completion handling.
- [x] Who hits this in practice and what is the evidence? Invocation API callers supplying these options; baseline requests with unknown names or eight malformed export configurations returned HTTP 200.
- [x] Were simpler or existing approaches considered? Yes; shared registry lookup preserves extensions, and hook-owned validation avoids centralized action-specific rules. Optional-option strictness and destination resolution need separate compatibility decisions.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Focused API and completion-unit coverage</summary>

Run the three new tests in `TestWorkflowsApi`: `test_run_with_unknown_on_complete_action_creates_no_history`, `test_run_with_invalid_export_completion_config_creates_no_history` and `test_run_with_notification_completion_config`. Include `TestWorkflowCompletionEndpoint.test_completion_response_structure`, `test_completion_export_config_accepted` and `test/unit/workflow/test_completion.py`.

Implementation verification: **28 passed** (13 API cases and 15 existing completion units). Fresh polish verification and leading-baseline execution are in progress. Final-head fork CI must be assessed separately after the history-only update.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
