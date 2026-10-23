# Baseline refactor — ag_grid_36

Two 31-compatible refactor commits now precede the upgrade: the existing ag-grid tidy commit, and a new commit that extracts the generic `ag_grid_edit_cell` selenium helper (with `list_wizard_click_cell_and_send_keys` delegating to it). Fixups were folded into the upgrade commit, and the E2E tests follow as two commits.

2026-10-22. Base `0073b5e9224` (unchanged). Final tree is identical to the post-review tip `802ec2d4195`, except for the one-line `gridRows` vue-tsc fix in `FetchGrid.test.ts`.

## New history

1. `0dc06dc46d2` Tidy ag-grid usage ahead of 36 upgrade. Same tree as before: renderers passed as components, setGridOption, shallowRef, RuleGrid dead code.
2. `dda2cd86564` Extract generic ag_grid_edit_cell selenium helper. This was moved pre-upgrade: it refactors existing `list_wizard_click_cell_and_send_keys` without changing behaviour. The `clear` option is added later, with its first caller.
3. `70d706eb291` Upgrade ag-grid to 36.2.0. Folded into it: the FetchGrid stub fixups, the sample sheet model-object fix and its test, the useAgGrid comments and row-copy contract, `agGridLegacyTheme.css`, and the stub tightening. The paired-builder and FetchGrid unit tests that were later deleted are never added. The commit message was rewritten (the old one listed items that had moved to the refactor commit).
4. `086b683cb88` Data landing E2E test: `go_to_tool_landing`, the `clear` option, `data_landing` selectors and the `data-description` hooks.
5. `8c3c513c856` Paired list rename/swap E2E plus the `swap_button` selector.

## Considered, kept with the upgrade

- `ColDef.headerStyle` (replacing the CSS class duplicated in two components) doesn't exist in 31.3.4. vue-tsc fails, TS2353.
- The write-backs in `onIdentifierChange`/`onSwap`, the string `MODEL_OBJECT`, `cellDataType: false` and the legacy-theme CSS variable. They work on 31 or are harmless there, but 36 is their only motivation.
- The E2E tests and `data-description` hooks probably pass on 31, which doesn't copy rows, but they weren't run against a 31 client build. They stay after the upgrade as its regression coverage.

## Verification

- Refactor commits alone on 31.3.4 (`pnpm install --frozen-lockfile` at `e693dc9b82c`, which has the same tree as `dda2cd86564`): vue-tsc clean; vitest 73 files / 702 tests passed; eslint and prettier clean on the touched files; black and ruff clean.
- 36.2.0 reinstalled at the tip: vue-tsc clean; vitest 703 passed; lint clean. Playwright: `test_data_landing.py` and `test_build_paired_list_auto_matched` passed.
- Tree identity: `git diff e693dc9b82c dda2cd86564` is empty; `git diff 802ec2d4195 8c3c513c856` is only the `gridRows` typing line.

Backups: `ag_grid_36_backup_thermo2` (`f1c68b9464c`, pre-review) and `ag_grid_36_pre_baseline` (`802ec2d4195`, post-review, pre-rewrite).
