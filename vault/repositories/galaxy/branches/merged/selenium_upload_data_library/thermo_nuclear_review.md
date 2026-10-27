**Acted on 4 findings:**
1. Added a `LibraryPopulator.fetch_to_folder` helper that replaces two hand-built folder-fetch payloads.
2. TargetHistorySelector now truncates through SwitchToHistoryLink's `.history-link-click` hook instead of GLink's private `.g-link`.
3. Removed vGTooltip's defensive try/catch and documented the `:focus` guard.
4. Added a unit-level `copy_elements: false` assertion.

**Not acted on: 6** (listed below), all release-branch scope or pre-existing. The fixes are folded into their own commits: still 11 commits on base `d2d1dcd883c`, Baseline commits first. New head `7d69fd884f0` (was `dff1243e3d0`), force-pushed to `jmchilton`.

## Changes

- **`LibraryPopulator.fetch_to_folder(folder_id, items, history_id=None)`**, folded into Baseline `4ebd3c2e61e`.
  - It mirrors `DatasetPopulator.fetch_hdas`. It hides the `F`-prefix strip (`folder_id[1:]`) and the `history_id` the fetch API needs.
  - The E2E `_create_and_populate_library` uses it, also folded into the Baseline commits.
  - The new API test `test_index_folder_without_description` uses it too, folded into `a857fdb4ba6`.
  - earlier_drafts/2 declined a `[1:]` helper as "populator-wide cleanup" when the E2E was the only caller. The folder-description fix has since added a second hand-built copy, so the helper now has two callers.
  - The Baseline commit message now names it.
- **TargetHistorySelector truncation**, folded into `26c53b2a531`. `:deep(.history-link .g-link)` became `:deep(.history-link-click)`.
  - `.g-link` is GLink's private root class. `.history-link-click` is the class SwitchToHistoryLink sets on that same element, and WorkflowAnnotation already uses it.
- **vGTooltip `isNonKeyboardFocus`**, folded into `56c7fa0ae4e`.
  - I dropped the try/catch. GPopover's `isKeyboardFocus` already calls `matches(":focus-visible")` unguarded in the same package.
  - I verified the `:focus` half empirically. Removing it turns 5 existing vGTooltip tests red, and all of them dispatch a synthetic `focusin` with no real focus. Real `focusin` targets are always `:focus`.
  - I kept the guard and gave it a one-line comment rather than rewriting 7 synthetic-focusin tests on a release branch.
- **`useUploadBatchOperations.test.ts`**, folded into `7d69fd884f0`.
  - The two-step retry test now captures the `/api/dataset_collections` body and asserts `element_identifiers: [{src: "hda", id: "ds_1"}]` and `copy_elements: false`.
  - This is a strengthening: before, the copy_elements fix was guarded only by E2E. It is red with `copy_elements: true` and green with `false`.
  - The commit message notes it.

## Not acted on

- **Move the truncation CSS into `TargetHistoryLink` itself.** This is the real code-judo move. TargetHistoryLink has exactly two consumers, `WorkflowAnnotation.vue` and `TargetHistorySelector.vue`, and both now carry near-identical `:deep` blocks reaching two components down to make the name truncate. With the rules in the owning component, both blocks disappear. I deferred it because it changes WorkflowAnnotation's styles on a release branch. Dev follow-up.
- **Share `isKeyboardFocus` between GPopover and vGTooltip** (`packages/ui/src/utils/`). It touches GPopover too. Dev follow-up, and it should also convert the synthetic-`focusin` tests to real `focus()` so the `:focus` guard can go.
- **`api/datasetCollections.ts:118` `copy_elements: options.copy_elements || true`** ignores an explicit `false`. This is a pre-existing bug outside the diff, and the Upload Activity path doesn't go through it. Dev follow-up.
- **`upload_activity_helpers.py` is 1038 lines.** It was already 1005 lines at base, so the branch didn't cross the 1k threshold. Splitting it is a dev follow-up.
- **The `select_all` mode flag, and `DataLibraryContext.stage_data_library_datasets` returning `self`.** Both match the `stage_remote_files` / `stage_paste_links` convention. earlier_drafts/2 weighed a separate folder method and declined it. I'm keeping that decision.
- **Base `_UploadStaging.start()` vs inline `_button_group`, and `test_upload_activity_collection.py:77` bypassing `start()`.** These are pre-existing helper-inheritance issues, already logged in earlier_drafts/2. Dev follow-up.

## Verification

All runs were sequential, one at a time. The server code was untouched, so no restart was needed.

- `ruff`, `black` and `isort` are clean on the changed Python files, and `prettier` is clean on the changed client files.
- Pre-commit passed on the commits I made: the amend, the two conflict resolutions, the fixups, the message amend and the reword. Autosquash picks don't run hooks.
- `git range-diff` against `dff1243e3d0`:
  - The deltas are confined to the intended files in commits 1, 3, 6, 8, 9 and 11.
  - Commits 2, 4, 5, 7 and 10 are identical apart from their SHAs.
  - Commit 3 still adds the folder-description workaround, and commit 6 still removes it.
- `git ls-remote` confirms that `jmchilton` is at `7d69fd884f0`.
- The 5-red experiment on the `:focus` guard also confirmed that the aliased vitest config resolved this worktree's `packages/ui`.
- Vitest, run with a temp config aliasing `@galaxyproject/galaxy-ui` to this worktree's `packages/ui/src/index.ts` (since deleted):
  - `vGTooltip.test.ts` plus `TargetHistorySelector.test.ts`: 26 passed.
  - `useUploadBatchOperations.test.ts`: 3 passed. With `copy_elements: true` it is red (1 failed).
- API (against :8092): `test_folder_contents.py::test_index_folder_without_description` passed.
- E2E `TestUploadActivityDataLibrary` (3 tests) at `7d69fd884f0`:
  - Playwright: 3 passed (76s).
  - Selenium: 3 passed (128s).
- `fetch_to_folder` is present in every Baseline commit that calls it.

<details>
<summary>Details: full review</summary>

**Verdict:** structurally sound for a release branch. The product fixes are minimal and live in the canonical layers:
- schema `str | None`
- an inner join with a comment
- one `copy_elements` flag
- a focus-visible guard
- scoped CSS

No file crosses 1k lines because of the branch. Findings, by priority:

1. **Duplicated folder-fetch payload (boundary / canonical helper). Acted.**
   - `{"type": "library_folder", "library_folder_id": X[1:]}` plus a `fetch` payload was hand-built in the E2E `_create_and_populate_library` and in the new API test. `LibraryPopulator.setup_fetch_to_folder` already inlines the same idiom.
   - The `[1:]` encoded-id prefix strip is a magic detail that belongs to the populator.
   - The fix adds `fetch_to_folder`, parallel to `DatasetPopulator.fetch_hdas`. `setup_fetch_to_folder` and `fetch_single_url_to_folder` are left alone; that wider cleanup is outside the diff.

2. **TargetHistorySelector reaches two components deep (abstraction leak / code judo). Partially acted.**
   - The selector styles `.history-link-wrapper` (TargetHistoryLink), `.history-link` (SwitchToHistoryLink) and `.g-link` (GLink's private root class). WorkflowAnnotation does the same thing with slightly different rules.
   - The truncation behavior is a property of TargetHistoryLink. Both of its consumers want it.
   - On release, I only swapped the GLink-private hook for SwitchToHistoryLink's `.history-link-click`.
   - On dev, move the rules into TargetHistoryLink and delete both consumers' `:deep` blocks.

3. **`isNonKeyboardFocus` near-duplicates GPopover's `isKeyboardFocus`, plus a defensive try/catch (bespoke helper / magic fallback). Partially acted.**
   - The try/catch hid no real failure mode: `:focus-visible` is supported everywhere and in happy-dom.
   - The `:focus` conjunct exists only so synthetic `dispatchEvent(new Event("focusin"))` tests keep showing. I verified this, and production `focusin` always has a focused target.
   - On release, I removed the try/catch and documented the conjunct.
   - On dev, share the helper and convert the tests to real `focus()`.

4. **The `copy_elements` change had E2E-only coverage (test boundary). Acted** with a unit assertion on the request body.
   - The change itself is correct and minimal. `copy_elements` is the right knob, since the two-step path only ever receives datasets created by the same upload.

5. **`folders.py` inner join.** Correct and minimal.
   - It drops LDs with no LDDA, which can't render anyway.
   - The unit test exercises the exact mid-upload shape.
   - The `MockTrans.get_current_user_roles` addition is the minimal mock support it needs.
   - No action.

6. **`LibraryFolderMetadata.folder_description: str | None`.** It matches the model column and `FolderLibraryFolderItem.description`.
   - `grep` found no client consumer that treats `folder_description` as non-null, so there's no typecheck fallout.
   - No action.

7. **E2E helpers.**
   - The `start_button_enabled` / `data_library_add_selected_enabled` nav targets are the canonical place for the aria-disabled waits.
   - `stage_data_library_dataset` delegating to the plural form removes duplication.
   - `_assert_target_history_change_link_in_banner` uses a bounding-rect script. That's the direct way to assert the layout bug, and it's local to one test.
   - The `tooltip_balloon_with_text` xpath is only used for an absence check, which is acceptable.
   - No action.

8. **File size.**
   - `upload_activity_helpers.py`: 1005 to 1038 lines, already over 1k at base.
   - `test_upload_activity.py`: 258 lines.
   - `populators.py` is a pre-existing 5k-line file. +19 lines across two cohesive methods is acceptable.

</details>
