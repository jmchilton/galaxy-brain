# HistoryNavigation review — iteration 05

Selected originator: `client/src/components/History/CurrentHistory/HistoryNavigation.test.ts`.

Baseline and final: 2 cases, 4 assertion statements. Both create/switch controls remain enabled for registered users and disabled for anonymous users. Required selectors now use `get`, then check actual disabled-attribute presence/absence.

Replaced the component `as object` cast, sparse history and registered-user casts with existing typed factories. The anonymous fixture explicitly satisfies `AnonymousUser`; the former helper spread an initially null current user into an empty object. A null session is not classified as anonymous by Galaxy, so that tempting substitution was rejected during review. Initializes the user store before mounting; each mount has fresh localVue/Pinia through `withPlugins`, with automatic unmounting. Removed the unnecessary async helper, unused histories prop and mutable user merge.

Reuse search: uses the existing registered-user/history factories shared across CopyModal and other history suites. Anonymous input needs three explicit fields; a new factory would hide this selected scenario without a demonstrated repeated complex consumer. No supporting migrations or new guidance needed.

Validation: both cases pass in the affected 11-suite/63-case run; scoped ESLint passes. Root performs final combined checks and type checking.
