# Scope evaluation (re-harden, post re-scope)

**Recommendation: keep the scope as is.** The first evaluation's modest expansion (subfolder navigation + select-all, `UploadContext.start()` waiting on `start_button_enabled`) is implemented, reviewed four ways and green on both backends at `344dc3d6b17`. It covers davelopez's ask on #24399 (regular users importing library data through the 26.2 Upload Activity) plus the main interactive paths of `DataLibraryUpload.vue`. The remaining candidates either need product `.vue` changes, can't be validated locally, guard a race nobody has seen, or duplicate API coverage. None is clearly warranted. Product bugs and dev-only helper reshaping are listed as follow-ups, not scope changes.

## Possible Decompositions

Diff vs `d2d1dcd883c`: 5 files, +145/-17, all tests/helpers/nav (no product code). Four commits, Baseline tests first.

- **A. Single PR (as committed).** All four commits. Every piece is small, tests-only, and each helper has a caller in its own commit.
- **B. Tests PR + helper-hardening PR.**
  1. `1024890c3b2` + `c0069b0c378` + `f777c86f911`: API library setup, `LibraryPopulator.remove_library_dataset_restrictions` (+ `test_history_contents.py` second caller), `start_button_enabled` target, multi-dataset/select-all staging, `data_library_select_all` selector fix, and the three data-library tests.
  2. `344dc3d6b17`: `_UploadStaging.start()` waits on `start_button_enabled`. Touches every `UploadContext` caller (~28 modules), so it may deserve its own review. Depends on (1) for the nav target, or could carry that target itself and land first.
- **C. Three PRs, by story.** (1) `1024890c3b2` alone (setup refactor of the existing test + populator helper), (2) `c0069b0c378` + `f777c86f911` (new coverage: regular user, list into picked history, subfolder/select-all), (3) `344dc3d6b17`. Strictly linear.

## Scopes considered

### 1. As implemented (recommended)

Three Baseline tests commits: API library setup with a public library, a regular-user import, a list built from a subfolder via select-all into a non-current target history, the populator helper with two callers, and a fix for the dead `data_library_select_all` selector. Plus one helper commit making `start()` wait for an enabled Start.

| Pros | Cons |
|---|---|
| <ul><li>Answers the #24399 ask directly and covers root, subfolder, select-all, per-label, list, target-history, other-user paths</li><li>Tests-only on `release_26.2`; no product review needed</li><li>Hardened twice: normal, thermo-nuclear and Codex reviews, test challenges, polish; 3/3 on Playwright and Selenium at head</li><li>Already absorbed the first evaluation's expansion; prior follow-ups (`start()` race, populator second caller) are resolved</li></ul> | <ul><li>Search, breadcrumbs, pagination and sort in `DataLibraryUpload.vue` (1042 lines) remain untested</li><li>`data_library_add_selected` keeps a theoretical click-while-`aria-disabled` race</li><li>Inline `UploadMethodInlineContext.start()` not hardened</li><li>Guaranteed forward-merge conflict on `data_library_select_all` (take dev's e971fc43a4d)</li></ul> |

### 2. + `data_library_add_selected` (and `remote_files_add_selected`) wait for enabled (not recommended)

Add `:not([aria-disabled])` targets for the add-selected buttons and click those in the stagers, mirroring the `start()` change.

| Pros | Cons |
|---|---|
| <ul><li>Same pattern the branch already applied to Start; a few lines in files it already touches</li><li>Removes the last known aria-disabled race in the data-library helper</li></ul> | <ul><li>Never observed: `hasSelection` flips on the checkbox click itself, and 6 backend runs passed since re-scope</li><li>`remote_files_add_selected` is outside the library story</li><li>Another force-push + two-backend reruns for a theoretical fix</li></ul> |

<details>
<summary>Notes</summary>

If John wants it, it's the cheapest expansion on the list: two nav targets, two one-line helper edits, rerun `TestUploadActivityDataLibrary` plus the remote-files tests on both backends. It belongs after the Baseline commits, next to `344dc3d6b17`.
</details>

### 3. + Harden inline `UploadMethodInlineContext.start()` / `cancel()` (not recommended here)

Switch the inline workflow-form context to its `upload_method_inline.start_button`/`cancel_button` targets with an enabled wait, closing the contract gap where `_UploadStaging.start()` assumes `start_button_enabled` on a group that lacks it.

| Pros | Cons |
|---|---|
| <ul><li>Removes two pre-existing raw selectors and the latent `_button_group` contract wart that this branch made concrete</li></ul> | <ul><li>Only callers are 5 `test_workflow_run.py` tests that can't run on :8092 (no `cat` tool); the re-scope tried it and reverted it as untestable</li><li>The clean fix (move `start()`/`cancel()`/`_button_group` into `UploadContext`) restructures helper inheritance: a dev-targeted refactor</li><li>Unrelated to the library route</li></ul> |

### 4. + Search and breadcrumbs (not recommended)

Add `data-test-id`s to the search input and breadcrumb items in `DataLibraryUpload.vue`, then test server-side search filtering and breadcrumb navigation back to the root.

| Pros | Cons |
|---|---|
| <ul><li>Covers the remaining interactive features</li><li>`data-test-id` additions are low risk</li></ul> | <ul><li>Touches product `.vue` on `release_26.2`, breaking the branch's tests-only identity</li><li>Another slow, server-roundtrip E2E path</li><li>Diminishing returns after subfolder + select-all coverage</li></ul> |

### 5. + Negative permission check: non-admin can't see a restricted dataset (not recommended)

Keep one dataset restricted and assert the regular user doesn't see it in the activity's folder view.

| Pros | Cons |
|---|---|
| <ul><li>Fits the "regular user" angle of the ask</li></ul> | <ul><li>Server-side filtering is already covered by `api/test_folder_contents.py::test_index_permissions`</li><li>Absence checks in E2E are timing-prone (must wait for the folder to load before asserting nothing)</li><li>Another ~60-80s per backend</li></ul> |

### 6. Fix product bugs found here (not in this branch)

Bugs found while writing the tests:
- `GET /api/folders/{id}/contents` 500 for a folder created without `description` (`LibraryFolderMetadata.folder_description` is non-optional `str`; `library_folder_contents.py:228` passes `None`). The test passes a description to dodge it.
- Same endpoint 500 while an import is still adding datasets (`ldda` None in `_serialize_library_dataset`).
- A library-to-list import leaves 4 hidden HDAs.
- Long history name hides the target-history change link.
- Lingering "Change target history" tooltip over the banner.

| Pros | Cons |
|---|---|
| <ul><li>Found by this work; the description 500 has a natural red-to-green (drop the test's description)</li></ul> | <ul><li>Product changes in a tests-only PR; blocks the tests on product review</li><li>Server bugs likely belong on the oldest supported release with the serializer, not necessarily 26.2</li><li>Duplicate HDAs need investigation first</li></ul> |

### 7. Contract: drop `344dc3d6b17` (or the subfolder test) back to `alts/original_scope.md` (not recommended)

Return to the alt `selenium_upload_data_library_alt_original_scope`.

| Pros | Cons |
|---|---|
| <ul><li>Smaller blast radius: `start()` change no longer touches ~28 modules</li></ul> | <ul><li>Reopens the disabled-Start race the reviews called canonical to fix</li><li>Leaves `data_library_select_all` dead and broken on 26.2</li><li>Decomposition B already lets the `start()` change ship separately without contracting</li></ul> |

## Follow-ups (separate branches or queued issues)

- **Product, `release_26.2` or older:** folder-contents 500 on `None` description (best candidate, red-to-green ready); folder-contents 500 mid-import; long history name hides change link. Queue via `GX_QUEUING_ISSUE_CREATION.md` if not fixing next.
- **Investigate:** duplicate hidden HDAs from library-to-list import; lingering tooltip (cosmetic).
- **Dev helper refactor:** move `start()`/`cancel()`/`_button_group` into `UploadContext`; switch inline context to nav targets; consider splitting `upload_activity_helpers.py` (1037 lines) by method.
- **Helper hardening (optional):** add-selected enabled waits (scope 2); convert `test_upload_activity_collection.py:77` to the helper `start()`.
- **Forward merge:** take dev's e971fc43a4d `data_library_select_all` on conflict, then run the list test on dev.
- **Run recipe:** branch context `GALAXY_TEST_FILE_DIR` already includes the git resolver; nothing left.

## Unresolved questions

- Ship as one PR, or split the `start()` hardening out (decomposition B)?
- Want the add-selected enabled waits (scope 2) folded in, or follow-up?
- Folder `description` 500: next branch, or queue issue?
