# Round-robin selector — iteration 05

Selected originator: `client/src/composables/roundRobinSelector.test.ts`.

All eight cases and 20 assertions remain, including every intermediate state in timed wraparound, manual wraparound, stop, item replacement, initially empty startup, and clearing a running list. The original arrays, interval 1000, and timer advancement durations remain.

The minimal lifecycle component now returns the actual typed composable result instead of maintaining a separately guessed ref/method surface with no-op method placeholders and `Object.assign`. Manual `next()` calls are awaited. Automatic unmount invokes the composable's existing unmount cleanup after each scenario; fake timers are installed per case, cleared, and restored afterward. Names describe manual/timed wraparound and empty-list conditions; comments repeating current-item assertions were removed.

Reuse search covered composable test helpers and other `useRoundRobinSelector` consumers. No second unit suite needs this particular generic items/polling harness, and the application consumers do not create equivalent test arrangements. Reuse Vue Test Utils `enableAutoUnmount`; keep the short lifecycle mount helper local, as README's composable guidance recommends. No new helper or supporting migration is required.

Validation: eight cases pass with all 20 original checks retained; scoped ESLint and Prettier pass. Lifecycle mounting is already documented; timer isolation and awaiting work are basic practices, not a new README nugget.
