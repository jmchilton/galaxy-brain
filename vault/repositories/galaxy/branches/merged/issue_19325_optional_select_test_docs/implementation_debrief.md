# Issue #19325 implementation debrief

Date: 2026-10-06
Issue: https://github.com/galaxyproject/galaxy/issues/19325
Branch: `issue_19325_optional_select_test_docs`
Head: `176d2ce32cb`
Base: `dev` at `253a4cb0b9c`.
Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_19325_optional_select_test_docs`
Remote: pushed to `jmchilton/galaxy`, with upstream tracking configured.

## Implementation

The issue discussion settled on `value_json="null"` for an unset optional
select, but the XSD still recommended `value=""`. Updated only
`lib/galaxy/tool_util/xsd/galaxy.xsd`, which also supplies the generated tool
syntax documentation:

- Document `value_json="null"` for unset optional single and multiple selects.
- Document `value_json="[]"` for an explicit empty multiple-select list.
- Explain the legacy empty-string conversion before profile 26.1 and rejection
  from profile 26.1 onward.
- Explain that omitting the test parameter uses its default, including selected
  options, and add examples to the `value_json` attribute documentation.

Runtime validation and error presentation are unchanged. No new tests were
added for this documentation-only change.

## Validation

- Existing `test_parameter_test_cases.py` and `test_parameter_specification.py`:
  **36 passed**.
- Temporary example verification used the actual XML parser, parameter models,
  XSD, `TestsCaseValidation`, and `TestsMultipleSelectEmptyValue`: explicit null
  passes for optional single/multiple selects, [] passes for multiple selects,
  omission passes, and invalid single-select [] / modern empty strings fail.
- Verified the legacy multiple-select empty-string conversion and warning under
  profile 24.2, and validation/lint rejection under profile 26.1.
- Generated the complete Markdown reference with `doc/parse_gx_xsd.py` and
  inspected the updated section. Output was kept outside the repository.
- `git diff --check` and commit hooks passed; worktree is clean.

The test run emitted existing pytest collection warnings and a macOS sandbox
PermissionError during mirakuru atexit process cleanup after all tests passed
(exit status 0). The documentation generator emitted existing lxml
FutureWarnings; generation completed successfully.

Vault handoff validation: the current working vault has four unrelated,
untracked files without frontmatter under `vault/issue_23930_shed_update_descriptions/`.
Those files were preserved. A temporary snapshot of the committed vault plus
this handoff passed validation: 122 files, 0 errors, 15 advisory warnings.

## Review and handoff

Independent subagent review followed `_shared/REVIEW_FOCUS.md` and checked
parser, model, default, linter, and documentation generation behavior. Its
legacy-profile clarification was applied and verified. No suggestions were
declined and no blocking findings remain.

Ready for fork CI and branch-management polish. No PR, GitHub comment, or issue
state change was made.
