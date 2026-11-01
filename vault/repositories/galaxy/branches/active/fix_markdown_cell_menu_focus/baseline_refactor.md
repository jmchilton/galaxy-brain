Run via Claude Opus at high effort.

No refactoring of the base branch was performed. This session couldn't force-push, so it only recommends a restructure: split the Vue-only `data-description` / `data-cell-index` DOM hooks out of `0d1ebb49773` into one leading refactor commit with no behavior change, then put all three baseline-test commits right after it, then the fix commits.

## What counts as refactoring

I reviewed `git log upstream/release_26.2..e83597521bd` (16 commits).

- **Refactor, can move ahead of the fix:** the Vue template hunks of `0d1ebb49773` ("Scope Markdown cell editor E2E selectors with data-description"). They add `data-description` attributes to `CellAction.vue`, `CellAdd.vue`, `CellOption.vue` (plus `:data-option-title`), `CellWrapper.vue` (plus `:data-cell-index`) and `MarkdownEditor.vue`. These are test hooks only and change no behavior on the base. They are also the reason the CellEditor baseline `56bf7cade76` can't move first today, because it selects through `data-cell-index`, `markdown cell toggle button`, `markdown cell actions button` and `data-option-title`.
- **Not refactoring, must stay after the fix:**
  - `76176832853` (drop `usePopper`'s `.popper-close` delegation). On the base, `CellAdd` still relies on it to close on mouse selection. It can only follow `5e18f770488`.
  - `Popper.vue`'s `defineExpose({ close })` in `5e18f770488`. It's a purely additive one-liner, but nothing calls it until the fix. A refactor commit holding only that line would be unused infrastructure, so leave it in the fix.
  - Every `ButtonPlain` change (Enter `.prevent`, Space on keyup, pressed tracking) and the `CellEditor` focus helper. These are behavior changes that make up the fix.
- **E2E half of `0d1ebb49773`** (`navigation.yml` and `test_pages.py`). This rewrites the selectors that `80fed24ff11` added, so it has to stay after `80fed24ff11`. It could also be squashed into it.

## Recommended history (oldest first)

1. **New: "Add data-description hooks to the Markdown cell editor"**, made of only the `client/src/components/**` hunks of `0d1ebb49773`. On the base, the `CellAction.vue` nav hunk lands with fuzz, because its context reads `popperRef.visible = false` rather than `popperRef.close()`. The added line itself is unchanged.
2. `f244884bee1`: Baseline tests for Markdown editor cell menu selection.
3. `9e06d35bd9c`: Baseline tests for ButtonPlain keyboard activation.
4. `56bf7cade76`: Baseline tests for Markdown cell editor Move. Optionally fold in the `CellAdd: true` stub from `f77c09c11f7`'s test hunk to speed it up.
   Steps 2-4 can be squashed into one "Baseline tests ..." commit, as the `baseline_first` alt did for 2-3.
5. `5e18f770488` fix, `1886353dd23`, `964555d3f3a`, `80fed24ff11`. Order and content unchanged.
6. **The rest of `0d1ebb49773`**: only `client/src/utils/navigation/navigation.yml` and `lib/galaxy_test/selenium/test_pages.py`. It can be squashed into `80fed24ff11`.
7. `006f64d6c37`, `76176832853`, `0c6a362e9eb`, `f77c09c11f7`, `84b9730d401`, `bcab00b9482`, `e83597521bd`, unchanged. Optional cleanup: `0c6a362e9eb` (formatting) is reverted to the multi-line form by `f77c09c11f7`, so squashing both `CellEditor.vue` hunks into `006f64d6c37` drops the churn.

Steps 1-4 form a prefix with no behavior change that could become its own PR, as the "Baseline tests" convention expects. If baseline commits must come literally first, a valid alternative is 2, 3, 1, 4. Commits 2 and 3 don't touch any Vue file.

## Validation

I validated this read-only, without touching the Galaxy worktree:

- **Clone replay.** I made a `git clone --shared` in the scratchpad and replayed steps 1-7 there (split `0d1ebb49773` with `patch -F3` and `git apply`, then cherry-picked the rest). There were no conflicts, and `git diff e83597521bd HEAD` was empty, so the final tree is identical.
- **Baselines pass on the base plus the hooks.** I applied `git archive upstream/release_26.2 client`, the hooks patch, and baselines `f244884bee1`, `9e06d35bd9c` and `56bf7cade76`, then ran vitest (node 22.20.0) over `Markdown/Editor`, `Common/ButtonPlain.test.js` and `Popper`. All 10 files and 65 tests passed.

## How to apply (when force-push is allowed)

With `upstream/release_26.2` as base, run `git rebase -i` and mark `0d1ebb49773` `edit`. Before that, create commit 1 by `git show 0d1ebb49773 -- client/src/components | git apply -3` on the base, and reorder the baseline commits after it. In the edit stop for `0d1ebb49773`, keep only the `navigation.yml` and `test_pages.py` hunks. Then confirm with `git diff e83597521bd` (expect empty) and force-push.

The `fix_markdown_cell_menu_focus_alt_baseline_first` alt is stale (see [baseline_first](alts/baseline_first.md)). Reorder the main branch as above instead of resetting it to the alt.

## Minor note (not a history change)

`CellEditor.vue`'s `focusCellActions` queries `.cell-actions-button`, a class that `006f64d6c37` adds only for that purpose. The tests now address the same button through `[data-description="markdown cell actions button"]`. The focus helper could use that hook too and drop the extra class, but whether production code should depend on a `data-description` test hook is a matter of taste, so I left it as is.
