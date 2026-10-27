# Polish E2E tests debrief (re-harden pass 2)

**No code changes were needed.** A fresh check of the new Upload Activity data-library E2E tests found they already meet all four polish rules, and all 3 tests pass on both backends with screenshots verified. Head is unchanged at `1688f78b095`, with no rebase and no push. The base is still `d2d1dcd883c`.

## Checked, no change

- **Selectors.** The new test code and helper code go only through `components.upload_activity.*`, including the parameterized `data_library_library_label(label=...)` and `data_library_item_label(label=...)`. There's no raw CSS or XPath in the diff. The Smart Components note has no guidance against the new `start_button_enabled` (`:not([aria-disabled])`) target, and `navigation.yml` already uses that pattern 7 times.
- **Shared abstractions.**
  - `_screenshot_when_startable` covers both pre-start screenshots.
  - `start_button_enabled` is one nav target used by the helper `start()` and by the screenshot helper.
  - `stage_data_library_dataset` delegates to `stage_data_library_datasets`.
  - Nothing is duplicated.
  - I didn't move the screenshot helper or the enabled wait into the helper layer: about 28 modules go through `_UploadStaging.start()`, and that change belongs to the inline-`start()` follow-up.
- **Sleeps.** The only sleep is the commented `sleep_for(UX_RENDER)` in `_screenshot_when_startable`. It runs after an explicit enabled wait and lets `GButton`'s color transition finish, so it serves only the screenshot. `self.home()` is a commented reload, not a wait. The custom `_wait_on` for the list in the target history stays, because the Writing note recommends `_wait_on` for conditions a SmartTarget can't express.
- **Screenshots.** These are the only E2E tests of `DataLibraryUpload.vue`, and all three take a screenshot:
  - `upload_activity_data_library_staged`
  - `upload_activity_data_library_target_history_staged`
  - `upload_activity_data_library_other_user_imported`

  I checked the PNGs from this run. Start is enabled (not greyed), the staged rows and the "library list target (not current)" banner show, and the non-admin history shows `1: 1.bed` green.
- **The 128-column docstring** on `stage_data_library_datasets` comes from `a9eb2d0b9db`. I left it, as the normal review did: black and ruff don't flag it, and a docstring-only force-push plus reruns isn't worth it.

## Follow-ups (carried forward, not fixed here)

- `UploadMethodInlineContext` still uses two raw selectors, `_click_visible_element_with_selector('[data-test-id="upload-method-inline-start"/"cancel"]')`, even though `upload_method_inline.start_button` and `cancel_button` targets exist. This predates the branch.
- `test_upload_activity_collection.py:77` clicks `start_button` directly and bypasses the hardened `start()`. It's outside the diff.
- `data_library_add_selected` has the same aria-disabled click race that `start()` had.
- The forward merge to dev will conflict on `data_library_select_all` with e971fc43a4d. Take dev's `GCheckbox` selector there.
- A "Change target history for this upload" tooltip still lingers over the banner in the target-history screenshot. It's a cosmetic product issue.
- Two follow-ups from the previous polish are now resolved, so I dropped them:
  - `start()` clicking a disabled Start was fixed by `1688f78b095`.
  - The `test_history_contents.py` second caller of `remove_library_dataset_restrictions` is now converted.

## Verification (head `1688f78b095`, servers :8092/:5181, with `GALAXY_TEST_SCREENSHOTS_DIRECTORY` set)

- `test_upload_activity.py::TestUploadActivityDataLibrary` (3 tests):
  - Playwright: **3 passed** (83s).
  - Selenium: **3 passed** (174s).
- All 3 screenshots were written under both backends.
