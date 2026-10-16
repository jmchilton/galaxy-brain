Backport the two server-side invocation-request fixes from 🌿[invocation_no_add_to_history_false](https://github.com/jmchilton/galaxy/tree/invocation_no_add_to_history_false) to `release_26.1`.

A caller filling in the published request defaults can trigger two server bugs: explicitly sending `no_add_to_history: false` silently suppresses input copying, while sending an empty `ds_map` alongside `inputs` returns 400. Both checks currently treat key presence as the value.

| Request | Before this fix | With this fix |
| --- | --- | --- |
| `no_add_to_history: false` or `null` | Cross-history inputs are not copied into the target | Inputs are copied, matching omission |
| `no_add_to_history: true` | Inputs are not copied | Unchanged |
| `ds_map: {}` or `null` alongside `inputs` | HTTP 400 | `inputs` is used |
| Non-empty `ds_map` alongside non-null `inputs` | HTTP 400 | Unchanged |

***This backport changes only the two server value checks and their API regressions. The client-type generator, generated schemas and description changes stay in the 26.2 sibling.***

***This affects invocation API callers that explicitly send these default values; this backport does not change the published client types.***

Omitting either field behaves as before. The published api-client types expose these server bugs by requiring callers to fill defaulted request fields.

## Risks

Callers that relied on explicit false/null suppressing input copies will now get the documented copying behavior; true remains the opt-out.

<details><summary>Risk Details</summary>

- The no_add_to_history flag feeds dataset, collection and library input copying. The new regression covers cross-history HDA inputs; broader input-source matrices are not claimed.
- inputs: null with a non-empty ds_map is newly accepted through the legacy fallback, matching the input-source selection below the guard.
- These two checks are reversible code changes, but the corrected request behavior is externally observable. No client schema/type changes are included.

</details>

<details><summary>Risk Review Advice</summary>

Review the distinction between omission, false/null and true, plus the empty/non-empty legacy-map guard. The API cases assert target-history contents or the retained conflicting-source error, rather than implementation helper calls.

</details>

## Context

Server-only backport of the two fixes in 🌿[invocation_no_add_to_history_false](https://github.com/jmchilton/galaxy/tree/invocation_no_add_to_history_false), split from 🌿[issue_20900_invocation_validation](https://github.com/jmchilton/galaxy/tree/issue_20900_invocation_validation). Independent of the 26.2 generator changes.

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Explicit false/null copies inputs; null/empty ds_map next to inputs is accepted. A non-empty conflicting map keeps the existing HTTP 400.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. API tests exercise observable request behavior and persistence effects.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? Requests with these explicit default values are corrected; omission and the true opt-out retain their behavior.
- [x] Who hits this in practice and what is the evidence? Real HTTP requests check copied target-history contents and legacy-map acceptance; published typed callers are a concrete trigger.
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? Yes. Two value-based checks avoid changing the service model dump or every other request field.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>API regression coverage and validation</summary>

The two parametrized API tests cover omitted/null/false/true no_add_to_history and omitted/null/empty/non-empty ds_map. Earlier regression evidence from the 26.2 sibling demonstrates the value-check failures; the eight cases also passed on the 26.1 backport before polish.

```sh
GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false \
GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES=true \
GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS=true \
GALAXY_TEST_TOOL_CONF='lib/galaxy/config/sample/tool_conf.xml.sample,test/functional/tools/sample_tool_conf.xml' \
.venv/bin/python -m pytest lib/galaxy_test/api/test_workflows.py -k "test_run_no_add_to_history or test_run_inputs_with_ds_map" -v
```

Fresh polish verification: **8 API cases passed**. Fork CI on the final SHA remains pending at handoff.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
