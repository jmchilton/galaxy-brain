# LastQueue review — iteration 07

Selected originator: `client/src/utils/lastQueue.test.js`. Baseline: 17 cases. Final: 18 cases.

Every scenario now receives fake timers and an explicit time origin, with timer cleanup and real-timer restoration in `afterEach`. Previously one fake-timer case never restored real timers, allowing later tests to inherit its clock. Real sleeps become asynchronous advancement of the same durations. The shared one-line action is named `returnArgument`, and test names describe observable behavior rather than making unsupported claims about rejection, cancellation, or memory.

Throttle checks retain the original queued inputs and now assert exact start times `[0, 50]` for the first/latest actions and independently for both keys. This strengthens the former permissive nonempty/range checks. The completion-enqueue case additionally verifies calls `[1, 2]`; previously it only checked that the initial result existed. The immediate-start case keeps its synchronous timer advancement and original nonempty assertion, adds a check before advancement, and then settles pending work. The timeout cleanup scenario retains its original immediate zero-timeout check and adds the same check after asynchronous timers have actually completed.

The original nonrejecting two-action scenario never skipped a pending action. Its inputs remain `[1, 2]`, and its loose alternatives are strengthened to the exact observed first result `[1]`; its name now describes that contract. A separate three-action case verifies an actual superseded pending action resolves to `undefined`, with exact results `[1, undefined, 3]`. The explicit rejecting variant still checks `ActionSkippedError`. Error recovery, independent keys, negative throttle, idle-key reuse, in-flight work, external abort propagation, thousand-key cleanup, thousand-action burst order, and string/numeric keys remain checked. The running-action replacement case advances timers before awaiting the second promise, preserving the original 30 ms action delays, 5 ms enqueue gap, and final 40 ms advancement without deadlocking a fake clock.

No second suite needs this tiny action helper, and no shared queue harness improves these visible input sequences. Existing README timer-cleanup and asynchronous-operation guidance already covers the changes; no marginal advice or README addition is proposed.

Validation: all 18 cases pass in a shuffled 71-case client run, seed 70117 (`/private/tmp/batch07_entity_queue_redirect_results.json`). Scoped current-config ESLint and Prettier pass. No production changes.
