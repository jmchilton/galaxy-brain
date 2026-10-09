# Date utilities — iteration 05

Selected originator: `client/src/utils/dates.test.ts`.

Nine original grouped cases become 16 independently named cases, preserving all 17 executed assertions. Both functions retain all four rejected inputs (`undefined`, `null`, empty string, malformed string), and the short-date formatter retains both same-day and previous-day timezone examples. The UTC parser's Date-instance check, both original parsing checks, exact invalid-time message, and exact formatted strings remain.

Missing/malformed inputs and independent calendar-day examples now use descriptive `it.each` rows. Relative-time input and current time are fixed explicitly at October 1 and October 4, 2023, instead of deriving the input from the wall clock; the same three-days-ago condition and expected label remain. A narrowly scoped `Date.now` spy avoids replacing the timezone-mock Date constructor. Teardown unregisters the timezone and restores the spy.

Reuse search found another timezone-mock consumer in CommandPalette visualizations, but it only shares two standard register/unregister statements and has different notification timestamps. No shared timezone wrapper is needed. The two local four-row tables expose each public function's rejection contract directly; extracting these tiny tables across functions/files would not improve readability.

Validation: all 16 cases pass in the same mocked GMT-4 timezone; scoped ESLint and Prettier pass. Fixed clocks and independently named variations are basic existing principles, so no new README or marginal advice is proposed.
