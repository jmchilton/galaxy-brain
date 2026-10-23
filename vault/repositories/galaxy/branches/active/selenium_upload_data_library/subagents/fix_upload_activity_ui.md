# Fix: Upload Activity UI items

Three commits on `selenium_upload_data_library`, after `078ff13cbc3`. Head is now `75f4fe30dea`, force-pushed to `jmchilton`. `origin/dev` and upstream PRs had no fix for any of the three: `TargetHistorySelector`/`TargetHistoryLink`/`vGTooltip` have no diff vs dev, and dev's helper still clicks plain `data_library_add_selected`.

## 1. Long history name hides the change link - bug fixed (`55900c2dd7a`)

- **Evidence:**
  - Removing the `rename_history(... "library list current")` workaround alone stays green on both backends. A probe showed why: after `_create_and_populate_library`'s admin relogin, the current history is "Unnamed history", not the `@managed_history` one.
  - Renaming the current history to a long unbroken name (`"library_list_current_" + "x" * 60`) reproduces the bug. Selenium times out waiting for `.change-history-link` to be clickable. The screenshot shows the name running past the banner and clipping "Choose another" and "(current)".
  - Playwright still clicked the clipped link, because its actionability checks ignore overflow clipping.
- **Change:** `TargetHistorySelector.vue`, scoped CSS only.
  - `min-width: 0` down the flex chain into `SwitchToHistoryLink`'s `GLink`, which gets ellipsis and `nowrap`.
  - The change link is `flex-shrink: 0` and `nowrap`.
  - The full name goes on the link's `title`, via `historyStore.getHistoryById`.
  - `TargetHistoryLink` and `SwitchToHistoryLink` are unchanged, so `WorkflowAnnotation` is unaffected.
- **Tests:**
  - **E2E:** the short-name workaround is replaced by the long-name rename, plus `_assert_target_history_change_link_in_banner`, which compares the link's and banner's `getBoundingClientRect().right`. Red on both backends before the fix ("overflows the banner by 193.8px"), green after.
  - **Vitest:** a `TargetHistorySelector.test.ts` case checks the full-name title. Red, then green.

## 2. Lingering "Change target history for this upload" tooltip - product bug fixed (`2883161df27`)

- **Evidence:** a probe ran right after `select_target_history`, again after `UX_RENDER`, and again after hovering the footer. Every time it returned:
  - `activeElement` = the change link
  - `:hover` false, `:focus-visible` false
  - `.g-tooltip-d` = ["Change target history for this upload"]
- **Cause:**
  - `GModal` uses a native `<dialog>`, which restores focus to the opener on `close()`.
  - `vGTooltip` registers `focusin` → show even for `.hover` tooltips. So the restored focus pops the tooltip, and it stays until focus moves. A real user sees it too; it isn't a test artifact.
- **Change:** `client/packages/ui/src/directives/vGTooltip.ts`.
  - For non-focus-only tooltips, `focusin` is ignored when the target is `:focus` but not `:focus-visible`, i.e. pointer or programmatic focus. Such tooltips still show after the hover delay.
  - Keyboard focus still shows immediately, and `.focus`-only tooltips are unchanged (`FilterMenuInput`/`FilterMenuRanged`).
  - Synthetic `focusin` without real focus falls through to show as before, and so does an engine without `:focus-visible` support (try/catch).
- **Behavior change across galaxy-ui consumers** (Tool Shed frontend included): a mouse click no longer shows a hover tooltip instantly, only after the usual hover delay.
- **Tests:**
  - **E2E:** after the selector closes, the list test asserts the tooltip text is absent. Red on both backends before the fix, green after.
  - **Vitest** (`src/directives/vGTooltip.test.ts`), 4 new cases:
    - pointer focus on a hover tooltip shows nothing (red, then green)
    - keyboard focus shows the tooltip
    - a pending hover show survives pointer focus
    - a focus-only tooltip shows on pointer focus
  - happy-dom treats any focus as `:focus-visible`, so pointer focus is simulated with a `matches` stub.
  - No existing tests were changed. `createTooltipTarget` gained an optional `modifiers` param.
- **Not fixed:** `useAccessibleHover` (used by `GTooltip` in `GLink`/`GButton`) has the same unconditional focus → show. That's a follow-up candidate.

## 3. `data_library_add_selected` click-while-disabled race - test helper (`75f4fe30dea`)

- Added `data_library_add_selected_enabled` (`:not([aria-disabled])`) to `navigation.yml`, mirroring `start_button_enabled`. `stage_data_library_datasets` now waits on it before clicking.
- The race is timing-dependent, so there's no deterministic red test.

## Environment gotcha

`client/node_modules` in this worktree is a symlink chain that ends in `galaxy_ui_driver_gxui/client/node_modules`. So `@galaxyproject/galaxy-ui` in vitest resolves to that other worktree's `packages/ui` source, and plain vitest runs don't see edits to this branch's galaxy-ui. Vite (5181) aliases galaxy-ui to this worktree's source, so E2E runs were fine. Vitest for the directive ran through a temporary config (deleted afterwards) that merges `vitest.config.mts` and aliases `@galaxyproject/galaxy-ui` to `packages/ui/src/index.ts`.

## Tests run

- Vitest under the pinned node, with the local-galaxy-ui alias: `vGTooltip.test.ts` and `TargetHistorySelector.test.ts` 28/28. Every client and `packages/ui` test file mentioning tooltip or focusin: 44 files, 494/494 passed.
- `TestUploadActivityDataLibrary`, all 3 tests: Playwright passed, Selenium passed.
- `-k target_history_change` (the other `select_target_history` user), Selenium: passed.
- Lint:
  - ruff/black/isort clean on the touched Python.
  - eslint/prettier clean on the touched client files, apart from one pre-existing `@selectHistory` hyphenation warning in `TargetHistorySelector.vue`.
  - Pre-commit hooks passed.
