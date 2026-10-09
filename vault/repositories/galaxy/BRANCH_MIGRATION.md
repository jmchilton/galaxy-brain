# Galaxy branch migration

Completed 2026-10-09. Branch files now live under `vault/repositories/galaxy/branches/<status>/<branch>/`, following the [shared convention](../../agents/_shared/REPOSITORY_BRANCHES.md).

- **303 tracked branch documents moved**, with **145 branch records**: 75 active, 59 merged, 11 explicitly abandoned.
- **36 local screenshots moved** and remain ignored by Git, including captures under earlier drafts.
- **68 queue entries preserved**, with their existing workflow classifications. The [queue](../../agents/gx_branches/MY_BRANCHES.md) is about 61% smaller. Status covers routine progression; branch records preserve explicit decisions, approvals, dependencies and standing instructions.
- The complete original entry for each queued/abandoned branch is retained in its `tracking_history.md`; shared dated CI diagnoses and lifecycle notes are in [queue_context.md](branches/queue_context.md).
- Agent instructions, implementation handoff, polishing paths, abandonment links and incoming issue links use the repository directories. Process files and the reusable PR-debrief corpus stay with the agent.

## Representative records

- [Approved branch: script_setup_polling_unmount](branches/active/script_setup_polling_unmount/index.md)
- [Open PR: pulsar_version_metrics](branches/active/pulsar_version_metrics/index.md)
- [Scope decision: workflow_input_pipe_names](branches/active/workflow_input_pipe_names/index.md)

These are the real migrated records; the preview samples have been removed.

## Preserved distinctions

The three pipe-name variants remain comparison records, linked to the original decision; they are not three new queue candidates. The closed-PR comment remains unposted pending its PR number.

`galaxy_ui_driver` remains owned by the Playwright project, with do-not-PR, do-not-polish and gxui-tip instructions. The concurrent 2026-10-09 update integrating `galaxy_ui_driver_followups` was captured before migration; its retirement still awaits John's OK. Retained references stay active without acquiring PR intent.

The two descriptions for natefoo's PRs are retained under [mulled-hash](branches/active/mulled-hash/index.md) and [galaxy-memory-gb](branches/active/galaxy-memory-gb/index.md) as external history. Neither was added to John's queue. [playwright_hover_away](branches/active/playwright_hover_away/index.md) remains active history with its terminal outcome unconfirmed.

PR state/base/head metadata was refreshed for 88 identified PRs and agreed with the inventory; CI and review threads were not refreshed. Existing workflow classifications and historical CI diagnoses were preserved. No project-code branches, PRs or worktrees were modified.

The [migration manifest](branch_migration_manifest.json) records source/destination paths and hashes for every moved file. Hash differences reflect supporting-link/path repairs; substantive branch history is retained.

Verified all moved files, all 68 queue entries, all four approvals, 458 local links across the queue/catalog/report/indexes, and screenshot ignore rules. Vault validation and index/dashboard checks pass (15 existing vault warnings). Twelve older supporting links still reference missing files or unarchived draft reviews; these predate the migration and are listed in the manifest.
