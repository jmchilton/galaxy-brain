# workflow_editor_selector_escaping

- [Open PR](https://github.com/galaxyproject/galaxy/compare/workflow_editor_connection_helpers...jmchilton:galaxy:workflow_editor_selector_escaping?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/workflow_editor_selector_escaping)

## Status

Implementation in progress.

No PR yet.

No CI yet.

## Scope

CSS-safe workflow editor terminal and connector selectors. A subworkflow step's terminal names are its inner workflow's free-text input and output labels, so they can contain spaces, `'` or `\`.
- The `connector_for` / `connector_invalid_for` targets escape only `|`.
- The `[input-name='…']` / `[output-name='…']` targets break on `'`.

So the `workflow_editor_assert_*` helpers and `workflow_editor_destroy_connection` fail on such steps. This is item A of [the parent's second scope evaluation](../workflow_editor_connection_helpers/scope_evaluation.md), deferred by John on 2026-10-22.

Stacked on [`workflow_editor_connection_helpers`](../workflow_editor_connection_helpers/index.md) at `9699ec45644`, base `release_26.2`. It shares that branch's worktree (`branch/workflow_editor_connection_helpers`).
