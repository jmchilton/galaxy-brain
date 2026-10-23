# galaxy-brain follow-up: PR #24288 (Jobs activity panel)

## Stale documentation

None found. No existing research note describes `jobStore`, the `/api/jobs` index count, or the `Filtering` `_eq` semantics. Notes that only mention these areas in passing still hold after this PR: `Component - Data Fetch` (lists `jobStore` as job tracking), `Component - Workflow API` (`total_matches` on the workflow and invocation lists), and `PR 21842` (`POST /api/jobs` submission).

## Suggested new research

- **Component - Client Job Store**: `jobStore` now serves a job list as well as single-job views. Developers need its LRU cap, `retainJob` refcounts, poll deduplication, and stale-response sequencing to add consumers that don't evict or pin unboundedly.
- **Component - Client Filtering DSL**: `utils/filtering.ts` backs the history, job, workflow, and other list filters. Its handling of quotes, case folding, and `_eq` siblings changes in this PR, and nothing documents those rules.

## Post-merge activities

- If **Component - Client Job Store** is written, cover the Jobs panel as the first list consumer (`updateJob`, `sortedStoredJobs`, `currentJobIds` scoping, retention of everything displayed).
- If **Component - Client Filtering DSL** is written, record that explicit `*_eq` keys now keep their case, which also affects `HistoryFilters` `name_eq`.
