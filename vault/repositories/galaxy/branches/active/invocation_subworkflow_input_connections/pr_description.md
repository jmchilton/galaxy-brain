Toward 🎯 #20900 — reject disconnected required subworkflow inputs before creating a history or invocation.

An invocation request can currently be accepted even though a nested subworkflow has a required input with no connection or default. The user gets an invocation that fails later. Detecting that structural error at submission gives the caller an actionable response before Galaxy creates run state.

| Request | Before this fix | With this fix |
| --- | --- | --- |
| Required subworkflow input lacks a connection and default | Accepted, then fails during evaluation | HTTP 400 naming the subworkflow path and input |
| Only some required inputs are connected, or the gap is nested | Accepted | Same early rejection, including the nested path |
| Input is optional or has a default | Accepted | Accepted, including false, zero and empty-text defaults |

***This checks the saved subworkflow connections; it does not require every optional input to be connected or add general invocation-input validation.***

The submission check and existing runtime backstop share the same required/connected/default predicate. The runtime backstop remains for paths that bypass ordinary invocation submission.

## Risks

Clients submitting these invalid workflows now receive HTTP 400 instead of an invocation ID and a later failure; this deliberately changes the API failure timing.

<details><summary>Risk Details</summary>

- Reviewers should verify that optional and defaulted inputs remain accepted at every nested level.
- Callers that inspect failed invocations for this structural error must handle the immediate request error instead. No invocation record is created for this rejection.

</details>

<details><summary>Risk Review Advice</summary>

Focus review on the shared predicate and the rejection point before history construction. The API cases check both the diagnostic and the absence of new invocation/history state; existing valid-workflow cases remain the positive controls.

</details>

## Context

Independent extraction from 🌿[issue_20900_invocation_validation](https://github.com/jmchilton/galaxy/tree/issue_20900_invocation_validation), targeting `release_26.2`. It has no dependency on the other validation extractions.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the recursive connection check and shared runtime predicate together; broader input resolution remains separate.</summary>

Recorded in the branch’s existing review debrief. The pre-polish rebase preserves the reviewed commit patch.

</details>

### ✅ [John’s Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>API cases check real saved connections, HTTP diagnostics and persisted side effects; no mock-only predicate tests.</summary>

Recorded in the branch’s existing review debrief. The pre-polish rebase preserves the reviewed commit patch.

</details>

### ✅ [Cursor’s Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>One predicate replaces duplicated default/optional semantics while retaining the runtime backstop.</summary>

Recorded in the branch’s existing review debrief. The pre-polish rebase preserves the reviewed commit patch.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? HTTP 400 names the nested subworkflow path and missing required input before run state is created.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. API tests exercise observable request behavior and persistence effects.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? The runtime TODO records the remaining import-time check; the predicate docstring explains its invariant.
- [x] Which existing workflows change behavior (if any)? Invalid saved subworkflow connections reject at submission; optional/defaulted connections retain their existing semantics.
- [x] Who hits this in practice and what is the evidence? Real API regressions cover disconnected, partially connected and nested shapes, plus valid/defaulted controls.
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? Yes. Reusing the runtime predicate avoids two definitions of required/defaulted connectivity; broader validation stays separate.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>API regression coverage and validation</summary>

The original release-baseline run accepted all four negative cases with HTTP 200. The focused API selection covers all four rejections and six default/optional/connected controls. Workflow unit tests cover the retained runtime behavior.

```sh
GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false \
GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES=true \
GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS=true \
GALAXY_TEST_TOOL_CONF='lib/galaxy/config/sample/tool_conf.xml.sample,test/functional/tools/sample_tool_conf.xml' \
.venv/bin/python -m pytest lib/galaxy_test/api/test_workflows.py -k "subworkflow_missing_input_connection_error or subworkflow_partially_connected_required_input_error or nested_subworkflow_missing_input_connection_error or run_subworkflow_with_falsy_default_unconnected or run_subworkflow_with_required_input_with_default_unconnected or run_subworkflow_with_optional_data_unspecified or run_subworkflow_with_optional_parent_input_connected_but_not_provided" -v
```

Fresh polish verification: **10 API cases passed**. Workflow runtime unit suite: **194 passed, 1 skipped**. Fork CI on the final SHA remains pending at handoff.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
