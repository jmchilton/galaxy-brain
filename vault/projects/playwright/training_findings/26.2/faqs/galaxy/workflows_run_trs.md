# faqs/galaxy/workflows_run_trs.md — 26.2, UI run (main, needs training.galaxyproject.org)

GTN `45d4932d33`, `galaxy_ui_driver` `c48fe3d7d5a`. Replay: `workflows_run_trs.gxui.sh`.

- `workflows-run-trs-url-404`: `convert_workflow_path_to_trs` (`_plugins/gtn.rb`) only downcases the file name, but
  `api.rb` writes the TRS files under the name with every non-alphanumeric turned into `-`. So any workflow whose
  file name has `_` (e.g. largegenome's `Galaxy-Workflow-Data_QC.ga`) gets a launch link to
  `.../versions/galaxy-workflow-data_qc`, which 404s; `.../galaxy-workflow-data-qc` exists. Breaks the launch
  button in every tutorial with such a file.
- Galaxy bug: `trs_url` launch links stopped auto-importing in 26.1 (wizard rewrite dropped TrsUrlImport's
  import-on-load); the user lands on the TRS URL form with nothing imported. Fixed (vitest red->green, gxui red on
  the old client); folded into queued `trs_import_ignores_trs_version.md`. The integration "auto import" tests
  clicked Import themselves; strengthened to wait for the import alone.
- The "If this does not work" fallback (`workflows_import` with the .ga URL) works; `workflows-import-wizard`
  covers its wording.
- gxui: `workflow-import --trs-url URL [--launch]`.
