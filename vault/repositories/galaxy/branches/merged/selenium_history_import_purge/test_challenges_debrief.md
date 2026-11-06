# Test challenges debrief

No changes made (fresh pass after re-scope). Branch adds only two E2E tests; no unit/API tests to challenge.

## Challenges

- **Unit tests** - none added. Existing `HistoryView.test.js` vitest already covers the import button rendering; no overlap issue.
- **API/integration helpers** - none added. E2E tests hit `histories/{id}` and `histories/{id}/contents` once each; no helper warranted.
- **E2E coverage** - import-from-history-view and bulk purge from histories list had no E2E coverage on `release_26.2`; E2E is the right layer.
- **Selectors/helpers** - all via `navigation.yml` (`copy_history_modal`, `history_view.import_button`, `histories.bulk_purge_button`, `histories.select_all`) and `NavigatesGalaxy` helpers. No sleeps.
- **Assertions** - backend effects: import checks new id, requested name, contents `["1.txt"]`; purge polls `purged` per history with `DATABASE_OPERATION` wait.
- **Fails without change** - missing-tests branch; features exist on base, so no baseline commit applies. Without the branch the import test lacks the `CopyModal` hooks/selectors.

## Not acted on

- `get_history_titles(3)` (2 created + default history) - readable in context.
- No "list empties" UI assertion after purge - API poll is stronger.

## Verification

Both tests pass under Playwright (framework server) on current HEAD.
