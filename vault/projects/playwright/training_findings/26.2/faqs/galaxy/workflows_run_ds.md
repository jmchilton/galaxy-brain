# faqs/galaxy/workflows_run_ds.md — 26.2, UI run (main, needs Dockstore)

GTN `45d4932d33`, `galaxy_ui_driver` `f40c7f6d116`. Replay: `workflows_run_ds.gxui.sh`.

- `workflows-import-wizard` (no-id branch: Import from repository > TRS ID).
- Galaxy bug: launch links send `trs_version`, but the 26.1 import wizard reads `trs_version_id`, so they stop at the TRS ID form with the newest version and no run form. Fixed (`trsImportQuery`, vitest red->green); queued `trs_import_ignores_trs_version.md`.
- gxui: `workflow-import --launch` opens the launch link and waits for the run form.
