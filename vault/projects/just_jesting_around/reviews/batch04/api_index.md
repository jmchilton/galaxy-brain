# API type helpers review — iteration 04

Selected originator: `client/src/api/index.test.ts`.

Baseline: 12 cases and 14 assertion statements. Final: 14 independent parameterized cases, executing 14 assertions from three table bodies. The original `isAnonymousUser` group called `isRegisteredUser` in all three cases; it only repeated the registered guard assertions. The corrected group now tests the named guard for registered, anonymous and sessionless users, while all three original registered-guard inputs and expected results remain in their own group. No unique registered behavior was dropped. All eight original ownership input/result combinations remain; the three sessionless history variants now have individual failure names.

Reused existing `getFakeRegisteredUser()` and `getFakeHistorySummary()` in `tests/test-data/index.ts`. Removed the unconstrained generic `createFakeHistory<T>()`, its unchecked result cast and its extended-history mutation cast. A small local typed `historyWithOwner()` adapter supplies the contents/size/user fields needed by `HistorySummaryExtended`; ownerless histories remain true summary objects without a `user_id` property. IDs, names, original history URLs, original September 2021 timestamp, zero counts and all ownership conditions are retained. The existing summary factory supplies the same baseline defaults. Each table displays its condition and expected boolean.

Reuse searches found the history summary factory already consumed by `api/client/serverMock.test.ts`, `HistoryOptions.test.ts`, and `History/Modals/CopyModal.test.ts`; the selected test now joins that abstraction. No new shared history factory or supporting migration is warranted. API package fixtures intentionally stay package-local because the independently testable package has a different alias root and cannot depend on application test helpers.

Validation: the selected suite's 14 cases pass within the four-suite/32-case focused run; scoped ESLint and Prettier pass. The driver performs final full-client typechecking. Log: `/private/tmp/batch04_stores_api_final.log`.

No README addition recommended. Existing behavior/condition naming, `it.each`, and factory guidance already cover the improvements. Correcting a group that tested the wrong function is direct review work, not evidence for another general best-practice paragraph.
