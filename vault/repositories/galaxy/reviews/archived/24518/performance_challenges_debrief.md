# Performance challenges debrief — galaxyproject/galaxy#24518

Profile: gx_performance_challenger. Model: Claude Opus 5.5. Reviewed commit: `8ee467177ab` (base `release_26.0`).

## Scope

Client-only change to `client/src/components/FilesDialog/FilesDialog.vue` plus a new vitest spec. No server, SQL, or polling changes. Relevant performance surfaces:

- `GET /api/remote_files?recursive=true` issued per selected folder by `selectDirectoryRecursive()` (no `limit`/`offset`, so unbounded).
- Client-side selection bookkeeping (`Model.pathExists`, `formatRows`) run per file returned by a recursive listing.

## What the PR changes, performance-wise

- Request count: unchanged. Select all on a page still fires one recursive listing per unselected folder row (up to 25 concurrent with the default page size). That was already the case before; the PR now makes select all usable page by page on paginated sources, so a user can repeat it across pages, but each request is still user-initiated, not polling.
- `pendingListings` now gates OK on every in-flight recursive listing. Correct for the bug it fixes, but it makes the wait for in-flight listings user-visible, including listings the user has since cancelled (see below).
- `isRowSelected` adds a `pathExists` call per row in `onSelectAll`: O(rows × selection) once per click. Negligible.
- Dropping `totalItems = incoming.totalMatches` removes a bug, no cost.

## Findings

### Cancelled listings still block OK and re-add files (PR makes it user-visible)

Unselecting a folder (`selectDirectoryRecursive` on an already-selected record → `unselectPath`) does not cancel or ignore its in-flight `browseRemoteFiles(..., recursive=true)`. With this PR:

1. `pendingListings` stays > 0, so OK stays disabled until the unbounded recursive listing of a folder the user no longer wants finishes. For a large S3 prefix this can be a long wait.
2. When it returns, the `.then` still calls `selectSingleRecord(subRecord, true)` and pushes subdirectories, re-selecting files under the folder the user unselected. (Correctness bug, pre-existing; noted only, another agent is bug-checking.)
3. Select → unselect → select issues a second concurrent unbounded recursive listing of the same folder.

Recommendation: track in-flight listings per folder URL (e.g. `Map<url, AbortController>` or a generation token). On unselect, abort/ignore the listing and decrement `pendingListings`; on reselect, reuse the pending one. `GalaxyApi().GET` accepts a `signal`, and `browseRemoteFiles` would need an optional `signal` parameter. A vitest in the style of the new "slowFolders" test (select a slow folder, unselect it, assert OK re-enabled immediately and no files selected after the response) would cover it.

Basis: code reading; not run.

### Per-file `formatRows` on recursive listings is quadratic (pre-existing)

For each file in a recursive listing, `selectSingleRecord(subRecord, true)` → `count()` (`Object.keys`) + `formatRows()` (multiple mode), which calls `pathExists` for every folder row on the page and once for the select-all icon. `pathExists` scans the whole selection (`Object.values(...).some(isSubPath)`), so a folder of F files costs O(F²) string comparisons, on the main thread, all inside one `.then`.

Measured with a standalone Node script mimicking `Model` + the `formatRows` loop (25-row page, 3 folder rows, no Vue reactivity overhead, so this is a lower bound):

| Files in selected folder | Time |
| --- | --- |
| 1,000 | 170 ms |
| 5,000 | 5.1 s |
| 10,000 | 23.3 s |

Script: plain Node benchmark (scratchpad, not kept in repo); reactive `ref` proxies around `selectionModel` would make the real dialog slower.

This is not introduced by the PR (the loop body is only re-indented), but the PR targets exactly the sources (S3, fsspec, Invenio, Dataverse) where folders with thousands of files are common. Recommendation for a follow-up (not a merge blocker on a release-branch bug fix): add files in bulk from the listing and call `formatRows()` once after the loop (e.g. a `selectOnly` path that skips `formatRows`, or a `Model.addMany`), and/or index selection by path prefix so `pathExists` isn't a full scan.

### Unbounded recursive listing (pre-existing, server/API)

`browseRemoteFiles(record.url, true)` passes no `limit`. The whole recursive tree is listed server-side and returned in one response. Pre-existing and outside this PR's diff; noted for context only.

## Measurement plan (if anyone wants data beyond the micro-benchmark)

1. Point a dev Galaxy at a MinIO/S3 file source with a prefix containing ~10k objects across a few folders.
2. Open Upload → Choose remote files, select that folder; record main-thread long tasks in the browser Performance panel before and after batching `formatRows`.
3. Select a large folder, then unselect it immediately; time how long OK stays disabled, and check the selection afterwards.
