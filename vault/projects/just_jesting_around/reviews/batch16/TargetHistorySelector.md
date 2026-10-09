# TargetHistorySelector

Selected originator: `client/src/components/History/TargetHistorySelector.test.ts`. Baseline and final: **3 tests**.

The archived and deleted warning cases form a descriptive table with their original IDs, names, state flags, and exact messages. An active-history case stays separate. The existing `getFakeHistorySummary` factory supplies standard fields while the mount helper explicitly preserves the original annotation, timestamp, and URL defaults. All original false flags, zero count, History model class, unpublished state, and empty tags match the factory defaults.

The store is seeded explicitly because TargetHistoryLink remains stubbed. SelectorModal also remains stubbed, and the component still mounts with a fresh testing Pinia whose actions run. `withPlugins` installs that Pinia once alongside the normal localization/directive setup. The previous unconsumed history handler and unnecessary async flush are removed because the retained link stub prevents the request. This preserves the original store boundary rather than replacing a real fetch with direct state. Automatic unmounting cleans up wrappers.

Both warning messages remain asserted against the rendered alert. The active case retains its original negative text assertion, adds alert absence, and checks that the rendered TargetHistoryLink receives the active history ID. No original warning case or input state is dropped.

Reuse: adopts the existing shared history factory; no new helper or supporting edit is needed.

Validation: 52 tests pass across the three owned suites in shuffled order (seed `160063`, `NODE_OPTIONS=--no-webstorage`, two workers). Scoped ESLint, Prettier, and whitespace checks pass. A full client typecheck passed after removing the component/output/payload casts; the driver also validates the final batch together.

Guidance: the existing README already covers scenario locality, existing factories, component boundaries, async waits, and cleanup. No new best practice or unresolved marginal advice is proposed.
