# Scope evaluation

**Recommendation: expand, modestly. The branch stays tests-only.** Add two things on top of the two Baseline tests commits:
1. **A folder-navigation + select-all test** for `DataLibraryUpload.vue`. Nothing outside the root folder is tested today, and `navigation.yml` already defines `data_library_select_all` and `data_library_item_checkbox` with no Python caller.
2. **`UploadContext.start()` waits on the `start_button_enabled` target** this branch adds, before clicking. It's a helper bug in a file the branch already edits: `GButton` disables Start only through `aria-disabled`, so the current wait passes and the click on a disabled Start silently does nothing.

Search and breadcrumbs need new `data-test-id`s in the `.vue` file. They're an optional add if John accepts a small client touch. The four product bugs go to separate fix branches or queued issues, not here: the long history name hiding the change link, the folder-contents 500 during import, duplicate hidden HDAs, and the lingering tooltip.

## Possible Decompositions

As implemented, the diff is +101/-8 of non-generated code (4 files), so it's just over the threshold. Options:

- **A. As committed (2 PRs or 1).**
  - (1) `7d12e823b7e`: API library setup, `LibraryPopulator.remove_library_dataset_restrictions`, the `start_button_enabled` target, the multi-dataset stager, and the existing `test_upload_from_data_library` moved onto API setup.
  - (2) `aa8326448f9`: the two new tests.
  - (1) stands alone because each helper in it has a caller there. (2) depends on (1).
- **B. With the recommended expansion.**
  - Lands on top of A: (3) a non-Baseline commit `UploadContext.start()` waits on `start_button_enabled`, which touches every Upload Activity test; then (4) the folder-navigation/select-all test, which needs a nested-folder API setup.
  - (3) could ship alone as a "harden Upload Activity E2E helper" PR before or after (1)+(2). (4) depends on (1).
- **C. Single PR.** All of it, since every piece is small and tests-only.

## Scopes considered

### 1. As implemented

Two Baseline tests commits: E2E for a regular (other) user importing a public library dataset through the Upload Activity, and a 2-dataset list built into a non-current picked history. They come with the API setup refactor and helpers.

| Pros | Cons |
|---|---|
| <ul><li>Directly answers davelopez's #24399 ask (regular users + collections via the activity)</li><li>Small; already hardened (normal, thermo-nuclear and Codex reviews, test challenges); passes under both backends</li><li>No product code on a release branch</li></ul> | <ul><li>Only covers the root folder of one library; folder navigation, select-all and search in `DataLibraryUpload.vue` (1042 lines) have no E2E or unit test</li><li>Leaves the `start()` disabled-click race that the branch itself worked around (`_screenshot_when_startable`)</li><li>Two `navigation.yml` targets stay dead</li></ul> |

### 2. + `UploadContext.start()` waits on `start_button_enabled` (recommended)

`start()` uses `start_button.wait_for_and_click()`, which can pass while `GButton` is `aria-disabled`. Switch it to the enabled target this branch adds, so the precondition becomes the default for every Upload Activity test, not a test-local wait.

| Pros | Cons |
|---|---|
| <ul><li>Fixes a real flake source in a file the branch already edits; the thermo-nuclear review called it the canonical fix</li><li>Only makes the wait stricter, so no test is weakened</li><li>Gives the new target a second, general caller</li></ul> | <ul><li>Changes behavior for all `test_upload_activity.py` tests: needs a full-file run under Playwright and Selenium (one at a time, slow)</li><li>Not a "Baseline tests" commit; must sit after them</li><li>`_screenshot_when_startable` still needs its transition sleep</li></ul> |

<details>
<summary>Notes</summary>

The second `start()` (button group, `upload_activity_helpers.py:279-281`) and the inline-method `start()` at ~652/665 should be checked in the same pass. The inline one also uses a raw `[data-test-id="upload-method-inline-start"]` selector even though `upload_method_inline.start_button` exists, so it's natural to fold that cleanup (scope 5) in here.
</details>

### 3. + Folder navigation and select-all test (recommended)

Set up a library with a subfolder through the API (`LibraryPopulator` has folder creation and fetch-to-folder). Navigate into the subfolder through `data_library_item_label` (folder rows render the same `data-test-id`/`data-label`), use `data_library_select_all` to stage every dataset in it, and import.

| Pros | Cons |
|---|---|
| <ul><li>Covers the main way real libraries are organised (nested folders), which no test reaches today</li><li>Uses existing dead selectors (`data_library_select_all`, `data_library_item_checkbox`), per the Unused Infrastructure rule</li><li>No client change; still tests-only</li></ul> | <ul><li>One more slow E2E test (~25-80s per backend)</li><li>The `data_library_item_checkbox` xpath (ancestor row from the label span) hasn't been exercised and may need a fix; that would be a navigation.yml edit, still tests-side</li></ul> |

<details>
<summary>Notes</summary>

- Could fold into the existing list test (stage via select-all inside a subfolder instead of clicking two labels), which adds coverage without a new test. That trades away the explicit per-label staging path, though `test_upload_from_data_library` still covers it.
- Other `DataLibraryUpload.vue` behavior a later pass could pick up: pagination, sort, and the restricted-dataset permission icon. A negative check that a non-admin doesn't see a restricted dataset would be valuable, but it's broader than davelopez's ask.
</details>

### 4. + Search and breadcrumbs (optional)

Add `data-test-id`s to the search input and breadcrumb items in `DataLibraryUpload.vue`, plus navigation targets. Then test that search filters folder contents (server `searchText`) and that a breadcrumb gets back to the library root.

| Pros | Cons |
|---|---|
| <ul><li>Covers the remaining interactive features of the method</li><li>A `data-test-id` addition is about as low-risk as client changes get, and Galaxy is liberal on release branches</li></ul> | <ul><li>Breaks the branch's "tests-only" identity: it touches product `.vue` on `release_26.2`</li><li>Search goes through the server (`searchText`), so it's another slow, timing-sensitive path</li><li>Diminishing returns versus scope 3</li></ul> |

### 5. + Small helper cleanups in touched files (optional)

Convert `api/test_history_contents.py:385` to `LibraryPopulator.remove_library_dataset_restrictions`, and replace the two raw selectors in `UploadMethodInlineContext` with the existing `upload_method_inline.start_button`/`cancel_button` targets.

| Pros | Cons |
|---|---|
| <ul><li>Gives the new populator helper a second caller</li><li>Removes pre-existing raw selectors next to the code being changed</li><li>Small</li></ul> | <ul><li>The API test conversion means an extra slow API test run</li><li>Unrelated to the library route, so it dilutes the PR story</li></ul> |

### 6. Fix the product bugs found here (not recommended in this branch)

These are the bugs found while writing the tests:
- Long history name pushes the "Choose another" target-history link out of view (`TargetHistorySelector.vue`/`UploadMethodView.vue`).
- `GET /api/folders/{id}/contents` returns 500 while an import is still adding datasets (`library_folder_contents.py`, `ldda` None).
- A library-to-list import leaves 4 hidden HDAs (library copies plus element copies).
- A tooltip lingers over the target-history banner.

| Pros | Cons |
|---|---|
| <ul><li>Bugs were found by this work; reviewers like related fixes together</li><li>The long-name fix would let the list test drop its rename workaround, which makes a natural red-to-green test</li></ul> | <ul><li>None touch code this branch changes; all are product changes in a tests-only PR</li><li>Duplicate HDAs may be by design (copy-into-history before collection build), so it needs investigation and maybe a dev target</li><li>The 500 race is no longer exercised by these tests, so it has no red test here</li><li>Mixing them blocks the tests on product review</li></ul> |

<details>
<summary>Where each should go</summary>

- **Long history name / change link:** its own fix branch on `release_26.2`. It's a real usability bug in a 26.2 feature. Red-to-green: revert this branch's rename in the list test (or add a long-name assertion). Best candidate to do next.
- **Folder-contents 500 during import:** separate fix branch, probably on the oldest supported release with the folder-contents serializer. Needs an API test that lists a folder mid-import. Queue an issue first via `GX_QUEUING_ISSUE_CREATION.md` if not fixing right away.
- **Duplicate hidden HDAs:** queue an issue for investigation. Confirm whether `useCollectionCreation` plus library import intentionally copies twice; if it's a bug, it's likely server/client collection-creation plumbing and may want dev.
- **Lingering tooltip:** cosmetic, queue an issue at most.
</details>

### 7. Contract: drop the API-setup refactor of the existing test

Keep only the new tests with their own setup, and leave `test_upload_from_data_library` on its original import-dir UI setup.

| Pros | Cons |
|---|---|
| <ul><li>Doesn't change existing coverage at all</li></ul> | <ul><li>Two setup paths for one test class</li><li>Brings back the folder-contents 500 workaround and private helpers that reviews already removed</li><li>The commit split already isolates the refactor for review, so contracting buys little</li></ul> |

## Unresolved questions

- Accept the `start()` change touching every Upload Activity test on `release_26.2`, or ship it as its own PR?
- New folder/select-all test, or fold select-all into the existing list test?
- Allow the `data-test-id` additions for search and breadcrumbs (scope 4)?
- Long-name fix: next branch on `release_26.2`?
