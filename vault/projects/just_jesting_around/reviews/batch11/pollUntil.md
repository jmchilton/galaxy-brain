# pollUntil readability review

Selected originator: `client/src/composables/pollUntil.test.ts`.

The six cases retain immediate success and its one call, third-poll success and its three calls, the timeout message, propagated network error, the configured 100ms interval and two calls, and the complete `{ status: "complete", value: 42 }` result. Typed sequential resolved values replace mutable call counters, making the pending-to-ready inputs visible.

Fake timers replace wall-clock waits. The interval test now checks that no second request occurs at 99ms and that the second request succeeds at exactly 100ms, strengthening the previous elapsed-time lower bound of 80ms. Timeout checks retain the 50ms deadline and additionally require five attempts and no timer afterward. Immediate success and rejected requests also assert that no retry is scheduled. The rejection assertion is attached before advancing the clock so a timed rejection cannot become unhandled. Cleanup clears timers and restores the real clock after every case.

Reuse: inspected neighboring timer-based composable tests and existing Vitest helpers. They already use Vitest clock APIs directly. A shared polling harness would hide this suite's timing checkpoints and has no concrete second consumer requiring the same setup; no helper or supporting suite was added.

Validation: baseline 6/6; final 6/6. Assigned-suite shuffled seed `110071` passes all 33 cases across four files. Scoped current ESLint, Prettier, and diff whitespace checks pass. Evidence: `/private/tmp/jest_readability_batch11_async_{baseline,final}.json`, `_lint.log`, and `_prettier.log`.

No best-practice addition proposed. The concrete deadline boundary belongs in this test; existing async and cleanup principles are sufficient.
