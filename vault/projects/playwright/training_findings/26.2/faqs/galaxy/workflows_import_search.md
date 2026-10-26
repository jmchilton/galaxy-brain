# faqs/galaxy/workflows_import_search.md — 26.2, UI run (main, needs Dockstore)

GTN `45d4932d33`, `galaxy_ui_driver` `f40c7f6d116`. Replay: `workflows_import_search.gxui.sh`.

- `workflows-import-wizard`: Import from repository > Search workflow registries; click result, pick version, Import.
- Image query `name:vgp` finds nothing now: Dockstore's TRS name filter is case-sensitive (`name:VGP` works). Tutorial queries (`organization:"iwc" name:"sars-cov-2"`) work.
- FAQ server only lists Dockstore (WorkflowHub is server config). Search case-sensitivity is Dockstore's, not Galaxy's.
