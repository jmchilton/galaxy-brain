# Thermo-nuclear code quality review

I ran the review in-session against `origin/release_26.2...7f80bd09aab`. **Acted on 4 of the findings:**
- I dropped the duplicate method guard.
- I removed the `public` mode from library setup.
- I declared `@requires_new_library`.
- I put the setup on a single API interactor.

**Did not act on 6.** They're listed below.

Everything is amended into the single Baseline tests commit. The new head is `40aea385656`, force-pushed to `jmchilton`. The commit message is unchanged and still accurate.

## Changes

- **`UploadContext.stage_data_library_dataset`**: removed its method check. It delegates to `stage_data_library_datasets`, which already does the same check. The helper file is now 1013 lines (was 1016). It was already over 1k on `release_26.2` (1005), so the branch doesn't cross the threshold.
- **`_create_and_populate_library`**: removed the `public=False` flag and its branch. Library datasets are now always unrestricted.
  - The original admin test therefore imports unrestricted data. That changes setup only, not the behavior under test, since an admin sees restricted data anyway.
  - The restriction loop reads `/libraries/{id}/contents`, not the folder-contents endpoint with the 500 race.
- **Single interactor**: setup now uses `library_populator.dataset_populator` for `new_history` and `fetch`. Before, it mixed in the Selenium session populator. It's the same admin user either way.
- **`@requires_new_library`**: added to all 3 `TestUploadActivityDataLibrary` tests, matching `test_library_contents.py`. `LibraryPopulator.new_library` already calls `using_requirement("new_library")` at runtime. The marker makes that requirement visible to marker-based selection.

## Not acted on

- **Admin UI login in setup, plus `run_as_admin`.** The coordinator decided to keep it, to preserve the upstream test's admin coverage.
- **Switching `UploadContext.start()` to wait on `start_button_enabled`.** This is the real code-judo move: `_screenshot_when_startable`'s wait would become the canonical precondition, and the disabled-click race would go away. But it changes every Upload Activity test on a release branch, so it stays the follow-up recorded in `polish_e2e_tests_debrief.md`.
- **Converting `api/test_history_contents.py:385` to `LibraryPopulator.remove_library_dataset_restrictions`.** It's outside the files under test and would need a slow API test run on a tests-only release branch. It's the obvious second caller of the new helper, so it's a good dev follow-up.
- **Rewriting the collection `_wait_on` (any-over-contents) in the list test.** Low value, since it's direct enough as written.
- **`sleep_for(UX_RENDER)` in `_screenshot_when_startable`.** It's already justified (the `GButton` color transition) and only affects screenshots.
- **Hard-coded `"ext": "bed"` in setup.** Every caller passes `.bed` files.

## Verification

- `ruff`, `black` and `isort` are clean, and the pre-commit hooks passed on amend.
- All 3 `TestUploadActivityDataLibrary` tests passed under Playwright (81s), then under Selenium (142s), run one after the other.

<details>
<summary>Full review</summary>

**Verdict:** approve with small fixes. This is a tests-only diff (+99/-7 across 4 files), with no structural regressions or architecture leaks. Helper additions mirror the existing `stage_remote_file`/`stage_remote_files` pair and the `RemoteFilesContext` chaining shape.

**Findings**

1. **Duplicate guard (spaghetti, minor).** `stage_data_library_dataset` checks `_current_method_id`, then delegates to `stage_data_library_datasets`, which checks it again. Delete the outer check, since delegation makes it dead.
2. **One-off mode flag (spaghetti).** `_create_and_populate_library(public=False)` is a nullable mode with a single caller that sets it. Removing restrictions is harmless for the admin tests. Always doing it deletes the flag, the branch and a concept the reader has to hold.
3. **Mixed interactors (boundary).** Setup builds a `LibraryPopulator` over `api_interactor_for_logged_in_user()` but posts `new_history`/`fetch` via `self.dataset_populator` (the Selenium session populator). It works because both are the admin, but a reader has to verify that. Use `library_populator.dataset_populator` throughout.
4. **Undeclared requirement (boundary).** `LibraryPopulator.new_library` calls `using_requirement("new_library")`, but the tests don't carry `@requires_new_library`, unlike `test_library_contents.py`. Declare it.
5. **Missed canonical precondition (code judo, out of scope).** `_screenshot_when_startable` waits on `start_button_enabled` because `UploadContext.start()` can click a still-disabled `GButton` (`aria-disabled` plus a JS guard). The canonical fix is for `start()` to wait on the enabled target, which would delete the need for a test-local wait. On a release-branch tests-only diff, leave it as a follow-up.
6. **New populator helper with one caller (reuse).** `remove_library_dataset_restrictions` belongs in `LibraryPopulator`, its canonical home. `api/test_history_contents.py:385` still hand-rolls the same POST and is the natural second consumer. It's a follow-up, not a blocker.
7. **File size.** `upload_activity_helpers.py` was already 1005 lines on base, and the branch adds about 10. `populators.py` is about 4k on base, and the branch adds 10. Neither crosses 1k because of this branch.
8. **Hand-built fetch payload (checked, OK).** `setup_fetch_to_folder` would remove the destination construction, but it makes a *private* library, which breaks the non-admin test. The inline payload is the smallest correct form.
9. **Collection wait (nit).** `_wait_on(any(c["history_content_type"] == "dataset_collection" ...))` could use `get_history_contents_of_type(..., "dataset_collections")`, but that's cosmetic.
10. **Selectors and sleeps (checked, OK).** All UI access goes through `components.upload_activity.*`. The only sleep is the commented, screenshot-only one.

</details>
