The branch now opens with four refactor-only commits on `release_26.2`:
- the move, with the asserts' `workflow_editor_` rename folded in;
- the `workflow_editor_node_and_terminal` dedup;
- `workflow_editor_source_sink_terminal_elements`, with the component-based terminal lookup folded in;
- step refs by order index, with their typing folded in.

The Playwright drag fix follows. Then come the feature (try_connect, remove_node, the targets and the refused-connection test, with the shared test helper), the reuse of those helpers in existing tests, and the order-index test last. The final tree is identical to the pre-rewrite head `acbf1944883`, which is kept as `workflow_editor_connection_helpers_pre_rewrite_2_20261022`. The older backups and the alt branch are untouched.

## Commits (base `7febcc1d683`, oldest first)

1. `262bca43375` Move workflow editor connection helpers from TestWorkflowEditor to NavigatesGalaxy.
   - This is `2514981f5dc` with `f4d2c83107d` folded in.
   - The five moved asserts land as `workflow_editor_assert_*`, with the base's 71 call sites updated.
   - The other 4 of the original rename's 75 call sites belong to the refused-connection test, which now uses the new names from the start.
   - No behavior change.
2. `1e780f1eece` Add workflow_editor_node_and_terminal for label#terminal refs.
   - This is `4b4be9b0b7b`, rebased onto the renamed asserts.
   - It still contains the `split("#", 1)` change to `assert_node_output_is`, as in round 1.
3. `204bc521781` Add workflow_editor_source_sink_terminal_elements.
   - This is `b19f0095a17` with `0655f80fa2d` folded in.
   - The helper finds terminals through the node's `output_terminal`/`input_terminal` and returns their elements. `terminal_ids` takes its ids from those elements.
   - So base `workflow_editor_connect` no longer re-queries by `#id`, and terminal names that need CSS escapes work there.
   - It no longer waits for the nodes separately before the terminals; waiting for a terminal implies its node is present.
4. `cbc20fd9ebe` Let editor connection helpers address a step by order index.
   - This is `4c3fdf4cf7c` and `d1b27a69f2c` without their `try_connect`/`remove_node` hunks, since those methods don't exist yet.
   - Contents:
     - the `node._` selector list;
     - `EditorTerminalReference`;
     - `workflow_editor_node`, now also used by `ensure_tool_form_open`;
     - typed refs on every base and moved helper;
     - the "changes on save" note on `EditorNodeReference`.
   - This is helper infrastructure with no product change, so it goes ahead of the fix and the feature.
5. `863574bbed9` Fire a synthetic Playwright drag's dragenter a task after dragstart. This is `f699b080a32`, unchanged.
6. `e42cf5f49b5` Test a refused connection and a removed step in the workflow editor.
   - Folds `28380b8083e` together with:
     - the `try_connect`/`remove_node` typing and ref changes from `4c3fdf4cf7c` and `d1b27a69f2c`;
     - the shared `_saved_steps_with_connections` helper and the `Any` import from `a169fdb6397`.
   - Adds `workflow_editor_try_connect` and `workflow_editor_remove_node`, both taking refs from the start.
   - Also adds the navigation.yml targets (`node.input_terminal_dragging`, `_.tooltip_by_id`), the refusal screenshot and the test.
7. `9787ba72208` Use editor remove_node/destroy_connection helpers in existing editor tests. This is `b5c2a4506fd` (the conditional step test) and `acbf1944883` (the input and parameter tests) combined.
8. `04ce1a3f088` Test connecting and disconnecting unlabelled steps by order index.
   - This is `9c3924200ce` with `ffca39be5a6` (tuple-ref `try_connect`) folded in.
   - `_saved_tool_step_connections` is in its `a169fdb6397` form, built on the shared helper.

## Checks

- `git diff acbf1944883 HEAD` is empty.
- These pass on every commit:
  - `uvx ruff@0.17.0 check` on the changed Python files;
  - `black --check`;
  - the repo pre-commit hooks (black, ruff, flake8, prettier);
  - importing `galaxy.selenium.navigates_galaxy` and `galaxy_test.selenium.test_workflow_editor`.
- On the final head:
  - `pytest test/unit/selenium/test_has_driver.py -k drag`: 12 passed;
  - `test/unit/selenium/test_smart_components.py`: 54 passed.
- E2E was not rerun, because the tree is unchanged.
- Not pushed. The local branch is now 8 commits ahead and 3 behind its remote-tracking branch, which still holds the old history. Pushing it will need a force push.
