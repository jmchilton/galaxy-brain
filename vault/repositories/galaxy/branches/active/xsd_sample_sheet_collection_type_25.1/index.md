# xsd_sample_sheet_collection_type_25.1

Status: implementing. Base: `release_25.1` (`2ae14b0eac3`). Head: `7ccd03c658d`. Fork: `jmchilton/xsd_sample_sheet_collection_type_25.1`. Worktree: `~/projects/worktrees/galaxy/branch/xsd_sample_sheet_collection_type_25.1`.

The tool XSD rejected `collection_type="sample_sheet..."`, which core `lib/galaxy/tools/sample_sheet_to_tabular.xml` uses. No upstream issue. Found as a follow-up in [issue_23978_parameter_tools_xsd](../issue_23978_parameter_tools_xsd/scope_evaluation.md).

[Initial implementation](initial_implementation_debrief.md) · [Baseline refactor](baseline_refactor.md)

## Decisions

- Base `release_25.1`: oldest supported release with the sample sheet tools (added in 25.1, released 2025-12-12). Simple fix; XSD ships in `galaxy-tool-util` used by `planemo lint`.
- Legal values mirror the runtime `COLLECTION_TYPE_REGEX` (`type_description.py`): `sample_sheet` only outermost, optional `:paired|:paired_or_unpaired|:record`. Settles the "which nestings" question raised in 23978's scope evaluation.
- Testing per John: only lint coverage. `.ci/validate_test_tools.sh` now also validates core `lib/galaxy/tools/*.xml` that aren't internal `<type class=…>` tools (today: `data_fetch.xml`, `sample_sheet_to_tabular.xml`). Rule-based, not a hand-kept list.

## Dependencies

- Merge-forward conflict with `issue_23978_parameter_tools_xsd` (dev) in `.ci/validate_test_tools.sh`; both now use the same `set --` loop shape. Resolution: keep 23978's `*/*.xml` loop and xsd path fix, append this branch's core-tools loop.
