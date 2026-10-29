# Tasks

```gb-tasks
- prompt: Review mvdbeek's commit 93ee487fbe5 on issue_24220_drop_collection_matching_26.0 in the differential review. Then update the live PR body from pr_description.md (Risks rewritten), post the suggested reply in review_response_mvdbeek_1.md, and decide where the server follow-up in followup_issue_split_paired_or_unpaired.md lands (release_26.0 or dev).
  agent_dir: gx_branches
  kind: human
  link: https://github.com/galaxyproject/galaxy/pull/24453
  record: galaxy/branches/issue_24220_drop_collection_matching_26.0
- prompt: Review dannon-response changes (rebase + tool-count assertion) in the differential review, open the follow-up issue from followup_atomic_import_issue.md (galaxyproject/galaxy, dev), then post the suggested comment from review_pushback_dannon_1.md with the issue number filled in.
  agent_dir: gx_branches
  kind: human
  link: https://github.com/galaxyproject/galaxy/pull/24475
  record: galaxy/branches/workflow_import_embedded_tools
- prompt: Review dannon-response changes (rebase, app-path startup test, shed-first error message) in the differential review, update the PR body from pr_description.md, then post the suggested reply in review_pushback_dannon_1.md.
  agent_dir: gx_branches
  kind: human
  link: https://github.com/galaxyproject/galaxy/pull/24349
  record: galaxy/branches/issue_24328_data_table_mismatch_26.1
- prompt: Review dannon-response change (location.replace nit) in the differential review, then post the suggested reply in review_response_dannon_1.md.
  agent_dir: gx_branches
  kind: human
  link: https://github.com/galaxyproject/galaxy/pull/24473
  record: galaxy/branches/issue_24457_password_reset_25.1
- prompt: |
    Let's talk about branch issue_24529_custom_build_fasta_history_26.0. The branch record is vault/repositories/galaxy/branches/active/issue_24529_custom_build_fasta_history_26.0/.
  agent_dir: gx_branches
  record: galaxy/branches/issue_24529_custom_build_fasta_history_26.0
  description: |
    🤔 API-key conversions (custom build from FASTA #24529, `converted/{ext}`, feature search) run in an active history the user owns, via `HistoryManager`. Base `release_26.0`, head `0a6c27e2cae`; re-scoped, hardened. Decision: second scope eval says expand (202/4xx for pending/errored converter deps in `converted/{ext}`); ship as is, expand, or split? Alt `_alt_original_scope` = #24529 only.
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: |
    Let's talk about branch invocation_graph_embedded_outputs. The branch record is vault/repositories/galaxy/branches/active/invocation_graph_embedded_outputs/.
  agent_dir: gx_branches
  record: galaxy/branches/invocation_graph_embedded_outputs
  description: |
    🤔 Spike: outputs inside the invocation graph (hover preview; workflow outputs as large embedded nodes with nudge-only layout; per-step preferred output). Base `dev`, head `3e4312f7c1d`; browser-checked on a 10-step workflow. Decision: go/no-go on nudging (right mode is recognizable but fits at 40–50% zoom); split into per-stage PRs?
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: |
    Let's talk about branch issue_20657_input_processing_mode. The branch record is vault/repositories/galaxy/branches/active/issue_20657_input_processing_mode/.
  agent_dir: gx_branches
  record: galaxy/branches/issue_20657_input_processing_mode
  description: |
    🤔 Explains tool input batching and collection mapping, and fixes collection-type matching (#20657) (re-hardened, re-scoped). Decision: second scope eval says expand (pin off-page HDCA selection on refresh); split? Head `10ae420a663`.
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: |
    Let's talk about branch issue_24219_pin_offpage_collections_26.1. The branch record is vault/repositories/galaxy/branches/active/issue_24219_pin_offpage_collections_26.1/.
  agent_dir: gx_branches
  record: galaxy/branches/issue_24219_pin_offpage_collections_26.1
  description: |
    🤔 Tool form keeps a selected collection that isn't on the first option page across refreshes (#24219). Base `release_26.1`, head `00cf6f95004`; hardened. Decision: ship as is; scope-eval expansion split into `issue_24219_foreign_collection_carry_26.1`.
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: |
    Let's talk about branch issue_24219_foreign_collection_carry_26.1. The branch record is vault/repositories/galaxy/branches/active/issue_24219_foreign_collection_carry_26.1/.
  agent_dir: gx_branches
  record: galaxy/branches/issue_24219_foreign_collection_carry_26.1
  description: |
    🤔 26.1 backport of #23865 (visible-only collection select; carry hidden/deleted/other-history selection) plus map-over classification for collection and multiple data inputs. Base `release_26.1`, head `f54b3a9b9af`; re-scoped, re-hardened, BLOCKED. Decision: cross-user carry.
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: |
    Let's talk about branch issue_23424_when_expression_validation. The branch record is vault/repositories/galaxy/branches/active/issue_23424_when_expression_validation/.
  agent_dir: gx_branches
  record: galaxy/branches/issue_23424_when_expression_validation
  description: |
    🤔 Rejects obsolete flat nested tool-input references. Closed #23817: revive/reopen or abandon.
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: |
    Let's talk about branch workflow_input_pipe_names. The branch record is vault/repositories/galaxy/branches/active/workflow_input_pipe_names/.
  agent_dir: gx_branches
  record: galaxy/branches/workflow_input_pipe_names
  description: |
    🤔 Reserves pipes in input names, with three possible correction scopes. Decision: Choose validation-only, top-level correction, or nested correction.
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: |
    Let's talk about branch subworkflow_mapping_when_alignment. The branch record is vault/repositories/galaxy/branches/active/subworkflow_mapping_when_alignment/.
  agent_dir: gx_branches
  record: galaxy/branches/subworkflow_mapping_when_alignment
  description: |
    🤔 Aligns mapped subworkflow `when` values with compatible collection inputs. Decision: Decide whether #23676 supersedes this work.
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: |
    Let's talk about branch workflow_run_exposed_step_params. The branch record is vault/repositories/galaxy/branches/active/workflow_run_exposed_step_params/.
  agent_dir: gx_branches
  record: galaxy/branches/workflow_run_exposed_step_params
  description: |
    🤔 Spike: expose individual step params in the simple run form (picker, cards, `step_param` links, rerun re-show, "rerun with this changed"), plus strict keys (G1), job param paths (G2) and recorded exposed keys (G4). On the #24177 stack, head `147dac7222a`; 5 E2E tests pass. Decision: file RERUN_ISSUE with the edits in [LESSONS_LEARNED](../../../projects/workflow_applications/LESSONS_LEARNED.md); spike, do not PR as-is.
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: |
    Let's talk about branch workflow_rerun_step_parameters. The branch record is vault/repositories/galaxy/branches/active/workflow_rerun_step_parameters/.
  agent_dir: gx_branches
  record: galaxy/branches/workflow_rerun_step_parameters
  description: |
    🤔 Spike: step params survive rerun, subworkflow export and invocation import; full run form prefilled. Decision: split into 4 issues; server-seeded vs client-merged prefill. Spike, do not PR as-is.
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: |
    Let's talk about branch invocation_no_add_to_history_false. The branch record is vault/repositories/galaxy/branches/active/invocation_no_add_to_history_false/.
  agent_dir: gx_branches
  record: galaxy/branches/invocation_no_add_to_history_false
  description: |
    🤔 Fixes invocations built to the published types (`no_add_to_history`, empty `ds_map`) and the TS root cause. Base `release_26.2`. Decision: John posted a [decision gist](https://gist.github.com/jmchilton/c68c645a8fa6d8da58af9a5e70f060c1); waiting for someone to okay this or the 26.1 server-only approach.
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: |
    Let's talk about branch invocation_no_add_to_history_false_26.1. The branch record is vault/repositories/galaxy/branches/active/invocation_no_add_to_history_false_26.1/.
  agent_dir: gx_branches
  record: galaxy/branches/invocation_no_add_to_history_false_26.1
  description: |
    🤔 Server-only `no_add_to_history` and empty-`ds_map` invocation fixes for 26.1. Base `release_26.1`. Decision: same [decision gist](https://gist.github.com/jmchilton/c68c645a8fa6d8da58af9a5e70f060c1); waiting for an okay on this or the 26.2 approach.
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: |
    Let's talk about branch toolshed_repository_contents. The branch record is vault/repositories/galaxy/branches/active/toolshed_repository_contents/.
  agent_dir: gx_branches
  record: galaxy/branches/toolshed_repository_contents
  description: |
    🤔 Adds a bounded repository-files API and Tool Shed contents browser (#22598). Base `dev`. Decision: how to satisfy mvdbeek's performance concerns.
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: |
    Let's talk about branch issue_24389_duplicate_test_params_26.1. The branch record is vault/repositories/galaxy/branches/active/issue_24389_duplicate_test_params_26.1/.
  agent_dir: gx_branches
  record: galaxy/branches/issue_24389_duplicate_test_params_26.1
  description: |
    🤔 Conflicting duplicate tool-test params raise "Ambiguous" instead of silently keeping one; `<edit_attributes>` stored as dicts (#24389). Base `release_26.1`. Closed: split into the `_lint_` 26.1 and `_reject_` 26.2 branches. Decision: abandon or keep as reference.
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: |
    Let's talk about branch untyped_param_lint_declared_labels. The branch record is vault/repositories/galaxy/branches/active/untyped_param_lint_declared_labels/.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24381
  record: galaxy/branches/untyped_param_lint_declared_labels
  description: |
    🔀 Editor lint and run form only treat rename `${...}` as replacement params; lint skips input-backed names (#24379). Base `release_26.1`.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Merge Branches
- prompt: |
    Let's talk about branch extract_next_followups_baseline. The branch record is vault/repositories/galaxy/branches/active/extract_next_followups_baseline/.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24368
  record: galaxy/branches/extract_next_followups_baseline
  description: |
    🔀 Baseline tests, PageManager notebook access check and public extraction helpers ahead of #24225. Base `release_26.2`.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Merge Branches
- prompt: |
    Let's talk about branch yaml_boolean_defaults. The branch record is vault/repositories/galaxy/branches/active/yaml_boolean_defaults/.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24365
  record: galaxy/branches/yaml_boolean_defaults
  description: |
    🔀 YAML tools load Boolean `value`, optionality and canonical repeats/sections as the tool models define (#23888). Base `release_26.1`. Draft requested by John.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Merge Branches
- prompt: |
    Let's talk about branch selenium_multiview_copy. The branch record is vault/repositories/galaxy/branches/active/selenium_multiview_copy/.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24334
  record: galaxy/branches/selenium_multiview_copy
  description: |
    🔀 Multiview column test hooks, copy-between-columns helper + E2E tests; fixes target column not refreshing after single-type drops (26.2).
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Merge Branches
- prompt: |
    Let's talk about branch workflow_editor_run_cancel. The branch record is vault/repositories/galaxy/branches/active/workflow_editor_run_cancel/.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24318
  record: galaxy/branches/workflow_editor_run_cancel
  description: |
    🔀 Editor no longer marks a just-opened workflow unsaved; run-from-editor + cancel E2E test; File-input helper fix. Base `release_26.2`.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Merge Branches
- prompt: |
    Let's talk about branch issue_24061_24062_repository_details. The branch record is vault/repositories/galaxy/branches/active/issue_24061_24062_repository_details/.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24298
  record: galaxy/branches/issue_24061_24062_repository_details
  description: |
    🔀 Tool Shed repository page: `hg clone` command, category links, generated `.shed.yml`; API adds `categories`, `clone_url`.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Merge Branches
- prompt: |
    Let's talk about branch invocation_parameter_expected_failure. The branch record is vault/repositories/galaxy/branches/active/invocation_parameter_expected_failure/.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24265
  record: galaxy/branches/invocation_parameter_expected_failure
  description: |
    🔀 Invalid subworkflow parameters fail with their real reason again (#20980 regression) and log at info. Base `release_26.1`.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Merge Branches
- prompt: |
    Let's talk about branch xsd_sample_sheet_collection_type_25.1. The branch record is vault/repositories/galaxy/branches/active/xsd_sample_sheet_collection_type_25.1/.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24206
  record: galaxy/branches/xsd_sample_sheet_collection_type_25.1
  description: |
    🔀 Aligns tool XSD with sample-sheet collection syntax and adds core-tool lint coverage. Base `release_25.1`.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Merge Branches
- prompt: |
    Let's talk about branch invocation_subworkflow_input_connections. The branch record is vault/repositories/galaxy/branches/active/invocation_subworkflow_input_connections/.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24203
  record: galaxy/branches/invocation_subworkflow_input_connections
  description: |
    🔀 Rejects disconnected required subworkflow inputs and fixes runtime diagnostics. Base `release_26.2`.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Merge Branches
- prompt: |
    Let's talk about branch workflow_editor_connection_helpers. The branch record is vault/repositories/galaxy/branches/active/workflow_editor_connection_helpers/.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24370
  record: galaxy/branches/workflow_editor_connection_helpers
  description: |
    🔀 Missing editor E2E tests (refused connections, step removal, unlabelled same-tool steps) + shared connection helpers. Base `release_26.2`.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Merge Branches
```
