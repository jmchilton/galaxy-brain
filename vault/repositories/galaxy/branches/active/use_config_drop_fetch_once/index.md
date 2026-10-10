# use_config_drop_fetch_once

Status: `branches_implemented_needs_ci`. Base: `dev`.

Drops `useConfig`'s dead `fetchOnce` flag; every caller now retries config load on mount.

[Implementation debrief](implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Codex review](codex_review.md) · [Scope evaluation](scope_evaluation.md)

Came from BUGS_FOUND row 2 in [just_jesting_around](../../../../../projects/just_jesting_around/BUGS_FOUND.md). It was rejected as an issue (`gx_issues/to_file/reject_use_config_fetch_once_guard.md`) and John asked for a branch instead (2026-10-09).
