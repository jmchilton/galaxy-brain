# Test challenges debrief (fix phase)

**Head is now `c6afd9dc182` (was `e6dadb439ae`), force-pushed to `jmchilton`. Base is still `d2d1dcd883c`.** I made four changes:
- dropped two vitests;
- moved three vitests into a new Baseline commit;
- switched the E2E geometry check to navigation.yml components.

Net diff vs the old head: −36/+7 lines, all in tests and `navigation.yml`. No product code changed.

## Changed

- **Dropped `useUploadBatchOperations.test.ts` "builds the two-step collection ... without copying them".**
  - It asserted a payload literal (`copy_elements: false`), so it tests the implementation directly.
  - The E2E list test checks the actual outcome against a real Galaxy: the target history's datasets are exactly the list's elements, and all are hidden. That E2E was red before the fix.
  - Folded into the fix commit (`c6afd9dc182`). Its message now names the E2E as the red test.
- **Dropped vGTooltip "does not show a hover tooltip on pointer or programmatic focus".**
  - It's the only one of the 4 new directive cases that was red without the fix.
  - Its `matches(':focus-visible')` stub fakes input modality, which happy-dom doesn't have. The test only proves the guard exists.
  - The E2E tooltip-absence assertion checks the same behavior in real Chrome on both backends, and it was red before the fix on both.
  - The fix commit (`f4448ffd81d`) now holds only the directive change and the E2E assertion.
- **Moved the other 3 vGTooltip cases into a new commit, `9c35120fba5` "Baseline tests: vGTooltip focus behavior".**
  - The cases are "shows on keyboard focus", "keeps a pending hover show when the hovered element takes pointer focus" and "shows a focus-only tooltip on pointer focus". The commit also carries the `createTooltipTarget` `modifiers` param and the `focusWithPointer` helper.
  - All 3 pass on the base directive, so as non-Baseline tests they broke the fail-without rule.
  - I kept them rather than dropping them. They are the only unit guard that the fix doesn't over-suppress, i.e. that keyboard a11y and `.focus`-only tooltips still work. That matters across roughly 280 `v-g-tooltip` sites and the Tool Shed.
  - Verified on base: I temporarily restored `vGTooltip.ts` from `d2d1dcd883c` and ran under the local-galaxy-ui alias config. Result: 23 passed, and only the dropped pointer case failed.
  - Placement: after the 3 E2E Baseline commits, before `start()`.
- **The E2E geometry check `_assert_target_history_change_link_in_banner` now uses components.**
  - Added `upload_activity.target_history_banner` to `navigation.yml`.
  - Both elements come from SmartTarget `wait_for_present()` and are passed to `execute_script` as `arguments[0]`/`[1]`. The two hardcoded `querySelector` strings are gone.
  - Folded into the truncation fix commit (`fcaba41a788`).

## Challenged, kept

- **API `test_folder_contents.py::test_index_folder_without_description`.**
  - It reuses `_create_folder_in_library`, `_assert_index_count_is_correct` and `dataset_populator.fetch`.
  - The fetch path is needed: `_create_subfolder_in` always fills in a description, so it can't create the bug state. Fetch is also the real-world producer.
  - `LibraryPopulator.setup_fetch_to_folder` doesn't fit. It makes a new private library rather than targeting a given folder.
  - Red before the fix at `_assert_index_count_is_correct` (500).
  - The `library_folder` destination dict now appears 3 times (populators, E2E, this test). I didn't add a helper for one dict literal.
- **Unit `test_library_folder_contents_service.py`.**
  - An API test can't hit the legacy upload race deterministically, because no API creates an LD without an LDDA. An integration test could, through the app session, but that boots a server to check one query.
  - This test uses the real model and DB plus the shared `MockTrans`, with no ad-hoc mocks. It is product-fix coverage, not infra.
  - Pre-fix it errors with `AttributeError` inside the service under test. That error is the bug itself (the 500), not a missing API.
  - I considered retargeting it at `FolderManager.get_contents`, which would fail at its own assertion. That still needs `MockTrans.get_current_user_roles`. I kept the service level because it pins the user-visible behavior (`total_rows` too).
- **E2E tooltip-absence check.** I left the inline `querySelectorAll('.g-tooltip-d')` + `textContent`.
  - The obvious component swap, `components._.tooltip_balloon.all()` + `.text`, would weaken it. Selenium returns `""` for a tooltip still fading in, so the check could pass without the fix.
  - Playwright's `get_attribute("textContent")` returns None.
  - Asserting no tooltip at all would be stricter, but it risks flaking on an unrelated hover tooltip under the pointer after the modal closes.
- **E2E HDAs-equal-elements check:** it's strict (sorted ids equal, none visible) and uses `history_contents`/`get_history_collection_details`.
- **Earlier keeps still hold** (see `earlier_drafts/2/test_challenges_debrief.md`):
  - `_create_and_populate_library` stays local;
  - admin-login setup is kept;
  - pasted library items;
  - the collection `_wait_on`;
  - `_screenshot_when_startable`;
  - both `stage_data_library_datasets` branches are exercised.
- **No E2E gaps.** Each product fix has an E2E or API/unit red test:
  - description → API test, plus the E2E fetch-created folder;
  - race → unit test;
  - truncation → E2E geometry;
  - tooltip → E2E absence;
  - duplicates → E2E HDA check.

## Fail-without check

- Baseline commits:
  - The E2E tests passed on the Baseline commits in the earlier rounds.
  - The new vGTooltip Baseline cases pass on the base directive (verified above).
- Fix commits each carry a test that fails at its own assertion without the fix:
  - description: API status assert;
  - race: unit test (service `AttributeError`, see above);
  - truncation: E2E overflow assert;
  - tooltip: E2E absence assert;
  - duplicates: E2E id-set assert.
- The two helper commits (`start()`, add-selected) are hardening, not new tests.

## Verification

- Vitest under node 22.20.0 with a temporary config aliasing `@galaxyproject/galaxy-ui` to this worktree's `packages/ui/src/index.ts` (deleted afterwards):
  - base directive + Baseline test file: 23 passed (pointer case excluded);
  - head, `vGTooltip.test.ts` + `useUploadBatchOperations.test.ts`: 26 passed.
- E2E `TestUploadActivityDataLibrary::test_upload_list_from_data_library_to_target_history`: Playwright passed, Selenium passed (one run at a time against :8092/:5181).
- Not rerun:
  - the other two E2E tests and the API/unit tests, whose code is unchanged;
  - the geometry refactor's red case. Per the process, reasoning is enough: `link.right - banner.right` keeps the same operands.
- Lint: ruff, black and isort clean on `test_upload_activity.py`. Pre-commit (prettier, eslint) passed on every rebuilt commit.
- History was rebuilt with the 3 E2E Baseline SHAs unchanged. Old→new for the rest:

| Commit | Old | New |
|---|---|---|
| (new) vGTooltip Baseline | — | `9c35120fba5` |
| `start()` | `344dc3d6b17` | `b3a6d695c7b` |
| folder description | `394f52fedb0` | `e920480748f` |
| folder race | `078ff13cbc3` | `d277474a5bc` |
| truncation | `d8cb457df34` | `fcaba41a788` |
| tooltip | `bd51da15ca6` | `f4448ffd81d` |
| add-selected | `5b7c48adbbc` | `0c9f9ee4c56` |
| duplicates | `e6dadb439ae` | `c6afd9dc182` |
