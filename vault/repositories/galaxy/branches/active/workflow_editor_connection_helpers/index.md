# workflow_editor_connection_helpers

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:workflow_editor_connection_helpers?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/workflow_editor_connection_helpers)

## Status

Head `9699ec45644` on `release_26.2` `7febcc1d683` (merges clean with current base): polished, awaiting John's final review (`branches_ready_for_final_review`).

No PR yet.

Fork CI green on `9699ec45644`, both new E2E tests passing under Playwright ([run](https://github.com/jmchilton/galaxy/actions/runs/39780461081)).

## Scope

It adds two new E2E tests in `test_workflow_editor.py`:
- `test_refused_connection_and_removed_step` covers a refused connection with its reason, connect, disconnect, removing a step, and the save, checked through the API.
- `test_connect_unlabelled_steps_by_order_index` connects, disconnects and removes unlabelled steps of the same tool, by step number.

It brings these changes:
- the editor's connection helpers move onto `NavigatesGalaxy`, renamed `workflow_editor_assert_*`;
- steps can be addressed by label or by order index (`EditorTerminalReference`, `workflow_editor_node`);
- new `workflow_editor_try_connect` and `workflow_editor_remove_node` helpers;
- a fix to Playwright's synthetic drag timing.

The original label-only scope is kept as an [alt](alts/original_scope.md).

Base `release_26.2` on John's call (2026-10-21), not dev as [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md) says. It backs gxui's editor verbs (pitch refinement plan item 5). [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) is stacked on it, so restack that branch after any rewrite here.
- Restacked onto `9699ec45644` on 2026-10-22 (tip `b271e13696c`).

**Follow-up (John, 2026-10-22):** CSS-safe terminal and connector selectors, for subworkflow terminals whose labels contain spaces, `'` or `\`. See scope_evaluation item A. It is not in this branch; it's on [`workflow_editor_selector_escaping`](../workflow_editor_selector_escaping/index.md), stacked on this one.

**Superseded fold-in:** `77b5ea69434` on `jmchilton/galaxy_ui_driver_editor_refs` (step-number refs). The re-scope covers it with the same names. Drop it when folding that branch in, and keep its gxui fixup.

[Implementation debrief](implementation_debrief.md) · [Polish debrief](polish_debrief.md) · [PR description](pr_description.md) · [PR titles](pr_titles.md) · [PR tags](pr_tags.md)
