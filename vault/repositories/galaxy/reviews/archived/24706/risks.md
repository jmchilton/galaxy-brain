This changes the public `GET /api/histories` search-mode contract in two hard-to-walk-back ways: existing API clients that omit `limit` silently drop from all matches to 100 per page (and `limit` >= 1000 now gets a 400), and `sort_by=size` becomes a public value whose own-histories-only restriction is part of the API.

<details><summary>Risk Details</summary>

- Scripts that call search mode without `limit` and expect every match now get the first 100 with a 200 response and no error, so truncation can go unnoticed unless they read the `total_matches` header.
- Scripts that pass `limit` of 1000 or more now get a 400. The change is not limited to callers using the new sort.
- Search mode now validates its payload instead of using `model_construct`, so it can return validation errors for inputs that previously passed through (`limit` is the known case).
- The legacy listing without `search` stays uncapped, so the two modes of one endpoint now differ in paging behavior.
- `show_published` defaults to true on this endpoint, so `sort_by=size` with default flags gets a 400. API users must pass `show_published=false`.
- Once `sort_by=size` ships, consumers can depend on it. Loosening the restriction later is easy; tightening it or removing the value would be a breaking change.
- The sort computes `History.disk_size` per matching history on each page request, plus the id tiebreaker. Cost scales with the caller's dataset count, and PR profiling reports 60 ms for 400 histories / 27k datasets; users with far larger histories, the target audience, will pay more.
- The own-histories guard is the only thing preventing the expensive listings profiled at 745 ms (published) and 10.4 s (admin, all histories).
- `ListHeader` initial sort selection changed, but only `HistoryList` passes `sortOptions`, so this is cheap to reverse.

</details>

<details><summary>Risk Review Advice</summary>

The decision to weigh is whether capping search mode belongs in this feature PR and whether the silent drop to 100 is acceptable for existing scripts and libraries such as BioBlend. The in-tree callers checked all pass an explicit `limit`, so the exposure is external API clients, which this review did not survey. Consider whether a release note is warranted.

Also confirm the guard in `HistoryManager.index_query` covers every flag combination that reaches the size sort, and that the 60 ms profile is representative of the heaviest real users, since those are the people this sort is built for.

</details>
