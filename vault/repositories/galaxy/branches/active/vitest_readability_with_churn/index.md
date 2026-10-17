# vitest_readability_with_churn

Status: `branches_reference`; published comparison stack, do not PR. Base: `vitest_readability` (`e06bbc4c70271aacfe27a88e315c882b5270ecaa`).

Current pushed head: `488693a2611de20c50ec5f990311a6d676c0c989`. Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/vitest_readability_with_churn`.

John requested this backup on 2026-10-13 before removing the 77 score-2 readability commits. Originally it preserved the complete `vitest_readability` history at `7f2db5e59415f07c09fec5be75ff4885fbad047e`, including its `fix_story_a11y` base. That original head is now preserved at `backup/vitest_readability_with_churn-before-stack-20261016`. The named branch is now a comparison stack with a worktree; published on the fork at John’s request, no separate PR.

The original assessment refers to snapshot `7a5aa84d83dce57572a67450020a5fd0177a97af`. [Pruning manifest](../../../../../projects/just_jesting_around/readability_assessment/prune_plan.json) maps all 493 assessed commits to the preserved history; reviewed score-2 patches are unchanged. [Marginal examples](../../../../../projects/just_jesting_around/readability_assessment/marginal_examples.md) summarize retained score-3 changes.

The continuing branch is [vitest_readability](../vitest_readability/index.md), draft PR #24038. This backup is not approval to publish another PR.

## Rebased above cleaned readability — 2026-10-16

John explicitly requested rebasing this branch onto `vitest_readability`. Used the pruning map to exclude retained rewrites and already-merged a11y commits, replaying only the 76 removed branch-local score-2 changes. Dependency definitions already present below stay shared. Every original churn commit message and trailer is preserved; the original head stays in the backup ref. Cleaned readability remains unchanged at `e06bbc4c702`.

Final head `488693a2611de20c50ec5f990311a6d676c0c989` has 76 commits above cleaned readability. The net diff touches tests only. Five reviewed reconciliations keep new upstream configuration, checkbox, job-state, and confirmation coverage while restoring the removed changes. All other blobs match the three-way application of the historical churn difference. Upstream duplicate-suite deletion remains effective.

[History mapping](../../../../../projects/just_jesting_around/readability_assessment/churn_rebase_2026-10-16.json), [normal review](subagents/rebase_2026-10-16.md), and [test challenge](test_challenges_debrief.md). Final validation on `488693a2611de20c50ec5f990311a6d676c0c989`: client **612 suites / 5,471 tests pass**, one skipped, exit 0; Tool Shed **27 suites / 182 tests pass**, exit 0; both frontend type checks, changed-file ESLint/Prettier and diff whitespace pass. The client types and tests were rechecked with isolated dependencies. Vault validation: 124 files, zero errors, 15 advisory warnings. A client run using a shared node_modules symlink was stopped due to duplicate source-module resolution; the authoritative run uses an isolated frozen-lockfile installation.

Local comparison branch only. No remote publication, PR changes, downstream cascade, or changes to the cleaned branch.

[Implementation debrief](implementation_debrief.md). Tracking committed locally only per pipeline instructions.

## Published comparison and story restack plan — 2026-10-16

John explicitly requested publication. Pushed `488693a2611de20c50ec5f990311a6d676c0c989` as new `jmchilton/vitest_readability_with_churn`, set its upstream, and verified exact remote SHA. No PR opened; reference-only status retained.

Read-only ancestry audit: current stories `b1ba6eac0fd36c58256f9e8cdda9061cb7713697` contains old churn-inclusive readability `7f2db5e59415f07c09fec5be75ff4885fbad047e`, with 159 story-only commits above it. Current play `5673676726e0ae2430cb0d73f28cf61b60eaae0b` inherits stories through `f2a726da91a19e070a60d6d42cfa6f946ea06a47`, with 99 play-only commits above that point. Neither contains cleaned readability `e06bbc4c702`. Stories overlaps the historical churn delta in 25 test paths; play overlaps it in 12. The separate a11y and real-API branches also lack clean-head ancestry and require their own boundary audit.

Recommended sequence (plan only; story refs untouched): freeze worker loops and record exact remote heads/backups; rebase only stories’ 159 commits from old readability onto published cleaned readability via `--onto`; inspect the 25 overlapping migrated tests plus their stories for churn carried in content, preserving migration behavior/assertions and required fixtures; validate unit/browser/type/build gates and review before publishing stories with the recorded lease; then replay only play’s 99 commits from its actual captured stories parent `f2a726da91a` onto the newly published stories tip, audit its 12 overlapping test paths plus plays, validate/review and push with its exact lease. Preserve `Test-File` trailers and per-test commits. Verify new layer ancestry and diff each layer against its parent. Audit a11y/real-API boundaries separately after the core stack. The with-churn branch is a comparison reference, not a parent for the cleaned story stack.

## Accepted preservation policy — 2026-10-16

The user clarified that estimated churn scores are review pointers, not a removal mandate. Keep migrated story/play changes by default, changing them only for concrete conflicts, assertion loss, readability problems or current-dev incompatibility. This supersedes the blanket cleanup wording in the earlier restack recommendation. Stories now published at `4e60254eded` above clean readability; play restack is in progress. The churn comparison stays at `488693a2611` and is not the base of this story stack.
