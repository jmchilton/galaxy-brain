# Thermo-nuclear review: workflow_editor_connection_helpers

Head `706392e089a` (was `821f85ba717`), base `release_26.2` @ `7febcc1d683`.

**Verdict:** no structural regression, and nothing blocks. The one real smell was copy-paste. The `label#terminal` parse plus node lookup appeared six times, and the source/sink element lookup twice. I fixed both in two new cleanup commits, kept separate from the pure-move commit `2514981f5dc`. I did not act on any of the bigger structural ideas. They are all outside the diff, or they would change names or behavior that `galaxy_ui_driver` depends on, so they are recorded below as recommendations.

## Acted on

- `e0e1b1d5263` adds `workflow_editor_node_and_terminal(ref) -> tuple[SmartComponent, str]`. It replaces the repeated `split("#", 1)` + `editor.node._(label=...)` in:
  - `workflow_editor_try_connect`
  - `workflow_editor_source_sink_terminal_ids`
  - `workflow_editor_destroy_connection`
  - `assert_input_mapped` / `assert_input_not_mapped`
  - an existing consumer, `TestWorkflowEditor.assert_node_output_is`, which used `split("#")`

  It is public, so gxui can reuse it.
- `706392e089a` adds `workflow_editor_source_sink_terminal_elements(source, sink)`. `workflow_editor_connect` and `workflow_editor_try_connect` now share it in place of three identical lines each.

Neither commit changes any downstream name or call shape.

## Not acted on

- **`NavigatesGalaxy` is a 3.4k-line god class.** The branch adds about 65 lines to a file that was already far past 1k, so it crosses no threshold. Recommendation: move the workflow-editor helpers into a dedicated mixin, such as `NavigatesWorkflowEditor` mixed into `NavigatesGalaxy`. The names would be kept, so gxui keeps working. That is a repo-wide follow-up, too big for this branch.
- **The `assert_connected` family has generic names on a shared class.** The moved helpers have no `workflow_editor_` prefix, unlike the rest of the editor helpers. Recommendation only, since gxui calls these names: add `workflow_editor_assert_*` names later, or move them with the mixin above. Not renamed.
- **The backend branch in `assert_connected`** (SVG `<g>` present vs visible). This is moved code. The same `backend_type == "playwright"` pattern appears about eight times in `navigates_galaxy.py`. The code-judo move is a SmartTarget-level "wait until rendered" that handles SVG per backend, which would delete those branches. That is outside the diff.
- **The screenshot path in `workflow_editor_connect`** is about 25 lines of backend-specific mouse code. `drag_over` already holds a drag on both backends, which is how `try_connect` takes its screenshot. Rebuilding `connect`'s screenshot on `drag_over` would delete that branch. Not done, for two reasons:
  - the code predates the branch;
  - it would change what existing screenshots capture (mid-drag near the source, versus over the sink) and the event path (real mouse versus synthetic HTML5 drag).
- **`tooltip_by_id: '#${id}'`** is a thin generic selector. It is kept, because `navigation.yml` is where selectors belong. If `aria-describedby` were ever missing, the wait would target `#None` and time out instead of failing clearly. That relies on the invariant that every refusal in `terminals.ts` has a reason. Nit.
- **`try_connect` checks `can-accept` through `input_terminal` and not the `dragged_over` element.** Both classes come from the same `:class` binding, and this matches the `SmartTarget.has_class` convention. Kept.
- **The `str | None` return of `try_connect`.** gxui consumes it, and it is a clear contract. A result type would add nothing.
- **The inline comprehension that builds the connections dict in the test** is used once, so it has no helper. Fine.
- **The moved helpers are untyped.** The move was pure, and the cleanup commits didn't add types beyond the new helper. Nit.
- **The `821f85ba717` fixup** still needs folding into `4a3cd20b676` at the next rewrite. The two new commits can sit after `2514981f5dc`'s follow-ups, or squash into one "dedupe" commit.

## Tests run (after both commits)

- Playwright:
  - `test_refused_connection_and_removed_step` (37.6s)
  - `test_reconnecting_nodes` (19.2s)
  - `test_existing_connections` (15.3s)
  - `test_map_over_output_indicator` (17.2s), which covers `assert_node_output_is`
  - `test_simple_mapping_connections` (17.2s), which covers `assert_input_mapped`
- Selenium: `test_refused_connection_and_removed_step` (59.4s), passed.
- `pytest test/unit/selenium/test_has_driver.py -k drag`: 12 passed.
- Lint: `.venv` has no ruff. I used `uvx ruff@0.17.0`, the version pinned in `lib/galaxy/dependencies/pinned-lint-requirements.txt`. `check` is clean. `format --check` flags only hunks that were already there, none in the edited code, and none were reformatted. Pre-commit hooks passed on both commits.

`galaxy_ui_driver` needs restacking onto `706392e089a`.

Nothing BLOCKED.

<details>
<summary>Full review</summary>

**Scope:** `git diff 7febcc1d683..821f85ba717`, +119/−49 across `navigation.yml`, `has_playwright_driver.py`, `navigates_galaxy.py`, `test_workflow_editor.py` and `test_has_driver.py`.

### Structural / code judo

1. **Copy-paste parsing of `label#terminal`.** Fixed. Six sites each split the ref and looked up `workflow_editor.node._(label=...)`. This was the missing model: a terminal ref is a (node component, terminal name) pair. One helper now owns that.
2. **The source/sink element lookup was duplicated** between `connect` and `try_connect`. Fixed.
3. **Bigger code-judo moves that are out of scope:**
   - a workflow-editor mixin that splits the editor helpers out of `NavigatesGalaxy`;
   - a backend-neutral "rendered" wait that deletes the `backend_type` branches;
   - rebuilding `workflow_editor_connect`'s screenshot on `drag_over`.

   All three are recommended above.

### Spaghetti / branching

- `try_connect` has one early return: either it accepts, or it reads the reason. That is direct and has no flags. The `screenshot_partial` kwarg mirrors `workflow_editor_connect`. Fine.
- The `has_playwright_driver.py` fix is a single `await setTimeout` with a docstring explaining the timing. It is minimal and in the right layer, the driver and not the editor helper.
- The moved `assert_connected` keeps its backend branch. It is pre-existing and a pure move.

### Boundaries / types

- `try_connect` reads the tooltip through `aria-describedby` and a `navigation.yml` target, not page-wide `.tooltip-inner`. That is the right boundary for long-lived gxui sessions.
- `input_terminal_dragging` sits next to `input_mapping_icon` and follows its pattern. Good reuse of the selector layer.
- The `#None` failure mode when there is no tooltip is noted as a nit.

### File size

- `navigates_galaxy.py` grew from about 3.39k to 3.46k lines, and `test_workflow_editor.py` net shrinks after the move. No threshold is crossed, but the god-class concern above applies.

### Tests

- The new E2E test uses only helpers plus the populator download. Its assertions are exact: the refusal string and the whole saved-connections dict. No OR-checks.
- The docstring fix in `test_has_driver.py` is accurate.

</details>
