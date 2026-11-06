# Sync report — galaxy

Synced 2026-11-06 by `vault/agents/gx_branches` (GOOD_MORNING).

## Merged (archived to `merged/`)

#24140 `issue_23980_static_restriction_default`, #24224 `issue_24188_subworkflow_rename_expression_json`, #24318 `workflow_editor_run_cancel`, #24329 `selenium_history_datatype_citations`, #24341 `selenium_collection_build_convert`, #24439 `selenium_data_formats_interval_columns`, #24440 `selenium_history_import_purge`, #24451 `selenium_tool_form_use_cached_job`, #24458 `selenium_history_filters_ftp_notice`, #24477 `workflow_fetch_abstractions_25.1`, #24482 `selenium_faq_account_workflow_display_26.2`.

## Closed

None new. Unchanged: #23817, #24450, #24578 (in decision); #23345 `optional_input_gating` (closed PR, still in final review).

## Moved

- `ci_wait` → `ready` after undraft: #24453 (CI green, last comment ours).
- `ready` → `attention`: #24302, #24347 (conflicts).
- `ci_wait` → `author_work`: #24038, #24300 (conflicts).
- `branches_implemented_needs_ci` → `branches_implemented`: `issue_24532_user_deletion_refusal_25.1` (green); `issue_24648_shed_field_border`, `vitest_real_api_calls`, `issue_24178_subworkflow_step_params_export`, `issue_24175_imported_invocation_step_params`, `workflow_step_parameter_overrides` (reds diagnosed unrelated).

## CI

- Rerun: #24225 BioBlend. Already rerun on this SHA: #24228, #24555, #24483.
- Not promoted: `citation_fetch_hardening_26.1`, `selenium_standalone_package`, `issue_24264_library_metadata_file_name_25.1` (related reds); `issue_24545_oom_kill_detection` (unclear mypy count); `issue_24376_library_download_test_26_2` (all runs cancelled); `cwl_fixes_5` (stale March run); `issue_24176_rerun_full_form_prefill`, `issue_24177_rerun_step_params_full_form` (7 and 10 runs only); `issue_24375_restriction_string_roundtrip_26.1`, `issue_24474_collection_input_type_26.2` (local heads need force-push).
- Unclear: #24331 (CircleCI `get_code_and_test`, not covered by `check_ci.sh`), #24137 (startup package build), #23326 (Python linting), #24539 (Selenium library tests, likely unrelated).
- `branches_need_pr` empty; no PRs opened.

## Untracked open PRs

None.

## Mismatches (active records with no queue entry; not changed)

`custom_build_no_converter_400_26.0`, `harden_url_abstractions_26.0`, `harden_url_abstractions_26.1`, `issue_24199_workflow_numeric_bounds_26.0`, `job_parameters_input_access_25.1`, `mulled-hash`, `user_activation_register_masthead`, `vitest_stories`, `workflow_input_pipe_names_nested`, `workflow_input_pipe_names_top_level`, `workflow_input_pipe_names_validation`.

#24167 `toolshed_repository_contents` is an open draft held in `branches_need_decision` for John's recorded decision.

## Worktrees

Removed: 24140, 24224, 24329, 24341, 24451, 24458, 24477, 24482 branches. Kept: `selenium_data_formats_interval_columns` (4 commits unpushed), `selenium_history_import_purge` (3 unpushed), `workflow_editor_run_cancel` (has `workflow_editor_second_subworkflow` checked out).
