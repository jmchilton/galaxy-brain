# Verified review: galaxyproject/galaxy#24513

Reviewed commit `30b808629416e02e14a12efa3d3493b49c23ffb1`. Fixes on review branch `pr_24513_review_0` ([details](review_0_branch_details.md)).

### P2 1: Client-side search and pagination branch untested after watcher removal (implementation verified)

The spec mocks `useFileSources` with server search and pagination always on, so only the server-side branch runs. With the `searchQuery`/`currentPage` watchers gone, sources without server search or pagination (e.g. posix) now refilter only because `onPageChange` and `updateSearchQuery` call `updateClientSideView()`. Dropping either call (page 2 still showing page 1's rows, or a search not filtering) passes the current suite.

Make the capability mock switchable via `vi.hoisted` and add a client-side case: open a source with more than 25 entries, go to page 2, then search, asserting the rendered rows each time and that the source was listed only once.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the added test passes on the PR and fails when either `updateClientSideView()` call is removed from `onPageChange` or `updateSearchQuery`.

</details>

### P3 1: `startUpload()` reload of the file sources untested (implementation verified)

`startUpload()` now resets the page and calls `load()` itself, where it used to depend on the removed watchers (and only reloaded when a search was active). This is the PR's one deliberate behavior change, refreshing the root after an upload started from inside a folder, and no test covers it.

Add a case that navigates into a folder, calls the exposed `startUpload()`, and asserts one `fetchFileSources` call with the file sources listed again.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the added test passes on the PR and fails when `load()` is removed from `startUpload()`.

</details>
