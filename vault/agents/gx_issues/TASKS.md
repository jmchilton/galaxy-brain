# gx_issues tasks

```gb-tasks
- prompt: Prepare to file issue at vault/repositories/galaxy/issues_incubator/incubating/custom_build_fasta_api_no_current_history/raw.md with ./PREPARE_TO_FILE.md
  agent_dir: gx_issues
  profile: Opus (low)
  description: |
    ❯ Creating a FASTA custom build via API always 500s for API-key clients because there is no current history.
  status: recommended
- prompt: Prepare to file issue at vault/repositories/galaxy/issues_incubator/incubating/gtn_webhook_proxy_probe_always_passes/raw.md with ./PREPARE_TO_FILE.md
  agent_dir: gx_issues
  profile: Opus (low)
  description: |
    ❯ GTN tutorial-mode webhook probe always passes (Galaxy serves 200 HTML for unknown paths), leaving a blank iframe on servers without the GTN proxy.
  status: recommended
- prompt: Prepare to file issue at vault/repositories/galaxy/issues_incubator/incubating/history_item_disabled_edit_tooltip/raw.md with ./PREPARE_TO_FILE.md
  agent_dir: gx_issues
  profile: Opus (low)
  description: |
    ❯ Disabled history item edit button never shows its 'not yet editable' tooltip; found while implementing #24377.
  status: recommended
- prompt: Prepare to file issue at vault/repositories/galaxy/issues_incubator/incubating/invocation_graph_embedded_outputs/raw.md with ./PREPARE_TO_FILE.md
  agent_dir: gx_issues
  profile: Opus (low)
  description: |
    ❯ Feature request: embed outputs in the workflow invocation graph in three stages; spike branch exists; decide umbrella vs per-stage issues.
  status: recommended
- prompt: Prepare to file issue at vault/repositories/galaxy/issues_incubator/incubating/legacy_output_collection_form_broken/raw.md with ./PREPARE_TO_FILE.md
  agent_dir: gx_issues
  profile: Opus (low)
  description: |
    ❯ Legacy <output type="collection"> tool XML form has failed to load since 20.09; reject it clearly.
  status: recommended
- prompt: Prepare to file issue at vault/repositories/galaxy/issues_incubator/incubating/library_collection_ignores_selected_history/raw.md with ./PREPARE_TO_FILE.md
  agent_dir: gx_issues
  profile: Opus (low)
  description: |
    ❯ Library 'Add to History > as a Collection' ignores the selected history; fix on library_collection_selected_history_26.1.
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
- prompt: Prepare to file issue at vault/repositories/galaxy/issues_incubator/incubating/tool_panel_stale_after_toolshed_install/raw.md with ./PREPARE_TO_FILE.md
  agent_dir: gx_issues
  profile: Opus (low)
  description: |
    ❯ Tool panel doesn't show Tool Shed-installed tools until a page reload; fix + tests on galaxy_ui_driver.
  status: recommended
- prompt: Prepare to file issue at vault/repositories/galaxy/issues_incubator/incubating/udt_lint_expression_input_member_paths/raw.md with ./PREPARE_TO_FILE.md
  agent_dir: gx_issues
  profile: Opus (low)
  description: |
    ❯ User-defined tool lint should reject `inputs.*` member paths missing from the input's runtime model (e.g. `reads.forward` on paired_or_unpaired); jobs otherwise fail with JS TypeError.
  status: recommended
  suggested_by: gx_issues/SUGGESTED_TASKS.md#Process Issues
- prompt: Run ./ROOT_CAUSE.md on galaxyproject/galaxy#24527.
  agent_dir: gx_workhorse
  link: https://github.com/galaxyproject/galaxy/issues/24527
  profile: Opus (low)
  description: |
    🐴 Cached toolbox leaves literal $PATH_TO_IMAGES URLs in Tool Shed tool help when no install-database records exist. Unassigned, tool-dev adjacent.
  status: recommended
  suggested_by: gx_issues/SUGGESTED_TASKS.md#Find Issues
- prompt: Run ./ROOT_CAUSE.md on galaxyproject/galaxy#24519.
  agent_dir: gx_workhorse
  link: https://github.com/galaxyproject/galaxy/issues/24519
  profile: Opus (low)
  description: |
    🐴 Cached toolbox: concurrent writable SQLite store initialization can crash Galaxy processes. Unassigned; infra-leaning, less fit with preferences.
  status: idea
  suggested_by: gx_issues/SUGGESTED_TASKS.md#Find Issues
```
