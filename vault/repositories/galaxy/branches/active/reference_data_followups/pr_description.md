Follow-up to 🔀 #24798 - closes an XML loophole in the YAML-only rule for reference_data, loads reference_data through its authoring model, and pins it with contract tests.

Three gaps from reviewing #24798, all on `dev`:

| On `dev` (`a73355ea2e5`)                                                                                                                                                                              | With this PR                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| An XML `<param type="reference_data" table="all_fasta">` with an `<options from_data_table="all_fasta"/>` child loads, and the parameter model factory returns a `ReferenceDataParameterModel` for it | `ParameterDefinitionError: reference_data is only supported in GalaxyTool and GalaxyUserTool YAML tools` (same text at tool load) |
| A disk YAML tool's reference_data is built from the raw dict: `multiple: "false"` reaches the form as the string `'false'`, and keys the API rejects (a leftover `filter`, `options`) load silently   | Validated by `YamlReferenceDataParameter`, like the API; the form and the parameter model see the same coerced flags              |
| `YamlTextParameter(value="hello!").to_internal().default_value` is `None`                                                                                                                             | `'hello!'`                                                                                                                        |

Each row is real output from `dev`'s lib and this branch's lib.

***The XML loophole isn't a data-access hole: XML tools are admin-installed and already trusted with every table, and user tools can only be GalaxyUserTool YAML.***

***reference_data stays a YAML-only type, and this PR doesn't change what a valid GalaxyTool or GalaxyUserTool can declare.*** The only tools that load differently are XML tools borrowing the type through `<options>`, and disk YAML tools carrying keys the API already rejects. reference_data is unreleased, so nothing in the wild depends on either.

***Only reference_data changes how it loads; the parity test just pins the other types for #23888.***

***The text default bug has no runtime impact today.*** The only production caller of `to_internal()` is the new reference_data path; every other type still loads from the raw dict. The bug is also on `release_26.1`, where nothing calls `to_internal()` either, so no backport. It matters once #23888 routes more types through their authoring models, so it's fixed here along with a test that compares the parser's output with `to_internal()` for every functional YAML tool fixture (all 11 v1 types, both tool classes, full and `exclude_unset` dumps). That test is what found it.

<details><summary>What each commit does</summary>

1. **Baseline tests** (5 commits, pass on `dev`): reference_data fixtures through the #23888 user tool contract harness (disk, API YAML and API JSON; legacy, 21.01 and request formats); closed-table tests that assert which check fires; an admin `GalaxyTool` reading a table closed to user tools through the API; the parsed reference_data model equals `to_internal()` across tool class × dump; reference_data nested in a section and a conditional `when`.
2. **Share runtime dumping and the table access rule** (refactor). `runtimeify` and the legacy visitor call one `reference_data_runtime_json()`; the form and job-time checks both ask `ToolDataTable.readable_by(trusted=...)`.
3. **Reject reference_data unless the input source is a YAML tool's.** New `InputSource.parse_reference_data()` returns the validated definition only for GalaxyTool/GalaxyUserTool YAML. `ReferenceDataToolParameter` and the factory both use it, which closes the `<options>` bypass and the factory accepting XML or class-less reference_data. The message now names the tool classes, since "only supported in YAML tools" was wrong for a class-less YAML tool.
4. **Load reference_data through its authoring model.** `CanonicalYamlReferenceDataInputSource` validates the dict once, hands raw-dict readers (`SelectToolParameter`) the model's coerced values, and the factory returns `to_internal()`.
5. **Fix YAML text defaults dropped by `to_internal()`.** `TextParameterModel.default_value` is aliased `value` without `populate_by_name`, so `default_value=` was silently ignored. The fixture-wide parity test lands here.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- reference_data is now the only YAML parameter type strictly model-validated when loaded from disk; the others still load from the raw dict.
- The fixture-wide parity test leaves out `exclude_none` dumps on purpose: they erase an explicit `value: null`. That's a separate issue in the custom tool agent and lint code, also on `release_26.1`.

</details>

## Context

Builds on 🔀 #24798, which added `reference_data`, and the #23888 user tool contract harness. Toward 🎯 #23888: the parity test is a regression matrix for routing more YAML types through their authoring models. Alternative kept on 🌿 [`reference_data_followups_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/reference_data_followups_alt_original_scope) - the review follow-ups only, without the fixture-wide parity test, the text default fix or the reworded guard. Developed with [John's Galaxy Brain Branch Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep as implemented after one re-scope; every remaining idea is another target branch, untouched code or codebase-wide.</summary>

- The first evaluation added the fixture-wide parity test, which caught the text default bug.
- Declined: the `exclude_none` fix (agent and lint code, also on `release_26.1`, so its own PR), the latent factory vs `to_internal()` mismatches with no runtime path (#23888), `extra="forbid"` on `ToolSourceBaseModel` (codebase-wide), loading every type through its authoring model (#23888), dropping the upstream `test_run_with_reference_data` (a subset of the contract harness, left to reviewers).
- Splits cleanly if reviewers prefer: baseline tests + refactor, then the fixes; or the text fix on its own.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/reference_data_followups/scope_evaluation/). Run via Claude Opus 5.5 at low (reasoning_effort=15) effort.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Approve; no structural blockers. Two small fixes folded in.</summary>

- Hoisted a leftover inline import in `evaluation.py`; aliased the parser `YamlToolSource` in the parity test.
- `TextParameterModel.default_value` is the only bare `alias=` on a parameter definition model, so no other `to_internal()` call can hit the same trap today.
- Follow-up: `extra="forbid"` on the definition base would stop silent kwarg loss structurally.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/reference_data_followups/thermo_nuclear_review/). Run via Claude Opus 5.5 at low (reasoning_effort=15) effort.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Three fixups folded in; every non-baseline test fails on <code>dev</code> lib at its own assertion.</summary>

- Moved the parity test onto the functional YAML fixtures (all 11 v1 types, 130 cases), unified the reject tests across XML, XML-with-options and class-less YAML, and reused `DynamicToolSources` in the baseline parity test.
- On `dev` lib: factory rejects `DID NOT RAISE`, `xml_with_options` loads, the authoring-model rejects don't raise, the coerced flags test sees `'false'`, and 12 text and conditional fixture cases fail at the `==`. Baselines pass.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/reference_data_followups/test_challenges_debrief/). Run via Claude Opus 5.5 at reasoning_effort=15 effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings on the re-scoped branch; the first pass's one finding (disk flags not coerced for the form) was fixed.</summary>

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/reference_data_followups/codex_review/). Run via gpt-6-sol at medium effort.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Baseline tests lead, then one behavior-preserving refactor; each fix is its own commit.</summary>

The parser hook and the input-source dispatch would be unused on their own, so they stay with the fixes that use them.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/reference_data_followups/baseline_refactor/). Run via Claude Opus 5.5 at low effort.

</details>

### ✅ [John's Agentic Checklist](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/gx_pr_checklists/GENERAL.md)

<details><summary>All items pass.</summary>

- [x] What does the user see when it fails? Parameter-named errors at load or run time: `Parameter 'reference': reference_data is only supported in GalaxyTool and GalaxyUserTool YAML tools`; a pydantic `ValidationError` naming the rejected field; for a table closed to user tools, no options and a 400 `Parameter 'reference': requires a value, but no legal values defined`.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They go through tool load, `input_models_for_tool_source`, the contract harness and the API, and compare the parser with each authoring model across fixtures.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes, the first five commits.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/reference_data_followups/pr_checklist/). Run via Claude Opus at medium effort.

</details>

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- Unit: `test/unit/app/tools/test_reference_data.py`, `test/unit/tool_util/test_user_tool_source_fixtures.py`, `test/unit/tool_util/test_yaml_parameters.py`.
- API: `lib/galaxy_test/api/test_user_tool_contract.py` (reference_data fixtures), `lib/galaxy_test/api/test_unprivileged_tools.py` (closed tables, admin `GalaxyTool`).

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
