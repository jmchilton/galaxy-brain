# reports

Selected originator: `client/src/components/CommandPalette/providers/reports.test.ts`. Baseline and final: **26 tests**.

`mockPage(id, overrides)` stays as a thin wrapper (it carries the `Page <id>` title, `page-<id>` slug, `owner` username and the zone-less `2026-08-30T10:00:00` timestamp the subtitle and ownership assertions read) but now builds on `getFakePageSummary`, which drops the `as PageSummary` cast, the same way `pageStore.test.ts` and `visualizations.test.ts` wrap their factories. The local `signIn` moved to the shared `signIn` in `CommandPalette/test-utils` (see `signIn.md`). The 19 repetitions of `(await reportsProvider.searchScoped?.(scope("r"), "", makeCtx())) ?? []` become `await searchScope("r")`, a local helper that resolves the scope key and defaults the query and context; the `scope()` lookup folds into it. The note that `mockPage` hands its pages to "owner" moved from `signIn` to `mockPage`.

All 26 scenarios and assertions are unchanged; no seeding moved and nothing is stubbed that wasn't before. The factory adds unread summary fields (history id, revisions, flags); keywords and subtitles come only from the slug, username and update time the wrapper still sets. The `searchScope` helper does not filter empty sections (unlike siblings' `renderedSections`), so the section-list assertions keep their meaning. The rejection case awaits `searchScope("r")` and still expects a `PaletteFetchError`.

Reuse: `getFakePageSummary` from `@tests/test-data/pages`, the shared `signIn` and existing `makeCtx`.

Validation: 26 tests pass shuffled (seed `420101`, `NODE_OPTIONS=--no-webstorage`). ESLint, Prettier and full client vue-tsc pass.

Guidance: none.
