# workflow_editor_run_cancel

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:workflow_editor_run_cancel?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/workflow_editor_run_cancel)

## Status

Polishing on `release_26.2` @ `65132d40dac`, head `9a5cda91bed`.

No PR.

Fork CI on `9a5cda91bed` running, no reds yet.

## Scope

New E2E test: run a workflow from the editor's Run activity, select a non-default dataset in the simplified run form, cancel the invocation. Brings the helper fixes it needs: `workflow_run_specify_inputs` on the simplified form (4b), `workflow_editor_click_run` clicks the Run activity (7h), `invocations.cancel_button` selector (7j).

Expanded scope: `workflow_run_setup_inputs` now really selects `type: File` inputs, plus a fixture key fix. Also a client fix: the editor no longer marks a loading workflow dirty, which was the source of the new test's cold-start flake. Original scope: alt `workflow_editor_run_cancel_alt_original_scope`.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). Once this merges, restack `galaxy_ui_driver` on it. The commits diverged, and the fixture key fix is needed there.

## Decisions

- 2026-10-21: John kept the fixture key fix (`image_input_1` → `image_input`) and the editor dirty-on-load client fix in this branch.

[Implementation debrief](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md)
