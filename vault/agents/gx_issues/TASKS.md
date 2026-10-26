# gx_issues tasks

```gb-tasks
- prompt: Prepare to file issue at to_file/collection_build_leaves_stale_selection.md with ./PREPARE_TO_FILE.md
  agent_dir: gx_issues
  profile: Opus (low)
  description: |
    ❯ Building a collection from a history selection leaves selection mode on with a stale count (regression since 25.0, found by FAQ loop on release_26.2).
  status: recommended
- prompt: Prepare to file issue at to_file/custom_build_fasta_api_no_current_history.md with ./PREPARE_TO_FILE.md
  agent_dir: gx_issues
  profile: Opus (low)
  description: |
    ❯ Creating a FASTA custom build via API always 500s for API-key clients because there is no current history.
  status: recommended
- prompt: Prepare to file issue at to_file/gtn_webhook_proxy_probe_always_passes.md with ./PREPARE_TO_FILE.md
  agent_dir: gx_issues
  profile: Opus (low)
  description: |
    ❯ GTN tutorial-mode webhook probe always passes (Galaxy serves 200 HTML for unknown paths), leaving a blank iframe on servers without the GTN proxy.
  status: recommended
- prompt: Prepare to file issue at to_file/history_item_disabled_edit_tooltip.md with ./PREPARE_TO_FILE.md
  agent_dir: gx_issues
  profile: Opus (low)
  description: |
    ❯ Disabled history item edit button never shows its 'not yet editable' tooltip; found while implementing #24377.
  status: recommended
- prompt: Prepare to file issue at to_file/invocation_graph_embedded_outputs.md with ./PREPARE_TO_FILE.md
  agent_dir: gx_issues
  profile: Opus (low)
  description: |
    ❯ Feature request: embed outputs in the workflow invocation graph in three stages; spike branch exists; decide umbrella vs per-stage issues.
  status: recommended
- prompt: Prepare to file issue at to_file/legacy_output_collection_form_broken.md with ./PREPARE_TO_FILE.md
  agent_dir: gx_issues
  profile: Opus (low)
  description: |
    ❯ Legacy <output type="collection"> tool XML form has failed to load since 20.09; reject it clearly.
  status: recommended
- prompt: Prepare to file issue at to_file/library_collection_ignores_selected_history.md with ./PREPARE_TO_FILE.md
  agent_dir: gx_issues
  profile: Opus (low)
  description: |
    ❯ Library 'Add to History > as a Collection' ignores the selected history; fix on library_collection_selected_history_26.1.
  status: recommended
- prompt: Prepare to file issue at to_file/mapped_output_over_sample_sheet_invalid_type.md with ./PREPARE_TO_FILE.md
  agent_dir: gx_issues
  profile: Opus (low)
  description: |
    ❯ Mapping a collection-output tool over a sample_sheet input precomputes an invalid outer type (sample_sheet:list...); read from code, not reproduced.
  status: recommended
- prompt: Prepare to file issue at to_file/remote_files_upload_ftp_help_missing.md with ./PREPARE_TO_FILE.md
  agent_dir: gx_issues
  profile: Opus (low)
  description: |
    ❯ 26.2 Choose Remote Files no longer tells FTP users where to upload; fix on a stacked branch.
  status: recommended
- prompt: Prepare to file issue at to_file/remote_files_upload_long_names_overlap.md with ./PREPARE_TO_FILE.md
  agent_dir: gx_issues
  profile: Opus (low)
  description: |
    ❯ Choose Remote Files: long file names overflow into the Details column; fix on a stacked branch.
  status: recommended
- prompt: Prepare to file issue at to_file/tool_api_collection_input_type_not_validated.md with ./PREPARE_TO_FILE.md
  agent_dir: gx_issues
  profile: Opus (low)
  description: |
    ❯ Tool API accepts a directly-passed HDCA whose collection type the input does not declare.
  status: recommended
- prompt: Prepare to file issue at to_file/trs_import_ignores_trs_version.md with ./PREPARE_TO_FILE.md
  agent_dir: gx_issues
  profile: Opus (low)
  description: |
    ❯ TRS launch links with trs_version no longer auto-import since 26.1; fix + test on galaxy_ui_driver.
  status: recommended
- prompt: Prepare to file issue at to_file/workflow_import_udt_after_output_integrity_error.md with ./PREPARE_TO_FILE.md
  agent_dir: gx_issues
  profile: Opus (low)
  description: |
    ❯ Importing a workflow 500s (IntegrityError) when an embedded user-defined tool follows a step with a workflow output or PJA.
  status: recommended
```
