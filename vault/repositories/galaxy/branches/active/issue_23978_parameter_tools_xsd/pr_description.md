Fix 🎯 #23978 — make parameter test tools XSD-valid and prevent new test-tool subdirectories from silently missing XML validation.

The parameter fixtures were exercising Galaxy's parser without passing its XML schema. CI checked only top-level test tools, so invalid attributes, missing titles and the schema's missing `rules` type went unnoticed.

| Validation coverage | Before | After |
| --- | --- | --- |
| Top-level XML test tools | 310 | 310 |
| `parameters/` | 0 | 100 |
| Other immediate subdirectories | 0 | 21 |
| Total | 310 | 431 |

***This is test-tool and validation infrastructure work; it does not change workflow execution or introduce a new tool parameter type.*** The XSD now accepts the existing core-only `rules` type and documents it alongside the existing `group_tag` and `directory_uri` types.

The fixtures lose ignored `ext="data"` attributes, gain required section/repeat titles, and replace five ignored `ext="txt"`/`ext="tabular"` attributes with `format=`. ***Those five dynamic-options/drill-down fixtures now enforce their intended input formats.***

***Validation covers top-level XML test tools and their immediate subdirectories; deeper nesting and production-wide validation remain separate work.*** The script skips configuration and macro files and the existing nonstandard `upload.xml` fixture. It also fixes the schema path and stops immediately if schema lint fails. The wider glob includes production tools reached through `expression_tools/` and `for_tours/filtering.xml` symlinks.

<details><summary>Validation evidence</summary>

- All 431 selected tools pass XSD validation after Galaxy macro expansion.
- Focused linter, parameter specification and test-case unit suites: 171 passed, 1 skipped in the polish run.
- Recorded negative checks fail for invalid XML in each covered subdirectory and at the top level, a missing `rules` enum value, and a malformed schema.
- Shellcheck and whitespace checks pass.
- Full `tox -e validate_test_tools` startup has not been run locally. Current-head fork CI is queued; no CircleCI `validate_test_tools` result is available yet.

</details>

## Risks

Low risk overall: most changes affect test infrastructure, while accepting `rules` in the public XSD formalizes an existing core-only parameter type.

<details><summary>Risk Details</summary>

- Five test fixtures now restrict input formats; their recorded embedded framework tests accept the intended matching data.
- Invalid XML in newly covered fixtures, including symlinked production tools, will now fail CI.
- Schema acceptance of `rules` may be relied upon externally; its documentation explicitly limits it to core Galaxy tools.

</details>

<details><summary>Risk Review Advice</summary>

Review the fixture format restrictions and the validation exclusions. Confirm that documenting the existing core-only `rules` type accurately describes the supported tool language.

</details>

## Context

Builds on 🌿[issue_18642_framework_tool_coverage](https://github.com/jmchilton/galaxy/tree/issue_18642_framework_tool_coverage), which supplies prerequisite schema corrections. ***The parent must land first or accompany this change; until then, a comparison against `dev` includes the parent's commits.*** This review covers the four commits after `f66d1f0f97d`.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>The glob removes the directory-list gap that caused this issue.</summary>

Retained coverage of every immediate subdirectory. Deeper recursion, production-wide validation and other schema gaps remain separate work.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>The scoped code-quality review found no remaining changes to make.</summary>

Checked exclusions, format changes, schema documentation and the existing shared validator. Its larger process-spawning cleanup is outside this fix.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Negative checks demonstrate that invalid tools in each covered directory fail validation.</summary>

The recorded checks also exercise missing rules support and malformed-schema failure. The existing enum-message assertion fails against the parent schema.

</details>

### ✅ Second Frontier Model Review

<details><summary>A fresh review of the scoped diff reported no findings.</summary>

Reviewed the script, schema, fixtures and linter expectation. Validation covered 429 tools in that sandbox; independent runs include the two expression-tool symlinks and validate all 431.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Pre-existing CI-script fixes are isolated in the leading commit.</summary>

No separate base-branch refactor was needed. The history keeps the fixture/schema fix and subsequent coverage expansion separate from the pre-existing script fixes.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? CI reports the tool path and XSD diagnostic, then exits nonzero; malformed or unreadable schemas stop validation early.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Existing linter assertions exercise invalid inputs, and CI validates real fixtures.
- [x] Are baseline tests in their own leading commits (if applicable)? N/A. No baseline tests added; pre-existing script fixes lead the history.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Automated validation</summary>

Run `tox -e validate_test_tools` and the unit suites `test_tool_linters.py`, `test_parameter_specification.py` and `test_parameter_test_cases.py` under `test/unit/tool_util/`.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
