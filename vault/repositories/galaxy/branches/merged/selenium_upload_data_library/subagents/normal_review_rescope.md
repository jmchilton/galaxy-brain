# Normal review: re-scope (`393f09e69cb`, `d03ab9986c5`)

**Acted on nothing. No bugs found, head unchanged at `d03ab9986c5`.** Verified the select-all wait, the selector change, the stricter `start()` on 26.2 and dev, commit order and lint, and reran the list test once under Selenium (pass). Only nits and already-logged follow-ups remain.

Not acted on:
- **128-col docstring** on `stage_data_library_datasets` (`upload_activity_helpers.py:369`). Black and ruff don't flag it (E501 ignored), and 6 other lines in `lib/galaxy_test/selenium` are already over 120. Not worth a force-push plus two E2E reruns.
- **`_UploadStaging.start()` assumes `_button_group.start_button_enabled`.** `upload_method_inline` has no such target. That's harmless because `UploadMethodInlineContext` overrides `start()`, but it's a latent contract. It could be fixed by moving `start()` into `UploadContext`, or by adding the target to the inline group when the inline `start()` is hardened. Leave it for that follow-up.
- **Inline `UploadMethodInlineContext.start()`** is not hardened. It's untestable on :8092 (no `cat` tool), as the implementer logged.
- **`data_library_add_selected`** has the same aria-disabled click race. It's already logged as a follow-up.
- **`test_upload_activity_collection.py:77`** clicks `start_button` directly and bypasses the helper. It's outside the diff.
- **Forward-merge to dev is untested.** Resolve the conflict by taking e971fc43a4d's `[data-test-id="data-library-select-all"]`, then run the list test on dev.

<details>
<summary>Details</summary>

## Verdict

The re-scope is clean and small: +38 lines of test and helper code over the original scope, tests only.

## Select-all wait (both backends)
- Every expected label must be visible before select-all is clicked. `1.bed` and `2.bed` exist only in the subfolder. The table's `:key` includes `currentFolderId`, so by the time those labels are visible the root's header checkbox has already been unmounted, and select-all can't hit the root view.
- The final `element_identifiers == ["1.bed", "2.bed"]` assertion also catches over-selection: root `3.bed` would show up as a third element.
- Residual risk, not blocking: `:overlay-loading="isBusy"` could intercept the click if a refetch trails the render. Both backends passed for the implementer, and I got one more Selenium pass.

## Selector
- The `.custom-control:has(> [data-test-id="data-library-select-all"])` reasoning holds. 26.2's `BFormCheckbox` puts the test id on the hidden input, so the old `[...] input[type=checkbox]` descendant selector matched nothing.
- Clicking the wrapper lands on the label's `::before` box. Chrome supports `:has()`.
- On dev, e971fc43a4d swaps to `GCheckbox` and changes the same line. That's a guaranteed conflict, and dev's version is the right resolution because there's no `.custom-control` there.

## Stricter `start()`
- I checked `start_button_enabled` (`:not([aria-disabled])`) on both branches. `GButton.test.ts` asserts that `aria-disabled` is undefined when the button is enabled (line 114), on both HEAD and `origin/dev`. So the Vue 3 `aria-disabled="false"` pitfall noted in `GLink.test.ts` doesn't apply here.
- `navigation.yml` already uses the `:not([aria-disabled])` pattern 7 times on both branches.
- Callers: about 28 selenium modules go through `UploadContext`. No test asserts that Start stays disabled, so the stricter wait can only turn a silent no-op click into a timeout.
- `UploadItem.start()` delegates to `context.start()`.
- `UploadMethodInlineContext` overrides `start()`, so the inline group's missing `start_button_enabled` is never reached.

## Commit order
- The three "Baseline tests" commits come first, and `d03ab9986c5` is last.
- The implementer ran `TestUploadActivityDataLibrary` at `393f09e69cb`: 3/3 on both backends. That's evidence the Baseline commits pass on their own. At that commit the list test already guarded Start via `_screenshot_when_startable`.

## Reuse
- No `LibraryPopulator` folder-creation helper exists, so nested fetch `elements` is the right tool.
- `_library_items` is a test-local extraction. It's fine at one caller, and a populator helper isn't warranted yet.
- The `description` workaround for the folder-contents 500 is commented in one line, and the product bug is logged in the rescope debrief.

## Imports and comments
- No new imports were added in these commits.
- Comments are one line each.
- The docstring is one line but over 120 columns (nit above).

## Checks I ran
- `ruff`, `black --check`, `isort --check-only` on the 3 changed Python files: clean.
- Selenium: `test_upload_list_from_data_library_to_target_history` at `d03ab9986c5` passed (79s).

</details>
