# notebook_iframe

Status: `abandoned`. Base: `dev`.

Explores embedded Galaxy notebooks in Loom with automatic synchronization.

[Tracking history](tracking_history.md)

## TICK — 2026-10-11

Live PR #22988 has seven conflicts across Markdown/history dataset components, App.vue, admin options, schema, API and pages service. These are substantial; left branch untouched.

## TICK — 2026-10-12

Live draft remains conflicting with actual dev `6831f768a637d148d941a3477db0a14e21573c1d`. Read-only merge-tree confirms substantial conflicts in `client/src/components/Markdown/Markdown.vue`, `client/src/components/Markdown/Sections/Elements/HistoryDatasetDisplay.vue`, `client/src/entry/analysis/App.vue`, `doc/source/admin/galaxy_options.rst`, `lib/galaxy/schema/schema.py`, `lib/galaxy/webapps/galaxy/api/__init__.py`, `lib/galaxy/webapps/galaxy/services/pages.py`. These require design or behavior reconciliation beyond the automatic small/mechanical-conflict scope. No worktree files, branch refs or PR settings changed; remains author work.

## TICK — 2026-10-13 evening

GitHub reports PR #22988 CLOSED and unmerged. Moved to `branches_need_decision`; closing the PR is not abandonment. The record and local branch remain active. No rebase or cleanup performed. John needs to decide whether to retain, revive, or explicitly abandon it.

## Abandoned — 2026-10-13

John explicitly requested abandoning `notebook_iframe` after PR #22988 was closed unmerged. Removed from MY_BRANCHES.md and moved this record to abandoned/. Fork head `ceb2de88808999fbfe904be9f6f978a66f960a75` is preserved.

The worktree is clean and its HEAD exactly matches the live fork branch. It has no configured upstream; retained under WORKTREES.md rather than removed. No Galaxy branch or remote ref was deleted.
