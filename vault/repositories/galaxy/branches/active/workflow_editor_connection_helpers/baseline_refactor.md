The branch now opens with three refactor-only commits on `release_26.2`: the pure move, then the `workflow_editor_node_and_terminal` dedup, then `workflow_editor_source_sink_terminal_elements`. Both dedups are applied only to base and moved code. Next comes the Playwright drag fix with its docstring fix folded in, then the feature. The final tree is identical to the pre-rewrite head `706392e089a`, which is kept as `workflow_editor_connection_helpers_pre_rewrite_20261021`.

## Commits (base `7febcc1d683`, oldest first)

1. `2514981f5dc` Move workflow editor connection helpers from TestWorkflowEditor to NavigatesGalaxy. Unchanged from the original commit, SHA included.
2. `4b4be9b0b7b` Add workflow_editor_node_and_terminal for label#terminal refs.
   - Adds the helper. Uses it in the base `workflow_editor_source_sink_terminal_ids` and `TestWorkflowEditor.assert_node_output_is`, and in the moved `workflow_editor_destroy_connection`, `assert_input_mapped` and `assert_input_not_mapped`.
   - Small behavior change: `assert_node_output_is` used `split("#")` and now splits with `split("#", 1)`. No caller passes a second `#`.
3. `b19f0095a17` Add workflow_editor_source_sink_terminal_elements.
   - Extracts `workflow_editor_connect`'s three-line element lookup.
   - Only `workflow_editor_connect` calls it at this point. `try_connect` becomes the second caller in commit 5.
4. `f699b080a32` Fire a synthetic Playwright drag's dragenter a task after dragstart. This is the original `30ddfe4efb2` with `10132ffe21f` folded in. That commit fixed the rerender drag unit test's docstring, which the yield made untrue.
5. `28380b8083e` Test a refused connection and a removed step in the workflow editor.
   - Folds together `8380a8c1026`, `4a3cd20b676` and its revert fixup `821f85ba717`, plus the feature-side parts of `e0e1b1d5263` and `706392e089a`.
   - Adds `workflow_editor_try_connect`, `workflow_editor_remove_node`, the navigation.yml targets (`node.input_terminal_dragging`, `_.tooltip_by_id`) and the refusal screenshot, plus the new test.
   - `try_connect` uses both dedup helpers from the start. The unrelated lambda reformat is gone entirely.
6. `b5c2a4506fd` Use workflow_editor_remove_node in test_editor_create_conditional_step. Same as the original `da651406ddd`, now sitting after the helper it uses.

## Checks

- `git diff 706392e089a HEAD` is empty.
- On every commit: `ruff check` on the changed Python files (`uvx ruff@0.17.0`), the repo pre-commit hooks (black, ruff, flake8, prettier), and `import galaxy.selenium.navigates_galaxy` plus `galaxy_test.selenium.test_workflow_editor`. All pass.
- `pytest test/unit/selenium/test_has_driver.py -k drag`: 12 passed on the final head.
- E2E was not rerun because the tree is unchanged.
- `ruff format --check` reports formatting drift in `navigates_galaxy.py` that is already on the base (lambda and assert wrapping). It is not touched here.
