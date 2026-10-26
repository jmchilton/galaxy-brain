# faqs/galaxy/workflows_run_wfh.md — 26.2, UI run (main, needs workflowhub.eu)

GTN `45d4932d33`, `galaxy_ui_driver` `c48fe3d7d5a`. Replay: `workflows_run_wfh.gxui.sh`.

- `workflows-run-wfh-examples`: frontmatter `examples` pass `dockstore_id` (copied from `workflows_run_ds`); this FAQ
  reads `wfhub_id`, so both examples render the no-id branch.
- `workflows-import-wizard` (no-id branch): "Switch tabs to TRS ID" is now Import from repository > TRS ID; the
  server is a **TRS Server** dropdown (shown only when the server has more than one).
- Launch link (`trs_server=workflowhub.eu&trs_id=1352&trs_version=4`) imports and opens the run form with the
  batch-18 `trs_version` fix. The version dropdown shows WorkflowHub's names (`v0.9`), not the numeric id the
  tutorials pass.
- Fallback search (`name:"mags-building/main"` on WorkflowHub) works.
- Server: `faq_server.sh` now configures Dockstore + WorkflowHub TRS servers, as usegalaxy.* do (default is Dockstore only).
- gxui: `workflow-import --trs-server HOST` (launch link server; picks the form's TRS Server dropdown entry).
