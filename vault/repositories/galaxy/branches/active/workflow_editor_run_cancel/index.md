# workflow_editor_run_cancel

- [PR #24318](https://github.com/galaxyproject/galaxy/pull/24318)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/workflow_editor_run_cancel)

## Status

Polished. Base `release_26.2` @ `e2649e52818`, head `3437fa198b4`.

Draft PR [#24318](https://github.com/galaxyproject/galaxy/pull/24318) opened 2026-10-21 on John's request, title "[26.2] Don't mark a just-opened workflow as unsaved in the editor; test run-from-editor and cancel".

PR CI on `3437fa198b4` pending; screenshots hosted on `pr-assets-workflow_editor_run_cancel`.

## Scope

New E2E test: run a workflow from the editor's Run activity, select a non-default dataset in the simplified run form, cancel the invocation. Brings the helper fixes it needs: `workflow_run_specify_inputs` on the simplified form (4b), `workflow_editor_click_run` clicks the Run activity (7h), `invocations.cancel_button` selector (7j).

Expanded scope: `workflow_run_setup_inputs` now really selects `type: File` inputs, plus a fixture key fix. Also a client fix: the editor no longer marks a loading workflow dirty, which was the source of the new test's cold-start flake. Original scope: alt `workflow_editor_run_cancel_alt_original_scope`.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). Once this merges, restack `galaxy_ui_driver` on it. The commits diverged, and the fixture key fix is needed there.

## Decisions

- 2026-10-21: John kept the fixture key fix (`image_input_1` → `image_input`) and the editor dirty-on-load client fix in this branch.

[PR description](pr_description.md) · [Titles](pr_titles.md) · [Tags](pr_tags.md) · [Polish debrief](polish_debrief.md)

[Implementation debrief](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md)
