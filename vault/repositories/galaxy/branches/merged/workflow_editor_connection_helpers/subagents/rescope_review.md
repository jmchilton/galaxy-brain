# Re-scope review: workflow_editor_connection_helpers

**Verdict: ready. No real bugs.** I added two commits on top of `9c3924200ce`:
- `d1b27a69f2c` types the remaining connection helpers' `source`/`sink` params as `EditorTerminalReference`. It also makes the `EditorNodeReference` comment say that order indices change on save.
- `a169fdb6397` extracts `_saved_steps_with_connections`. Before it, `test_refused_connection_and_removed_step` had an inline copy of the new test's API-connection mapping.

I didn't act on the nits and judgement calls below.

A red check shows the new test catches the wrong-node bug. I temporarily changed its two sinks to the shared label `"Concatenate datasets (for test workflows)#input1"`, which is the label-only path. The test then fails at the first `workflow_editor_assert_connected`, waiting on `#connection-node-2-input-input1-node-1-output-output`: input2's drag hit the first cat and replaced input1's connection. I reverted the edit.

## Not acted on

- **`#{id}` terminal selector escapes only `|`** (`workflow_editor_source_sink_terminal_elements`). This is pre-existing. Switching to `[id="..."]` would also cover spaces, as gxui's `_by_id` does. It is a small follow-up, outside the re-scope.
- **`isinstance(node_ref, int)` accepts `bool`.** Nobody would pass one. Not worth a guard.
- **`node.by_id` now duplicates the second entry of `node._`.** It still has callers: undo/redo and the clone test. Removing it would churn unrelated tests.
- **`workflow_editor_remove_node` param renamed `label` -> `node_ref`.** Every gxui call is positional (`galaxy_ui_driver_gxui` and `galaxy_ui_driver_editor_refs` `verbs.py`), so nothing breaks.
- **Why the server renumbers steps on save is not explained.** The type note and the test comment are enough for callers. The root cause is server behaviour outside this branch.
- **The tuple path of `try_connect` has no direct test.** It shares `workflow_editor_node_and_terminal` with `connect` and `destroy_connection`, which the new test covers.

<details>
<summary>Full review</summary>

### Scope
I reviewed `git diff 7febcc1d683..HEAD` (5 files, about +253/-133), weighting the three re-scope commits `f4d2c83107d`, `4c3fdf4cf7c` and `9c3924200ce`.

### List-selector resolution (`workflow_editor.node._`): no change for existing callers
- `SelectorTemplate.selector` tries the list entries in order. The first entry whose `string.Template.substitute` succeeds wins.
- `label=` callers still resolve through entry 1, unchanged. `id=` resolves through entry 2.
- No caller passes both kwargs. If one did, the label would win.
- A call with neither kwarg raises the same `KeyError` as before, now re-raised from the last entry.
- Children (`output_terminal`, `input_terminal`, `destroy`, `connector_destroy_callout`, ...) bind `_` to the resolved string through `SmartComponent.__getattr__`, so they follow automatically.
- `node.by_id` and its callers (undo/redo, clone) are untouched.
- No client JS/TS consumes `workflow_editor.node`.
- This follows the existing precedent `history_panel.content_item._`.

### Back-compat
- `"label#terminal"` strings parse exactly as before.
- `remove_node("label")` still works.
- `ensure_tool_form_open` now goes through `workflow_editor_node`. It builds the same selector as the old `by_id` branch.
- I grepped gxui (read-only): `galaxy_ui_driver_gxui` passes strings positionally, and `galaxy_ui_driver_editor_refs` already passes `(int, name)` tuples and `int` to `try_connect`, `destroy_connection` and `remove_node`. Both work.
- No stragglers use the old unprefixed `assert_*` names in `lib/` or `test/`.

### Renumbering on save
The test re-reads order indices from the API after each save and uses them as editor refs. That only works if the reloaded editor's `wf-node-step-${id}` matches the API's `steps[*].id`. The test checks this itself: if the ids diverged, the destroy would hit the other cat, and the next `assert_connected("input1#output", (input1_step, ...))` would fail, as would the post-save API assertion. The original comment "can reference nodes by order_index" didn't warn callers, so I added "changes on save" to the type alias, the place callers look first.

### New test
- **Catches the bug.** The red check above shows it fails under label-only resolution.
- **Readable.** The three save/assert phases are clear. The `next(...)` lookups are dense but fine.
- **Reuses existing pieces:** `open_in_workflow_editor`, `assert_workflow_has_changes_and_save` and `_download_current_workflow`.
- **The API helper duplicated an existing block.** The inline mapping in `test_refused_connection_and_removed_step` was the same code. Fixed in `a169fdb6397`, and the shared helper uses one int-keyed convention. Populators have no equivalent label-named connection map.

### Types
- `EditorTerminalReference = str | tuple[EditorNodeReference, str]` reuses the existing `EditorNodeReference`. That is the right choice: no new node-ref vocabulary.
- Before the fix, only `try_connect` and `node_and_terminal` were annotated. `connect`, `destroy_connection`, the asserts and the `source_sink_*` helpers were untyped, which left the tuple shape undiscoverable. Fixed in `d1b27a69f2c`.
- mypy shows no errors in the touched files.

### Style
- Imports are at module top. I added `Any` to the existing `typing` import.
- Comments and docstrings are one line.
- Running ruff 0.17 `format` reformats three unrelated asserts. Galaxy formats with black, so I reverted those hunks. black, ruff check and flake8 pass, and so do the pre-commit hooks.

### Tests run (one at a time, Galaxy 8095 / Vite 5195)
- Red check (temporary label-only sinks), Playwright: failed as expected.
- After the fixes, Playwright: `test_refused_connection_and_removed_step`, `test_connect_unlabelled_steps_by_order_index` and `test_reconnecting_nodes` all passed.
- After the fixes, Selenium: `test_connect_unlabelled_steps_by_order_index` and `test_refused_connection_and_removed_step` both passed.

</details>
