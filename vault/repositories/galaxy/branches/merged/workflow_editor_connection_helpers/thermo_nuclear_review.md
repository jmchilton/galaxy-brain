# Thermo-nuclear review: workflow_editor_connection_helpers (round 2)

Head `acbf1944883` (was `0655f80fa2d`), base `release_26.2` @ `7febcc1d683`. Done fresh after the re-scope. Round 1 is in `earlier_drafts/1/`.

**Verdict:** no structural regression, and nothing blocks. The helper layer is now the right shape. One node-ref model (`EditorNodeReference` / `EditorTerminalReference`) and one resolver (`workflow_editor_node`) are used by every editor helper, and the `node._` selector list reuses the existing `SelectorTemplate` fallback. What was left was reuse: existing tests still inlined the logic the new helpers own. I acted on that in one commit. Everything else is either a nit or a scope-excluded structural idea, recorded below.

## Acted on

- `acbf1944883` Use editor remove_node/destroy_connection helpers in input and parameter tests.
  - `test_data_input`, `test_collection_input` and `test_integer_input` each inlined `node.destroy.wait_for_and_click()` + `node.wait_for_absent()`. They now call `workflow_editor_remove_node("input1")`, as `b5c2a4506fd` already did for `test_editor_create_conditional_step`.
  - `test_non_data_connections` inlined the hover plus destroy-callout click. It now calls `workflow_editor_destroy_connection("tool_exec#inttest")`. The `tool_node` click (opens the inspector) and the `tool_input` local (used further down) stay.
  - Net -4 lines. No behavior change: both helpers resolve the same `node._(label=)` component and run the same waits.

## Not acted on

- **`test_existing_connections`'s inline destroy.** A screenshot sits between the hover and the click, so the helper doesn't fit.
- **`node.by_id` duplicates the second entry of `node._`.** Galaxy's own undo/redo test (15 calls) and clone test still use it, and `navigation.yml` is a shared contract. Deleting it would churn unrelated tests. gxui's `verbs.py` doesn't use it. Follow-up only.
- **Return type on `workflow_editor_source_sink_terminal_elements`.** I tried `-> tuple[WebElementProtocol, WebElementProtocol]`. mypy then flags `get_attribute("id").replace(...)` in `_terminal_ids` as `str | None`, so the fix would need asserts or a new id-escape helper. That's churn for a nit, so I reverted it. The `id` attribute is always set by `NodeInput`/`NodeOutput`.
- **`try_connect` resolves the sink ref twice**, once inside `_terminal_elements` and once for `sink_node`. It's a cheap string parse, and folding it would mean a second elements helper that also returns nodes. Nit.
- **`tooltip_by_id` on a missing `aria-describedby`** would wait on `#None` and time out instead of failing clearly. Every refusal in `terminals.ts` carries a reason, so the invariant holds. A one-line `assert tooltip_id` would be optional. Nit.
- **`connector_for` / `connector_invalid_for` still escape only `|`.** This is pre-existing in `navigation.yml`, and every connection assert uses it. The polish debrief recorded it as a follow-up. Unchanged.
- **The `next(step_id for ...)` lookups in `test_connect_unlabelled_steps_by_order_index`** are dense, but each is used once. Inverting the dict would only move the density around. Nit.
- **`workflow_editor_set_tool_vesrion` is misspelled.** It's pre-existing, not part of the diff, and gxui calls it. Renaming it would need a `_version` alias plus a gxui update. Follow-up only.
- **File size.** `navigates_galaxy.py` grew from 3394 to 3453 lines, and `test_workflow_editor.py` from 2261 to 2309. Both were far past 1k before the branch, so no threshold is crossed. The god-class concern stands (see the mixin below).
- **Scope-excluded structural ideas, recommendations only:**
  - a `NavigatesWorkflowEditor` mixin to split the about 200 lines of editor helpers out of `NavigatesGalaxy`, keeping names;
  - a backend-agnostic "rendered" wait to delete the `backend_type == "playwright"` branches (one in `workflow_editor_assert_connected`, about eight in the file);
  - rebuilding `workflow_editor_connect`'s screenshot path on `drag_over`, which would delete about 25 lines of backend-specific mouse code.
- **Round 1's declines, re-judged:**
  - the `assert_*` prefix: resolved by the re-scope (`f4d2c83107d`);
  - the untyped moved helpers: resolved (`d1b27a69f2c`);
  - the `str | None` return of `try_connect`: still the right contract, since gxui consumes it;
  - `can-accept` checked through `input_terminal`: still fine, since it's the same `:class` binding.

## Tests run (after `acbf1944883`, one at a time, Galaxy 8095 / Vite 5195)

- Playwright, all passed:
  - `test_refused_connection_and_removed_step` (35.5s)
  - `test_connect_unlabelled_steps_by_order_index` (79.7s)
  - `test_reconnecting_nodes` (19.3s)
  - `test_existing_connections` (15.2s)
  - `test_simple_mapping_connections` (17.3s)
  - `test_data_input` (39.4s), `test_collection_input` (41.4s), `test_integer_input` (39.4s) and `test_non_data_connections` (15.2s), the edited tests
- Selenium, all passed:
  - `test_refused_connection_and_removed_step` (45.4s)
  - `test_connect_unlabelled_steps_by_order_index` (89.7s)
  - `test_data_input` (49.5s)
  - `test_non_data_connections` (27.4s)
- `pytest test/unit/selenium/test_has_driver.py -k drag`: 12 passed.
- Lint: `uvx ruff@0.17.0 check` and `black --check` are clean, and the pre-commit hooks passed on the commit.

`galaxy_ui_driver` needs restacking onto `acbf1944883`.

BLOCKED: none.

<details>
<summary>Full review</summary>

**Scope:** `git diff 7febcc1d683..0655f80fa2d`, 5 files, +262/−144: `navigation.yml`, `has_playwright_driver.py`, `navigates_galaxy.py`, `test_workflow_editor.py` and `test_has_driver.py`.

### Structural / code judo

- **Node refs are modeled once.** `EditorNodeReference` (an existing alias) and `EditorTerminalReference` are the only ref vocabulary. `workflow_editor_node` is the only place that branches int vs label. I grepped `navigates_galaxy.py` for `isinstance(.*, int)`, `EditorNodeReference` and `node._(label=`. `ensure_tool_form_open`, `set_node_label`, `set_node_annotation` and `set_tool_vesrion` all reach it through `ensure_tool_form_open`. The remaining `node._(label=name)` at about line 1520 is a by-name wait in `workflow_editor_add_*`, not a ref.
- **The selector list is the right move.** `workflow_editor.node._` as `["[node-label='${label}']", "#wf-node-step-${id}"]` reuses the `SelectorTemplate` first-substitutable fallback (precedent: `history_panel.content_item._`). Every child target (`output_terminal`, `input_terminal`, `destroy`, `connector_destroy_callout`, `input_terminal_dragging`, ...) follows automatically. That deleted the per-helper int/label branches instead of centralizing them.
- **Element lookup goes through the component.** Since `0655f80fa2d`, `_terminal_elements` resolves terminals through `output_terminal`/`input_terminal` targets. `_terminal_ids` derives ids from those elements, rather than re-querying `#{id}`. `connect` and `try_connect` share it. That's one lookup path.
- **No dramatic simplification left inside scope.** The remaining big moves are the mixin, the backend-agnostic waits and `connect`-on-`drag_over`. All three are excluded by scope evaluation and recorded as recommendations.

### Spaghetti / branching

- `try_connect` is direct: wait for the drag to register, return `None` on `can-accept`, otherwise read the reason through `aria-describedby`. No flags. `screenshot_partial` mirrors `connect`.
- `workflow_editor_node` is a single conditional expression and the canonical int/label dispatch. It's not ad hoc.
- `has_playwright_driver.py` adds one `await setTimeout` in the driver layer, with a docstring that says why. It's in the right place.
- The backend branch in `workflow_editor_assert_connected` was moved, not added.

### Reuse / canonical layer

- Existing consumers already converted on the branch: `ensure_tool_form_open` (through `workflow_editor_node`), `assert_node_output_is` (through `node_and_terminal`) and `test_editor_create_conditional_step` (through `remove_node`).
- **Missed consumers:** three input tests inlined `remove_node`, and `test_non_data_connections` inlined `destroy_connection`. Fixed in `acbf1944883`.
- `_saved_steps_with_connections` / `_saved_tool_step_connections` are test-local. Populators have no step-connection map. The format2 export drops order indices for unlabelled steps. Right home.
- `tooltip_by_id` and `input_terminal_dragging` are in `navigation.yml`, next to their siblings.

### Boundaries / types

- The public signatures are typed with the ref aliases. The `try_connect` return of `str | None` is a clear contract.
- `_terminal_elements` has no return annotation. Adding one surfaces `get_attribute`'s `str | None` in `_terminal_ids`. It's not worth asserts here (see "Not acted on").
- `isinstance(node_ref, int)` also accepts `bool`. Nobody passes one. Ignored.

### File size

Both files were already far past 1k. The growth is modest: +59 lines in `navigates_galaxy.py` and +48 in `test_workflow_editor.py`, mostly the two new E2E tests. The mixin recommendation is the decomposition path.

### Tests

- Both new tests assert exact saved state: the whole connections dict, sorted lists, and `== [from_input1]`. No OR-checks.
- `assert len(shared_label.all()) == 2` guards the order-index test's precondition.
- The test challenge's tuple-ref `try_connect` swap (`ffca39be5a6`) covers the accept path with an id-resolved sink.

</details>
