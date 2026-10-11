# ts_readme_render_followups

Base: `dev`. Branch: [`jmchilton:ts_readme_render_followups`](https://github.com/jmchilton/galaxy/tree/ts_readme_render_followups). Worktree: `~/projects/worktrees/galaxy/branch/ts_readme_render_followups`.

Merges [`ts_readme_render_fix_26.1`](../ts_readme_render_fix_26.1/index.md) into `dev`, then fixes old-revision READMEs (found when unchanged in that changeset; images served as of that revision via a `changeset_revision` option on the image route), makes revision permalinks load READMEs, and drops dead README code. Playwright test with screenshots.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Image route review](subagents/normal_review_image_route.md) · [Codex review](codex_review.md) · [Test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Screenshots](screenshot_debrief.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Scope evaluation](scope_evaluation.md) · [Earlier drafts](earlier_drafts/1/implementation_debrief.md)

Depends on `ts_readme_render_fix_26.1` (merged in as real history, so either order works and the release forward merge stays clean). Requested by John 2026-10-11. Replaces the local `ts_readme_render_fix_dev` sibling.

## TICK — 2026-10-11

Live fork tip `5abfc5c4aadf69c422a3b863a6a22b076d2b9aed` has queued/pending CI and no failures; retain needs CI. Its existing release-base dependency is now represented by draft #24053.
