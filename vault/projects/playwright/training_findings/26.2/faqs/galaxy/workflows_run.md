# faqs/galaxy/workflows_run.md — 26.2, UI run (main)

GTN `45d4932d33`, `galaxy_ui_driver` `c48fe3d7d5a`. Replay: `workflows_run.gxui.sh`.

- `workflows-run-include-debug`: step 9's `{% unless %}` block contains a stray `{{include}}`. Wherever a tutorial
  passes parameters it prints them, e.g. mags-building shows `{"tab"=>"Public workflows", "name"=>"..."}` and the
  numbered list restarts.
- `workflows-run-form-controls`: step 7's **Send results to a new history** / **Re-use jobs** are under the run
  form's ⚙ **Workflow Run Settings** (top right), not on the form. Step 9's import on the run form is an
  unlabelled upload icon (**Import this workflow**) at the top left of the run form; the labelled **Import** left
  of **Run** is in the preview (step 5-6). Same in 26.1.
- Steps 1-6, 10-11 fine: preview has Download / Import / Run; invocation page shows "History: <new> (not current)".
- 26.2 adds a **Curated workflows** tab before *My workflows* (step 2 lists three); not flagged.
- Galaxy tests: preview > Run and run-form Import had no E2E. Added `test_run_from_preview_and_import`
  (red without the Import click; both backends).
- gxui: `workflow-preview NAME --tab my|shared|public [--run]`, `workflow-run-import`.
