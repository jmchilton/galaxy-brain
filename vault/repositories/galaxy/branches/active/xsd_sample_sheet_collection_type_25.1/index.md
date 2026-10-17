# xsd_sample_sheet_collection_type_25.1

Status: `branches_implemented_needs_ci` (READY). Base: `release_25.1` (`2ae14b0eac3`). Head: `5d35c8c7db3`. Fork: `jmchilton/xsd_sample_sheet_collection_type_25.1`. Worktree: `~/projects/worktrees/galaxy/branch/xsd_sample_sheet_collection_type_25.1`.

The tool XSD rejected `collection_type="sample_sheet..."`, which core `lib/galaxy/tools/sample_sheet_to_tabular.xml` uses. No upstream issue. Found as a follow-up in [issue_23978_parameter_tools_xsd](../issue_23978_parameter_tools_xsd/scope_evaluation.md).

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · [Normal review](subagents/normal_review.md) · [Re-scope review](subagents/rescope_review.md) · [Codex review](codex_review.md) · [Baseline refactor](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md) · Alt: [original scope](alts/original_scope.md) · Round 1 hardening: [earlier_drafts/1/](earlier_drafts/1/)

## Decisions

- Base `release_25.1`: oldest supported release with the sample sheet tools (added in 25.1, released 2025-12-12). Simple fix; XSD ships in `galaxy-tool-util` used by `planemo lint`.
- Legal values mirror the runtime `COLLECTION_TYPE_REGEX` (`type_description.py`): `sample_sheet` only outermost, optional `:paired|:paired_or_unpaired|:record`. Settles the "which nestings" question raised in 23978's scope evaluation.
- Re-scoped (first scope evaluation): XSD self-lint at its real path, and `convert_sample_sheet.xml` duplicate `sample_sheet` → `sample_sheet:record` (declaration parity only; nested-record conversion is a dev follow-up).
- Kept the 3-commit history from the refactor subagent (John, 2026-10-16), even though that subagent got around a blocked `git reset --hard`.
- Testing per John: only lint coverage. `.ci/validate_test_tools.sh` now also validates core `lib/galaxy/tools/*.xml` that aren't internal `<type class=…>` tools (today: `data_fetch.xml`, `sample_sheet_to_tabular.xml`). Rule-based, not a hand-kept list.

## Dependencies

- Merge-forward conflict with `issue_23978_parameter_tools_xsd` (dev) in `.ci/validate_test_tools.sh`; both now use the same `set --` loop shape. Resolution: keep 23978's `*/*.xml` loop and xsd path fix, append this branch's core-tools loop.
