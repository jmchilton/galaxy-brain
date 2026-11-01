# Tasks

```gb-tasks
- prompt: Review the dannon review-response revision of selenium_history_filters_ftp_notice in the differential review (rebase, visible:false, remote-files search settle signal), then post or edit the drafted reply in review_response_dannon_1.md.
  agent_dir: gx_branches
  kind: human
  link: https://github.com/galaxyproject/galaxy/pull/24458
  record: galaxy/branches/selenium_history_filters_ftp_notice
- prompt: Review mvdbeek review response on invocation_subworkflow_input_connections in the differential review (revision 14f1310fe20); post the two inline replies and optional PR body edit from review_response_mvdbeek_1.md.
  agent_dir: gx_branches
  kind: human
  link: https://github.com/galaxyproject/galaxy/pull/24203
  record: galaxy/branches/invocation_subworkflow_input_connections
- prompt: Review mvdbeek review response on invocation_parameter_expected_failure in the differential review (revision 33d3a5fa8d2); post inline reply + set milestone.
  agent_dir: gx_branches
  kind: human
  link: https://github.com/galaxyproject/galaxy/pull/24265
  record: galaxy/branches/invocation_parameter_expected_failure
- prompt: Run ./POLISH_BRANCH.md selenium_workflow_preview_import_26.2
  agent_dir: gx_branches
  record: galaxy/branches/selenium_workflow_preview_import_26.2
  description: |
    ✨ Public workflow preview/Run/Import tests + TRS launch-link auto-import and version-alias fixes; baseline first, hardened READY. Base `release_26.2`, head `ef7bf72fdea9`; both browser backends verified.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Polish Branches
- prompt: Run ./POLISH_BRANCH.md issue_24303_collection_type_prefix_26.2
  agent_dir: gx_branches
  record: galaxy/branches/issue_24303_collection_type_prefix_26.2
  description: |
    ✨ `type_prefix` on `type_source` tool output collections (parser/XSD/lint, runtime, workflow server + subworkflow export fix, editor, collection_semantics) + Nest 1.1.0 replacing #24190 (bernt-matthias's commit cherry-picked; 1.0.0 kept) (#24303). Hardened + re-scoped; decisions: #24190 fate, PR split. Base `release_26.2`, head `e0239d8d74b`.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Polish Branches
- prompt: Run ./POLISH_BRANCH.md selenium_apply_rules_nest_menus
  agent_dir: gx_branches
  record: galaxy/branches/selenium_apply_rules_nest_menus
  description: |
    ✨ E2E test for Apply rules driven through the rule builder menus (Basename + nest, then map over); rule-source asserts on GTN rules examples 3/4; single-column rule builder helpers on a navigation target (from `galaxy_ui_driver`). Hardened + re-scoped. Base `release_26.2`, head `c1dc296ac86`.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Polish Branches
- prompt: Run ./POLISH_BRANCH.md vitest_real_api_calls
  agent_dir: gx_branches
  record: galaxy/branches/vitest_real_api_calls
  description: |
    ✨ Records real Galaxy API responses for client tests, starting with history and quota usage.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Polish Branches
- prompt: Run ./POLISH_BRANCH.md issue_24530_atomic_embedded_tool_import_26.1
  agent_dir: gx_branches
  record: galaxy/branches/issue_24530_atomic_embedded_tool_import_26.1
  description: |
    ✨ Failed workflow import/update/shared copy rolls back embedded tools (DB + toolbox) (#24530). Stacked on `workflow_import_embedded_tools` (#24475).
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Polish Branches
- prompt: Run ./POLISH_BRANCH.md converted_dataset_lookup_via_manager_26.0
  agent_dir: gx_branches
  record: galaxy/branches/converted_dataset_lookup_via_manager_26.0
  description: |
    ✨ Existing implicit conversions looked up via `DatasetAssociationManager.get_accessible_converted`.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Polish Branches
- prompt: De-conflict branch extract_next_followups. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/extract_next_followups/. Rebase it onto its actual base branch (`parent_branch` when present, otherwise `upstream_base_branch`, per ../_shared/REPOSITORY_BRANCHES.md), reconciling any disagreement with the PR's `baseRefName` first. Resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease` to the `jmchilton` fork, update the SHA in the branch record and queue, and take a `revision` snapshot per ../_shared/PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md.
  agent_dir: gx_branches
  profile: Sonnet (high)
  link: https://github.com/galaxyproject/galaxy/pull/24225
  record: galaxy/branches/extract_next_followups
  description: |
    🔀 Fixes notebook-to-workflow extraction, report references and editor behavior after #22860. Base `release_26.2`; must merge before 26.2.0 (API rename). [#24225](https://github.com/galaxyproject/galaxy/pull/24225). Draft [WIP] by John's request: up early while they review it in detail.
    Conflicts: lib/galaxy/schema/workflows.py, lib/galaxy/webapps/galaxy/services/workflows.py, lib/galaxy/workflow/extract.py, lib/galaxy_test/api/test_pages_history_attached.py, lib/galaxy_test/api/test_workflow_extraction.py
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#De-conflict Branches
- prompt: De-conflict branch subworkflow_mapping. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/subworkflow_mapping/. Rebase it onto its actual base branch (`parent_branch` when present, otherwise `upstream_base_branch`, per ../_shared/REPOSITORY_BRANCHES.md), reconciling any disagreement with the PR's `baseRefName` first. Resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease` to the `jmchilton` fork, update the SHA in the branch record and queue, and take a `revision` snapshot per ../_shared/PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md.
  agent_dir: gx_branches
  profile: Sonnet (high)
  link: https://github.com/galaxyproject/galaxy/pull/23676
  record: galaxy/branches/subworkflow_mapping
  description: |
    🔀 Brings subworkflow mapping inline between the workflow editor and the backend. [#23676](https://github.com/galaxyproject/galaxy/pull/23676).
    Conflicts: client/src/components/Workflow/Editor/test-data/parameter_steps.json, lib/galaxy/tool_util_models/__init__.py, lib/galaxy/workflow/modules.py, mypy.ini, test/unit/workflows/test_modules.py
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#De-conflict Branches
- prompt: De-conflict branch wf_tool_state. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/wf_tool_state/. Rebase it onto its actual base branch (`parent_branch` when present, otherwise `upstream_base_branch`, per ../_shared/REPOSITORY_BRANCHES.md), reconciling any disagreement with the PR's `baseRefName` first. Resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease` to the `jmchilton` fork, update the SHA in the branch record and queue, and take a `revision` snapshot per ../_shared/PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md.
  agent_dir: gx_branches
  profile: Sonnet (high)
  link: https://github.com/galaxyproject/galaxy/pull/22996
  record: galaxy/branches/wf_tool_state
  description: |
    🔀 Adds gxwf CLI tooling for validating and converting stateful workflows. [#22996](https://github.com/galaxyproject/galaxy/pull/22996).
    Conflicts: .github/workflows/framework_workflows.yaml, lib/galaxy/model/dataset_collections/type_description.py, lib/galaxy_test/base/populators.py, pyproject.toml
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#De-conflict Branches
- prompt: De-conflict branch fix_copied_datasets. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/fix_copied_datasets/. Rebase it onto its actual base branch (`parent_branch` when present, otherwise `upstream_base_branch`, per ../_shared/REPOSITORY_BRANCHES.md), reconciling any disagreement with the PR's `baseRefName` first. Resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease` to the `jmchilton` fork, update the SHA in the branch record and queue, and take a `revision` snapshot per ../_shared/PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md.
  agent_dir: gx_branches
  profile: Sonnet (high)
  link: https://github.com/galaxyproject/galaxy/pull/21806
  record: galaxy/branches/fix_copied_datasets
  description: |
    🔀 Fixes workflow extraction for datasets copied across histories. [#21806](https://github.com/galaxyproject/galaxy/pull/21806).
    Conflicts: lib/galaxy/workflow/extract.py, lib/galaxy_test/api/test_workflow_extraction.py, test/unit/workflows/test_extract_summary.py
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#De-conflict Branches
- prompt: De-conflict branch vitest_readability. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/vitest_readability/. Rebase it onto its actual base branch (`parent_branch` when present, otherwise `upstream_base_branch`, per ../_shared/REPOSITORY_BRANCHES.md), reconciling any disagreement with the PR's `baseRefName` first. Resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease` to the `jmchilton` fork, update the SHA in the branch record and queue, and take a `revision` snapshot per ../_shared/PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md.
  agent_dir: gx_branches
  profile: Sonnet (high)
  link: https://github.com/galaxyproject/galaxy/pull/24038
  record: galaxy/branches/vitest_readability
  description: |
    🔀 Rewrites client tests for readability, shared fixtures and stronger assertions. [#24038](https://github.com/galaxyproject/galaxy/pull/24038).
    Conflicts: 28 client test files (e.g. client/src/api/client/rateLimiter.test.ts, GButton.test.ts, DatasetView.test.js)
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#De-conflict Branches
- prompt: De-conflict branch vitest_story_play. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/vitest_story_play/. Rebase it onto its actual base branch (`parent_branch` when present, otherwise `upstream_base_branch`, per ../_shared/REPOSITORY_BRANCHES.md), reconciling any disagreement with the PR's `baseRefName` first. Resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease` to the `jmchilton` fork, update the SHA in the branch record and queue, and take a `revision` snapshot per ../_shared/PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md.
  agent_dir: gx_branches
  profile: Sonnet (high)
  link: https://github.com/galaxyproject/galaxy/pull/24300
  record: galaxy/branches/vitest_story_play
  description: |
    🔀 Storybook stories, browser plays and accessibility checks for richer client-test review. [#24300](https://github.com/galaxyproject/galaxy/pull/24300). Keep draft RFC per John.
    Conflicts: 34 files (client/pnpm-lock.yaml plus client test files, e.g. rateLimiter.test.ts, GButton.test.ts)
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#De-conflict Branches
- prompt: De-conflict branch collection_restructure_panel. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/collection_restructure_panel/. Rebase it onto its actual base branch (`parent_branch` when present, otherwise `upstream_base_branch`, per ../_shared/REPOSITORY_BRANCHES.md), reconciling any disagreement with the PR's `baseRefName` first. Resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease` to the `jmchilton` fork, update the SHA in the branch record and queue, and take a `revision` snapshot per ../_shared/PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md.
  agent_dir: gx_branches
  profile: Sonnet (high)
  link: https://github.com/galaxyproject/galaxy/pull/12238
  record: galaxy/branches/collection_restructure_panel
  description: |
    🔀 Adds a panel for transforming dataset collection layouts. [#12238](https://github.com/galaxyproject/galaxy/pull/12238).
    Conflicts: client/src/components/History/ContentItem/DatasetCollection/DscMenu.vue, DscUI.vue, doc/source/dev/debugging_galaxy.md, debugging_tests.md
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#De-conflict Branches
- prompt: De-conflict branch pulsar-mq-pull. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/pulsar-mq-pull/. Rebase it onto its actual base branch (`parent_branch` when present, otherwise `upstream_base_branch`, per ../_shared/REPOSITORY_BRANCHES.md), reconciling any disagreement with the PR's `baseRefName` first. Resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease` to the `jmchilton` fork, update the SHA in the branch record and queue, and take a `revision` snapshot per ../_shared/PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md.
  agent_dir: gx_branches
  profile: Sonnet (high)
  link: https://github.com/galaxyproject/galaxy/pull/9911
  record: galaxy/branches/pulsar-mq-pull
  description: |
    🔀 Polls for Pulsar MQ jobs missed by normal event handling. [#9911](https://github.com/galaxyproject/galaxy/pull/9911).
    Conflicts: lib/galaxy/jobs/__init__.py, lib/galaxy/jobs/runners/__init__.py, lib/galaxy/jobs/runners/pulsar.py
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#De-conflict Branches
- prompt: Respond to davelopez's review of galaxyproject/galaxy#24482 (branch selenium_faq_account_workflow_display_26.2) per ../_shared/RESPOND_TO_REVIEW.md. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/selenium_faq_account_workflow_display_26.2/.
  agent_dir: gx_branches
  profile: Opus (low)
  link: https://github.com/galaxyproject/galaxy/pull/24482
  record: galaxy/branches/selenium_faq_account_workflow_display_26.2
  description: |
    🙇 FAQ account/storage, workflow editor and populated/empty display-catalog tests and helpers. Base `release_26.2`. [#24482](https://github.com/galaxyproject/galaxy/pull/24482).
    davelopez: review with 2 unresolved inline threads (2026-10-30).
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Respond to Review (deferential)
- prompt: Respond to davelopez's review of galaxyproject/galaxy#24329 (branch selenium_history_datatype_citations) per ../_shared/RESPOND_TO_REVIEW.md. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/selenium_history_datatype_citations/.
  agent_dir: gx_branches
  profile: Opus (low)
  link: https://github.com/galaxyproject/galaxy/pull/24329
  record: galaxy/branches/selenium_history_datatype_citations
  description: |
    🙇 Browser tests for bulk Change data type, Change Database/Build and history Export Tool References (26.2). [#24329](https://github.com/galaxyproject/galaxy/pull/24329).
    davelopez: comment after approval (2026-10-28).
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Respond to Review (deferential)
- prompt: Respond to davelopez's review of galaxyproject/galaxy#24458 (branch selenium_history_filters_ftp_notice) per ../_shared/RESPOND_TO_REVIEW.md. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/selenium_history_filters_ftp_notice/.
  agent_dir: gx_branches
  profile: Opus (low)
  link: https://github.com/galaxyproject/galaxy/pull/24458
  record: galaxy/branches/selenium_history_filters_ftp_notice
  description: |
    🙇 Restores FTP guidance and wraps upload-browser names; adds history and remote-folder tests. Base `release_26.2`. [#24458](https://github.com/galaxyproject/galaxy/pull/24458).
    davelopez: comment after approval (2026-10-30).
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Respond to Review (deferential)
- prompt: Let's talk about branch issue_24481_sample_sheet_mapped_output_type_26_0. The branch record is vault/repositories/galaxy/branches/active/issue_24481_sample_sheet_mapped_output_type_26_0/.
  agent_dir: gx_branches
  record: galaxy/branches/issue_24481_sample_sheet_mapped_output_type_26_0
  description: |
    🤔 Mapping over sample sheets no longer composes invalid types like `sample_sheet:list` (#24481): every invalid `sample_sheet` rank is demoted to `list` with its columns dropped, at runtime, in the editor and in subworkflow typing (re-scoped, re-hardened, BLOCKED). Base `release_26.0`, head `129e3244b7b`. Decision: second scope evaluation says also demote job-created `type_source` children in `create_collection` (Scope B+, ~3 lines plus an API test), or leave that to #24303/#24308, or ship the original-scope alt?
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: Let's talk about branch fix_markdown_cell_menu_focus. The branch record is vault/repositories/galaxy/branches/active/fix_markdown_cell_menu_focus/.
  agent_dir: gx_branches
  record: galaxy/branches/fix_markdown_cell_menu_focus
  description: |
    🤔 Markdown editor cell menus return focus to their trigger after selection (Popper `close()`, native-like ButtonPlain keys), and Move keeps focus on the moved cell (#24335). Hardened; BLOCKED only on environment: the E2E test and screenshots need a browser-capable host (no libatk/libgtk here). Suggested action: run E2E + screenshots there, apply the force-push baseline reorder from `baseline_refactor.md`, then treat as ready. Base `release_26.2`, head `e6e9f38d6a3`.
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: Let's talk about branch yaml_tool_model_validation_26.1. The branch record is vault/repositories/galaxy/branches/active/yaml_tool_model_validation_26.1/.
  agent_dir: gx_branches
  record: galaxy/branches/yaml_tool_model_validation_26.1
  description: |
    🤔 Next #23888 chunk: `class: GalaxyTool` YAML validates against its authoring model on every load path (legacy dialect rejected, stored rows fail loud), strict admin outputs, no scalar/container-requirement outputs, citations + hidden collections load, YAML tool tests verify collections/stdout (re-scoped, re-hardened, BLOCKED). Base `release_26.1`, head `6c43b516f4d`. Decision: second scope eval says resolve user-tool citations by uuid (Scope 2) or stop loading `GalaxyUserTool` citations (Scope 3); split into 2–3 PRs?
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: Let's talk about branch invocation_graph_embedded_outputs. The branch record is vault/repositories/galaxy/branches/active/invocation_graph_embedded_outputs/.
  agent_dir: gx_branches
  record: galaxy/branches/invocation_graph_embedded_outputs
  description: |
    🤔 Spike: outputs inside the invocation graph (hover preview; workflow outputs as large embedded nodes with nudge-only layout; per-step preferred output). Base `dev`, head `3e4312f7c1d`; browser-checked on a 10-step workflow. Decision: go/no-go on nudging (right mode is recognizable but fits at 40–50% zoom); split into per-stage PRs?
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: Let's talk about branch issue_20657_input_processing_mode. The branch record is vault/repositories/galaxy/branches/active/issue_20657_input_processing_mode/.
  agent_dir: gx_branches
  record: galaxy/branches/issue_20657_input_processing_mode
  description: |
    🤔 Explains tool input batching and collection mapping, and fixes collection-type matching (#20657) (re-hardened, re-scoped). Decision: second scope eval says expand (pin off-page HDCA selection on refresh); split? Head `10ae420a663`.
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: Let's talk about branch issue_24219_pin_offpage_collections_26.1. The branch record is vault/repositories/galaxy/branches/active/issue_24219_pin_offpage_collections_26.1/.
  agent_dir: gx_branches
  record: galaxy/branches/issue_24219_pin_offpage_collections_26.1
  description: |
    🤔 Tool form keeps a selected collection that isn't on the first option page across refreshes (#24219). Base `release_26.1`, head `00cf6f95004`; hardened. Decision: ship as is; scope-eval expansion split into `issue_24219_foreign_collection_carry_26.1`.
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: Let's talk about branch issue_24219_foreign_collection_carry_26.1. The branch record is vault/repositories/galaxy/branches/active/issue_24219_foreign_collection_carry_26.1/.
  agent_dir: gx_branches
  record: galaxy/branches/issue_24219_foreign_collection_carry_26.1
  description: |
    🤔 26.1 backport of #23865 (visible-only collection select; carry hidden/deleted/other-history selection) plus map-over classification for collection and multiple data inputs. Base `release_26.1`, head `f54b3a9b9af`; re-scoped, re-hardened, BLOCKED. Decision: cross-user carry.
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: Let's talk about branch issue_23424_when_expression_validation. The branch record is vault/repositories/galaxy/branches/active/issue_23424_when_expression_validation/.
  agent_dir: gx_branches
  record: galaxy/branches/issue_23424_when_expression_validation
  description: |
    🤔 Rejects obsolete flat nested tool-input references. Closed #23817: revive/reopen or abandon. [#23817](https://github.com/galaxyproject/galaxy/pull/23817).
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: Let's talk about branch workflow_input_pipe_names. The branch record is vault/repositories/galaxy/branches/active/workflow_input_pipe_names/.
  agent_dir: gx_branches
  record: galaxy/branches/workflow_input_pipe_names
  description: |
    🤔 Reserves pipes in input names, with three possible correction scopes. Decision: Choose validation-only, top-level correction, or nested correction.
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: Let's talk about branch subworkflow_mapping_when_alignment. The branch record is vault/repositories/galaxy/branches/active/subworkflow_mapping_when_alignment/.
  agent_dir: gx_branches
  record: galaxy/branches/subworkflow_mapping_when_alignment
  description: |
    🤔 Aligns mapped subworkflow `when` values with compatible collection inputs. Decision: Decide whether #23676 supersedes this work.
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: Let's talk about branch workflow_run_exposed_step_params. The branch record is vault/repositories/galaxy/branches/active/workflow_run_exposed_step_params/.
  agent_dir: gx_branches
  record: galaxy/branches/workflow_run_exposed_step_params
  description: |
    🤔 Spike: expose individual step params in the simple run form (picker, cards, `step_param` links, rerun re-show, "rerun with this changed"), plus strict keys (G1), job param paths (G2) and recorded exposed keys (G4). On the #24177 stack, head `147dac7222a`; 5 E2E tests pass. Decision: file RERUN_ISSUE with the edits in [LESSONS_LEARNED](../../../projects/workflow_applications/LESSONS_LEARNED.md); spike, do not PR as-is.
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: Let's talk about branch workflow_rerun_step_parameters. The branch record is vault/repositories/galaxy/branches/active/workflow_rerun_step_parameters/.
  agent_dir: gx_branches
  record: galaxy/branches/workflow_rerun_step_parameters
  description: |
    🤔 Spike: step params survive rerun, subworkflow export and invocation import; full run form prefilled. Decision: split into 4 issues; server-seeded vs client-merged prefill. Spike, do not PR as-is.
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: Let's talk about branch invocation_no_add_to_history_false. The branch record is vault/repositories/galaxy/branches/active/invocation_no_add_to_history_false/.
  agent_dir: gx_branches
  record: galaxy/branches/invocation_no_add_to_history_false
  description: |
    🤔 Fixes invocations built to the published types (`no_add_to_history`, empty `ds_map`) and the TS root cause. Base `release_26.2`. Decision: John posted a [decision gist](https://gist.github.com/jmchilton/c68c645a8fa6d8da58af9a5e70f060c1); waiting for someone to okay this or the 26.1 server-only approach.
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: Let's talk about branch invocation_no_add_to_history_false_26.1. The branch record is vault/repositories/galaxy/branches/active/invocation_no_add_to_history_false_26.1/.
  agent_dir: gx_branches
  record: galaxy/branches/invocation_no_add_to_history_false_26.1
  description: |
    🤔 Server-only `no_add_to_history` and empty-`ds_map` invocation fixes for 26.1. Base `release_26.1`. Decision: same [decision gist](https://gist.github.com/jmchilton/c68c645a8fa6d8da58af9a5e70f060c1); waiting for an okay on this or the 26.2 approach.
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: Let's talk about branch toolshed_repository_contents. The branch record is vault/repositories/galaxy/branches/active/toolshed_repository_contents/.
  agent_dir: gx_branches
  record: galaxy/branches/toolshed_repository_contents
  description: |
    🤔 Adds a bounded repository-files API and Tool Shed contents browser (#22598). Base `dev`. Decision: how to satisfy mvdbeek's performance concerns. [#24167](https://github.com/galaxyproject/galaxy/pull/24167).
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: Let's talk about branch issue_24389_duplicate_test_params_26.1. The branch record is vault/repositories/galaxy/branches/active/issue_24389_duplicate_test_params_26.1/.
  agent_dir: gx_branches
  record: galaxy/branches/issue_24389_duplicate_test_params_26.1
  description: |
    🤔 Conflicting duplicate tool-test params raise "Ambiguous" instead of silently keeping one; `<edit_attributes>` stored as dicts (#24389). Base `release_26.1`. Closed [#24450](https://github.com/galaxyproject/galaxy/pull/24450): split into the `_lint_` 26.1 and `_reject_` 26.2 branches. Decision: abandon or keep as reference.
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: Let's talk about branch issue_24546_cache_monitor_default_26.2. The branch record is vault/repositories/galaxy/branches/active/issue_24546_cache_monitor_default_26.2/.
  agent_dir: gx_branches
  record: galaxy/branches/issue_24546_cache_monitor_default_26.2
  description: |
    🤔 With Celery off, caching object stores run the in-process cache monitor that `auto` documents; daemon/robust monitor thread; iRODS/pithos wired (#24546). Base `release_26.2`, head `6fe63109810`; re-scoped, re-hardened, BLOCKED. Decision: second scope eval says expand (pithos XML `<cache>` parsing; base-class monitor lifecycle - suggest pithos here, lifecycle as dev follow-up).
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: Let's talk about branch issue_24350_has_line_matching_docs_26_1. The branch record is vault/repositories/galaxy/branches/active/issue_24350_has_line_matching_docs_26_1/.
  agent_dir: gx_branches
  record: galaxy/branches/issue_24350_has_line_matching_docs_26_1
  description: |
    🤔 `has_line_matching` wraps as `^(?:e)$` so alternation stays line-anchored; per-assertion regex docs for `has_line_matching`/`has_text_matching`/`element_text_matches`/`attribute_matches`/`has_n_columns`; XSD/models/client schemas regenerated (#24350). Base `release_26.1`, head `c566eeb1d53` (6 `fixup!`s to autosquash); re-scoped, re-hardened, BLOCKED. Decision: second scope eval says fold in the `element_text_is`/`attribute_is` missing-`^` fix; release-branch behavior change breaks 2 galaxytools tests (docs-only alt `_alt_original_scope` kept).
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: Let's talk about branch issue_24529_custom_build_fasta_history_26.0. The branch record is vault/repositories/galaxy/branches/active/issue_24529_custom_build_fasta_history_26.0/.
  agent_dir: gx_branches
  record: galaxy/branches/issue_24529_custom_build_fasta_history_26.0
  description: |
    🤔 API-key conversions (custom build from FASTA #24529, `converted/{ext}`, feature search) run in a user-owned active history. Closed [#24578](https://github.com/galaxyproject/galaxy/pull/24578) after mvdbeek asked callers pass a history/session: revive/reopen or abandon.
  status: idea
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Decide Branches
- prompt: Let's talk about branch issue_23980_static_restriction_default. The branch record is vault/repositories/galaxy/branches/active/issue_23980_static_restriction_default/.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24140
  record: galaxy/branches/issue_23980_static_restriction_default
  description: |
    🔀 Preselects restricted text-input defaults and permits a default empty option on 26.2. [#24140](https://github.com/galaxyproject/galaxy/pull/24140).
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Merge Branches
- prompt: Let's talk about branch selenium_collection_build_convert. The branch record is vault/repositories/galaxy/branches/active/selenium_collection_build_convert/.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24341
  record: galaxy/branches/selenium_collection_build_convert
  description: |
    🔀 Fixes Convert Collection always enabled; E2E tests for list building and collection conversion. Base `release_26.2`. [#24341](https://github.com/galaxyproject/galaxy/pull/24341).
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Merge Branches
- prompt: Let's talk about branch selenium_data_formats_interval_columns. The branch record is vault/repositories/galaxy/branches/active/selenium_data_formats_interval_columns/.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24439
  record: galaxy/branches/selenium_data_formats_interval_columns
  description: |
    🔀 Add missing E2E tests: tool form accepted formats, Attributes tab interval columns; shared `form_element_*` read/set helpers. [#24439](https://github.com/galaxyproject/galaxy/pull/24439).
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Merge Branches
- prompt: Let's talk about branch selenium_history_import_purge. The branch record is vault/repositories/galaxy/branches/active/selenium_history_import_purge/.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24440
  record: galaxy/branches/selenium_history_import_purge
  description: |
    🔀 Add missing 26.2 E2E tests for shared history import and histories list bulk purge. Base `release_26.2`. [#24440](https://github.com/galaxyproject/galaxy/pull/24440).
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Merge Branches
- prompt: Let's talk about branch issue_24188_subworkflow_rename_expression_json. The branch record is vault/repositories/galaxy/branches/active/issue_24188_subworkflow_rename_expression_json/.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24224
  record: galaxy/branches/issue_24188_subworkflow_rename_expression_json
  description: |
    🔀 `${label}` renames inside subworkflows use expression.json values, not HDA reprs (#24188). Base `release_26.1`. [#24224](https://github.com/galaxyproject/galaxy/pull/24224).
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Merge Branches
- prompt: Let's talk about branch selenium_dataset_tags_auto_detect. The branch record is vault/repositories/galaxy/branches/active/selenium_dataset_tags_auto_detect/.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24347
  record: galaxy/branches/selenium_dataset_tags_auto_detect
  description: |
    🔀 Missing E2E tests: history item Add Tags reaching a tool output, Attributes tab metadata Auto-detect. Base `release_26.2`. [#24347](https://github.com/galaxyproject/galaxy/pull/24347).
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Merge Branches
- prompt: Let's talk about branch workflow_fetch_abstractions_25.1. The branch record is vault/repositories/galaxy/branches/active/workflow_fetch_abstractions_25.1/.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24477
  record: galaxy/branches/workflow_fetch_abstractions_25.1
  description: |
    🔀 Owned/accessible getters for workflow show, update, refactor, delete and menu; non-owners can no longer edit. Base `release_25.1`, head `fac396515e4`. [#24477](https://github.com/galaxyproject/galaxy/pull/24477).
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Merge Branches
- prompt: Let's talk about branch selenium_tool_form_use_cached_job. The branch record is vault/repositories/galaxy/branches/active/selenium_tool_form_use_cached_job/.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24451
  record: galaxy/branches/selenium_tool_form_use_cached_job
  description: |
    🔀 Missing E2E test of the tool form's re-use equivalent jobs switch + `tool_form_set_switch` helper. [#24451](https://github.com/galaxyproject/galaxy/pull/24451).
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Merge Branches
- prompt: Let's talk about branch workflow_editor_run_cancel. The branch record is vault/repositories/galaxy/branches/active/workflow_editor_run_cancel/.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24318
  record: galaxy/branches/workflow_editor_run_cancel
  description: |
    🔀 Editor no longer marks a just-opened workflow unsaved; run-from-editor + cancel E2E test; File-input helper fix. Base `release_26.2`. [#24318](https://github.com/galaxyproject/galaxy/pull/24318).
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Merge Branches
- prompt: "Read `blockers/deployment_test_fixes_merged/previous_session.md`. Parent PR galaxyproject/galaxy#24489 is merged. For branch `deployment_test_docs_decorators_26_2` (record vault/repositories/galaxy/branches/active/deployment_test_docs_decorators_26_2): rebase onto `origin/release_26.2` dropping parent commits, push to jmchilton fork, remove `parent_branch` from the record's index.md and fix the Open PR compare link in the record and MY_BRANCHES.md, then check fork CI and report. Finally delete `blockers/deployment_test_fixes_merged/` and the record's `blocker:` line."
  agent_dir: gx_branches
  record: galaxy/branches/deployment_test_docs_decorators_26_2
  description: |
    🔓 deployment_test_fixes_merged: galaxyproject/galaxy#24489 (`deployment_test_fixes_26_2`) is merged.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Unblocked
```
