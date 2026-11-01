# Normal review 2 (after re-scope)

This review covered the scope expansion, `0d1ebb49773..0c6a362e9eb`. Nothing blocked, and there were no security findings. I made all three suggested changes in `f77c09c11f7`:

- The CellEditor tests now stub `CellAdd`. Each test took about 2 s, and one hit vitest's 5 s timeout during a parallel run. They now take 0.4 to 0.8 s.
- `focusCellActions` focuses with `preventScroll`, so the focus call doesn't interrupt `scrollToCell`'s smooth scroll.
- There is now a Move Up test.

Not acted on:

- **Baseline commit `56bf7cade76` still has the slow version of the test.** Fixing it there would mean rewriting pushed history.
- **Focus also moves when Move is picked with the mouse.** Programmatic focus after a pointer interaction doesn't show `:focus-visible`, so I left it.
- **Delete focus is still out of scope.** The reviewer agreed: the confirm dialog's (GModal) focus-return timing would need its own handling.

<details>
<summary>Full review</summary>

- **Medium:** CellEditor tests are slow (about 2 s each) and timed out under parallel load. Stub `CellAdd`, then re-measure.
- **Low:** `focus()` may cut short the smooth `scrollIntoView` that runs just before it. Use `preventScroll: true`.
- **Nit:** Move Up has no test.
- **Nit:** focus also moves after a mouse selection. Fine to leave, and mention it in the debrief.
- **Checked and fine:**
  - Event and `nextTick` ordering against CellAction's `close()` focus return, for both keyboard and mouse.
  - Index-keyed `toggle` travelling with the swapped cell.
  - The `[data-cell-index] .cell-actions-button` query, scoped to `editorRef`. It's sturdier than `cellRefs[i]`, because Vue 3 doesn't guarantee ref-array order.
  - Removing `doCloseElement` breaks nothing. The only remaining `.popper-close` is Popper's own header button, which calls `close()`.
  - Commit hygiene.

</details>
