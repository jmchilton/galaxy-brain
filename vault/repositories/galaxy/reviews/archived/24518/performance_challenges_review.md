# Performance review — galaxyproject/galaxy#24518

Profile: gx_performance_challenger. Model: Claude Opus 5.5 (effort not provided to the agent). Reviewed commit: `8ee467177ab` (base `release_26.0`). Details and measurement plan: [performance_challenges_debrief.md](performance_challenges_debrief.md).

Verdict: no performance regression in request volume or response size. The PR adds no polling and no new requests. One PR-adjacent issue is worth fixing, and one pre-existing hot loop is worth a follow-up.

## P2 1: Unselecting a folder doesn't cancel its recursive listing, so OK stays disabled for listings the user abandoned

`selectDirectoryRecursive()` increments `pendingListings` and only decrements it in `.finally`. Unselecting the folder (`unselectPath`) leaves the unbounded `GET /api/remote_files?recursive=true` running. Because this PR makes OK wait on `pendingListings`, the user now waits for a recursive listing of a folder they no longer want, which can be slow on a large S3/fsspec prefix. When it does return, the `.then` re-selects that folder's files. That re-selection bug is older than the PR; this review reports it but didn't look for related bugs. Select → unselect → select also fires a second concurrent listing of the same folder.

Suggested fix: keep in-flight listings keyed by folder URL (an `AbortController` or a generation token). On unselect, abort or ignore the listing and decrement `pendingListings` right away. On reselect, reuse the pending request. `browseRemoteFiles` would take an optional `signal`. A vitest like the existing `slowFolders` case could check it: select a slow folder, unselect it, then check that OK is enabled and no files are selected after the response arrives.

Basis: code reading, not executed.

## P3 1: Recursive-listing results call `formatRows()` once per file, which is quadratic (pre-existing)

Each listed file goes through `selectSingleRecord(subRecord, true)`, which calls `count()` and then a full `formatRows()`. `formatRows()` calls `Model.pathExists` (a full scan of the selection) for each folder row and for the select-all icon. That makes a folder of F files cost O(F²) on the main thread. A standalone benchmark of that loop, run without Vue reactivity so the real dialog would be slower, took 170 ms for 1k files, 5.1 s for 5k and 23 s for 10k. The PR only re-indents this code, but it targets the paginated sources (S3, Invenio, Dataverse) where such folders are common.

Suggested fix, best as a follow-up rather than in this release-branch fix: add all listed files in bulk and call `formatRows()` once after the loop, for example through a `selectOnly` path that skips formatting or a `Model.addMany`.
