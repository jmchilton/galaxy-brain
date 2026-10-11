# use_config_drop_fetch_once

Status: `merged`. Base: `dev`. [PR #24022](https://github.com/galaxyproject/galaxy/pull/24022) (merged).

Drops `useConfig`'s dead `fetchOnce` flag; every caller now retries config load on mount.

[PR description](pr_description.md) · [Titles](pr_titles.md) · [Polish debrief](polish_debrief.md) · [Implementation debrief](implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Codex review](codex_review.md) · [Scope evaluation](scope_evaluation.md)

Came from BUGS_FOUND row 2 in [just_jesting_around](../../../../../projects/just_jesting_around/BUGS_FOUND.md). It was rejected as an issue (`gx_issues/to_file/reject_use_config_fetch_once_guard.md`) and John asked for a branch instead (2026-10-09).

## Merged — TICK 2026-10-11

Live GitHub state confirms [#24022](https://github.com/galaxyproject/galaxy/pull/24022) merged at `2026-10-10T12:49:26Z`. Removed from the queue and archived this record under `merged/`. The clean, fully pushed worktree at the PR head was removed with `ghwt rm`; its workspace note was archived by ghwt.
