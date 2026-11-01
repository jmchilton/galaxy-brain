Run via Claude Opus at high effort.

# Scope evaluation: fix_markdown_cell_menu_focus

**Recommendation: expand modestly.** Keep the `release_26.2` target and the branch as built. Add two small pieces:

1. **Focus after Move and Delete (candidate a).** After a Move, `CellEditor` should focus the moved cell's Actions button. After a Delete, it should focus a sensible neighbor. Both are the same user-visible bug as #24335, "menu selection drops keyboard focus", and both are in code the branch already touches.
2. **Drop the `.popper-close` delegation in `usePopper` (candidate b).** After this branch, nothing relies on it. Popper's own Close button already calls `close()`.

Leave `ButtonPlain` as it is (candidate c). Don't retarget to `dev` (candidate d).

## Possible decompositions

The branch is about 345 lines. About 60 are component code; the rest is unit tests, one E2E test, and navigation selectors.

- **Option 1: two PRs.**
  - (i) Baseline tests: `f244884bee1` and `9e06d35bd9c`, the CellAction, CellAdd and ButtonPlain baselines. They pass on the base.
  - (ii) Everything else: the fix, Space on keyup, the new ButtonPlain contract tests, and the E2E test, plus the expansion if adopted.
- **Option 2: three PRs.**
  - (i) Baselines, as in Option 1.
  - (ii) `ButtonPlain` native-button keyboard semantics, with its tests: Enter prevented, Space on keyup.
  - (iii) The Popper `close()` exposure, the CellAction and CellAdd routing, the E2E test, and the expansion.

  (ii) is shared infrastructure that also affects `VisualizationPanel`, so it can be reviewed separately. But (iii) depends on it for correct keyboard behavior.
- **Option 3: a separate follow-up for CellEditor.** Land the branch as is, then put the Move/Delete focus work in its own small PR on top.

## Scopes considered

### As implemented

`Popper.vue` exposes `close()`. CellAction's menu and CellAdd's options close through it, so focus returns to the trigger after a click, Enter or Space. `ButtonPlain` now prevents Enter's default and activates on Space keyup, so the newly focused trigger isn't re-activated. The branch adds unit tests, ButtonPlain contract tests and one E2E test, which hasn't been run.

| Pros | Cons |
|---|---|
| <ul><li>Fixes exactly what the issue describes, through the fix it proposed.</li><li>Also fixes a hidden bug: keyboard selection in CellAdd never closed the menu.</li><li>Covers every programmatic close in the client. No other Popper consumer sets `visible` directly or uses `.popper-close`.</li></ul> | <ul><li>Move can still drop focus to `<body>`, or land on the wrong cell's button. Codex P2 and normal review #2 both raised this. After a selection, the user still sees focus lost.</li><li>The `.popper-close` delegation in `usePopper` is left as dead code.</li></ul> |

### Expansion A: focus after Move and Delete in CellEditor (candidate a) — recommended

In `CellEditor.vue`:
- **After `onMove`:** once the DOM updates (`nextTick`), focus the Actions button inside `cellRefs[swapIndex]`. The moved cell is expanded, since its Actions menu was just used, and the swap carries `toggle` with it.
- **After `onDelete`:** focus the cell that now holds that index, or the previous cell if it was the last. If no cells are left, focus the top Insert button.

This is about 20 lines of code plus two or three vitest cases. The E2E test could add a Move Down step.

| Pros | Cons |
|---|---|
| <ul><li>Same symptom as the issue: a keyboard user picks a menu item and loses focus. Reviewers will try Move right after Clone.</li><li>Small, and in a file next to what the branch touches.</li><li>`scrollToCell` already reads `cellRefs` after `nextTick`, so the change fits that pattern.</li><li>Fixes both forms of the bug: focus on `<body>` when the swapped-in cell is collapsed, and focus on the wrong cell's button when it is expanded.</li></ul> | <ul><li>The bug predates the branch. It came from index-keyed cells, not from this change.</li><li>It reaches into a child's DOM to find the Actions button: a query, or a ref exposed through CellWrapper.</li><li>There's no real browser on this host to check it. That is already true for the E2E test.</li></ul> |

<details>
<summary>Why explicit focus rather than stable cell keys</summary>

Switching `:key="cellIndex"` to a stable id per cell is the "proper" fix for index keys. But Vue's keyed diff moves DOM nodes with `insertBefore`, and moving a focused element blurs it in Chromium. So stable keys alone would not keep focus. They also change how CellCode and CodeMirror instances are reused when cells move, which is a broader behavior change for a release branch. Explicit focus after `nextTick` is smaller and more predictable. Stable keys can be a separate `dev` cleanup.

Clone is already fine. Focus stays on the original cell's Actions button, which still exists. After a confirmed Delete, the confirm dialog returns focus to the Actions button of the cell being deleted. So the Delete case needs the `nextTick` focus too.
</details>

### Expansion B: remove the `.popper-close` delegation in `usePopper` (candidate b) — recommended

The issue suggested routing `usePopper`'s `.popper-close` delegation through `close()`. After this branch, the only `.popper-close` element in the repo is Popper's own header Close button, and its `@click="close"` already restores focus. Delete `doCloseElement` and the click listener that registers it. Keep the class name, which the styles and `Popper.test.js` selectors still use.

| Pros | Cons |
|---|---|
| <ul><li>Takes the issue's own suggestion, by removing the second close path instead of routing it.</li><li>No other close path in the client skips focus return, so the next consumer can't hit this bug.</li><li>About 8 lines, and the existing Popper tests already cover the Close button.</li></ul> | <ul><li>It's a cleanup, not a user-visible fix.</li><li>Any out-of-tree content that relies on adding `popper-close` would stop closing the popover. `git grep` finds none.</li></ul> |

<details>
<summary>Routing instead of removing</summary>

"Routing" would mean `usePopper` calls a focus-restoring close. But focus return lives in `Popper.vue`, which knows the reference element and how to find a tabbable target, so `usePopper` would need a callback. Nothing would use that callback, so removing the delegation is the simpler way to honor the suggestion.
</details>

### Expansion C: replace `ButtonPlain`'s `div role=button` with a native `<button>` (candidate c, wider form) — not recommended

The branch makes `ButtonPlain` behave like a native button: Enter is prevented, and Space activates on keyup. A wider version would render an actual `<button type="button">`. That gives native keyboard handling for free, and the keyup workaround goes away.

| Pros | Cons |
|---|---|
| <ul><li>Removes the hand-rolled key handling for good.</li><li>Better semantics for assistive technology.</li></ul> | <ul><li>Button styling, block layout and nested content in `CellOption` and `VisualizationPanel` would need CSS resets. That's a visual-regression risk on a release branch.</li><li>The branch's change is already narrow. `VisualizationPanel` is its only other consumer, its slot holds no inputs or links, and keyup activation matches native buttons. The new contract tests pin it.</li></ul> |

As implemented, the `ButtonPlain` change is in scope and justified. Without Enter's prevent, the trigger is re-activated. Without keyup activation, Firefox may click the newly focused trigger. Keep it.

### Contraction: drop the Space-on-keyup commit (candidate c, narrow form) — not recommended

Ship without `1886353dd23` and its tests, since the Firefox re-activation was never seen in a real browser.

| Pros | Cons |
|---|---|
| <ul><li>Smaller change to a shared component.</li></ul> | <ul><li>Risks the reopen bug in Firefox for Space selection.</li><li>The E2E test covers Space, and keyup activation is what native buttons do anyway.</li><li>Saves little: a few lines.</li></ul> |

### Retarget to `dev` (candidate d) — not recommended

The issue says the follow-up is "for `dev`". That was about not widening #24285, not about policy.

| Pros | Cons |
|---|---|
| <ul><li>Matches the issue's literal wording.</li><li>It would make stable cell keys, or a bigger ButtonPlain rework, easier to justify.</li></ul> | <ul><li>The bug is present in `release_26.2`, and the `close()` focus return this branch builds on first shipped there. So `release_26.2` is the oldest branch where the fix applies, as policy asks.</li><li>A small, contained a11y fix fits Galaxy's liberal release-branch policy.</li><li>The code merges forward cleanly. `dev` only adds `aria-expanded` to CellAdd's button.</li></ul> |

## Notes

- Before the PR goes up, the E2E test still has to run on a host with a working browser. If Expansion A is adopted, a Move Down step in that test would cover it.
- If John prefers Option 3, keep Expansion B in this branch either way. It's tiny, it's the issue's own suggestion, and it's in a file the fix already relies on.
