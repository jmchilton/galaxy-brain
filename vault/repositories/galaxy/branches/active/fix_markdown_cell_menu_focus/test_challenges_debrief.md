Run via Claude Opus at high effort.

# Test challenges (round 2, after re-scope): fix_markdown_cell_menu_focus

Process: `vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md`. Round 1 is in [earlier_drafts/1/test_challenges_debrief.md](earlier_drafts/1/test_challenges_debrief.md). Its conclusions for the CellAction, CellAdd, ButtonPlain and Popper tests still hold, and that code has not changed since, so this round focuses on what changed after `0d1ebb49773`: the new `CellEditor.test.js`, CellEditor's Move focus and the `usePopper` `.popper-close` removal.

## Outcome

Nothing was dropped. I made one fix to the new unit tests and added Move coverage to the E2E test:

| SHA | Commit |
|---|---|
| `84b9730d401` | Address CellEditor Move focus tests through data-description hooks |
| `bcab00b9482` | E2E: check keyboard Move keeps focus with the moved Markdown cell |

## Changes

1. **The CellEditor focus tests now fail at their own assertion without the fix.** They found the actions button by `.cell-actions-button`, a class that the fix commit `006f64d6c37` adds. Against pre-fix source they would fail at `get()`, not at the focus check. They also tied the test to the selector the implementation uses internally. They now use the existing `[data-description="markdown cell actions button"]` hook, the same one `chooseAction` already used. Checked by putting `56bf7cade76`'s `CellEditor.vue`/`CellAction.vue` back temporarily:
   - The baseline Move Down test passed.
   - All three focus tests failed at `expect(document.activeElement).toBe(...)`. Two of them saw `<body>` (collapsed neighbour, Move Up); the expanded-neighbour test saw the button at the old position.
2. **The E2E test now covers Move**; details in [polish_e2e_tests_debrief.md](polish_e2e_tests_debrief.md). In a real browser, focus moves programmatically one `nextTick` after the menu's own `close()` focus return, and that can interact with the key's default action and keyup. jsdom can't model either.

## Challenges to the new tests (kept)

- **`swaps cells and emits the reordered markdown on Move Down` (baseline):** pins the existing behavior through the DOM. It passes on pre-fix source. Kept.
- **Three focus tests (collapsed neighbour, expanded neighbour, Move Up):** they drive the real menu by keyboard and assert `document.activeElement`. No layout is faked, and nothing is mocked beyond stubbing `CellAdd`, `CellCode` and `SectionWrapper` for speed. Each covers a different way the old behavior failed: focus went to `<body>` when the old-position button was unmounted, or to the wrong cell's button when it wasn't.
- **Overlap with E2E:** the E2E test now covers the expanded-neighbour Move Down and the Move Up cases too. I kept the unit tests anyway. They are deterministic, take under a second, and are the only Move-focus checks that have actually run (the E2E test can't run on this host). The collapsed-neighbour case is unit-only.
- **Mocks / restructure:** the stubs are plain `true` component stubs. `focusCellActions` is already a small helper. No refactor would remove anything from the test.
- **`usePopper` `.popper-close` delegation removal:** no test change is needed. Popper's own Close button calls `close()` directly, and the existing `Popper.test.js` cases already cover it: close button, Escape, and focus return. No other `.popper-close` remains in `client/src`. A test that the delegation is absent would only test the implementation.
- **Delete focus:** still out of scope (see [implementation_rescope_debrief.md](implementation_rescope_debrief.md)). No test was added.

## Verification

- vitest, `src/components/Markdown/ src/components/Popper/ src/components/Common/ButtonPlain.test.js` under node 22.20.0: 23 files and 169 tests passed.
- Prettier and eslint are clean on `CellEditor.test.js`. ruff 0.17.0 (check and format), black and isort are clean on `test_pages.py`.
- **mypy was not run.** The throwaway scratchpad venv has no Galaxy deps, so the `pydantic.mypy` plugin fails to import. The change adds two typed optional parameters and nothing else that mypy would check.
- **The E2E test has not been run.** Browsers cannot launch on this host.
