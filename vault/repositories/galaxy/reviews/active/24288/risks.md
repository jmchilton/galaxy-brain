The main one-way door is small. `GET /api/jobs` now always sends a `total_matches` response header, and clients may come to rely on it. It follows the pattern histories, pages, visualizations and workflows already use. The new Jobs activity and its localStorage preference are easy to undo.

<details><summary>Risk Details</summary>

- `GET /api/jobs` adds a public `total_matches` header. It adds no query params and leaves the response body unchanged. Once clients rely on the header, removing it or changing what it means would break them.
- `include_total_count=True` is hard-coded in the API, so every `/api/jobs` call now also runs a `COUNT(*)` over the filtered subquery. Callers that never read the header pay for it too. For an admin listing all jobs with few or no filters on a large server, that count can be expensive. Sibling endpoints run the count only when the caller asks for it.
- `JobManager.index_query` and `JobsService.index` now return a `(result, count)` tuple. This changes Python call signatures. In-tree callers are updated, but plugins or downstream code calling these methods would break.
- The new `jobs` activity in `defaultActivities` (`optional: true`, `visible: true`) shows up in every logged-in user's activity bar. Any later rename of the `jobs` id has to account for activity settings users have already saved.
- The `user-store-show-tool-names-in-job-panel` localStorage key is per-browser state, so it's cheap to drop. The PR also removes `hasSeenUploadHelp` from `userStore`. Nothing in the client references it any more.
- `Filtering` now keeps the case of values for any `*_eq` key. This is shared filtering code, so other lists that have `_eq` keys change behavior in the same way.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether `/api/jobs` should run the count every time, or take an opt-in flag like the histories index does. Admin job listings on large deployments are where the extra `COUNT` could hurt.

The shared `Filtering` case change also needs a check: confirm no existing list depends on case-folding for an `_eq` key. The UI parts (activity entry, panel, preference) are two-way doors.

</details>
