# Not acted on — davelopez review 1 (#24482)

- **DisplayApplications.test.js "failed" row** — kept. Verified 2026-11-02 by reverting the wrapper to `v-if="dataset"`: "failed" (`{}`) and "stale" fail, "loading" (`null`) passes. "loading" dropped with John's OK; "failed" pins the readiness wrapper the browser helper waits on. Reply explains.

No dev-only follow-up issues.
