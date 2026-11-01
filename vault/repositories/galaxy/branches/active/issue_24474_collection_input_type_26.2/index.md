---
upstream_base_branch: release_26.2
---
# issue_24474_collection_input_type_26.2

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:issue_24474_collection_input_type_26.2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24474_collection_input_type_26.2)

## Status

Status: `branches_implemented_needs_ci`. READY: re-scoped once, hardened twice. Base `release_26.2` (`0fa4dc4c4fa`). Local head `069a65d9c3f`; the remote still has `8f11cea7dc9` because a force-push was denied, so it needs `git push --force-with-lease`. Alt: `issue_24474_collection_input_type_26.2_alt_original_scope` (pushed). Worktree: `~/projects/worktrees/galaxy/branch/issue_24474_collection_input_type_26.2`.

No PR yet. CI not yet seen.

Implements [#24474](https://github.com/galaxyproject/galaxy/issues/24474): `data_collection` inputs reject collections of undeclared types. Issue notes: [queued/24474](../../../issues/queued/24474/index.md).

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · [Research](brain_research.md) · Reviews: [subagents/](subagents/) · [Test challenges](test_challenges_debrief.md) · [Codex](codex_review.md) · [Thermo-nuclear](thermo_nuclear_review.md) · [Baseline refactor](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md) · Alt: [original scope](alts/original_scope.md) · Round 1 hardening: [earlier_drafts/1/](earlier_drafts/1/) · [Issue comment draft](issue_comment_draft.md)

## Decisions

- Base `release_26.2`: the fix tightens validation, and `accepts()` exists only from 26.1 on. Open for John: workflows and API calls that feed the wrong collection type into a typed tool input now fail on a release branch; the alternative is to retarget to `dev`.
- A request-time check of typed workflow collection inputs was dropped. Workflow inputs accept deeper collections, which the type algebra doesn't model; a `dev` issue is suggested.
- Squash the commits that added and then removed that check before opening a PR.
