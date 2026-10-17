Toward 🎯 #20900 — reject workflow-incompatible tools and report missing tools before creating run state.

Galaxy can accept a workflow containing a tool that cannot run in workflows, and can create a requested history before discovering that a required tool is missing. Check tool readiness before constructing the run so an invalid request returns a useful error without leaving an empty target history.

For example, invoke an imported workflow containing the installed `test_data_source` tool with a requested new history. It now returns HTTP 400 naming `test_data_source`, before that history is created—the concrete request exercised by the regression.

| Workflow tools | With this fix |
| --- | --- |
| Installed but workflow-incompatible | HTTP 400 listing the incompatible tool IDs |
| Missing, including a mixture of missing and incompatible | Existing missing-tool error takes precedence, with the existing exact-version formatting |
| Available and workflow-compatible | Normal invocation |

***This validates workflow invocation requests, including imported workflows containing installed tools that cannot run in workflows.***

***This prevents history creation for missing or workflow-incompatible tools; other invocation validation remains unchanged.***

***Tool lookup keeps the existing version, UUID, exactness and user rules; this adds early compatibility validation rather than a new tool-resolution policy.***

The check reuses each resolved tool's compatibility metadata and keeps the scheduling backstop. Missing-tool validation moves before history construction as part of the same preflight.

## Risks

API callers now receive an immediate incompatibility error; missing-tool failures occur before a requested history is created.

<details><summary>Risk Details</summary>

- The earlier failure can replace other errors in a request that has several independent problems.
- Missing tools must retain precedence over incompatible tools, and exact-version/user-scoped lookups must keep their existing meaning.

</details>

<details><summary>Risk Review Advice</summary>

Review the canonical tool lookup arguments and the two diagnostic lists. The mixed missing/incompatible tests protect error precedence and formatting, while an existing valid workflow executes as a positive control.

</details>

## Context

Independent extraction from 🌿[issue_20900_invocation_validation](https://github.com/jmchilton/galaxy/tree/issue_20900_invocation_validation), targeting `release_26.2`. No dependency on the other validation branches.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep early availability and compatibility together so either failure precedes history construction.</summary>

Recorded in the branch’s existing review debrief. The pre-polish rebase preserves the reviewed commit patch.

</details>

### ✅ [John’s Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Four public API regressions protect new/existing histories, exact-version diagnostics and missing-tool precedence.</summary>

Recorded in the branch’s existing review debrief. The pre-polish rebase preserves the reviewed commit patch.

</details>

### ✅ [Cursor’s Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Reuse the canonical recursive references and one metadata lookup per tool; retain the runtime backstop.</summary>

Recorded in the branch’s existing review debrief. The pre-polish rebase preserves the reviewed commit patch.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? HTTP 400 identifies incompatible tools, or returns the existing missing-tool message before history creation.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. API tests exercise observable request behavior and persistence effects.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? Workflows with incompatible tools reject early; compatible tools keep the existing lookup and invocation behavior.
- [x] Who hits this in practice and what is the evidence? Real installed-tool API cases reproduce incompatibility and missing-tool history side effects; a compatible workflow executes.
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? Yes. One canonical lookup per reference avoids separate availability and compatibility passes; a larger preflight framework is unnecessary.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>API regression coverage and validation</summary>

All four new API cases failed on the original release baseline. The focused selection includes those regressions and the existing compatible `test_run_workflow_by_name` execution control.

```sh
GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false \
GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES=true \
GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS=true \
GALAXY_TEST_TOOL_CONF='lib/galaxy/config/sample/tool_conf.xml.sample,test/functional/tools/sample_tool_conf.xml' \
.venv/bin/python -m pytest lib/galaxy_test/api/test_workflows.py -k "run_with_workflow_incompatible_tool or run_with_missing_and_incompatible_tools or test_run_workflow_by_name" -v
```

Fresh polish verification: **5 API cases passed**. Fork CI on the final SHA remains pending at handoff.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
