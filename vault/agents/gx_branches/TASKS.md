# Tasks

```gb-tasks
- prompt: De-conflict branch vitest_readability. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/vitest_readability/. Rebase it onto its actual base branch (`parent_branch` when present, otherwise `upstream_base_branch`, per ../_shared/REPOSITORY_BRANCHES.md), reconciling any disagreement with the PR's `baseRefName` first. Resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease` to the `jmchilton` fork, update the SHA in the branch record and queue, and take a `revision` snapshot per ../_shared/PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24038
  record: galaxy/branches/vitest_readability
  profile: Sonnet (high)
  description: |
    🔀 Rewrites client tests for readability, shared fixtures and stronger assertions. Conflicts: 7 test files (DatasetView, HistoryDatasetDisplay, SelectionDialog, Editor Index, WorkflowList, historyStore, ...)
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#De-conflict Branches
- prompt: De-conflict branch fix_copied_datasets. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/fix_copied_datasets/. Rebase it onto its actual base branch (`parent_branch` when present, otherwise `upstream_base_branch`, per ../_shared/REPOSITORY_BRANCHES.md), reconciling any disagreement with the PR's `baseRefName` first. Resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease` to the `jmchilton` fork, update the SHA in the branch record and queue, and take a `revision` snapshot per ../_shared/PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/21806
  record: galaxy/branches/fix_copied_datasets
  profile: Sonnet (high)
  description: |
    🔀 Fixes workflow extraction for datasets copied across histories. Conflicts: extract.py, test_workflow_extraction.py, test_extract_summary.py
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#De-conflict Branches
- prompt: De-conflict branch collection_restructure_panel. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/collection_restructure_panel/. Rebase it onto its actual base branch (`parent_branch` when present, otherwise `upstream_base_branch`, per ../_shared/REPOSITORY_BRANCHES.md), reconciling any disagreement with the PR's `baseRefName` first. Resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease` to the `jmchilton` fork, update the SHA in the branch record and queue, and take a `revision` snapshot per ../_shared/PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/12238
  record: galaxy/branches/collection_restructure_panel
  profile: Sonnet (high)
  description: |
    🔀 Adds a panel for transforming dataset collection layouts. Conflicts: DscMenu.vue, DscUI.vue, debugging_galaxy.md, debugging_tests.md
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#De-conflict Branches
- prompt: De-conflict branch pulsar-mq-pull. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/pulsar-mq-pull/. Rebase it onto its actual base branch (`parent_branch` when present, otherwise `upstream_base_branch`, per ../_shared/REPOSITORY_BRANCHES.md), reconciling any disagreement with the PR's `baseRefName` first. Resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease` to the `jmchilton` fork, update the SHA in the branch record and queue, and take a `revision` snapshot per ../_shared/PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/9911
  record: galaxy/branches/pulsar-mq-pull
  profile: Sonnet (high)
  description: |
    🔀 Polls for Pulsar MQ jobs missed by normal event handling. Conflicts: jobs/__init__.py, runners/__init__.py, runners/pulsar.py
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#De-conflict Branches
- prompt: Run ./POLISH_BRANCH.md vitest_real_api_calls
  agent_dir: gx_branches
  record: galaxy/branches/vitest_real_api_calls
  description: |
    ✨ Records real Galaxy API responses for client tests, starting with history and quota usage.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Polish Branches
- prompt: Run ./POLISH_BRANCH.md issue_24178_subworkflow_step_params_export
  agent_dir: gx_branches
  record: galaxy/branches/issue_24178_subworkflow_step_params_export
  description: |
    ✨ Exports subworkflow step params as `<index>|name`; unknown/malformed keys 400; shared step-param row resolver (#24178).
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Polish Branches
- prompt: Run ./POLISH_BRANCH.md issue_24175_imported_invocation_step_params
  agent_dir: gx_branches
  record: galaxy/branches/issue_24175_imported_invocation_step_params
  description: |
    ✨ Re-keys step params on invocation import so Rerun of imported runs works (#24175). Stacked on `issue_24178_subworkflow_step_params_export`.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Polish Branches
- prompt: Run ./POLISH_BRANCH.md workflow_step_parameter_overrides
  agent_dir: gx_branches
  record: galaxy/branches/workflow_step_parameter_overrides
  description: |
    ✨ Nested `step_parameter_overrides` run field; run-form picker with pop-out workflow view (#24454).
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Polish Branches
- prompt: Run ./POLISH_BRANCH.md vitest_story_foundation
  agent_dir: gx_branches
  record: galaxy/branches/vitest_story_foundation
  description: |
    ✨ Client test readability guidance, Storybook stories/plays/a11y infra, two examples and blocking browser CI.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Polish Branches
- prompt: Run ./POLISH_BRANCH.md deployment_test_docs_decorators_26_2
  agent_dir: gx_branches
  record: galaxy/branches/deployment_test_docs_decorators_26_2
  description: |
    ✨ Documents deployment tests and adds a decorator audit skill. Stacked on `deployment_test_fixes_26_2`.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Polish Branches
- prompt: Run ./POLISH_BRANCH.md issue_23902_qualified_output_references
  agent_dir: gx_branches
  record: galaxy/branches/issue_23902_qualified_output_references
  description: |
    ✨ From 26.2, unqualified `format_source`/`metadata_source` fail tool load; runtime skips legacy aliases (fixes #23902).
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Polish Branches
- prompt: Run ./POLISH_BRANCH.md resubmit_static_chain_test_26.1
  agent_dir: gx_branches
  record: galaxy/branches/resubmit_static_chain_test_26.1
  description: |
    ✨ Tests repeated resubmission through static destinations with per-hop environment values.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Polish Branches
- prompt: Run ./POLISH_BRANCH.md api_gotchas
  agent_dir: gx_branches
  record: galaxy/branches/api_gotchas
  description: |
    ✨ Documents API client best practices for external projects, plus a review rubric for API-driven work.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Polish Branches
- prompt: Run ./POLISH_BRANCH.md selenium_workflow_preview_import_26.2
  agent_dir: gx_branches
  record: galaxy/branches/selenium_workflow_preview_import_26.2
  description: |
    ✨ Public workflow preview/Run/Import tests + TRS launch-link auto-import and version-alias fixes. Base `release_26.2`.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Polish Branches
- prompt: Run ./POLISH_BRANCH.md issue_24303_collection_type_prefix_26.2
  agent_dir: gx_branches
  record: galaxy/branches/issue_24303_collection_type_prefix_26.2
  description: |
    ✨ `type_prefix` on `type_source` tool output collections + Nest 1.1.0 replacing #24190 (#24303). Decisions: #24190 fate, PR split.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Polish Branches
- prompt: Run ./POLISH_BRANCH.md selenium_apply_rules_nest_menus
  agent_dir: gx_branches
  record: galaxy/branches/selenium_apply_rules_nest_menus
  description: |
    ✨ E2E test for Apply rules through the rule builder menus; single-column rule builder helpers. Base `release_26.2`.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Polish Branches
- prompt: Run ./POLISH_BRANCH.md converted_dataset_lookup_via_manager_26.0
  agent_dir: gx_branches
  record: galaxy/branches/converted_dataset_lookup_via_manager_26.0
  description: |
    ✨ Existing implicit conversions looked up via `DatasetAssociationManager.get_accessible_converted`. Polish paused, awaiting John's decisions.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Polish Branches
- prompt: Run ./POLISH_BRANCH.md harden_url_abstractions_25.1
  agent_dir: gx_branches
  record: galaxy/branches/harden_url_abstractions_25.1
  description: |
    ✨ `validate_non_local` reads schemes/hosts like requests/urllib; every hop of http file source, TRS servers and remote ZIP validated. Fork CI green.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Polish Branches
- prompt: De-conflict branch issue_3899_pulsar_container_deps. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/issue_3899_pulsar_container_deps/. Rebase it onto its actual base branch (`parent_branch` when present, otherwise `upstream_base_branch`, per ../_shared/REPOSITORY_BRANCHES.md), reconciling any disagreement with the PR's `baseRefName` first. Resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease` to the `jmchilton` fork, update the SHA in the branch record and queue, and take a `revision` snapshot per ../_shared/PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24555
  record: galaxy/branches/issue_3899_pulsar_container_deps
  profile: Sonnet (high)
  priority: high
  description: |
    🔀 Respects a Pulsar container job's dependency-resolution opt-in (#3899). Conflicting files: see PR.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#De-conflict Branches
- prompt: De-conflict branch issue_24173_invocation_selection_urls. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/issue_24173_invocation_selection_urls/. Rebase it onto its actual base branch (`parent_branch` when present, otherwise `upstream_base_branch`, per ../_shared/REPOSITORY_BRANCHES.md), reconciling any disagreement with the PR's `baseRefName` first. Resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease` to the `jmchilton` fork, update the SHA in the branch record and queue, and take a `revision` snapshot per ../_shared/PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24307
  record: galaxy/branches/issue_24173_invocation_selection_urls
  profile: Sonnet (high)
  priority: high
  description: |
    🔀 Makes invocation step, job and output selections shareable through URLs (#24173). Conflicting files: see PR.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#De-conflict Branches
- prompt: Respond to mvdbeek's review of galaxyproject/galaxy#24742 (branch issue_24722_unversioned_tool_preflight_26_2) per ../_shared/RESPOND_TO_REVIEW.md. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/issue_24722_unversioned_tool_preflight_26_2/.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24742
  record: galaxy/branches/issue_24722_unversioned_tool_preflight_26_2
  profile: Opus (low)
  description: |
    🙇 Exact-version invocation/update accept unversioned shed ids. mvdbeek asks to review and pull in jmchilton/galaxy#98.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Respond to Review (deferential)
- prompt: Let's talk about branch selenium_dataset_tags_auto_detect. The branch record is vault/repositories/galaxy/branches/active/selenium_dataset_tags_auto_detect/.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24347
  record: galaxy/branches/selenium_dataset_tags_auto_detect
  description: |
    🔀 Missing E2E tests: history item Add Tags, Attributes tab Auto-detect. Approved by mvdbeek; CI green.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Merge Branches
- prompt: Show me the drafted reply in review_pushback_dannon_1.md for galaxyproject/galaxy#24349 (branch issue_24328_data_table_mismatch_26.1). Post it with the agent marker per ../_shared/AGENT_MARKERS.md once I say go.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24349
  record: galaxy/branches/issue_24328_data_table_mismatch_26.1
  profile: Opus (low)
  description: |
    📮 Conflicting shed data table halts startup with an actionable error (#24328). dannon approved; reply to review 1 awaits posting.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Post Drafted Review Replies
- prompt: De-conflict branch wf_tool_state. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/wf_tool_state/. Rebase it onto its actual base branch (`parent_branch` when present, otherwise `upstream_base_branch`, per ../_shared/REPOSITORY_BRANCHES.md), reconciling any disagreement with the PR's `baseRefName` first. Resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease` to the `jmchilton` fork, update the SHA in the branch record and queue, and take a `revision` snapshot per ../_shared/PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/22996
  record: galaxy/branches/wf_tool_state
  profile: Sonnet (high)
  description: |
    🔀 Adds gxwf CLI tooling for validating and converting stateful workflows. Conflicts: see PR.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#De-conflict Branches
- prompt: De-conflict branch subworkflow_mapping. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/subworkflow_mapping/. Rebase it onto its actual base branch (`parent_branch` when present, otherwise `upstream_base_branch`, per ../_shared/REPOSITORY_BRANCHES.md), reconciling any disagreement with the PR's `baseRefName` first. Resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease` to the `jmchilton` fork, update the SHA in the branch record and queue, and take a `revision` snapshot per ../_shared/PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/23676
  record: galaxy/branches/subworkflow_mapping
  profile: Sonnet (high)
  description: |
    🔀 Brings subworkflow mapping inline between the workflow editor and the backend. Conflicts: see PR.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#De-conflict Branches
- prompt: De-conflict branch vitest_story_play. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/vitest_story_play/. Rebase it onto its actual base branch (`parent_branch` when present, otherwise `upstream_base_branch`, per ../_shared/REPOSITORY_BRANCHES.md), reconciling any disagreement with the PR's `baseRefName` first. Resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease` to the `jmchilton` fork, update the SHA in the branch record and queue, and take a `revision` snapshot per ../_shared/PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24300
  record: galaxy/branches/vitest_story_play
  profile: Sonnet (high)
  description: |
    🔀 Storybook stories, browser plays and accessibility checks for richer client-test review. Keep draft RFC per John. Conflicts: see PR.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#De-conflict Branches
```
