# Tasks

```gb-tasks
- prompt: Run ./POLISH_BRANCH.md issue_22598_login_prompt_26.2
  agent_dir: gx_branches
  description: |
    ✨ Prompts anonymous shed users to log in for Changelog/Contents, then returns them (#22598).
  status: recommended
- prompt: Run ./POLISH_BRANCH.md workflow_editor_selector_escaping
  agent_dir: gx_branches
  description: |
    ✨ CSS-safe selector escaping (`css_attribute_value`) for editor terminal names, node labels, connector ids (`[id='…']`) and workflow run-form input labels, so `'`/`\` in free-text labels no longer break the Selenium/Playwright helpers; editor + run-form E2E tests. Re-scoped, re-hardened. Stacked on `workflow_editor_connection_helpers` (`9699ec45644`), head `7ba4f7bd25f`.
  status: recommended
- prompt: Run ./POLISH_BRANCH.md ag_grid_36
  agent_dir: gx_branches
  description: |
    ✨ Upgrades ag-grid to 36.2.0 with grid editing and renderer adaptations.
  status: recommended
- prompt: Run ./POLISH_BRANCH.md issue_23902_qualified_output_references
  agent_dir: gx_branches
  description: |
    ✨ From 26.2, unqualified `format_source`/`metadata_source` fail tool load; runtime skips legacy aliases (fixes #23902).
  status: recommended
- prompt: Run ./POLISH_BRANCH.md resubmit_static_chain_test_26.1
  agent_dir: gx_branches
  description: |
    ✨ Tests repeated resubmission through static destinations with per-hop environment values.
  status: recommended
- prompt: Run ./POLISH_BRANCH.md upgrade_advice_structured_like
  agent_dir: gx_branches
  description: |
    ✨ Moves `structured_like` qualification upgrade advice from 18.01 to a new 26.0 migration (fixes #23884).
  status: recommended
- prompt: Run ./POLISH_BRANCH.md optional_input_gating
  agent_dir: gx_branches
  description: |
    ✨ Runs workflow steps only when their optional inputs are present.
  status: recommended
- prompt: Run ./POLISH_BRANCH.md api_gotchas
  agent_dir: gx_branches
  description: |
    ✨ Documents API client best practices for external projects, plus a review rubric for API-driven work.
  status: recommended
- prompt: Run ./POLISH_BRANCH.md issue_3899_pulsar_container_deps
  agent_dir: gx_branches
  description: |
    ✨ Respects a Pulsar container job’s dependency-resolution opt-in (#3899).
  status: recommended
- prompt: Run ./POLISH_BRANCH.md selenium_resume_paused_purge_deleted
  agent_dir: gx_branches
  description: |
    ✨ Add missing E2E tests for 26.2 History options > Resume Paused Jobs and Storage Dashboard > Free up disk space (deleted datasets, deleted + archived histories); generic `storage_dashboard_cleanup(operation)`; test hooks only (from `galaxy_ui_driver`). Hardened + re-scoped + re-hardened. Base `release_26.2`, head `257d514929c`.
  status: recommended
- prompt: Respond to mvdbeek's review of galaxyproject/galaxy#24307 (branch issue_24173_invocation_selection_urls) per ../_shared/RESPOND_TO_REVIEW.md. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/issue_24173_invocation_selection_urls/.
  agent_dir: gx_branches
  profile: Opus (low)
  description: |
    🙇 Makes invocation step, job and output selections shareable through URLs (#24173). Unanswered mvdbeek comment(s) after our last push.
  status: recommended
- prompt: Respond to mvdbeek's review of galaxyproject/galaxy#24331 (branch selenium_tool_form_helpers) per ../_shared/RESPOND_TO_REVIEW.md. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/selenium_tool_form_helpers/.
  agent_dir: gx_branches
  profile: Opus (low)
  description: |
    🙇 Selenium tool form helpers. Unanswered mvdbeek comment(s) after our last push.
  status: recommended
- prompt: Respond to mvdbeek's review of galaxyproject/galaxy#24453 (branch issue_24220_drop_collection_matching_26.0) per ../_shared/RESPOND_TO_REVIEW.md. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/issue_24220_drop_collection_matching_26.0/.
  agent_dir: gx_branches
  profile: Opus (low)
  description: |
    🙇 Tool form drag and drop matches dropped collections to collection inputs (#24220). Unanswered mvdbeek comment(s) after our last push.
  status: recommended
- prompt: Respond to davelopez's review of galaxyproject/galaxy#24370 (branch workflow_editor_connection_helpers) per ../_shared/RESPOND_TO_REVIEW.md. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/workflow_editor_connection_helpers/.
  agent_dir: gx_branches
  profile: Opus (low)
  description: |
    🙇 Missing editor E2E tests + shared connection helpers. Unanswered davelopez comment(s) after our last push.
  status: recommended
- prompt: Respond to mvdbeek's review of galaxyproject/galaxy#24167 (branch toolshed_repository_contents) per ../_shared/RESPOND_TO_REVIEW.md. BRANCH_DIRECTORY is vault/repositories/galaxy/branches/active/toolshed_repository_contents/.
  agent_dir: gx_branches
  profile: Opus (low)
  description: |
    🙇 Tool Shed repository contents. Unanswered mvdbeek comment(s) after our last push.
  status: recommended
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
```
