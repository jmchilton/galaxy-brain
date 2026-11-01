# Implementation debrief

```
created /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/fix_markdown_cell_menu_focus/differential-review/snapshots/20261101T153232Z-hardening-e6e9f38d6a34.json
  hardening @ e6e9f38d6a34 vs origin/release_26.2 (merge-base 0fa4dc4c4fa3)
  since 20261101T142756Z-implementation-1886353dd239:
    commits: 3 same, 0 rebased, 0 changed, 13 new, 0 dropped
```

**STATUS: BLOCKED, by the environment only.** The code is complete and hardened. The E2E test and screenshots can't run on this host: the Playwright browsers are missing `libatk`/`libgtk` and none of them launch. The fix itself is not blocked. Once the E2E test and screenshots pass on a host with a working browser, this is READY.

The branch is pushed at `e6e9f38d6a3` and targets `release_26.2`. It fixes [#24335](https://github.com/galaxyproject/galaxy/issues/24335).

## Final implementation

- **Menu selection returns focus.** `Popper.vue` exposes `close()`. In both the CellAction and CellAdd menus, each option runs its action and then calls `popperRef.close()`, which returns focus to the button that opened the menu. CellAdd previously closed only on mouse clicks, through the `.popper-close` class. Keyboard selection left it open.
- **`ButtonPlain` behaves like a native button.**
  - Enter's default is prevented.
  - Space activates on keyup, and only if the Space keydown happened on that element. A blur cancels the pending press.
  - Without this, moving focus during the key press would let the browser activate the trigger and reopen the menu. Activating on keyup alone would also have let Space pressed on one option and released on another activate the second one, which Codex found.
- **Move keeps focus with the cell.** This came from the re-scope. `CellEditor` keys cells by index, so after a Move it now focuses the moved cell's actions button (with `preventScroll`).
- **`usePopper`'s `.popper-close` click delegation is removed.** This also came from the re-scope. Popper's own Close button already calls `close()`.
- **Tests.**
  - vitest: CellAction, CellAdd, CellEditor and ButtonPlain. That's 226 tests passing across the Markdown, Popper, ButtonPlain and Visualizations suites, with red-to-green checks.
  - E2E: `TestPages.test_cell_editor_menus_return_focus_after_keyboard_selection` covers Clone and Insert with Enter and Space, plus Move Down and Move Up, and takes two screenshots. The `data-description` hooks it needs are added. It has never been run.

## Choices

- **Base `release_26.2`, not the issue's `dev`.** The focus-returning `close()` only exists from 26.2, and the fix is small. Both scope evaluations agreed.
- **Scope.** The first evaluation recommended expanding, and that was done. The original scope is kept in [alts/original_scope.md](alts/original_scope.md). The [second evaluation](scope_evaluation.md) keeps the scope as it now is.
- **Delete focus is not fixed here.** It depends on the shared `ConfirmDialog` resolving before its `<dialog>` closes. That should be a separate issue about `ConfirmDialog`, filed through GX_QUEUING_ISSUE_CREATION.
- **Commit order.** Force-pushing wasn't permitted. The ButtonPlain and CellEditor baseline commits therefore sit after the fix commits. [baseline_refactor.md](baseline_refactor.md) gives a reorder that was replayed and checked; doing it needs a force-push. The [baseline_first alt](alts/baseline_first.md) is superseded.

## Checks

- Prettier and eslint are clean.
- `vue-tsc --noEmit` is clean, run with an 8 GB node heap.
- `test_pages.py` is clean under black 26.10, isort 9.0.2 and ruff 0.17.0. These came from a scratch venv because the worktree has no `.venv`.
- mypy wasn't run: no venv has Galaxy's dependencies installed.
- Screenshots are blocked; see [screenshot_debrief.md](screenshot_debrief.md).

## Debriefs

- [initial](initial_implementation_debrief.md)
- [re-scope](implementation_rescope_debrief.md)
- [test challenges](test_challenges_debrief.md)
- [E2E polish](polish_e2e_tests_debrief.md)
- [Codex](codex_review.md)
- [thermo-nuclear](thermo_nuclear_review.md)
- [baseline refactor](baseline_refactor.md)
- [scope](scope_evaluation.md)
- [screenshots](screenshot_debrief.md)
- [reviews](subagents/)
- First-round hardening debriefs are in [earlier_drafts/1](earlier_drafts/1/).
