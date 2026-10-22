# Re-scope debrief: workflow_editor_connection_helpers

The first [scope evaluation](earlier_drafts/1/scope_evaluation.md) recommended expanding the branch in two ways:
- address steps by order index as well as label;
- rename the moved asserts.

Unlabelled steps of one tool share a `node-label`, so the label-only helpers silently acted on the first matching node.

The original scope is kept as the alt [`workflow_editor_connection_helpers_alt_original_scope`](alts/original_scope.md) at `b5c2a4506fd`, pushed to `jmchilton`.

## What changed (new commits on `b5c2a4506fd`)

- `f4d2c83107d` renames the five moved asserts to `workflow_editor_assert_*` and updates the 70 call sites in `test_workflow_editor.py`. There are no other callers in the repo, and gxui doesn't call them. `assert_node_output_is` never moved, so it keeps its name.
- `4c3fdf4cf7c` adds step refs by order index:
  - `workflow_editor.node._` is now a selector list, `["[node-label='${label}']", "#wf-node-step-${id}"]`.
  - It reuses the existing `EditorNodeReference = int | str` and adds `EditorTerminalReference = str | tuple[EditorNodeReference, str]`.
  - A new `workflow_editor_node(ref)` handles it. `workflow_editor_node_and_terminal`, `remove_node` and `ensure_tool_form_open` all go through it. String `"label#terminal"` refs behave as before.
- `9c3924200ce` adds the new test `test_connect_unlabelled_steps_by_order_index`. It uses two unlabelled `cat` steps and checks connect, disconnect and remove by index, verifying through the API which step got each change.
- From the review:
  - `d1b27a69f2c` types the remaining helpers' refs.
  - `a169fdb6397` adds a `_saved_steps_with_connections` helper, shared by both new tests.

## Findings

- **Order indices change on save.** The server reorders steps and the editor reloads with new indices. The test re-reads indices from the API after each save, and the `EditorNodeReference` comment now says so. gxui callers that pass indices need to know this too.
- **Red check:**
  - the implementer pointed the connects at the shared label, and the test failed at the API check;
  - the reviewer did the same on Playwright, and it failed at the first `workflow_editor_assert_connected`, because the second drag replaced the first connection.
- **Parallel work.** Overnight, another session built `77b5ea69434` "Let workflow editor helpers take a step number" on `jmchilton/galaxy_ui_driver_editor_refs`. It was meant to be folded in here during polish.
  - It reached almost the same design, with the same `EditorTerminalReference` and `workflow_editor_node`.
  - This re-scope supersedes it. Its gxui fixup, `df78f64ec31`, only uses `workflow_editor_node`, `try_connect`, `destroy_connection` and `remove_node`, all with the same shapes as here.
  - It had one extra: it found `try_connect` terminals through the component's selectors instead of `#{id}`, so input names that need CSS escapes work too. This branch still looks terminals up by `#{id}`, which is older code that `connect` shares. The review recorded this as a recommendation.

## Review

[subagents/rescope_review.md](subagents/rescope_review.md) found no bugs. Its two cleanups are the review commits above. Not acted on:
- `[id=...]` escaping;
- `bool` passing `isinstance(int)`;
- `by_id` is now redundant but still has callers;
- no direct tuple-ref `try_connect` test.

## Tests

The new test and `test_refused_connection_and_removed_step` pass on Playwright and Selenium. Also passing:
- on Playwright: `test_reconnecting_nodes`, `test_existing_connections`, `test_simple_mapping_connections`, `test_map_over_output_indicator`, `test_editor_create_conditional_step`, `test_editor_tool_upgrade_all_tools`, `test_editor_duplicate_node`, `test_data_input` and `test_change_datatype`;
- the drag unit tests (12) and `test_smart_components.py` (54).

The branch was then re-hardened. The first round's debriefs are in `earlier_drafts/1/`.
