Toward 🎯 #20900 — validate invocation object-store preferences before creating a target history.

An invocation can currently accept an invalid preferred object store, and conflicting general/split preferences are checked only after a requested history has been created. Validate these preferences before building run state, using the existing selectable-store policy.

| Request preference | With this fix |
| --- | --- |
| Invalid general, output or intermediate store | HTTP 400 from the existing selection-policy validator; no new target history |
| General store combined with split output/intermediate preferences | Existing mutual-exclusion rule rejects before history creation |
| Valid selectable general or split stores | Existing selection behavior |

***This changes validation timing and applies the existing store-selection policy; it does not introduce a new storage policy or change how valid jobs select stores.***

All three fields use the existing validator. The general-versus-split guard moves alongside those checks, so the related errors are detected before history construction.

## Risks

Invocation callers now receive immediate HTTP 400 for invalid store preferences, and conflicting preferences no longer leave a newly created target history.

<details><summary>Risk Details</summary>

- Callers relying on a previously accepted invalid store identifier must now choose a selectable store or omit the preference.
- General-versus-split exclusivity must retain its existing meaning, and valid selectable stores must still reach jobs and request exports.

</details>

<details><summary>Risk Review Advice</summary>

Review the existing preference validator reuse and the relocated mutual-exclusion predicate. The selectable-store integration tests are the positive controls against blanket rejection of every explicit preference.

</details>

## Context

Independent extraction from 🌿[issue_20900_invocation_validation](https://github.com/jmchilton/galaxy/tree/issue_20900_invocation_validation), targeting `release_26.2`. Broader invocation validation is outside this fix.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep all three preference fields and the early mutual-exclusion check together; no general preflight framework.</summary>

Recorded in the branch’s existing review debrief. The pre-polish rebase preserves the reviewed commit patch.

</details>

### ✅ [John’s Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Three real API requests cover the sibling preference fields, with selectable/split-store integration positive controls.</summary>

Recorded in the branch’s existing review debrief. The pre-polish rebase preserves the reviewed commit patch.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? HTTP 400 reports the existing store-selection or mutual-exclusion error before a new history is created.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. API tests exercise observable request behavior and persistence effects.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? Invalid preferences reject early; valid general and split store selections retain the existing behavior.
- [x] Who hits this in practice and what is the evidence? Three public API regressions returned 200 on the original release baseline; existing integration cases exercise valid selectable stores.
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? Yes. Reusing the existing validator avoids a second policy; leaving the exclusivity guard late would preserve avoidable history side effects.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>API regression coverage and validation</summary>

All three invalid-store API cases failed on the original release baseline with HTTP 200. Positive integration coverage exercises default, general, and output/intermediate store choices and mapped split-store execution.

```sh
GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false \
GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES=true \
GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS=true \
GALAXY_TEST_TOOL_CONF='lib/galaxy/config/sample/tool_conf.xml.sample,test/functional/tools/sample_tool_conf.xml' \
.venv/bin/python -m pytest lib/galaxy_test/api/test_workflows.py -k run_with_unselectable_object_store_creates_no_history -v
```

Fresh polish verification: **3 API cases passed**. Valid selectable general and mapped split-store integration controls: **2 passed**. The shared virtualenv lacked pytest-xdist after the base refresh; loaded pinned pytest-xdist 3.8.0 and execnet 2.1.2 under /tmp, leaving the shared environment unchanged. Fork CI on the final SHA remains pending at handoff.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
