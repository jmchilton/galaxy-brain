# Alt: original_scope

Branch [`workflow_editor_connection_helpers_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/workflow_editor_connection_helpers_alt_original_scope) at `b5c2a4506fd`, on `release_26.2` `7febcc1d683`.

This is the branch as first hardened, before the re-scope. It contains:
- the connection helpers moved onto `NavigatesGalaxy`;
- two dedup refactors: `workflow_editor_node_and_terminal` and `workflow_editor_source_sink_terminal_elements`;
- the Playwright drag-timing fix;
- `workflow_editor_try_connect` and `workflow_editor_remove_node`, with `navigation.yml` targets and a screenshot of the refusal;
- the refused-connection E2E test.

It differs from the parent in two ways:
- **Label-only refs.** The helpers address a step only by `label#terminal`. Unlabelled steps of the same tool share a `node-label`, so these helpers silently act on the first matching node.
- **No rename.** The moved asserts keep their old unprefixed names (`assert_connected` etc.), without the `workflow_editor_` prefix.

The parent adds step refs by id, renames the asserts, and adds an E2E test for unlabelled steps of the same tool. The expansion comes from [scope_evaluation](../earlier_drafts/1/scope_evaluation.md).
