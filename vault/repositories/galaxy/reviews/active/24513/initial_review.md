# Initial review: galaxyproject/galaxy#24513

- Profile: `default`
- Model: Claude Opus 5.5
- Effort: medium
- Reviewed commit: `30b808629416e02e14a12efa3d3493b49c23ffb1` (base `origin/release_26.0`)

## Verdict

Approve-worthy. The fix is small, correct, and right-sized for a release branch. Removing the `searchQuery`/`currentPage` watchers and loading from the user-action handlers (`updateSearchQuery`, BPagination `@change`) removes the double/triple listings, and every remaining writer of those refs (`open`, `navigateToBreadcrumb`, `clearAll`, `onErrorRetry`, `startUpload`) already calls `load()` itself. No P1/P2 found. Spec not run locally (worktree has no `client/node_modules`).

## What I checked

- All writers of `searchQuery` / `currentPage` in `RemoteFilesUpload.vue`: `open`, `navigateToBreadcrumb`, `clearAll`, `onErrorRetry`, `startUpload`, `updateSearchQuery`, `onPageChange`, and BPagination's `v-model`. Each now produces exactly one `load()`. `clearAll()` also had the duplicate pre-PR (reset search + explicit `load()`), so it is fixed too, though the PR body doesn't mention it.
- `DataDialogSearch` only emits `input` from its own `BFormInput` (debounced) or the clear button; programmatic `clearSearch()` changes the prop and does not echo an `input` event, so navigation doesn't re-enter `updateSearchQuery`.
- BPagination: `change` fires only on user clicks; `input` from internal clamping now updates `currentPage` without loading. Clamping can't realistically happen: the pagination is `v-if`'d off while `isBusy`, and every path that changes `totalMatches` resets the page to 1 first.
- `startUpload()` behavior change: it now always reloads the root. Before, a load only happened through the search watcher when a search was active, so after uploading from inside a folder with no search the root view kept showing the stale folder listing. The PR fixes this as a side effect.
- `executeIfLatest`/`loadSequenceId` already drop stale responses on the client, so the bug was wasted server and external-service calls, not wrong UI. That matches the PR description.

## Findings

### P3 1: Sibling `DataLibraryUpload.vue` keeps the same watcher-plus-explicit-load pattern

`client/src/components/Panels/Upload/methods/DataLibraryUpload.vue` has the same `watch(searchQuery)` / `watch(currentPage)` → `loadFolderContents()` watchers (lines ~582-598), and its handlers also set `currentPage.value = 1` and then load explicitly. From page > 1, `navigateToFolder`, `navigateToBreadcrumb`, `selectLibrary`, `onSortChanged` and `onErrorRetry` each fire the explicit load plus the watcher load, so this is the same duplicate-request bug in the neighboring upload method. This PR doesn't touch that file, so fixing it here is out of scope. A follow-up (same fix: drop the watchers, load from `updateSearchQuery` and pagination `@change`) would keep the two upload methods consistent.

### P3 2: `startUpload()` / `clearAll()` reset path has no test, and the client-side branches are untested

The spec mocks `useFileSources` with server search and pagination always on. It never exercises:

- the client-side branches of `updateSearchQuery` and `onPageChange` (`updateClientSideView()` without a request), which the PR moved out of the watchers;
- `startUpload()`'s new unconditional `load()`. This is the one deliberate behavior change: it now refreshes the root after an upload from a folder without a search.

Adding one case that toggles the `useFileSources` mock to client-side and checks no extra `browseRemoteFiles` call on search/page change, plus one that calls `wrapper.vm.startUpload()` from inside a folder and checks a single `fetchFileSources` call with the root listing shown, would cover the moved logic. The dev merge-forward notes already describe a `vi.hoisted` toggle for the mock, so that infrastructure exists one branch up.

### P3 3 (optional, likely skip on a release branch): reset-and-load is now repeated five times

`currentPage.value = 1; clearSearch(); load();` (with small variations) now appears in `open`, `navigateToBreadcrumb`, `clearAll`, `onErrorRetry` and `startUpload`. Per the PR body, 26.1+ already has a `reset()` helper that does this, and the merge-forward resolves to it, so introducing a helper on 26.0 would just create another conflict. Noted only so the forward-merge keeps using the upstream `reset()`; no change requested here.

## Notes (not findings)

- Docstring on `updateSearchQuery` and the test comments are short and explain non-obvious constraints (debounce, Vue 2 event timestamp vs faked clock, BTable row-click target). Fine.
- Tests drive real user interactions (row click, search input with debounce, pagination button, breadcrumb) instead of calling component internals. Good integration-level unit tests, nothing trivial.
- `onPageChange` returns early at root after setting `currentPage`, matching the old watcher; pagination isn't rendered at root anyway.
