Run via Claude Opus at high effort.

# Thermo-nuclear code quality review

I reviewed `upstream/release_26.2...e83597521bd` against `vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md`. The review found one structural issue, and I fixed it in `e6e9f38d6a3`. Everything else passed the approval bar for a release-branch fix. No finding was security-sensitive.

## Acted on

**The CellAction menu closed through container-level delegation (`e6e9f38d6a3`).** The `<nav>` had four listeners (`@click`, `@keydown.enter.prevent`, a no-op `@keydown.space.prevent`, and `@keyup.space`). Together they re-implemented `ButtonPlain`'s activation rules at the container. After the Codex P2 fix, `ButtonPlain` emits `click` exactly once per real activation, so the container layer was redundant. It was also slightly wrong: a Space press that started on one option and was released on another still closed the menu (the residual edge case noted in `codex_review.md`).

- Each option now runs `onSelect(action)`: the action runs first, then `popperRef.close()`. This is the same shape as CellAdd's `onSelect`, so both menus now close the same way. Container delegation could never work for CellAdd anyway, because its menu contains a search input.
- The action-then-close order is unchanged, so CellEditor's Move focus and Delete's confirm dialog see the same sequence as before.
- `popperRef` is now typed as `InstanceType<typeof Popper>` in CellAction and CellAdd. That means vue-tsc checks the new `close()` calls instead of letting them pass through `any`.
- **Tests:** the "Enter on the focused menu" test pinned the branch's own nav-level `.prevent`, so I replaced it with a red-to-green test. A Space press started on Clone and released on Delete now emits nothing and leaves the menu open. That test fails on `e83597521bd`.
- **Behavior change:** Enter, Space or a click on the menu container itself (not on an option), including its title, no longer closes the menu. Escape and clicking outside still do. Upstream closed the menu on a click anywhere in the nav, but I judged that incidental.

## Not acted on

- **CellEditor finds cells two ways.** `scrollToCell` uses the `cellRefs` array, while `focusCellActions` uses `[data-cell-index] .cell-actions-button`. The query is the sturdier of the two, because Vue 3 doesn't guarantee the order of a v-for ref array. Moving `scrollToCell` onto the query would touch code that predates the branch, which is out of proportion for a release fix. It's a reasonable follow-up on dev.
- **Stable cell keys instead of explicit focus after Move.** Keying cells by a stable id would make focus follow the moved cell without extra code. But the cell model has no ids, and browsers may blur a focused node when Vue reorders it. Nothing can confirm that here, because no browser launches on this host. `focusCellActions` stays: it is short and explicit.
- **The `spacePressed` ref in `ButtonPlain`.** A plain `let` would work, but the template's `@blur` writes to it, so the ref is the idiomatic choice. Left as is.
- **File sizes.** Every touched file is well under 1k lines; the largest is `test_pages.py` at 293. The `usePopper` deletion is a net simplification.

## Checks

- **vitest:** `src/components/Markdown/`, `Popper/`, `Common/ButtonPlain.test.js` and `Visualizations/` pass: 32 files, 226 tests.
- **Lint:** prettier and eslint are clean on the touched files.
- **Types:** `vue-tsc --noEmit` passes. It needed `NODE_OPTIONS=--max-old-space-size=8192`, because the default heap ran out of memory.
- **Not run:** the E2E (`test_cell_editor_menus_return_focus_after_keyboard_selection`), because no browser launches on this host. Its selectors and its option-level Enter/Space flow are unaffected by this change.
