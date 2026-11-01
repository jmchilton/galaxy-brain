---
upstream_base_branch: release_26.0
---
# issue_24481_sample_sheet_mapped_output_type_26_0

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.0...jmchilton:galaxy:issue_24481_sample_sheet_mapped_output_type_26_0?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24481_sample_sheet_mapped_output_type_26_0)

## Status

Status: `branches_need_decision`. BLOCKED on a scope decision: re-scoped once, and the second scope evaluation recommends a small further expansion (Scope B+). Head `129e3244b7b`. Alt: `issue_24481_sample_sheet_mapped_output_type_26_0_alt_original_scope`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24481_sample_sheet_mapped_output_type_26_0`.

No PR yet. CI not yet seen.

Fixes [#24481](https://github.com/galaxyproject/galaxy/issues/24481) (issue notes: [queued/24481](../../../issues/queued/24481/index.md)). Mapping over sample sheets no longer composes invalid types like `sample_sheet:list`. Every invalid `sample_sheet` rank is demoted to `list`, with its columns dropped. This applies at runtime, in the editor and in subworkflow output typing.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · [Research](brain_research.md) · Reviews: [subagents/](subagents/) · [Test challenges](test_challenges_debrief.md) · [Codex](codex_review.md) · [Scope evaluation](scope_evaluation.md) · Alt: [original scope](alts/original_scope.md) · Round 1 hardening: [earlier_drafts/1/](earlier_drafts/1/) · [Issue comment draft](issue_comment_draft.md)

## Decisions

- Base `release_26.0`. Sample sheets exist from 25.1, but 25.1 lacks the sample_sheet-as-list mapping normalization the fix builds on.
- Demote to `list` and drop the columns, rather than making `sample_sheet:list` and similar valid types (that would be a feature for dev).
- Open for John:
  - Scope B+, demoting job-created `type_source` children in `create_collection`. The alternatives are leaving it to #24303/#24308, or shipping the original-scope alt.
  - Whether to reorder the subworkflow baseline commit, which needs a force-push.
