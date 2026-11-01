# Sync report — galaxy

Synced 2026-11-01 by `vault/agents/gx_branches` (GOOD_MORNING).

## Merged (archived to `merged/`, clean worktrees removed)

#24206 `xsd_sample_sheet_collection_type_25.1`, #24298 `issue_24061_24062_repository_details`, #24334 `selenium_multiview_copy`, #24365 `yaml_boolean_defaults`, #24381 `untyped_param_lint_declared_labels`, #24473 `issue_24457_password_reset_25.1`, #24475 `workflow_import_embedded_tools`, #24487 `issue_24469_collection_build_reset_selection_25.1`, #24489 `deployment_test_fixes_26_2`, #24564 `job_files_resolve_paths_25.1`, #24595 `pages_extraction_summary_rename_26.2`, #24596 `issue_24550_direct_download_expires_in_26.2`.

## Closed

- #24578 `issue_24529_custom_build_fasta_history_26.0`: closed unmerged after mvdbeek asked callers to pass a history/session; moved to `branches_need_decision`.
- Unchanged: #23817, #24450 (already in decision); #23345 `optional_input_gating` (closed PR, still in final review; needs a decision).

## Moved

- `attention` → `ready`: #24140, #24341, #24439, #24440 (green, mergeable, approved), #24224, #24347, #24477, #24329 (reds diagnosed unrelated).
- `ci_wait` → `ready`: #24549, #24552, #24555 (already out of draft).
- `ci_wait` → `ready` after undraft: #24482 (CI green), #24483 (red unrelated).
- `branches_implemented_needs_ci` → `branches_implemented`: `selenium_workflow_preview_import_26.2`, `selenium_apply_rules_nest_menus`, `issue_24303_collection_type_prefix_26.2`, `vitest_real_api_calls` (reds diagnosed unrelated).

## CI

- Reruns (once per head SHA): #24211, #24228 (infra), #24555, #24483, #24477, #24329, #24347.
- Related reds, left alone: #24480 (mypy `dict_verify_each`), #24137 (mypy in packages tests).
- Not promoted (stale fork heads, no CI, or related reds): 24532 (pending), 24375 (fork stale), 24376 (all red), 24600, citation_fetch_hardening, 24474 (stale), standalone_package, 24264, 24178, 24175/24176/24177 (check_ci error), cwl_fixes_5.
- `branches_need_pr` empty; no PRs opened.

## Untracked open PRs

None.

## Mismatches (active records with no queue entry; not changed)

`custom_build_no_converter_400_26.0`, `issue_24199_workflow_numeric_bounds_26.0`, `job_parameters_input_access_25.1`, `mulled-hash`, `user_activation_register_masthead`, `vitest_stories`, `workflow_input_pipe_names_nested`, `workflow_input_pipe_names_top_level`, `workflow_input_pipe_names_validation` (last three are comparison alternatives; first four have PRs #24313, #24212, #18938, #24301 that may be merged/closed).

## Worktrees

Removed: 11 merged branches above. Kept: `selenium_multiview_copy` (worktree dir has `selenium_standalone_package` checked out; clean, pushed).
