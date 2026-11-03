Run via claude-opus-5-5 at high effort.

# Polish E2E tests debrief: invocation_graph_embedded_workflow_outputs

`test_embed_workflow_outputs` now waits for each card's table or collection before counting its rows. It checks the toggle's pressed state, shares its setup with stage 1's hover test, and reads on-screen boxes through a named `ClientRect` instead of indexing JS arrays. All of this was folded into the last E2E commit, which goes from `ee28a92edd9` to `62299d13c17`. No other commit changed.

## Changes

- **Waits before counting (flake fix).** Before, the test called `table_row.all()` and `collection_element_name.all()` straight after the cards' loading message went away. Nothing guaranteed the table or collection had rendered by then. Each card is now addressed once (`top_rows`, `summary`, `lines`) and waits with `table.wait_for_present()` or `collection_element_name.wait_for_present()` before counting. This waits for presence, not visibility, because the cards clip long tables: the `summary` card shows two of its eight rows, so a visibility wait could fail under Selenium's clipping-aware visibility check. This follows stage 1's hover test, which waits on `output.table` first.
- **navigation.yml.** Added `table` to `invocations.graph_embedded_output`, mirroring `graph_step_output.table`. No other selector changed.
- **Toggle state.** The test asserts the toggle's `aria-pressed` (rendered by GButton's `pressed` prop) is `false`, then `true` once embedded, then `false` again after toggling off. The toggle is now held in a local `toggle` variable, so the test no longer repeats `invocations.graph_embed_outputs_toggle`.
- **Shared setup.** Both `test_hover_previews_step_outputs` (stage 1) and `test_embed_workflow_outputs` opened the output-kinds invocation, moved the pointer off the activity tooltip and blurred focus, but only the hover test had the comments. That sequence is now `_open_output_kinds_invocation()`, keeping stage 1's comments. The blur, used three times, is now `_drop_focus()`, and the second use has a comment explaining it keeps the toggle's tooltip and focus ring out of the screenshot. The hover test's behavior is unchanged.
- **Readable geometry.** `_assert_cards_beside_their_steps` used one JS snippet returning `[left, top, right, bottom]` and then indexed it (`step[2] < card[0] < step[2] + 30`). It now uses a `_client_rect()` helper that returns a `ClientRect` NamedTuple with a `clear_of()` overlap check. The bare `30` and `2` are now named constants, each with a comment: `MAX_CARD_GAP` (the layout's 20-pixel card gap, measured at zoom of at most 1) and `EDGE_TOLERANCE` (subpixel rounding). The checks themselves didn't change. The mutations run in the test-challenge pass still apply.
- **Naming.** The `card` variable was used for both a WebElement and a component. Now the component is `embedded_output` and the list comprehension uses `labels`.

## Checked and left alone

- **Sleeps.** The embed test has none. The refit wait is a `_wait_on` on a change in the node area's CSS transform. `fitWorkflow` sets zoom and pan synchronously, with no CSS transition on `.node-area`, so the first changed transform is the final one. I considered adding a "fit pending" DOM attribute, but decided against it: it would expose test-only state, and the transform check is already exact.
- **Test-challenge decisions kept.** The connector, pointer and focus checks (`_assert_embedded_outputs_static`, `_assert_cards_beside_their_steps` with `retry_assertion_during_transitions`) are unchanged in substance, and so is the CSS-property `_node_positions`. The `elementFromPoint` JS in `_assert_embedded_outputs_static` stays inline. Moving it onto `_client_rect` would cost a second round trip and wouldn't make it clearer.
- **Raw selectors left in navigation.yml.** `graph_node_area: '.invocation-graph .node-area'` uses the shared WorkflowGraph's stable class, and decorating the editor's node area for one test isn't worth touching the editor. The `table.g-table`, `pre` and `img` children are scoped to a single card, the same choice stage 1 made.
- **Screenshots.** Both screenshots (before embedding, and embedded after the refit) are kept. The embedded screenshot shows all six cards beside their steps, the image drawn, collection elements 1 and 2, and the toggle pressed.
- **Client refactoring and DOM decoration.** None needed. Cards, connectors and the toggle already carry `data-description` and `data-output-label` hooks.
- **Shared abstractions across files.** The new helpers are used only in this file, so they stay file-local rather than going into `NavigatesGalaxy`.

## Verification

- `test_embed_workflow_outputs` alone (Playwright backend, the worktree's running servers) passed in 82s before the fixup was committed. I checked the embedded screenshot.
- After the autosquash, the whole file `lib/galaxy_test/selenium/test_workflow_invocation_graph.py` passed: 9 of 9 in 477s, including all of stage 1's tests and the refactored `test_hover_previews_step_outputs`.
- black, ruff and isort are clean on the Selenium file. mypy reports no new kind of error: the file's existing unannotated test methods already trip `no-untyped-def` under the strict run, and the new helpers are annotated.
- The worktree is clean. Nothing was pushed.
