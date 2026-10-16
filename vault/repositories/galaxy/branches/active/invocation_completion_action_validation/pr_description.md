Toward 🎯 #20900 — reject unknown invocation completion-action names before creating a history or invocation.

A typo in an `on_complete` action name currently passes invocation submission, leaving the caller to discover later that the requested action cannot run. Check names against the same registered hooks used by the completion monitor before building the invocation.

| `on_complete` request | With this fix |
| --- | --- |
| Unknown action name | HTTP 400 naming the action and available actions; no new target history or invocation |
| Registered action name | Existing action configuration and completion behavior |
| No actions | Existing ordinary completion response |

***For invocation API callers, this checks completion-action names before submission creates a history or invocation. Hook configuration, target URIs and execution semantics keep their existing validation.***

The service receives the application's existing hook registry through constructor injection. The completion monitor and submission check therefore use the same registry, including registered extensions, rather than a hardcoded list.

## Risks

Requests with unknown completion-action names now fail immediately instead of producing an invocation; registered action payloads keep their existing contract.

<details><summary>Risk Details</summary>

- Clients that submitted unknown names must handle HTTP 400 before they have an invocation ID.
- Dependency injection must retain the same registry instance used by the completion monitor; custom registered names must not be replaced with a built-in-only allowlist.

</details>

<details><summary>Risk Review Advice</summary>

Check the registry singleton wiring and the placement before run configuration construction. Positive API cases verify registered export configuration is accepted and ordinary completion remains available; they do not prove a successful export action executes.

</details>

## Context

Independent extraction from 🌿[issue_20900_invocation_validation](https://github.com/jmchilton/galaxy/tree/issue_20900_invocation_validation), targeting `release_26.2`. Complete hook-payload validation remains separate.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep name membership validation and existing registry injection together; payload/URI validation stays with the hooks.</summary>

Recorded in the branch’s existing review debrief. The pre-polish rebase preserves the reviewed commit patch.

</details>

### ✅ [John’s Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>A real API regression checks rejection and persistence effects, with registered-export acceptance and no-hook positive controls.</summary>

Recorded in the branch’s existing review debrief. The pre-polish rebase preserves the reviewed commit patch.

</details>

### ✅ [Cursor’s Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Use the existing authoritative singleton registry rather than another allowlist or request-validation framework.</summary>

Recorded in the branch’s existing review debrief. The pre-polish rebase preserves the reviewed commit patch.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? HTTP 400 names the unknown action and lists available actions; no history or invocation is created.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. API tests exercise observable request behavior and persistence effects.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? Only requests with unregistered completion-action names reject earlier; existing registered configurations retain their behavior.
- [x] Who hits this in practice and what is the evidence? A public invocation request with an unknown name returned 200 on the original release baseline and is rejected with this guard.
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? Yes. Reusing the runtime registry preserves extensions; hardcoding built-in names would create a second source of truth.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>API regression coverage and validation</summary>

The unknown-action regression failed on the original release baseline with HTTP 200. The focused checks cover rejection/no side effects, the completion response structure and acceptance of registered export configuration.

```sh
GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false \
GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES=true \
GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS=true \
GALAXY_TEST_TOOL_CONF='lib/galaxy/config/sample/tool_conf.xml.sample,test/functional/tools/sample_tool_conf.xml' \
.venv/bin/python -m pytest lib/galaxy_test/api/test_workflows.py::TestWorkflowsApi::test_run_with_unknown_on_complete_action_creates_no_history lib/galaxy_test/api/test_workflow_completion.py::TestWorkflowCompletionEndpoint::test_completion_response_structure lib/galaxy_test/api/test_workflow_completion.py::TestWorkflowCompletionEndpoint::test_completion_export_config_accepted -v
```

Fresh polish verification: **3 API cases passed**. Workflow completion unit suite: **15 passed**. Fork CI on the final SHA remains pending at handoff.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
