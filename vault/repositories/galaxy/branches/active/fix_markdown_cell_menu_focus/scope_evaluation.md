Run via Claude Opus at high effort.

# Scope evaluation (round 2, after re-scope): fix_markdown_cell_menu_focus

**Recommendation: keep the scope as implemented.** Don't expand or contract. Keep the `release_26.2` target. The re-scope already took the first evaluation's modest expansion: Move focus and the `.popper-close` removal. Of the remaining candidates, only Delete focus is the same user-visible bug, and it isn't local to this branch. The confirm dialog resolves its promise *before* its native `<dialog>` closes and restores focus. The cell is removed while the dialog is still modal, so everything outside it is inert, and a `nextTick` focus in `CellEditor` would be a no-op. Fixing Delete properly means changing when the shared `ConfirmDialog`/`GModal` resolves, or adding a timing hack in `CellEditor`. Neither can be checked here, because no browser launches on this host. That is a follow-up issue against the confirm dialog, not part of this branch. The other candidates (stable keys, `cellRefs` unification, a native `<button>`, retargeting to `dev`) are cleanups or riskier changes, not related bugs.

Reviewed at `e6e9f38d6a3` (`upstream/release_26.2...HEAD`, 16 commits, 15 files, +541/-34).

## Possible Decompositions

The branch is about 575 changed lines. About 100 are component code; the rest is unit tests, one E2E test and navigation selectors. Splits that could work, in landing order:

- **Option 1: two PRs.**
  1. *Baseline tests:* `f244884bee1`, `9e06d35bd9c`, and `56bf7cade76` with the Vue-only `data-description`/`data-cell-index` hooks split out of `0d1ebb49773` (see [baseline_refactor.md](baseline_refactor.md)). No behavior change, and it passes on the base.
  2. *Everything else:* the Popper `close()` routing, ButtonPlain, Move focus, removal of the `.popper-close` delegation, and the E2E test.
- **Option 2: three PRs.**
  1. Baselines, as in Option 1.
  2. *Menu focus return (#24335 proper):* `5e18f770488`, `1886353dd23`, `964555d3f3a`, `e83597521bd`, `e6e9f38d6a3`, the E2E test (`80fed24ff11` plus the E2E half of `0d1ebb49773`). This matches the `original_scope` alt plus the later ButtonPlain and CellAction hardening.
  3. *CellEditor Move focus and `usePopper` cleanup:* `006f64d6c37`, `0c6a362e9eb`, `f77c09c11f7`, `84b9730d401`, `76176832853`, the Move steps of `bcab00b9482`. It depends on 2: removing the delegation is only safe once CellAdd closes through `close()`.
- **Option 3: split ButtonPlain out.** Baselines, then the ButtonPlain native-button semantics (`1886353dd23`, `964555d3f3a`, `e83597521bd` and the Enter `.prevent` from `5e18f770488`), then the rest. ButtonPlain is shared with `VisualizationPanel`, so it could get its own review. But the menu fix needs it to stop Enter and Space from reopening the menu, so it would have to land first.

## Scopes considered

### As implemented — recommended

`Popper.vue` exposes `close()`. CellAction and CellAdd close through it from each option's `onSelect`, so focus returns to the trigger. `ButtonPlain` acts like a native button: Enter's default is prevented, and Space activates only on a keyup whose keydown it saw. After a Move, `CellEditor` focuses the moved cell's actions button. `usePopper`'s `.popper-close` delegation is gone.

| Pros | Cons |
|---|---|
| <ul><li>Covers the issue and its suggested fix. It also fixes two related bugs: CellAdd keyboard selection never closed the menu, and Move left focus on the wrong cell or on `<body>`.</li><li>Removes the second close path, so no Popper close skips focus return.</li><li>Each piece has red-to-green vitest coverage.</li><li>Two reviews, Codex and a thermo-nuclear review left nothing open.</li></ul> | <ul><li>Delete still loses focus when the next cell is collapsed or the deleted cell was last.</li><li>The E2E test has never run. A browser host is needed before the PR goes up.</li><li>Commit order needs a force-push to put the baselines first.</li></ul> |

### Expansion: focus after a confirmed Delete — not recommended here; file a follow-up

After a confirmed Delete, focus the cell that now holds the deleted index, or the previous cell, or the top Insert button if no cells are left.

| Pros | Cons |
|---|---|
| <ul><li>Same symptom as #24335, and reviewers will try it right after Move.</li><li>The focus target choice is simple, and every cell has an always-rendered toggle button to fall back on.</li></ul> | <ul><li>A local `nextTick` focus can't work, because the dialog is still modal when the cell goes (see details).</li><li>A real fix changes the shared `ConfirmDialog`, so every `confirm()` caller in Galaxy is affected. That's wider than this branch.</li><li>happy-dom doesn't model `<dialog>` inertness or focus restore, and no browser runs here. So nothing could verify it.</li></ul> |

<details>
<summary>Why Delete focus isn't a CellEditor-local change</summary>

The sequence, from reading `CellAction.vue`, `ConfirmDialog.vue`, `confirmDialog.ts` and `packages/ui/src/components/GModal.vue`:

1. `onSelect(onDeleteCell)` calls `confirm()`, which isn't awaited, then `popperRef.close()`, which returns focus to the cell's actions button. `GModal`'s `showModal()` then opens a native modal `<dialog>`, and the browser records that button as the element to return focus to.
2. On OK, `ConfirmDialog.handleResponse` **resolves the promise first**, then sets `show = false`. GModal's `show` watcher is `flush: "post"` plus `await nextTick()`, and only after that calls `dialog.close()`, which runs the browser's focus restore.
3. So CellAction's `await confirm()` continuation emits `delete`, and `CellEditor` re-renders while the dialog is still modal. Everything outside an open modal dialog is inert, so a `focus()` call there does nothing.
4. `dialog.close()` then restores focus to the recorded button. Because cells are keyed by index, that DOM node is reused for the next cell if that cell is expanded, so focus ends up on its actions button by accident, which is acceptable. If the next cell is collapsed, or the deleted cell was last, the node is unmounted and focus falls to `<body>`.

Fixes, roughly in order of preference:
- (a) Make `ConfirmDialog` resolve on GModal's `close` event, after the dialog is gone. Every confirm caller could then move focus. This is shared behavior, so it is follow-up material.
- (b) In `CellEditor`, wait for the dialog to close before focusing, with a `close`-event hook or a deferred task. That is fragile and depends on the dialog's timing.
- (c) Give the confirm dialog a "return focus to" option.

All of them need a real browser to verify. That supports the re-scope's choice to leave this out. Draft the follow-up through `GX_QUEUING_ISSUE_CREATION.md`, framed around `ConfirmDialog` resolve order rather than the Markdown editor.
</details>

### Stable cell keys in `CellEditor` instead of `focusCellActions` — not recommended

Key cells by a stable id rather than by `cellIndex`, so the DOM follows the cell and the explicit focus helper can go.

| Pros | Cons |
|---|---|
| <ul><li>Fixes the root cause of index-keyed focus and state drift.</li><li>It would also handle Delete reuse more predictably.</li></ul> | <ul><li>The cell model has no ids. `parseMarkdown` would need to make them, with clone and insert generating new ones.</li><li>Vue's keyed move uses `insertBefore`, which can blur the focused node. Explicit focus would still be needed, and nobody can check it here.</li><li>It changes how CellCode and CodeMirror instances are reused on reorder. That's a behavior change too big for a release branch.</li></ul> |

### Unify `cellRefs` and the `data-cell-index` lookup — not recommended

Move `scrollToCell` onto the same `[data-cell-index]` query as `focusCellActions`, then drop the `cellRefs` array.

| Pros | Cons |
|---|---|
| <ul><li>One way to find a cell. The query is sturdier than an array of `v-for` refs.</li><li>It's a few lines.</li></ul> | <ul><li>It's a cleanup, not a bug fix. With index keys, nodes never reorder, so `cellRefs` order is correct today.</li><li>It touches pre-existing scroll behavior that has no tests on this branch.</li><li>It's a good dev follow-up, but it doesn't belong in this fix.</li></ul> |

### `ButtonPlain` as a native `<button>` — not recommended

Render `<button type="button">` and drop the hand-rolled key handling.

| Pros | Cons |
|---|---|
| <ul><li>The browser handles keys natively, with no `spacePressed` bookkeeping.</li><li>Better semantics for assistive technology.</li></ul> | <ul><li>`CellOption` and `VisualizationPanel` would need CSS resets for button styling and block layout. That's a visual-regression risk with no browser to screenshot.</li><li>The current change already matches native behavior, including the Codex "press started here" case. Contract tests pin it.</li></ul> |

Contracting the other way, by dropping the Space-on-keyup work, is not recommended either. That work is what stops the newly focused trigger, or a different option (the Codex P2), from being activated.

### Retarget to `dev` — not recommended

| Pros | Cons |
|---|---|
| <ul><li>Matches the issue's literal "for `dev`".</li><li>Stable keys or a ConfirmDialog change would fit better there.</li></ul> | <ul><li>The issue said `dev` only to avoid widening #24285. The bug and the focus-restoring `close()` both first exist in `release_26.2`, so policy points there.</li><li>It's a small, contained a11y fix, and it merges forward cleanly.</li></ul> |

## Notes

- Nothing from the earlier reviews is left unresolved within scope. The leftover items (Delete focus, stable keys, `cellRefs` unification) are follow-ups.
- Before opening the PR, run `test_cell_editor_menus_return_focus_after_keyboard_selection` on a host with a working browser, and apply the baseline reorder from [baseline_refactor.md](baseline_refactor.md) once force-pushing is allowed.
