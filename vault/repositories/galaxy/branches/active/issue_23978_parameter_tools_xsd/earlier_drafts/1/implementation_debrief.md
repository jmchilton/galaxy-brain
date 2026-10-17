# issue_23978_parameter_tools_xsd — implementation debrief

**STATUS: READY.** This is a recovery pass on a branch that predates the current process. The code is unchanged: `2a42bff3bfc`, two commits stacked on `issue_18642_framework_tool_coverage` (`85f79a9ab6c`). It fixes galaxyproject/galaxy#23978.

## Implementation
- The 14 `parameters/` tools drop `ext="data"` or switch to `format=`. Five of them (4 `*select_dynamic`, `gx_drill_down_code`) now actually restrict their inputs.
- Four section/repeat tools get a `title`.
- `rules` is added to the XSD `ParamType` enum, with doc syncs.
- `.ci/validate_test_tools.sh` validates `parameters/*.xml`, and its broken XSD lint path is fixed.
- Details are in the [initial debrief](initial_implementation_debrief.md).

## Recovery steps
- **Normal review:** this was done during the initial implementation. Its outcome is recorded in the initial debrief, but no `subagents/` file exists.
- **Test challenge:** skipped. The branch adds no new test code; it extends one expected linter error string with `'rules'` and edits fixture tools.
- **Codex review:** no findings and no code changes. See [codex_review.md](codex_review.md).
- **Scope:** no change. See [scope_evaluation.md](scope_evaluation.md). The branch stays stacked on the parent as its own PR.
  - Follow-up, not a blocker: also validate `for_workflows/`, `deprecated/` and `for_tours/` (all 19 tools already pass), and fix the `test/functional/tools/CLAUDE.md` "all test tools" wording with it.
  - `ftpfile` stays out of scope.
- **Screenshots:** not relevant, since the branch has no UI changes.
- **PR description:** none was drafted yet, and nothing changed that needs one now.

## Blockers to merge
- The parent PR (`issue_18642_framework_tool_coverage`) has to open first.
- Fork CI on `2a42bff3bfc` was partial at recovery time: the GitHub Actions checks seen were green or still queued. CircleCI `validate_test_tools` is the key job.
