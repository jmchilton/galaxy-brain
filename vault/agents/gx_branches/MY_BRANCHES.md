# Open PR and branch queue

Live GitHub PR metadata and exact-head fork CI refreshed 2026-10-12 by GOOD_MORNING/TICK. [Morning findings and actions](TICK_2026-10-12.md) record classifications, CI limits, rebases and reruns.

PR #24038 refreshed after its requested rebase on 2026-10-12: mergeable at `e1570742723`, awaiting new-head CI.

[Shared CI context and recent history](../../repositories/galaxy/branches/queue_context.md). Branch links hold the details, approvals and standing instructions.

## Open Galaxy PRs — ready from our side (`ready`)

- [`sample_sheet_vue3`](../../repositories/galaxy/branches/active/sample_sheet_vue3/index.md) — Moves sample sheet grids to Vue 3 patterns and fixes editing, validation and reloads. [#24050](https://github.com/galaxyproject/galaxy/pull/24050).
- [`container_tool_env`](../../repositories/galaxy/branches/active/container_tool_env/index.md) — Adds destination job/tool environment scopes and tool-declared container runtime variables. [#23815](https://github.com/galaxyproject/galaxy/pull/23815).
- [`workbook_import`](../../repositories/galaxy/branches/active/workbook_import/index.md) — Tests the rule builder mapping Galaxy infers from workbook headers, under Selenium and Playwright. [#23922](https://github.com/galaxyproject/galaxy/pull/23922).
- [`issue_19325_optional_select_test_docs`](../../repositories/galaxy/branches/active/issue_19325_optional_select_test_docs/index.md) — Documents unset optional selects and empty multiple-select lists in tool tests (#19325), with tests for each form. [#23959](https://github.com/galaxyproject/galaxy/pull/23959).
- [`client_test_fixture_cleanup`](../../repositories/galaxy/branches/active/client_test_fixture_cleanup/index.md) — Corrects JobInformation message fixtures and removes duplicate CollectionProgress tests. [#24045](https://github.com/galaxyproject/galaxy/pull/24045).
- [`playwright_drag_over_feedback`](../../repositories/galaxy/branches/active/playwright_drag_over_feedback/index.md) — Adds drag_over feedback checks and runs test_drag_drop_visual_feedback under Playwright. [#24010](https://github.com/galaxyproject/galaxy/pull/24010).
- [`fix_story_a11y`](../../repositories/galaxy/branches/active/fix_story_a11y/index.md) — Repairs Storybook-audited accessibility issues across shared controls, forms, collections and workflows. [#24046](https://github.com/galaxyproject/galaxy/pull/24046).
- [`ts_readme_render_fix_26.1`](../../repositories/galaxy/branches/active/ts_readme_render_fix_26.1/index.md) — Backports Tool Shed README rendering and sanitization, including old revisions, to release_26.1. [#24053](https://github.com/galaxyproject/galaxy/pull/24053).

## Open Galaxy PRs — waiting for CI (`ci_wait`)

- [`issue_21015_multiple_text_param`](../../repositories/galaxy/branches/active/issue_21015_multiple_text_param/index.md) — Supports multiple text workflow parameters; approved text review fixes pushed, new-head CI pending. [#23992](https://github.com/galaxyproject/galaxy/pull/23992).

## Open Galaxy PRs — needs attention (`attention`)

None yet.

## Draft Galaxy PRs — ready to undraft (`draft_ready`)

- [`issue_19049_collection_type_picker`](../../repositories/galaxy/branches/active/issue_19049_collection_type_picker/index.md) — Adds a select-or-text field for workflow collection types and Tool Shed targets. [#24055](https://github.com/galaxyproject/galaxy/pull/24055).

## Draft Galaxy PRs — waiting for CI (`ci_wait`)

- [`vitest_readability`](../../repositories/galaxy/branches/active/vitest_readability/index.md) — Rewrites client tests for readability, shared fixtures and stronger assertions. [#24038](https://github.com/galaxyproject/galaxy/pull/24038).

## Draft Galaxy PRs — needs author work (`author_work`)

- [`issue_11743_copy_tags_iterable`](../../repositories/galaxy/branches/active/issue_11743_copy_tags_iterable/index.md) — Types copy_tags as an iterable and preserves nested element tags when copying collections (#11743). [#23973](https://github.com/galaxyproject/galaxy/pull/23973).
- [`tool_parameter_references`](../../repositories/galaxy/branches/active/tool_parameter_references/index.md) — Developer reference for the inconsistent ways tools, APIs and workflows reference nested tool parameters. [#23877](https://github.com/galaxyproject/galaxy/pull/23877).
- [`subworkflow_mapping`](../../repositories/galaxy/branches/active/subworkflow_mapping/index.md) — Brings subworkflow mapping inline between the workflow editor and the backend. [#23676](https://github.com/galaxyproject/galaxy/pull/23676).
- [`htcondor_pulsar`](../../repositories/galaxy/branches/active/htcondor_pulsar/index.md) — Shares HTCondor mechanics with Pulsar and bounds held-job handling. [#23326](https://github.com/galaxyproject/galaxy/pull/23326).
- [`wf_tool_state`](../../repositories/galaxy/branches/active/wf_tool_state/index.md) — Adds gxwf CLI tooling for validating and converting stateful workflows. [#22996](https://github.com/galaxyproject/galaxy/pull/22996).
- [`notebook_iframe`](../../repositories/galaxy/branches/active/notebook_iframe/index.md) — Explores embedded Galaxy notebooks in Loom with automatic synchronization. [#22988](https://github.com/galaxyproject/galaxy/pull/22988).
- [`fix_copied_datasets`](../../repositories/galaxy/branches/active/fix_copied_datasets/index.md) — Fixes workflow extraction for datasets copied across histories. [#21806](https://github.com/galaxyproject/galaxy/pull/21806).
- [`collection_restructure_panel`](../../repositories/galaxy/branches/active/collection_restructure_panel/index.md) — Adds a panel for transforming dataset collection layouts. [#12238](https://github.com/galaxyproject/galaxy/pull/12238).
- [`pulsar-mq-pull`](../../repositories/galaxy/branches/active/pulsar-mq-pull/index.md) — Polls for Pulsar MQ jobs missed by normal event handling. [#9911](https://github.com/galaxyproject/galaxy/pull/9911).
- [`plugins_test_fake_provider`](../../repositories/galaxy/branches/active/plugins_test_fake_provider/index.md) — Tests plugin proxy and AI agents against a local provider; fixes live LLM tests using static responses. [#24051](https://github.com/galaxyproject/galaxy/pull/24051).

## Galaxy branches — implemented, work left (`branches_implemented_needs_ci`)

- [`workflow_multiple_parameter_review_followups`](../../repositories/galaxy/branches/active/workflow_multiple_parameter_review_followups/index.md) — Float-only follow-up stacked on updated PR #23992; text fixes moved into the original PR as approved. Local checks and required reviews pass; new-head CI pending.
- [`pulsar-explicit-imports`](../../repositories/galaxy/branches/active/pulsar-explicit-imports/index.md) — Updates the existing draft to published Pulsar 0.16.0 and removes temporary source-build settings. [#23898](https://github.com/galaxyproject/galaxy/pull/23898).
- [`integration_ci_scope`](../../repositories/galaxy/branches/active/integration_ci_scope/index.md) — Selects costly plugin suites from changed paths; helpers and guide live beside integration tests. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:integration_ci_scope).
- [`issue_23978_parameter_tools_xsd`](../../repositories/galaxy/branches/active/issue_23978_parameter_tools_xsd/index.md) — Makes parameter framework tools XSD-valid and checks them in CI (#23978). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_23978_parameter_tools_xsd?expand=1).
- [`issue_20900_invocation_validation`](../../repositories/galaxy/branches/active/issue_20900_invocation_validation/index.md) — Validates workflow invocation requests before creating histories or other side effects (#20900). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_20900_invocation_validation?expand=1).
- [`issue_20657_input_processing_mode`](../../repositories/galaxy/branches/active/issue_20657_input_processing_mode/index.md) — Explains tool input batching and collection mapping, and fixes collection-type matching (#20657). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_20657_input_processing_mode?expand=1).
- [`tool_form_job_count`](../../repositories/galaxy/branches/active/tool_form_job_count/index.md) — Previews tool job counts before Run, with expansion and mismatch warnings. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:tool_form_job_count?expand=1).
- [`pulsar_mq_status_poll`](../../repositories/galaxy/branches/active/pulsar_mq_status_poll/index.md) — Opt-in `status_poll_interval` asks Pulsar MQ to resend lost job statuses; stops double finishes (revives #9911). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:pulsar_mq_status_poll?expand=1).
- [`cwl_fixes_5`](../../repositories/galaxy/branches/active/cwl_fixes_5/index.md) — Collects CWL validation, typing, output-path and job-document fixes. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:cwl_fixes_5?expand=1).
- [`licenses`](../../repositories/galaxy/branches/active/licenses/index.md) — Adds `<license_agreement>` tool requirements that users must accept before running the tool. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:licenses?expand=1).
- [`selenium_stories_core`](../../repositories/galaxy/branches/active/selenium_stories_core/index.md) — Writes Selenium and Playwright test screenshots as Markdown, HTML and PDF stories; recovered and rebased 2026-10-09 (`233a2dc31e8`). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:selenium_stories_core?expand=1).
- [`ts_readme_render_followups`](../../repositories/galaxy/branches/active/ts_readme_render_followups/index.md) — Shows old-revision READMEs and images, loads revision permalinks, and removes dead README code. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:ts_readme_render_followups?expand=1).
- [`issue_3899_pulsar_container_deps`](../../repositories/galaxy/branches/active/issue_3899_pulsar_container_deps/index.md) — Respects a Pulsar container job’s dependency-resolution opt-in (#3899). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_3899_pulsar_container_deps?expand=1).

## Galaxy branches — implemented, work left, green (`branches_implemented`)

- [`toolshed_repository_contents`](../../repositories/galaxy/branches/active/toolshed_repository_contents/index.md) — Adds a bounded repository-files API and Tool Shed contents browser (#22598). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:toolshed_repository_contents?expand=1).
- [`issue_23902_qualified_output_references`](../../repositories/galaxy/branches/active/issue_23902_qualified_output_references/index.md) — From 26.2, unqualified `format_source`/`metadata_source` fail tool load; runtime skips legacy aliases (fixes #23902). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_23902_qualified_output_references?expand=1).
- [`playwright_timeout_retry_once`](../../repositories/galaxy/branches/active/playwright_timeout_retry_once/index.md) — `retry_call_during_transitions` retries a Playwright timeout once, not ten times (partly reverts `2825bb09e42`); pulled from `galaxy_ui_driver`. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:playwright_timeout_retry_once?expand=1).
- [`extract_next_followups`](../../repositories/galaxy/branches/active/extract_next_followups/index.md) — Fixes notebook-to-workflow extraction, report references and editor behavior after #22860. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:extract_next_followups?expand=1).
- [`resubmit_static_chain_test_26.1`](../../repositories/galaxy/branches/active/resubmit_static_chain_test_26.1/index.md) — Tests repeated resubmission through static destinations with per-hop environment values. [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.1...jmchilton:galaxy:resubmit_static_chain_test_26.1?expand=1).
- [`yaml_boolean_defaults`](../../repositories/galaxy/branches/active/yaml_boolean_defaults/index.md) — Honors explicit YAML Boolean defaults with user-tool API contract coverage (#23888). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:yaml_boolean_defaults?expand=1).
- [`upgrade_advice_structured_like`](../../repositories/galaxy/branches/active/upgrade_advice_structured_like/index.md) — Moves `structured_like` qualification upgrade advice from 18.01 to a new 26.0 migration (fixes #23884). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:upgrade_advice_structured_like?expand=1).
- [`optional_input_gating`](../../repositories/galaxy/branches/active/optional_input_gating/index.md) — Runs workflow steps only when their optional inputs are present. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:optional_input_gating?expand=1).
- [`api_gotchas`](../../repositories/galaxy/branches/active/api_gotchas/index.md) — Documents API client best practices for external projects, plus a review rubric for API-driven work. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:api_gotchas?expand=1).
- [`ag_grid_36`](../../repositories/galaxy/branches/active/ag_grid_36/index.md) — Upgrades ag-grid to 36.2.0 with grid editing and renderer adaptations. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:ag_grid_36?expand=1).
- [`tool_open_tool_shed_ids`](../../repositories/galaxy/branches/active/tool_open_tool_shed_ids/index.md) — Finds Tool Shed tools by full GUID through tool panel search and tool card selectors. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:tool_open_tool_shed_ids?expand=1).

## Galaxy branches — needs polish (`branches_need_polish`)

- [`issue_23424_when_expression_validation`](../../repositories/galaxy/branches/active/issue_23424_when_expression_validation/index.md) — Validates workflow `when` expression input references at import. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_23424_when_expression_validation?expand=1).

## Galaxy branches — ready for final review (`branches_ready_for_final_review`)

- [`issue_24031_badge_tooltip_html`](../../repositories/galaxy/branches/active/issue_24031_badge_tooltip_html/index.md) — Restores storage badge popovers with sanitized Markdown and working links; readable HTML tooltip labels (#24031). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_24031_badge_tooltip_html?expand=1).
- [`issue_23980_static_restriction_default`](../../repositories/galaxy/branches/active/issue_23980_static_restriction_default/index.md) — Preselects defaults for statically restricted workflow text inputs, and lets the run form submit an allowed `""` (#23980). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_23980_static_restriction_default?expand=1).
- [`issue_23977_client_api_fanout_26.1`](../../repositories/galaxy/branches/active/issue_23977_client_api_fanout_26.1/index.md) — Spaces out client retries and removes hidden counts requests (#23977). [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.1...jmchilton:galaxy:issue_23977_client_api_fanout_26.1?expand=1).
- [`issue_19391_file_source_templates_config_dir`](../../repositories/galaxy/branches/active/issue_19391_file_source_templates_config_dir/index.md) — Adds drop-in configuration directories for file source and object store templates (#19391). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_19391_file_source_templates_config_dir?expand=1).
- [`issue_23897_xml_collection_output`](../../repositories/galaxy/branches/active/issue_23897_xml_collection_output/index.md) — Fixes XML `<output type="collection">` parsing and lets the XSD accept its static elements (#23897). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_23897_xml_collection_output?expand=1).
- [`issue_23914_page_card_actions`](../../repositories/galaxy/branches/active/issue_23914_page_card_actions/index.md) — Makes notebook card title and Edit/Share actions follow the current user and page, so a late user load shows Share. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_23914_page_card_actions?expand=1).
- [`issue_23521_conditional_case_resolution`](../../repositories/galaxy/branches/active/issue_23521_conditional_case_resolution/index.md) — Rejects conditional cases that resolve to nothing instead of running the last when-case (#23521). [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.0...jmchilton:galaxy:issue_23521_conditional_case_resolution?expand=1).
- [`it_container_epilog_docs`](../../repositories/galaxy/branches/active/it_container_epilog_docs/index.md) — Documents a Slurm epilog for killing leftover Interactive Tool containers (#13511). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:it_container_epilog_docs?expand=1).
- [`issue_23891_output_reference_resolver`](../../repositories/galaxy/branches/active/issue_23891_output_reference_resolver/index.md) — Resolves format_source and metadata_source against declared inputs at tool load (#23891). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_23891_output_reference_resolver?expand=1).
- [`dangling_when_lint`](../../repositories/galaxy/branches/active/dangling_when_lint/index.md) — Warns about disconnected workflow when-inputs and gives them editor ports. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:dangling_when_lint?expand=1).
- [`issue_18642_framework_tool_coverage`](../../repositories/galaxy/branches/active/issue_18642_framework_tool_coverage/index.md) — Adds drill_down framework coverage, fixes relative from_file modeling and deprecates from_file (#18642). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_18642_framework_tool_coverage?expand=1).
- [`upload_datatypes_composable`](../../repositories/galaxy/branches/active/upload_datatypes_composable/index.md) — Replaces upload datatype/dbkey providers with composables and shows load failures instead of empty selectors; stacked on #23995. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:upload_datatypes_composable?expand=1).
- [`issue_15515_related_filter_copied_items`](../../repositories/galaxy/branches/active/issue_15515_related_filter_copied_items/index.md) — Makes the related filter work on imported and copied history items (#15515). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_15515_related_filter_copied_items?expand=1).

## Galaxy branches — approved, opens when green (`branches_need_pr`)

None yet.

## Galaxy branches — still deciding on (`branches_need_decision`)

- [`vitest_story_a11y`](../../repositories/galaxy/branches/active/vitest_story_a11y/index.md) — Storybook axe checks and viewport review tools; reference-only prototype stacked on `vitest_story_play`. Do not PR.
- [`galaxy_ui_driver`](../../repositories/galaxy/branches/active/galaxy_ui_driver/index.md) — Standing branch for Galaxy changes motivated by gxui. Do not PR independently. Do not polish; Playwright owns it.
- [`move_markdown_conversion_to_util`](../../repositories/galaxy/branches/active/move_markdown_conversion_to_util/index.md) — Moves markdown HTML/PDF conversion out of `managers.markdown_util` into `galaxy.util`. Do not PR independently.
- [`workflow_input_pipe_names`](../../repositories/galaxy/branches/active/workflow_input_pipe_names/index.md) — Reserves pipes in input names, with three possible correction scopes. Decision: Choose validation-only, top-level correction, or nested correction. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:workflow_input_pipe_names?expand=1).
- [`subworkflow_mapping_when_alignment`](../../repositories/galaxy/branches/active/subworkflow_mapping_when_alignment/index.md) — Aligns mapped subworkflow `when` values with compatible collection inputs. Decision: Decide whether #23676 supersedes this work. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:subworkflow_mapping_when_alignment?expand=1).
