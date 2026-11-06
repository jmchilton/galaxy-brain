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
```
