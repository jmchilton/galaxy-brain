# invocation_tool_compatibility

- [PR #24209](https://github.com/galaxyproject/galaxy/pull/24209)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/invocation_tool_compatibility)

## Status

`attention` at `4954720f00ce1ce530ba97d01fdf9633a8574e84`; live PR description needs refresh from [pr_description.md](pr_description.md).

PR #24209 targets `release_26.2`, rebased onto `fe6a5540d28` 2026-10-19; mergeable.

PR CI pending on the rebased head; previous head's Test Galaxy packages reds were unrelated (see CI diagnosis).

## Review

mvdbeek reviewed (comment, 2026-10-19); his fixes jmchilton/galaxy#91 fast-forwarded in 2026-10-19: `has_tool` decides availability again (cached toolbox `get_tool(exact=True)` falls back to another version), each tool description listed once, versions for incompatible tools in exact mode, `MessageException` for both pre-flight failures, stale TODO updated. New `TestCachedToolBoxApi` test red on old services code (`Workflow step has upgrade messages`), green after. Rebased head: 17 API cases (incl. upstream scheduler/storage pre-checks) and the integration test pass; ruff/black/isort clean; mypy matches base. Rebase conflicts were additive (upstream scheduler pre-check + storage tests). No further work requested.

## Review materials

[PR description](pr_description.md) · [Title options](pr_titles.md) · [Labels](pr_tags.md) · [Polish debrief](polish_debrief.md) · [Checklist](checklist_evaluation.md) · [Strengthening review](strengthening_review.md)

## Context and supporting evidence

Independent extraction from [issue_20900_invocation_validation](../issue_20900_invocation_validation/index.md). Revised scope includes complete-reference deduplication across nested workflows. The original polished scope remains on fork branch `invocation_tool_compatibility_alt_original_scope`; prior polish materials are in [earlier_drafts/3](earlier_drafts/3/index.md).

[Implementation](implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenge](test_challenges_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Code-quality review](thermo_nuclear_review.md)

## CI diagnosis — 2026-10-19

- Test Galaxy packages (3.10, 3.14) fail collecting `packages/data/tests/data/datatypes/test_data.py`: `ModuleNotFoundError: galaxy.tools` from the `Conditional` import. Pre-existing on `release_26.2`; fixed by unmerged [`fix_data_package_tests_26_2`](../fix_data_package_tests_26_2/index.md). Unrelated.
- Conflicts with `release_26.2` resolved by the 2026-10-19 rebase.
