Run via Claude Opus at high effort.

# Test challenges: fix_markdown_cell_menu_focus

Process: `vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md`, checked against `doc/source/dev/writing_tests.md` and `client/README.md#client-side-unit-testing`.

## Outcome

Nothing was dropped or rewritten. I added two things: direct `ButtonPlain` contract tests and one E2E test. The branch's existing vitest tests hold up under each challenge.

Commits on top of `upstream/release_26.2`:

| SHA | Commit |
|---|---|
| `7ccab3253b1` | Baseline tests for Markdown editor cell menu selection. Now also pins `ButtonPlain` click, full Enter and Space activation, and Space scroll prevention; reworded to say so. |
| `946d22e2ca6` | Return focus to the trigger after Markdown cell menu selection (unchanged, rebased) |
| `b1895d92018` | Activate ButtonPlain on Space keyup, like a native button (unchanged, rebased) |
| `28636178660` | Test ButtonPlain's native-button keyboard activation directly |
| `ef9d03e036c` | E2E test for keyboard selection in Markdown cell editor menus |

The baseline commit was rewritten by a fixup, so the branch needs a force-push.

**Coordinator note:** force-pushing wasn't permitted. The rewritten history above is kept as the alt [`fix_markdown_cell_menu_focus_alt_baseline_first`](../../alts/baseline_first.md). The working branch is a fast-forward of the pushed `1886353dd23`, with the same final tree:

- `9e06d35bd9c`: Baseline tests for ButtonPlain keyboard activation. This is the ButtonPlain part of the fixup, now its own commit.
- `964555d3f3a`: Test ButtonPlain's native-button keyboard activation directly.
- `80fed24ff11`: E2E test for keyboard selection in Markdown cell editor menus.

## Changes

1. **New `client/src/components/Common/ButtonPlain.test.js`.** `ButtonPlain` is shared by `CellOption` and `VisualizationPanel`, and the branch changes how it handles keys: Enter's default is now prevented, and Space activates on keyup instead of keydown. Until now that was tested only indirectly, through CellAction's menu. Baseline cases went into the baseline commit and pass on the base. The two new cases are in a later commit and fail on the base, each at its own assertion:
   - Enter keydown `defaultPrevented`
   - Space keydown alone does not activate; keyup does

   The tests listen through an `onClick` attr, the way consumers do. VTU's `emitted("click")` also records the native click that bubbles from the root, so it counted 2 for one click.
2. **New E2E `TestPages.test_cell_editor_menus_return_focus_after_keyboard_selection`** in `lib/galaxy_test/selenium/test_pages.py`, plus a new `markdown_cell_editor` component in `navigation.yml`. The test:
   - Opens a page in the unified editor and switches to the cell editor.
   - For each of Enter and Space, picks Clone from the cell actions menu and the first insert-cell option, focusing the option and pressing the key.
   - Asserts the menu closes, stays closed after a `UX_RENDER` wait, and that `document.activeElement` has the trigger's `data-title` ("Actions" or "Insert").

   This is the one behavior jsdom cannot model. Commit 3 exists because a real browser can activate the newly focused trigger on the key's default action or keyup and reopen the menu. Without the fix, CellAction leaves focus on `<body>` (fails the `data-title` assertion) and CellAdd's menu stays open (fails the hidden wait).

## Challenges to existing tests (kept)

- **Implementation-only or silly:** none. Every test drives the component through the DOM (click, keydown, keyup) and asserts things a user can observe: emitted events, menu visibility, `document.activeElement`, `defaultPrevented`.
- **Faked layout:** none. The tests check focus and visibility. Neither depends on layout in jsdom.
- **Covered elsewhere or better at another layer:** focus return and default prevention are cheap and deterministic in vitest. The E2E test adds only the real-browser re-activation check, so the unit tests stay.
- **Overlap:** CellAction's "emits and closes ... Enter or Space" overlaps the focus-return test on emission and closing. It is the only test that checks the nav closes on Space keyup and not on keydown, so I kept it. In CellAdd, the baseline click-closes test is a subset of "returns focus ... focused option is clicked". I kept it so the baseline commit can still be split into its own PR.
- **Mocks:** CellAction mocks only `useConfirmDialog`, needed for the delete confirmation. CellAdd uses the shared msw `server` helper. Neither has a simpler replacement.
- **Refactoring for testability:** not needed. The fix routes both menus through Popper's existing `close()`, which is already the seam.

## Verification

- Baseline commit tests on base source: 42/42 pass, run with the commit's test files over `upstream/release_26.2` component sources.
- Branch tests on base source: 8 fail. All are non-baseline focus, close or keyboard tests, and each fails at its own assertion.
- Requested vitest suites at HEAD (`Markdown/Editor`, `Popper`, `Visualizations`, `ButtonPlain`): 18 files, 127 tests pass.
- Prettier and eslint are clean on the touched JS and YAML. ruff, black and isort are clean on `test_pages.py`. mypy shows only the "missing a return" errors that every `@selenium_test` method in the file already gets. The worktree has no `.venv`, so I ran the Python checks with the `issue_24376_library_download_test_26_2` venv (same 26.2 pins). The new `navigation.yml` selectors load and render through `load_root_component()`.
- **The E2E test has not been run.** Chromium and Firefox can't launch on this host. The selectors were built by reading the templates; none were seen in a real DOM:
  - BootstrapVue radio `label.btn` wrapping `input[value="editor"]`
  - GButton's `data-title`
  - `.cell-option` falling through to ButtonPlain's root
  - first-match DOM order for the top "Insert" CellAdd and the first cell's actions menu

  The test should be run once on a host with a working browser before the PR goes up.
