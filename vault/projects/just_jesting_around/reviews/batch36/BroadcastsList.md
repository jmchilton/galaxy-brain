# BroadcastsList

Selected originator: `client/src/components/admin/Notifications/BroadcastsList.test.ts`. Baseline **2 tests** → final **6 tests**.

The single filter walk is split. One case lists all three broadcasts with every filter on. An `it.each` over the three filters shows each one alone surfaces only its own broadcast. A final case keeps the original walk: every filter off shows the empty-list alert, then switching active, scheduled and expired back on lists one, two and three broadcasts. The no-broadcasts case stays as it was.

The fixtures used the real clock with ±1 s windows, and the component re-reads `new Date()` on every click, so a slow run could reclassify the active broadcast as expired mid-test. `Date` alone is now pinned (`vi.useFakeTimers({ toFake: ["Date"] })` + `setSystemTime`), leaving `setTimeout` real for `flushPromises` and MSW. The original offsets (−1000/+1000, +1000/+2000, −2000/−1000) are unchanged. A local `broadcastBetween(subject, publishedOffset, expiresOffset)` wraps `generateNewBroadcast` and gives each broadcast a fixed subject, replacing that factory's random one.

Preserved and strengthened: each count assertion (3, 0 + alert, 1, 2, 3) now checks which broadcasts show, by the subject rendered in each card's `Heading`, not only how many. The default-state case also asserts the alert is absent. The three single-filter rows are new. The scheduled-only and expired-only states weren't checked before.

Mount: `withPlugins(localVue, pinia)` installs the testing Pinia in place of `getLocalVue`'s default. This drops the separate `setActivePinia`, which `createTestingPinia` already does, and the `as object` cast. The mount stays a full `mount` because a stubbed GButton never emits `update:pressed`, so the filter clicks would do nothing.

Reuse: `generateNewBroadcast` (local `test.utils.ts`) and `withPlugins`. No new shared helper.

Validation: 6 tests pass shuffled (seed `360101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and full `vue-tsc --noEmit` (exit 0) pass.

Guidance: none new. Pinning only `Date` is the narrow fix for time-window fixtures in a suite that also relies on real timers. That is a general Vitest point, not Galaxy-specific.
