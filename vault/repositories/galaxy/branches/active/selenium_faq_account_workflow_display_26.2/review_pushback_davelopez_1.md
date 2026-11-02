# Not acted on — davelopez review 1 (#24482)

- **DisplayApplications.test.js `it.each` rows** — kept unchanged pending John. Verified 2026-11-02 by reverting the wrapper to `v-if="dataset"`: "failed" (`{}`) and "stale" fail, "loading" (`null`) passes. So only "loading" is redundant with the old guard; "failed" pins the readiness wrapper the browser helper waits on. Dropping "loading" = removing a test case, needs John's OK.

No dev-only follow-up issues.
