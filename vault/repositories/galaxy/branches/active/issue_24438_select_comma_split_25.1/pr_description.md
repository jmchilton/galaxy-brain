Fix 🎯 #24438 — preserve comma-containing single-select values when running tool tests.

A tool option such as `relax,150,100` can be selected in Galaxy, but its XML test fails before the job runs:

```text
multiple values provided but parameter is not expecting multiple values
```

| Tool test input | Before | After |
| --- | --- | --- |
| Single select: `value="relax,150,100"` | Treated as three values; test fails | One intact option value |
| Conditional selector: `value="b,2"` | Treated as two values; test fails | One intact selector value |
| Multiple select: `value_json='["x,1", "y,2"]'` | Two intact option values | Two intact option values |

***This fixes tool-test input preparation; it does not change how users select options in the tool form.*** Both `value=` and string `value_json=` are covered for single selects, including conditional selectors.

***Multiple selects still split `value=` on commas: use a `value_json` list when an option value itself contains commas.*** The schema documentation explains that form, and a new lint warning points tool authors to it when a static multiple select's comma-split test value contains parts that are not valid option values or labels. Names shared by several inputs are skipped to avoid ambiguous matches.

## Risks

The compatibility risk is in tool-test parsing and linting: single-valued non-text inputs now keep strings intact, and an additional lint warning can fail a tool-author CI pipeline configured to reject warnings.

<details><summary>Risk Details</summary>

- Data inputs and multiple-valued inputs retain comma splitting, including the implicit multiple default of `ftpfile`.
- The linter checks static multiple-select options; dynamic options and ambiguous duplicate short names are outside its coverage.
- Tests selecting only valid comma-free options, empty selections, and `value_json` lists do not receive the new warning.
- There are no database migrations or stored-data changes. The parsing and linting changes can be reverted independently.

</details>

<details><summary>Risk Review Advice</summary>

Review the split gate against legacy tool-test submission and check the warning's conservative matching rules. When forward-merging to dev, account for its `hidden_data` input type and `test_case_json` parsing path, which are absent from this release target.

</details>

## Context

Alternative kept on 🌿[issue_24438_select_comma_split_25.1_alt_original_scope](https://github.com/jmchilton/galaxy/tree/issue_24438_select_comma_split_25.1_alt_original_scope) — the parsing fix and its regression coverage without the lint warning and expanded multiple-select documentation/coverage. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the parsing fix, warning and documentation together.</summary>

The scope evaluation retained the conservative multiple-select warning and documented JSON-list form. Option-aware splitting, broader name resolution and dev-only changes remain outside this release fix.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>The linter reuses the existing input-parameter iterator.</summary>

Removed duplicate parameter-name traversal. Broader linter infrastructure changes were deferred because they add release-branch churn without helping this fix.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Framework regressions fail at the reported error on the base; baseline guards lead the history.</summary>

The single-select and conditional framework cases failed on the base with the multiple-values error. Existing-behavior guards for FTP splitting and multiple-select JSON lists were moved to the leading baseline commit. Mutation checks cover the implicit FTP default and qualified test-parameter names.

</details>

### ✅ Second Frontier Model Review

<details><summary>Fixed warning false positives for duplicate names and ordinary option selections.</summary>

The linter skips ambiguous short names and accepts selections composed entirely of valid option values or labels. Regression fixtures cover these cases alongside empty selections and argument-derived input names.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>No preliminary refactor was needed.</summary>

The parsing helper's body is the fix itself. Moving shared linter helpers would add unrelated release-branch changes, so the branch retains four focused commits beginning with baseline tests.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment?
- [x] What does the user see when it fails? The multiple-values error above; the new lint warning names the test and parameter and recommends `value_json`.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Public parsing/linting fixtures check behavior; framework tests assert command output.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc., what purpose do they serve? N/A.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Automated coverage</summary>

Unit suites: `test_tool_linters.py`, `test_test_definition_parsing.py`, and `test_parameter_test_cases.py`.

Framework tools: `select_comma_value` and `multi_select`, covering intact single-select values, conditional selectors and multiple-select JSON lists.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
