# Alt: baseline_first

**Status: superseded.** Out of date since the re-scope; do not reset the main branch to it. See the note at the end, and `../baseline_refactor.md` for the current reorder plan.

Branch: [`fix_markdown_cell_menu_focus_alt_baseline_first`](https://github.com/jmchilton/galaxy/tree/fix_markdown_cell_menu_focus_alt_baseline_first) (`ef9d03e036c`).

It has the same changes as the main branch at `80fed24ff11`, but the `ButtonPlain` baseline tests are folded into the leading "Baseline tests" commit (`7ccab3253b1`). Every baseline test therefore comes before the fix, as the workhorse process expects.

The main branch couldn't take this history, because rewriting already-pushed commits needs a force-push, and that wasn't permitted in this session. Instead, the main branch carries the `ButtonPlain` baseline tests as `9e06d35bd9c`, after the fix commits. Those tests pass on the base too, so a later rebase can move that commit first, or the main branch can be reset to this alt once force-pushing is allowed. The alt is only valid while the main branch has no further changes.

**Superseded by the re-scope.** The main branch has moved on (see [original_scope](original_scope.md)), so this alt no longer matches it. Resetting the main branch to this alt would drop the re-scope commits. To put the baseline commits first, rebase the main branch instead. Move `9e06d35bd9c` (ButtonPlain baseline), which passes on the base, right after `f244884bee1`. The CellEditor baseline `56bf7cade76` selects elements by the `data-description` and `data-cell-index` hooks that `0d1ebb49773` adds. To move it first, split those DOM hooks out of `0d1ebb49773` and move them along with it.
