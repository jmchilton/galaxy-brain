---
upstream_base_branch: dev
related_records: galaxy/reviews/24607
---
# pr_24607_followup

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:pr_24607_followup?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/pr_24607_followup)

## Status

Hardened (re-scoped once), READY; head `47e2af2f82d` on `dev` merge-base `ab008a1a7cfe`, 6 commits. Alt: `pr_24607_followup_alt_original_scope`. Worktree: `~/projects/worktrees/galaxy/branch/pr_24607_followup`.

No PR.

No CI yet.

[PR description](pr_description.md) · [Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · [Re-scope review](subagents/rescope_review.md) · [Test challenges](test_challenges_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Baseline refactor](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md) · Alts: [original scope](alts/original_scope.md) · Earlier drafts: [1/](earlier_drafts/1/)

## Decisions

- Follow-up to merged [#24607](https://github.com/galaxyproject/galaxy/pull/24607): started as the four `pr_24607_review_0` review commits cherry-picked onto `dev` (review record: [archived/24607](../../../reviews/archived/24607/index.md)).
- Base `dev`: coverage + admin log wording, no user-visible change.
- `JobWrapper.prepare()` keeps its inline role check and `test_job_wrapper_user_tool.py` stays, to avoid conflicting with open #24635 on merge-forward; `prepare()` adopts `ensure_job_owner_can_run` after it lands.
- User-facing "This tool was disabled..." message unchanged.
- Commits 1–3 test-only, splittable.
