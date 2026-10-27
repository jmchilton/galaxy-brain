# Polish E2E tests debrief (fix phase)

**I replaced the last raw CSS selector in the data-library E2E with a navigation.yml target and folded it into the tooltip fix commit.** The inline JS was `querySelectorAll('.g-tooltip-d')` reading `textContent`. The new target is `_.tooltip_balloon_with_text`. Head is now `dff1243e3d0` (was `c6afd9dc182`), force-pushed to `jmchilton`, and the base is still `d2d1dcd883c`.

## Changed

- **New global target `_.tooltip_balloon_with_text(text=...)`.**
  - It's an XPath that matches a `g-tooltip-d` balloon by class token, with the given text anywhere in its string value: `//*[contains(concat(" ", normalize-space(@class), " "), " g-tooltip-d ")][contains(string(.), "${text}")]`.
  - It sits next to `tooltip_balloon` and `tooltip_inner`, so other tooltip-absence checks can reuse it.
- **`test_upload_list_from_data_library_to_target_history`.** The `execute_script` call and its list assert are now one line: `self.components._.tooltip_balloon_with_text(text="Change target history for this upload").assert_absent()`.
- **This overrides a "challenged, kept" item in `test_challenges_debrief.md`.**
  - That round rejected `tooltip_balloon.all()` + `.text`. That form is weaker: Selenium reads a fading-in balloon as `""`, and Playwright `textContent` returns None.
  - The new target avoids the problem. XPath `string(.)` reads DOM text regardless of opacity, and `assert_absent` on both backends checks DOM presence through `find_elements`, not visibility. So it's exactly as strict as the old JS.
- **Red check.**
  - I temporarily restored `client/packages/ui/src/directives/vGTooltip.ts` from `d2d1dcd883c`, with Vite on 5181 hot-reloading.
  - The test failed on Playwright at the new `assert_absent`, at `test_upload_activity.py:194`, and it reported the element as "actually displayed? [True]".
  - I then restored the file.
- **History.**
  - Fixup plus autosquash into the tooltip commit, which went from `f4448ffd81d` to `b5c835414a8`.
  - The 4 Baseline commits, `start()` (`b3a6d695c7b`) and the first three fix commits keep their SHAs.
  - The add-selected commit is now `2dd0d88813d` and the duplicates commit is now `dff1243e3d0`.
  - `git diff c6afd9dc182 dff1243e3d0` contains only these 2 files and 5 lines.

## Checked, no change

- **Selectors.** Apart from the line above, the test and helper code goes only through `components.upload_activity.*` and `components._.*`. The banner geometry check passes component elements into `execute_script` as arguments.
- **Shared abstractions.**
  - `_screenshot_when_startable` is used twice.
  - `start_button_enabled` and `data_library_add_selected_enabled` are each one target, used by the helpers.
  - `stage_data_library_dataset` delegates to the plural version.
  - `_create_and_populate_library` and `_library_items` are only used in this class.
- **Sleeps.** The only sleep is the commented `sleep_for(UX_RENDER)` after the explicit enabled wait in `_screenshot_when_startable`, which is for the screenshot only. `self.home()` is a commented reload. The collection `_wait_on` stays, because a SmartTarget can't express it.
- **Screenshots.** These are the only E2E tests of `DataLibraryUpload.vue`. All 3 capture a screenshot:
  - `upload_activity_data_library_staged`
  - `upload_activity_data_library_target_history_staged`
  - `upload_activity_data_library_other_user_imported`

  I checked the target-history PNG on both backends:
  - the lingering "Change target history" tooltip is gone;
  - the "Choose another" link is visible next to the long history name;
  - Start is enabled.

## Follow-ups (carried forward)

- `UploadMethodInlineContext` still clicks raw `[data-test-id="upload-method-inline-start"/"cancel"]` selectors, even though `upload_method_inline.start_button` and `cancel_button` targets exist. This predates the branch.
- `test_upload_activity_collection.py:77` clicks `start_button` directly and bypasses the hardened `start()`. It's outside the diff.
- The forward merge to dev will conflict on `data_library_select_all` with e971fc43a4d. Take dev's `GCheckbox` selector there.
- Two follow-ups from the previous polish are now resolved, so I dropped them:
  - the `data_library_add_selected` click race, fixed by `2dd0d88813d`;
  - the lingering tooltip in the screenshot, fixed by `b5c835414a8` and confirmed visually.

## Verification (head `dff1243e3d0`, servers :8092/:5181, one run at a time)

- `test_upload_activity.py::TestUploadActivityDataLibrary` (3 tests), with `GALAXY_TEST_SCREENSHOTS_DIRECTORY` set:
  - Playwright: **3 passed** (82s).
  - Selenium: **3 passed** (176s).
- Screenshots: `/private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-brain-vault-agents-gx-workhorse/cebef6ed-2fcb-49da-abbd-9372b65e0c6a/scratchpad/polish3_screenshots/{playwright,selenium}/` (3 PNGs each).
- Lint: ruff, black and isort are clean on `test_upload_activity.py`, and prettier is clean on `navigation.yml`.
