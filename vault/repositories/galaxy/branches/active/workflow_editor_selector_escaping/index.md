# workflow_editor_selector_escaping

- [Open PR](https://github.com/galaxyproject/galaxy/compare/workflow_editor_connection_helpers...jmchilton:galaxy:workflow_editor_selector_escaping?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/workflow_editor_selector_escaping)

## Status

Head `7ba4f7bd25f`, stacked on `workflow_editor_connection_helpers` `9699ec45644`: implemented, re-scoped and hardened. It's ready for CI.

No PR yet.

No CI yet.

## Scope

CSS-safe Selenium/Playwright selectors for free-text labels. Editor terminal names, node labels, connector ids and workflow run-form input labels all go through one `css_attribute_value` escape, and the connector targets become `[id='…']`. E2E tests cover the editor (a subworkflow with `it's an input` / `it's a \ output` labels, and a step labelled `cat's downstream`) and the run form (`it's input`).

This is item A of [the parent's second scope evaluation](../workflow_editor_connection_helpers/scope_evaluation.md), deferred by John on 2026-10-22. It was re-scoped once to add the run form; the editor-only version is kept as an [alt](alts/original_scope.md).

Stacked on [`workflow_editor_connection_helpers`](../workflow_editor_connection_helpers/index.md), base `release_26.2`. It shares that branch's worktree (`branch/workflow_editor_connection_helpers`). Open its PR only after the parent's, or retarget it.

[Implementation debrief](implementation_debrief.md)
