# collection_restructure_panel

Status: `author_work`. Base: `dev`. [PR #12238](https://github.com/galaxyproject/galaxy/pull/12238) (open).

Adds a panel for transforming dataset collection layouts.

[Tracking history](tracking_history.md)

## TICK — 2026-10-11

Live PR #12238 conflicts because DatasetCollection/DscMenu.vue and DscUI.vue were deleted upstream; debugging docs also conflict. Porting this old UI is substantial; left branch untouched.

## TICK — 2026-10-12

Live draft remains conflicting with actual dev `6831f768a637d148d941a3477db0a14e21573c1d`. Read-only merge-tree confirms substantial conflicts in `client/src/components/History/ContentItem/DatasetCollection/DscMenu.vue`, `client/src/components/History/ContentItem/DatasetCollection/DscUI.vue`, `doc/source/dev/debugging_galaxy.md`, `doc/source/dev/debugging_tests.md`. These require design or behavior reconciliation beyond the automatic small/mechanical-conflict scope. No worktree files, branch refs or PR settings changed; remains author work.

## GOOD_MORNING — 2026-10-13

Current fork head `e71f6a21fae21fc3a15152914e414ae0a7ecf5ad` conflicts with `origin/dev` in 4 paths. Overlapping behavior, schema or assertion changes require deliberate reconciliation beyond the standing mechanical/small-conflict authorization. Branch left intact. `CONFLICT (modify/delete): client/src/components/History/ContentItem/DatasetCollection/DscMenu.vue` · `CONFLICT (modify/delete): client/src/components/History/ContentItem/DatasetCollection/DscUI.vue` · `doc/source/dev/debugging_galaxy.md` · `doc/source/dev/debugging_tests.md`

## Morning refresh — 2026-10-16

Conflict preview against `origin/dev` at `e71f6a21fae21fc3a15152914e414ae0a7ecf5ad` found overlapping changes in 4 paths (`tree.`, `tree.`, `doc/source/dev/debugging_galaxy.md`, `doc/source/dev/debugging_tests.md`). These include behavior/schema/assertion changes beyond a small mechanical rebase; fork and development worktree left intact. Existing status/review holds remain.
