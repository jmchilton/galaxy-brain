Fix tool-XSD rejection of the sample-sheet collection types used by Galaxy's own tools.

The core `sample_sheet_to_tabular.xml` declares `sample_sheet`, `sample_sheet:paired`, `sample_sheet:paired_or_unpaired` and `sample_sheet:record`, but the shipped XSD rejects its input declaration. This makes a valid core tool fail the same schema validation used by tool linting.

| Validation of the selected 281 tool XML files | Release baseline XSD | Updated XSD |
| --- | --- | --- |
| Existing functional tools plus plain core tools | 280 pass; `sample_sheet_to_tabular.xml` fails | 281 pass |

***This fixes XML-schema validation for tool authors and lint users; it does not add a new runtime collection type.***

The XSD now matches the runtime sample-sheet forms: `sample_sheet` is outermost, with an optional `:paired`, `:paired_or_unpaired` or `:record` suffix. Existing non-sample-sheet forms remain supported. The CI lint selection now includes plain core tools, and XSD self-lint uses the real schema path and stops on failure.

***The converter's duplicate `sample_sheet` entry becomes `sample_sheet:record` for declaration parity only; this PR does not implement nested-record conversion.***

## Risks

The XSD accepts the existing runtime sample-sheet syntax, and CI now fails on malformed schemas or invalid plain core-tool declarations.

<details><summary>Risk Details</summary>

- Regex alternative ordering matters for libxml2: placing the open-ended alternative first can incorrectly accept invalid sample-sheet nesting.
- Internal core tools using `type class` remain outside XSD validation because the schema does not describe their declarations.
- Declaring `sample_sheet:record` on the converter does not supply the nested-record field propagation required for actual conversion; that runtime work remains a separate follow-up.

</details>

<details><summary>Risk Review Advice</summary>

Compare the single-type and comma-list patterns with the existing runtime grammar. Review the CI file selection and fail-fast schema check, and treat the converter edit as declaration parity. Lint coverage demonstrates schema compatibility, not execution of every listed collection form.

</details>

## Context

Follow-up identified while scoping 🌿[issue_23978_parameter_tools_xsd](https://github.com/jmchilton/galaxy/tree/issue_23978_parameter_tools_xsd). Targets `release_25.1`, where the sample-sheet tools were introduced. On merge-forward with that branch, retain its nested functional-tool XML loop and append this branch's core-tool loop; the schema-path fix is shared.

Alternative kept on 🌿[xsd_sample_sheet_collection_type_25.1_alt_original_scope](https://github.com/jmchilton/galaxy/tree/xsd_sample_sheet_collection_type_25.1_alt_original_scope) — XSD support, documentation and core-tool lint coverage without the later schema self-lint fix or converter declaration correction.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep schema parity, core-tool lint coverage and adjacent declaration/self-lint fixes together.</summary>

Nested-record conversion requires collection creation and field propagation beyond this lint fix; the current scope records it as a separate runtime follow-up.

</details>

### ✅ Second Frontier Model Review

<details><summary>No actionable findings in the complete expanded diff.</summary>

Review evidence includes 3,288 collection-type validation cases, shell syntax and both newly included core-tool declarations. It distinguishes converter declaration parity from end-to-end conversion.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>The retained shell cleanup is a separate leading commit.</summary>

The shellcheck cleanup preserves the existing functional-tool selection; later commits introduce schema behavior and core-tool coverage. No additional refactoring was needed during polishing.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? Requires human author to check.
- [x] What does the user see when it fails? XSD lint rejects valid sample-sheet declarations and exits nonzero; this fixes that rejection.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A; lint coverage validates the existing core tool declaration, per the requested testing scope.
- [x] Are baseline tests in their own leading commits (if applicable)? N/A; no baseline tests added. The shell refactor is a separate leading commit.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? The libxml2 comments explain alternative ordering that prevents invalid sample-sheet nesting from passing lint.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Existing-tool XSD lint coverage</summary>

`.ci/validate_test_tools.sh` selects 281 existing tools, including `data_fetch.xml` and `sample_sheet_to_tabular.xml`. Fresh verification uses the same macro-expanding `load_tool` to `xmllint` pipeline without dependency-installing startup: the baseline XSD fails only `sample_sheet_to_tabular.xml`; the updated XSD passes all 281. XML syntax, shell syntax, ShellCheck and diff whitespace checks pass. No runtime conversion or browser test is claimed. Fork CI remains pending.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
