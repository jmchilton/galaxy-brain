# workflow_editor_connection_helpers

- [PR #24370](https://github.com/galaxyproject/galaxy/pull/24370)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/workflow_editor_connection_helpers)

## Status

Head `bbb56abe1bb` (2026-10-27): rebased onto `release_26.2` (nav.yml `tooltip_*` conflict, kept both), fixed davelopez mypy blocker, escaping moved to selector sites per his optional note. `workflow_editor_selector_escaping` content is folded in; restack `galaxy_ui_driver`.

[#24370](https://github.com/galaxyproject/galaxy/pull/24370) is draft (waiting on CI), mergeable, against `release_26.2`; opened 2026-10-22 with the first title from `pr_titles.md` and labels from `pr_tags.md`.

CI pending on `bbb56abe1bb`; mypy and lint clean locally, no local E2E run (port 8080 held by another worktree).

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
