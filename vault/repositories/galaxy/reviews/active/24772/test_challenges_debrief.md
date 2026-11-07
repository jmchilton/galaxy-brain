# Test challenge debrief: #24772

Profile: gx_test_challenger (`_shared/reviewers/gx_test_challenger.md`). Model: Opus 5.5. Effort: medium. Reviewed commit: `49fa5544810c37ddfa05ccc9eaa2bd52c07e019c`.

Review mode: nothing in the PR was edited. The drops and rewrites below are recommendations. Findings are in [test_challenges_review.md](test_challenges_review.md).

## How this was checked

The PR worktree has no `client/node_modules`, so I exported the PR's `client/` into a scratch directory and linked dependencies from a worktree with an identical `pnpm-lock.yaml`. `@galaxyproject/galaxy-ui` was aliased to the exported `packages/ui` so mutations applied. The PR worktree stayed clean.

The new tests and `MastheadDropdown.test.ts` pass at the PR head. `Masthead.test.js` fails 15 of 15 in this harness even without any mutation (`Cannot read properties of undefined (reading 'getItem')`). It passes in CI (`client-unit-test` is green), so I discarded it as evidence.

| Mutation at PR head | Test run | Result |
| --- | --- | --- |
| Pre-PR `HistoryStorageOverview.vue` and `util.ts` under MODE 3 | `HistoryStorageOverview.test.ts` | Fails: `expected true to be false` |
| Remove `v-bind="byteFormattingForChart"` from the active vs deleted chart | `HistoryStorageOverview.test.ts` | **Passes** |
| Move the spread back after the attributes in the horizontal `GTabs` link | `GTabs.test.ts` | Fails: `expected 'caller-id' to be 'first-button'` |
| Same, in the vertical `GTabs` link | `GTabs.test.ts` | **Passes** |
| Same, in the vertical link, with the test parametrized over `vertical` | `GTabs.test.ts` | `vertical: true` case fails; both cases pass unmutated |
| Restore the lone `<template>` in `MastheadDropdown.vue` | `MastheadDropdown.test.ts` | Both tests fail (no `a.dropdown-item`) |
| Move the spread back after the attributes in `GButton` | `GButton.test.ts` | Passes (see below) |
| Same, in `GLink` | `GLink.test.ts` | Passes (see below) |

## Challenge of each new unit test

### `client/src/components/User/DiskUsage/Visualizations/HistoryStorageOverview.test.ts`: rewrite at the E2E layer and drop

- It does catch the regression it was written for: the pre-PR code fails it under MODE 3.
- After this PR, `enable-selection` is not in the shared object, so the two assertions check template literals (`:enable-selection="true"` and `"false"`) reaching a stubbed `BarChart`.
- The `labelFormatter` assertion is vacuous. `BarChart` declares a default `labelFormatter`, so `toBeTypeOf("function")` holds with the spread removed. The mutation above confirms it.
- It needs four `vi.mock` calls, including one of `@/stores/historyStore` and one of `./service`, to reach those assertions. `client/README.md` points at `useServerMock` and `createTestingPinia` for this setup, and at `shallowMount` over `mount`. Reworking it isn't worthwhile given the next points.
- What the selection flag does is already tested in `Charts/BarChart.test.ts` ("should not trigger selection on click when selection is disabled").
- The PR's own test plan lists this as a manual check ("the active vs deleted chart shouldn't be selectable"), and `test_history_storage.py` already drives this page and clicks a bar on the sibling chart.

### `client/packages/ui/src/components/GTabs.test.ts`: keep, extend to the vertical branch

This is a good test. It asserts rendered attributes, has no mocks, and fails when the reorder is undone. `mount` over `shallowMount` is justified because `GTab` registers itself with its parent. It only renders the horizontal branch, though, and `GTabs.vue` has a second copy of the anchor for `vertical`, which the PR also changed.

## Coverage gaps considered and not raised

- **`MastheadDropdown`:** the existing `MastheadDropdown.test.ts` catches the lone `<template>` regression. Selenium helpers also open the user menu (`navigates_galaxy.py`, `logout` and the preferences navigation), and Playwright is green on this PR. No new test needed.
- **`GButton` and `GLink` reorder:** undoing it isn't caught by their test files, but I could not write a test that observes it. I tried pinning `disabled: true` with a caller `aria-disabled="false"`. The result is `"false"` in both orders, because neither component sets `inheritAttrs: false`, so `$attrs` fall through onto the root after the template's bindings. `anchorAttributes` only carries `href`, which has no explicit binding. A pin here can't pass, so none is recommended. This also means "explicit attribute wins" in the PR description doesn't hold for `$attrs` on these two components. That behavior isn't introduced here, because the fallthrough wins in both orders.
- **`GDropdown`, `GPopover`, `GCard`, `HistoryCounter`, `BroadcastContainer`, `LintSection`:** the spread keys (`aria-label`, `aria-labelledby`, `color`/`outline`/`transparent`, `href`/`to`/`target`/`rel`, `data-*` from lint state) don't overlap the explicit attributes on those elements, as the PR says. A test here would only pin source order.
- **Tests for the build and lint config:** the `compatConfig` switch and the ESLint rules are checked by the suite itself, by `Lint and unit test`, and by a production build. No dedicated test is warranted.

## The warning count as evidence

The PR measures compiler deprecations "across the vitest run". Vitest only compiles SFCs that a test imports, and the warning only fires in dev, so that count can't speak for untested components. To close that gap I ran a regex scan of every `client/**/*.vue` tag for an object `v-bind` placed after explicit attributes, ignoring class, style, ref, key, listeners and directives. The only hits are `:is` on `GButton` and `GLink`, and `is` isn't a fallthrough attribute. A regex scan is weaker than the compiler, and it didn't cover the Tool Shed frontend, but it supports the PR's claim.

## CI

`Playwright tests` (both shards) and `Integration Selenium` ran and passed on this commit, so the real-browser rendering the PR flags as a risk gets broad coverage. `Selenium tests` is schedule and dispatch only, which is expected.

## Test plan

1. Add the E2E test in P2 1 to `lib/galaxy_test/selenium/test_history_storage.py`, with its selectors in `client/src/utils/navigation/navigation.yml`.
2. Delete `HistoryStorageOverview.test.ts`.
3. Parametrize `GTabs.test.ts` over `vertical` (P3 1). This was run in the scratch copy and works as described.

The E2E test has not been written or run. I inferred from the existing `dataset_by_size` selector that Vega gives the Active bar an `aria-label` containing its label, so check that first.
