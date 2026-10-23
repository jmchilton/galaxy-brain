# Thermo-nuclear code quality review (re-harden)

**Acted on 1 finding:** I collapsed `stage_data_library_datasets`' two `if select_all` checks into a single branch and shortened its 128-col docstring. **Not acted on: 5** (listed below). The change is fixed up into the subfolder Baseline commit. New head `344dc3d6b17` (was `1688f78b095`), on base `d2d1dcd883c`, force-pushed to `jmchilton`.

## Change

`UploadContext.stage_data_library_datasets`, folded into `f777c86f911` (was `a9eb2d0b9db`):
- One `if select_all / else` now replaces the per-label `if` inside the loop and the second `if` after it.
- The select-all arm still waits for every expected label to be visible before it clicks select-all. A short comment now names the folder-load race that wait guards.
- It reads `self.components.upload_activity` into a local once.
- The docstring now fits in 120 columns.

`range-diff` shows the other three commits identical apart from SHAs. The Baseline commits are still first.

## Not acted on

- **Base `_UploadStaging.start()` now needs `start_button_enabled` on `_button_group`, but `upload_method_inline` doesn't define it.**
  - It only works because `UploadMethodInlineContext` overrides both `start()` and `cancel()`. That also leaves its `_button_group` dead.
  - The clean fix is to move `start()`/`cancel()` and `_button_group` down into `UploadContext`, or make the base versions abstract. That restructures pre-existing helper inheritance on a release branch, so it's a dev follow-up.
  - Nothing breaks today.
- **A dedicated folder select-all method instead of the `select_all` flag.** This is the bolder option: something like `stage_data_library_folder(library, folder, expected_labels)`, with `stage_data_library_datasets` going back to per-label clicks only.
  - It would delete the mode flag, and the per-label path is now only ever called with one label.
  - I didn't take it because it would add a second navigation path to a 1035-line helper file for one caller. The single-branch version already removes the repeated conditional.
- **`_screenshot_when_startable` repeats the enabled wait that `start()` now does.** It screenshots *before* `start()`, so it needs its own wait plus the screenshot-only `UX_RENDER` sleep. Moving it into the helper layer would add a screenshot concept there for two callers.
- **`library["root_folder_id"][1:]` in `_create_and_populate_library`.** This is the same inline idiom as `LibraryPopulator.setup_fetch_to_folder`. A `folder_id_for` helper would be a populator-wide cleanup, not this branch's job. `setup_fetch_to_folder` itself can't be reused because it makes a private library, which breaks the other-user test.
- **Admin UI login in library setup.** The coordinator decided earlier to keep it.

## Resolved since earlier_drafts/1

- The "`start()` should wait on `start_button_enabled`" code-judo follow-up is now done in `344dc3d6b17`. It's no longer an open follow-up.
- `remove_library_dataset_restrictions` has its second caller (`test_history_contents.py`).

## Verification

- `ruff`, `black` and `isort` are clean, and pre-commit passed on the fixup.
- `TestUploadActivityDataLibrary` (3 tests) at `344dc3d6b17`:
  - Playwright: **3 passed** (75s)
  - Selenium: **3 passed** (176s)
  - The two runs were sequential.

<details>
<summary>Details</summary>

**Verdict:** approve. This is a tests-only diff (5 files, about +140/-14), with no structural regressions and no new architecture leaks. The one real structural wart is listed above (`start_button_enabled` on a shared `_button_group` that only one subclass uses), and it's latent.

**Findings**

1. **`select_all` mode flag, with its branch repeated (spaghetti, minor). Acted on.**
   - The flag changed what `dataset_labels` means: click each label, or wait for each to be visible as a precondition. The flag was tested in two places.
   - It's collapsed to one branch now. The bolder alternative, a separate method, is noted above.
   - Combinations not exercised: folder + per-label clicks, and root + select-all. Both are trivially composed from paths that are exercised.
2. **Base `start()` vs `_button_group` contract (boundary). Not acted on.**
   - `344dc3d6b17` hardened the shared `start()` to click `start_button_enabled`.
   - `UploadMethodInlineContext._button_group` returns `upload_method_inline`, which has only `start_button`/`cancel_button`. It's safe only because inline overrides `start()`/`cancel()` with raw-selector clicks, so `_button_group` is fake polymorphism there.
   - The pre-existing design is the root cause; the branch made the asymmetry concrete.
   - Dev follow-up: push `start()`/`cancel()`/`_button_group` into `UploadContext`. Separately, switch inline to its nav targets; it still uses raw `[data-test-id=...]` selectors.
3. **The `start()` hardening is canonical now (code judo, done).** It deletes the need for test-local enabled waits before `start()`. `test_upload_activity_collection.py:77` still clicks `start_button` directly and bypasses it. That's outside the diff, and a follow-up.
4. **`DataLibraryContext.stage_data_library_datasets` returns `self`, while `UploadContext` returns items.** This matches the `RemoteFilesContext.stage_remote_files` / `PasteLinksContext.stage_paste_links` convention. OK.
5. **`stage_data_library_dataset` delegates to the plural form.** There's no duplicate guard. OK.
6. **`LibraryPopulator.remove_library_dataset_restrictions`.** Its home is canonical, it declares `using_requirement("admin")`, and it has two callers. OK.
7. **`_create_and_populate_library` / `_library_items` (test file).**
   - Building a nested fetch payload is the direct form, since the fetch API creates subfolders natively.
   - The folder `description` workaround for the folder-contents 500 is commented in one line.
   - Pasting contents avoids the admin `src: path` requirement.
   - The restriction loop reads `/libraries/{id}/contents`, which avoids the racy folder endpoint.
   - It's local to its one caller. OK.
8. **The list test's `_wait_on(any(... dataset_collection ...))`.** The collection only exists after the client starts the upload, so there's no populator wait that fits. Direct enough.
9. **File size.**
   - `upload_activity_helpers.py`: 1005 lines on base, 1037 now. It was already over 1k, and the branch adds about 30.
   - `test_upload_activity.py`: 245 lines.
   - `populators.py`: about 4k lines on base, plus 10.
   - No threshold crossed because of this branch. The helper file is a decomposition candidate by method-specific context on dev, independent of this branch.
10. **Selectors.**
    - All UI access goes through `components.upload_activity.*`.
    - `start_button_enabled` uses the existing `:not([aria-disabled])` idiom.
    - The `data_library_select_all` rewrite targets the `.custom-control` wrapper, because bootstrap-vue puts `data-test-id` on the hidden input. Dev's e971fc43a4d replaces it; take dev's version on the forward merge.
11. **Sleeps.** There's just one: `UX_RENDER`, after an explicit wait, used only for screenshots. OK.

</details>
