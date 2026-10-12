# notebook_iframe

Status: `author_work`. Base: `dev`. [PR #22988](https://github.com/galaxyproject/galaxy/pull/22988) (open).

Explores embedded Galaxy notebooks in Loom with automatic synchronization.

[Tracking history](tracking_history.md)

## TICK — 2026-10-11

Live PR #22988 has seven conflicts across Markdown/history dataset components, App.vue, admin options, schema, API and pages service. These are substantial; left branch untouched.

## TICK — 2026-10-12

Live draft remains conflicting with actual dev `6831f768a637d148d941a3477db0a14e21573c1d`. Read-only merge-tree confirms substantial conflicts in `client/src/components/Markdown/Markdown.vue`, `client/src/components/Markdown/Sections/Elements/HistoryDatasetDisplay.vue`, `client/src/entry/analysis/App.vue`, `doc/source/admin/galaxy_options.rst`, `lib/galaxy/schema/schema.py`, `lib/galaxy/webapps/galaxy/api/__init__.py`, `lib/galaxy/webapps/galaxy/services/pages.py`. These require design or behavior reconciliation beyond the automatic small/mechanical-conflict scope. No worktree files, branch refs or PR settings changed; remains author work.
