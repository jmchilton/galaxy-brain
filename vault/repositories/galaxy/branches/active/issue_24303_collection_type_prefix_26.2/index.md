# issue_24303_collection_type_prefix_26.2

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:issue_24303_collection_type_prefix_26.2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24303_collection_type_prefix_26.2)

## Status

Status: `branches_implemented_needs_ci`. READY: re-scoped once, hardened twice. Base: `release_26.2` (`e2649e52818`). Head: `e0239d8d74b`. Alt: `issue_24303_collection_type_prefix_26.2_alt_original_scope`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24303_collection_type_prefix_26.2`.

No PR yet. CI not yet seen.

Implements [#24303](https://github.com/galaxyproject/galaxy/issues/24303): tools can declare an output collection's type as "the input's type plus a list level" (`type_prefix` alongside `type_source`).

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · [Plan](plan.md) · [Research](research.md) · Reviews: [subagents/](subagents/) · [Test challenges](test_challenges_debrief.md) · [Codex](codex_review.md) · [Thermo-nuclear](thermo_nuclear_review.md) · [Baseline refactor](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md) · [Screenshots](screenshot_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · Alt: [original scope](alts/original_scope.md) · Round 1 hardening: [earlier_drafts/1/](earlier_drafts/1/)

## Decisions

- Base `release_26.2`: John's call (new tool-spec feature; #24190 Nest fix targets `release_26.0` and is unmerged).
- Replaces #24190 (Nest `list:paired`) on 26.2: Nest 1.1.0 with `type_prefix`, 1.0.0 kept; bernt-matthias's commit cherry-picked. 26.0/26.1 don't get the Nest fix.
- Named `type_prefix`. A `sample_sheet` input is treated as a `list` before prefixing; this reverses the earlier choice to raise an error. Profile 26.2 is enforced by the linter only. The field is parser-only. The resolution-order bug is [#24308](https://github.com/galaxyproject/galaxy/issues/24308).
- Open for John: what to do with #24190 (close in favour of this branch, or something else), and how to split the PR (scope evaluation options A–E).
