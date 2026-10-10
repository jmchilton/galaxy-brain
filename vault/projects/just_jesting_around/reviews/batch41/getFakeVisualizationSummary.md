# getFakeVisualizationSummary (`client/tests/test-data/visualizations.ts`)

New test-data factory following `tests/test-data/pages.ts`: `getFakeVisualizationSummary(overrides)` returns a complete `VisualizationSummary` with the fields the index returns. The defaults are the ones the three existing copies shared byte for byte (`nvd3_bar`, `2026-01-01T00:00:00` / `2026-01-02T00:00:00`, `test-user`, unpublished, no tags). The providers suite pins a timezone because its subtitles render `update_time`, so changing a default would change that suite's test data. The schema's index-signature intersection doesn't block a plain literal, so the copies' `as VisualizationSummary` cast goes away.

Consumers: three identical `mockVisualization` copies.
- `src/api/visualizations.test.ts` (supporting): its only use (two summaries) calls the factory inline; the local copy is gone.
- `src/components/CommandPalette/providers/visualizations.test.ts` (supporting): 16 call sites, so `mockVisualization(id, title)` stays as a one-line wrapper around the factory. Its unused `type` parameter (no call passed it) is dropped.
- `src/stores/visualizationStore.test.ts` (the batch originator), adopted in its own commit.

Not adopted: `CommandPalette/CommandPalette.test.ts` builds one more cast-based visualization summary in its recents case, but a later lane owns that file.

Validation: both supporting suites pass shuffled (seed `410101`, 4 + 10 tests, unchanged from baseline). ESLint, Prettier and full client vue-tsc pass. Per-file coverage of each supporting suite is unchanged (no statement or branch lost or gained).
