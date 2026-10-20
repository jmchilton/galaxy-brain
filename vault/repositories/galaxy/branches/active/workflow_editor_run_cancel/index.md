# workflow_editor_run_cancel

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:workflow_editor_run_cancel?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/workflow_editor_run_cancel)

## Status

Implemented on `release_26.2`, head `4a0abaaaa0f`; framed as a missing-test bug fix for the release.

No PR.

CI not yet observed.

## Scope

New E2E test: run a workflow from the editor's Run activity, select a non-default dataset in the simplified run form, cancel the invocation. Brings the helper fixes it needs: `workflow_run_specify_inputs` on the simplified form (4b), `workflow_editor_click_run` clicks the Run activity (7h), `invocations.cancel_button` selector (7j).

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). Drop these commits from `galaxy_ui_driver` once this merges.

[Initial implementation](initial_implementation_debrief.md)
