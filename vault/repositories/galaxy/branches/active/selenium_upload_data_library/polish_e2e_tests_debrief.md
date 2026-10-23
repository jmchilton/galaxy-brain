# Polish E2E tests debrief

I added screenshots to the Data Library method tests, which are the only E2E coverage of `DataLibraryUpload.vue`. I also replaced the private `_post` restriction-removal call with a `LibraryPopulator` helper and added a `navigation.yml` target for waiting on an enabled Start button.

Head is `7f80bd09aab`, amended into the single Baseline tests commit and force-pushed to `jmchilton`.

## Changes

- **Screenshots**, saved when `GALAXY_TEST_SCREENSHOTS_DIRECTORY` is set:
  - `upload_activity_data_library_staged` shows the staged `1.bed` with the current target history.
  - `upload_activity_data_library_target_history_staged` shows the two staged datasets and the "library list target (not current)" banner.
  - `upload_activity_data_library_other_user_imported` shows the non-admin's history with `1.bed` imported.
  - I checked all three PNGs under Playwright, and all three were also written under Selenium.
- **`_screenshot_when_startable(label)`** is a test-class helper used twice. It waits on the new `upload_activity.start_button_enabled` target (`[data-test-id="start-upload"]:not([aria-disabled])`) before taking the screenshot.
- **One commented `sleep_for(UX_RENDER)` remains in that helper.** `GButton` has a 0.15s color transition, and without the sleep the staged screenshot shows Start greyed out even though the DOM had no `aria-disabled` (reproduced twice). It only affects the screenshot, not the test logic.
- **`LibraryPopulator.remove_library_dataset_restrictions(ld_id)`** replaces `self.dataset_populator._post(...)` in `_create_and_populate_library(public=True)`. It's the same call as `api/test_history_contents.py:385`. I left that test unconverted on this tests-only release branch, but it's an available second caller.
- The admin login in `_create_and_populate_library` is kept, per the coordinator follow-up.

## Checked, no change

- **Selectors.** The new test code and the helper additions go only through `components.upload_activity.*`. There's no raw CSS or XPath.
- **Sleeps.** None in the new test code apart from the screenshot one above. `self.home()` is a reload. The custom `_wait_on` for "list in target history" stays. A `wait_for_history_to_have_hid` would need hid 5, which only comes from the duplicate-hidden-HDA bug.
- **No screenshot of the list config.** `to_list()` only records the config, and `start()` applies it, so the target-history screenshot doesn't show the collection toggle on. Capturing it would mean calling the private `_apply_collection_config`.
- **No screenshot of the library browser.** `stage_data_library_datasets` clicks "add selected" right away, so I didn't capture that view.

## Follow-ups (not fixed here)

- **`UploadContext.start()` can click a disabled Start.** It uses `start_button.wait_for_and_click()`, and `GButton` disables through `aria-disabled` plus a JS click guard. Because the native `disabled` attribute isn't set, `wait_for_clickable` passes while the button is still disabled, and the click silently does nothing. Switching `start()` to `start_button_enabled` would remove that race for every Upload Activity test. That's outside this branch's scope.
- Two pre-existing raw selectors remain in `UploadMethodInlineContext` (`_click_visible_element_with_selector('[data-test-id="upload-method-inline-start"/"cancel"]')`, `upload_activity_helpers.py` ~657/660), even though `upload_method_inline.start_button`/`cancel_button` targets already exist. This is not from this branch.
- **Product bugs from earlier debriefs, still open:**
  - A long history name pushes the "Choose another" target-history link out of view (the test works around it with a rename).
  - Library imports create duplicate hidden HDAs.
  - Separately, a "Change target history for this upload" tooltip lingers over the banner after the history is picked. It's cosmetic and visible in the target-history screenshot.

## Verification

- `TestUploadActivityDataLibrary` (3 tests): passed under Playwright and under Selenium, each run once on the final code.
- `ruff`, `black` and `isort` are clean, and the pre-commit hooks passed on amend.
