# Not acted on — davelopez review 1 (#24482)

- **DisplayApplications.test.js `it.each` rows** — kept unchanged. "loading" (`null`) is covered by the old guard as davelopez says, but "failed" (`{}`) fails without the id check (plain `v-if="dataset"` renders the wrapper for `{}`), so only one row is redundant. Cheap regression coverage; no removal. Reply explains.

No dev-only follow-up issues.
