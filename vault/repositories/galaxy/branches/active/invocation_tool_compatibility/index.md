# invocation_tool_compatibility

- [Draft PR #24209](https://github.com/galaxyproject/galaxy/pull/24209)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/invocation_tool_compatibility)

## Status

`attention` at `d8319abb97b0ee37c059a37ea2188b18bad61275`.

Draft PR #24209 targets `release_26.2` at `caa4acc3ad7`; out of draft as of 2026-10-19; now conflicts with its base.

PR CI (2026-10-19): Test Galaxy packages red on 3.10 and 3.14, unrelated (see CI diagnosis).

## Review materials

[PR description](pr_description.md) · [Title options](pr_titles.md) · [Labels](pr_tags.md) · [Polish debrief](polish_debrief.md) · [Checklist](checklist_evaluation.md) · [Strengthening review](strengthening_review.md)

## Context and supporting evidence

Independent extraction from [issue_20900_invocation_validation](../issue_20900_invocation_validation/index.md). Revised scope includes complete-reference deduplication across nested workflows. The original polished scope remains on fork branch `invocation_tool_compatibility_alt_original_scope`; prior polish materials are in [earlier_drafts/3](earlier_drafts/3/index.md).

[Implementation](implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenge](test_challenges_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Code-quality review](thermo_nuclear_review.md)

## CI diagnosis — 2026-10-19

- Test Galaxy packages (3.10, 3.14) fail collecting `packages/data/tests/data/datatypes/test_data.py`: `ModuleNotFoundError: galaxy.tools` from the `Conditional` import. Pre-existing on `release_26.2`; fixed by unmerged [`fix_data_package_tests_26_2`](../fix_data_package_tests_26_2/index.md). Unrelated.
- Conflicts with `release_26.2`; needs a rebase.
