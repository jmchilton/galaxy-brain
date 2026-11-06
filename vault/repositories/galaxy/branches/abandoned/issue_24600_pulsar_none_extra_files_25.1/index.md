---
upstream_base_branch: release_25.1
---
# issue_24600_pulsar_none_extra_files_25.1

- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24600_pulsar_none_extra_files_25.1)

## Status

Status: `abandoned`. Was READY, hardened twice (re-scoped once). Base: `release_25.1` (`32317280ecb`). Head: `bf1ec9728a6`. Fork: `jmchilton/issue_24600_pulsar_none_extra_files_25.1`. Alt `_alt_original_scope` at `4d18da26fee`. Both kept on the fork; no worktree. Never a PR.

Targeted [#24600](https://github.com/galaxyproject/galaxy/issues/24600): Pulsar jobs with `default_file_action: none` failed with `TypeError` when a tool asked for an extra-files path. Issue notes: [24600](../../../issues/closed/24600/index.md).

## Abandoned — 2026-11-06

John's call: [#24702](https://github.com/galaxyproject/galaxy/pull/24702) (merged 2026-11-04, `release_26.2`) fixed the crash first, with a `local_path_config` fallback instead of this branch's `dataset.extra_files_path`.

Dropped with it: the fix on 25.0, 25.1, 26.0 and 26.1, the sample job conf docs fix (only in `bf1ec9728a6`), and the integration tests.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · [Normal review](subagents/normal_review.md) · [Re-scope review](subagents/rescope_review.md) · [Test challenges](test_challenges_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Baseline refactor](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md) · Alt: [original scope](alts/original_scope.md) · Round 1 hardening: [earlier_drafts/1/](earlier_drafts/1/) · [Draft issue comment](issue_comment_draft.md)

## Decisions

- Base `release_25.1`: the crashing hooks and the `$input.extra_files_path` / composite-output callers are unchanged since before 25.1 (2025-12-12, oldest release in the 1-year window); small fix.
- Hooks return `dataset.extra_files_path` (not `None` as the issue proposed): every 25.1 caller expects a `str`, and dev's Directory and data-manager callers then work after merge-forward without changes.
- Integration coverage lives in a new `none` module with `remote_metadata: false`. The `none` + `remote_metadata: true` set_meta bug is separate, queued in `issues_incubator/incubating/pulsar_none_remote_metadata_unstaged/`.
- Re-scoped to include the sample job conf docs fix (first scope evaluation).
- Open: fold `4d18da26fee` into the baseline and fix commits before the PR (needs a force push).
