### P2 1: Changing page while folder listings are loading leaves the old page's rows (implementation verified)

The table is busy while any recursive folder listing is pending (`:is-busy="isBusy || pendingListings > 0"`), and bootstrap-vue drops provider updates made while `busy` is set. So in the PR's own manual-test flow (select all on page 1 with folders on it, then go to page 2), the pager moves to page 2 but the rows stay on page 1 if a listing is still loading, and a second select all then acts on page 1's rows. This also happens on base `release_26.0`, but the PR now keeps the table busy until the last listing finishes rather than the first, which widens the window.

<details><summary>Details</summary>

In `bootstrap-vue` `mixin-provider.js`, `_providerUpdate()` defers to `refresh()` while `computedBusy` is true, and `refresh()` only re-schedules itself while the provider itself is running (`localBusy`). When the busy prop comes from outside, nothing calls the provider again after it clears.

</details>

Fix: expose `refresh()` from `SelectionDialog` (calling the `BTable` ref's `refresh()`, as `LibrariesList.vue` does) and call it from `FilesDialog` once `pendingListings` returns to 0 on a paginated folder. This keeps the busy state and spinner the PR adds, and should also recover filter changes dropped the same way (not tested). The cost is one extra page request each time the listings on a paginated folder finish, even if no change was dropped. This only applies to 26.0 and 26.1: on 26.2 and `dev`, `SelectionDialog` uses `GTable` and calls the provider from its own `currentPage` watcher, so busy doesn't drop page changes there.

<details><summary>Details</summary>

The call has to wait a `nextTick` after the watcher fires, so that the cleared busy prop has reached `BTable`. Regression test `should show the next page once the folders selected on this page are listed` holds two folder listings, goes to page 2, releases them, and expects page 2's rows. It fails without the fix (rows stay `file0`…).

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P2 2: A folder listing that returns after the folder was unselected selects its files again and holds OK (implementation verified)

`selectDirectoryRecursive()` adds every file a recursive listing returns without checking that the folder is still selected. If the folder is unselected while its listing loads, the late listing selects its files again: the folder shows as mixed and OK imports files the user removed. Row clicks are ignored while the table is busy, but the select-all icon isn't, so clicking it twice on a page with folders does this. Unselecting also doesn't stop the PR's new OK gate from waiting on that listing, which can be a slow recursive listing of a large S3/fsspec prefix the user no longer wants. Clicking select all a third time starts a second listing of the same folders. Whichever of the two listings returns second calls `selectSingleRecord(file, true)` on files that are already selected, and its `unselectPath(file.url, true)` drops the folder from `selectedDirectories`, so the folder ends up mixed.

Fix: remember the latest listing for each folder (a non-reactive `Map` of folder id to token). Unselecting the folder, or starting a newer listing, ends the old one and decrements `pendingListings` immediately. A listing's results are applied only if it is still the latest one and the folder is still selected.

<details><summary>Details</summary>

The listing request itself isn't aborted, because `browseRemoteFiles` takes no `AbortSignal`. Passing one through is possible later. If the folder is unselected some other way, for example from its parent, its results are ignored but OK still waits for the listing. When merging forward to 26.1 and later, the existing `.catch` that undoes the selection needs the same check, or a failed stale listing would unselect a folder the user selected again. The tests emit `onClick` directly, so they don't go through the busy gate; the select-all path reaches the same `selectDirectoryRecursive()`. Tests `should ignore the listing of a folder unselected while it loads` (OK becomes enabled as soon as the folder is unselected, and only `file0` is confirmed) and `should keep a folder selected when an older listing of it returns late` (folder stays `SELECTED`, and exactly its two files are confirmed) both fail at the PR head.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 1: A paginated folder that fits on one page is never selected as a whole (implementation verified)

`isPaginated = Boolean(itemsProvider.value)` is true at every level of a source that supports pagination, even when the folder fits on one page and no filter is applied. In that case select all on the page is select all on the folder, yet the folder is no longer marked selected, so it shows as mixed from its parent. That covers most small folders on S3, Dataverse and similar sources. The PR explains page-scoped select all as "a page isn't the whole folder", which doesn't hold when the single page is the whole folder, and the doc comment on `isPaginated` is wrong there too.

Fix: `Boolean(itemsProvider.value) && (totalItems.value > items.value.length || Boolean(query.value))`. A filtered listing stays page-based, because `totalMatches` then counts only the matches.

<details><summary>Details</summary>

Test `should select a paginated folder that fits on one page as a whole` opens `folder5` (two files), uses select all, goes back, and expects `folder5` to be `SELECTED`. At the PR head it is `secondary` (mixed).

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: The pending-listing test depends on timing and doesn't check the folder's files (implementation verified)

`should keep OK disabled until the files of every selected folder are listed` delays the folder's listing with `setTimeout(50)` and polls for OK. It never checks that the held folder's files end up selected, which is why OK has to wait in the first place.

Fix: let the test hold listings and release them itself, then assert that OK is enabled and that confirming the dialog passes `folder15`'s files to the callback. The new tests above use the same hold/release helper. The strengthened test still fails against base `release_26.0`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>
