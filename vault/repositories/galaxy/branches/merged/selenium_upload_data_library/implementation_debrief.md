# Implementation debrief

**STATUS: READY**

- Base: `release_26.2` (merge-base `d2d1dcd883c`).
- Head: `1fccf61f2d5`.
- Size: 16 files, +322/-25, 11 commits.

The branch started as the missing E2E coverage for the 26.2 Upload Activity "Import from Data Library" route, prompted by davelopez on #24399. That route doesn't have the #24399 bug. The new tests then surfaced product bugs, and John asked for all of them to be fixed here, keeping the `start()` wait commit.

## Commits

1. **Baseline tests 1-3**, the Upload Activity data library coverage:
   - Admin import.
   - Non-admin import of a public library dataset.
   - Subfolder → select-all → list into a picked non-current history.
   - New helpers: `LibraryPopulator.remove_library_dataset_restrictions` and `fetch_to_folder`, `stage_data_library_datasets`, nav targets.
   - The `data_library_select_all` selector, which was broken on 26.2.
2. **Baseline tests 4:** vGTooltip focus behaviour (keyboard focus, pending hover, focus-only tooltips).
3. **E2E helpers:** `start()` and Add Selected wait until their buttons are enabled before clicking.
4. **Fix: folder contents 500 for a null folder description.** Schema `folder_description: str | None`, plus the client schema. API red test.
5. **Fix: folder contents 500 while a legacy library upload is in progress.** The library dataset is committed before its LDDA is linked. Fixed with an inner join on the LDDA in `_get_contained_datasets_statement`, matching `get_readme`. Unit red test.
6. **Fix: long history name truncation in `TargetHistorySelector`.** The "Choose another" link stays in the banner. E2E geometry red test.
7. **Fix: vGTooltip hover tooltips ignore non-`:focus-visible` focus.** The tooltip no longer lingers after a native `<dialog>` returns focus. E2E red test.
8. **Fix: library-to-list import no longer duplicates hidden HDAs** (`copy_elements: false`). Red tests: an E2E assertion that the history's HDAs equal the list's elements, and a vitest.

## Verification

- Every fix goes red without its own change.
- The Baseline commits pass on unfixed product code: E2E on both backends, plus vitest.
- At head:
  - `TestUploadActivityDataLibrary`: 3/3 on Playwright and 3/3 on Selenium.
  - The API tests, the unit test and the touched vitests pass.
- Reviews: four normal reviews, a fresh test challenge, E2E polish, Codex (0 findings), thermo-nuclear (4 small cleanups), baseline refactor, scope evaluation (**keep as is**).
- Left to CI: about 20 other modules that use the upload helpers, and the inline workflow-run upload tests (the local server has no test toolbox).

## Decisions for John

See `scope_evaluation.md`.
- **One PR or several:** one PR, or split into tests / server / client? The commit order already supports any split.
- **Tooltip PR:** keep the tooltip fix bundled, or make it its own galaxy-ui PR? It changes behaviour for every hover-style `v-g-tooltip`, and in the 26.2+ Tool Shed frontend. GLink/GButton tooltips (`useAccessibleHover`) still pop on focus.
- **26.1 backport:** all 5 bugs exist on 26.1. Backport the server fixes, all, or none?
- **Forward merge to dev:** take dev's `data_library_select_all` (e971fc43a4d).

## Follow-ups (dev)

- Align `useAccessibleHover` with the guard and dedupe its two copies. Share `isKeyboardFocus` with GPopover.
- Move the truncation into `TargetHistoryLink`.
- `createCollectionPayload` `copy_elements || true` ignores `false`. Latent: no caller passes `false`.
- Move `start()`/`cancel()` into `UploadContext` and harden the inline `start()`. `test_upload_activity_collection.py:77` should use the helper.
