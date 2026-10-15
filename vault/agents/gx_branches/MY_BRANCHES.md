# Open PR and branch queue

PR #24050 refreshed 2026-10-14: latest review fixes pushed at `88ac10202d8`; mergeable against `release_26.2`, fresh CI queued. [Vue 3 migration guide](VUE3_COMPONENT_MIGRATION.md).

PR #23815 refreshed 2026-10-14: rebased onto latest `release_26.2`, import-order CI fix pushed at `7f32c166400`; mergeable, CI queued.

PR #24120 refreshed 2026-10-14: requested draft opened against `release_26.2`; head `b0a8d368d60`, CI pending.

PR #24106 refreshed 2026-10-14 after review fixes: draft, mergeable, new-head CI pending.

PR #24119 refreshed 2026-10-14: requested draft opened against `release_26.2`; head `042902f139e`, CI pending.

Clipboard E2E base/CI refreshed 2026-10-14 after polishing; #24104 merged and fork head `042902f139e` awaits CI and final human review.

PR #24046 refreshed 2026-10-14: four review fixes pushed at `58849d66e99` on `release_26.2`; CI pending, final review required.

nightly_unit_tests refreshed 2026-10-14: draft #24131 updated at `a311e41f2c3` with client-build reference lint fixes; CI pending.

Queue snapshot refreshed from GitHub 2026-10-14. [TICK findings and actions](TICK_2026-10-14.md).

[Shared CI context and recent history](../../repositories/galaxy/branches/queue_context.md). Branch links hold the details, approvals and standing instructions.

## Open Galaxy PRs — ready from our side (`ready`)

- [`container_tool_env`](../../repositories/galaxy/branches/active/container_tool_env/index.md) — Adds destination job/tool environment scopes and tool-declared container runtime variables. [#23815](https://github.com/galaxyproject/galaxy/pull/23815).
- [`issue_11743_copy_tags_iterable`](../../repositories/galaxy/branches/active/issue_11743_copy_tags_iterable/index.md) — Types copy_tags as an iterable and preserves nested element tags when copying collections (#11743). [#23973](https://github.com/galaxyproject/galaxy/pull/23973).
- [`sample_sheet_vue3`](../../repositories/galaxy/branches/active/sample_sheet_vue3/index.md) — Moves sample sheet grids to Vue 3 patterns and fixes editing, validation and reloads. [#24050](https://github.com/galaxyproject/galaxy/pull/24050).
- [`dangling_when_lint`](../../repositories/galaxy/branches/active/dangling_when_lint/index.md) — Warns about disconnected workflow when-inputs and gives them editor ports. [#24107](https://github.com/galaxyproject/galaxy/pull/24107).
- [`workbook_import_followups`](../../repositories/galaxy/branches/active/workbook_import_followups/index.md) — Strengthens workbook import tests with exact template parameters, split-row contents, and collection-mode checks. [#24105](https://github.com/galaxyproject/galaxy/pull/24105).

## Open Galaxy PRs — needs attention (`attention`)

None yet.

## Draft Galaxy PRs — ready to undraft (`draft_ready`)

- [`ci_tracked_source_filters`](../../repositories/galaxy/branches/active/ci_tracked_source_filters/index.md) — Restores tracked source CI triggers and Selenium exclusions after #23999. [#24120](https://github.com/galaxyproject/galaxy/pull/24120).
- [`issue_15515_related_filter_copied_items`](../../repositories/galaxy/branches/active/issue_15515_related_filter_copied_items/index.md) — Makes the related filter work on imported and copied history items (#15515). [#24106](https://github.com/galaxyproject/galaxy/pull/24106).
- [`copy_to_clipboard_e2e`](../../repositories/galaxy/branches/active/copy_to_clipboard_e2e/index.md) — Adds clipboard capture and an API key copy browser regression test after #24104. [#24119](https://github.com/galaxyproject/galaxy/pull/24119).

## Draft Galaxy PRs — waiting for CI (`ci_wait`)

- [`integration_ci_paths`](../../repositories/galaxy/branches/active/integration_ci_paths/index.md) — Skips Integration for changes confined to other test suites; moves shared helpers into `galaxy_test.base`. [#24135](https://github.com/galaxyproject/galaxy/pull/24135).
- [`oidc_authorize_params_docs`](../../repositories/galaxy/branches/active/oidc_authorize_params_docs/index.md) — Documents OIDC request parameters, provider prefixes, configuration examples, and verification. [#24133](https://github.com/galaxyproject/galaxy/pull/24133).
- [`nightly_unit_tests`](../../repositories/galaxy/branches/active/nightly_unit_tests/index.md) — Reduces dev PR CI and tracks nightly failures; keeps a rejected cross-release alternative for discussion. [#24131](https://github.com/galaxyproject/galaxy/pull/24131).

## Draft Galaxy PRs — needs author work (`author_work`)

- [`vitest_readability`](../../repositories/galaxy/branches/active/vitest_readability/index.md) — Rewrites client tests for readability, shared fixtures and stronger assertions. [#24038](https://github.com/galaxyproject/galaxy/pull/24038).
- [`tool_parameter_references`](../../repositories/galaxy/branches/active/tool_parameter_references/index.md) — Developer reference for the inconsistent ways tools, APIs and workflows reference nested tool parameters. [#23877](https://github.com/galaxyproject/galaxy/pull/23877).
- [`subworkflow_mapping`](../../repositories/galaxy/branches/active/subworkflow_mapping/index.md) — Brings subworkflow mapping inline between the workflow editor and the backend. [#23676](https://github.com/galaxyproject/galaxy/pull/23676).
- [`htcondor_pulsar`](../../repositories/galaxy/branches/active/htcondor_pulsar/index.md) — Shares HTCondor mechanics with Pulsar and bounds held-job handling. [#23326](https://github.com/galaxyproject/galaxy/pull/23326).
- [`wf_tool_state`](../../repositories/galaxy/branches/active/wf_tool_state/index.md) — Adds gxwf CLI tooling for validating and converting stateful workflows. [#22996](https://github.com/galaxyproject/galaxy/pull/22996).
- [`fix_copied_datasets`](../../repositories/galaxy/branches/active/fix_copied_datasets/index.md) — Fixes workflow extraction for datasets copied across histories. [#21806](https://github.com/galaxyproject/galaxy/pull/21806).
- [`collection_restructure_panel`](../../repositories/galaxy/branches/active/collection_restructure_panel/index.md) — Adds a panel for transforming dataset collection layouts. [#12238](https://github.com/galaxyproject/galaxy/pull/12238).
- [`pulsar-mq-pull`](../../repositories/galaxy/branches/active/pulsar-mq-pull/index.md) — Polls for Pulsar MQ jobs missed by normal event handling. [#9911](https://github.com/galaxyproject/galaxy/pull/9911).

## Galaxy branches — implemented, work left (`branches_implemented_needs_ci`)

- [`vitest_real_api_calls`](../../repositories/galaxy/branches/active/vitest_real_api_calls/index.md) — Records real Galaxy API responses for client tests, starting with history and quota usage. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:vitest_real_api_calls?expand=1).
- [`integration_ci_scope`](../../repositories/galaxy/branches/active/integration_ci_scope/index.md) — Selects costly plugin suites from changed paths; helpers and guide live beside integration tests. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:integration_ci_scope).
- [`issue_23978_parameter_tools_xsd`](../../repositories/galaxy/branches/active/issue_23978_parameter_tools_xsd/index.md) — Makes parameter framework tools XSD-valid and checks them in CI (#23978). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_23978_parameter_tools_xsd?expand=1).
- [`issue_20900_invocation_validation`](../../repositories/galaxy/branches/active/issue_20900_invocation_validation/index.md) — Validates workflow invocation requests before creating histories or other side effects (#20900). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_20900_invocation_validation?expand=1).
- [`issue_20657_input_processing_mode`](../../repositories/galaxy/branches/active/issue_20657_input_processing_mode/index.md) — Explains tool input batching and collection mapping, and fixes collection-type matching (#20657). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_20657_input_processing_mode?expand=1).
- [`tool_form_job_count`](../../repositories/galaxy/branches/active/tool_form_job_count/index.md) — Previews tool job counts before Run, with expansion and mismatch warnings. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:tool_form_job_count?expand=1).
- [`cwl_fixes_5`](../../repositories/galaxy/branches/active/cwl_fixes_5/index.md) — Collects CWL validation, typing, output-path and job-document fixes. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:cwl_fixes_5?expand=1).
- [`licenses`](../../repositories/galaxy/branches/active/licenses/index.md) — Adds `<license_agreement>` tool requirements that users must accept before running the tool. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:licenses?expand=1).
- [`ts_readme_render_followups`](../../repositories/galaxy/branches/active/ts_readme_render_followups/index.md) — Shows old-revision READMEs and images, loads revision permalinks, and removes dead README code. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:ts_readme_render_followups?expand=1).

## Galaxy branches — implemented, work left, green (`branches_implemented`)

- [`toolshed_repository_contents`](../../repositories/galaxy/branches/active/toolshed_repository_contents/index.md) — Adds a bounded repository-files API and Tool Shed contents browser (#22598). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:toolshed_repository_contents?expand=1).
- [`issue_23902_qualified_output_references`](../../repositories/galaxy/branches/active/issue_23902_qualified_output_references/index.md) — From 26.2, unqualified `format_source`/`metadata_source` fail tool load; runtime skips legacy aliases (fixes #23902). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_23902_qualified_output_references?expand=1).
- [`extract_next_followups`](../../repositories/galaxy/branches/active/extract_next_followups/index.md) — Fixes notebook-to-workflow extraction, report references and editor behavior after #22860. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:extract_next_followups?expand=1).
- [`resubmit_static_chain_test_26.1`](../../repositories/galaxy/branches/active/resubmit_static_chain_test_26.1/index.md) — Tests repeated resubmission through static destinations with per-hop environment values. [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.1...jmchilton:galaxy:resubmit_static_chain_test_26.1?expand=1).
- [`yaml_boolean_defaults`](../../repositories/galaxy/branches/active/yaml_boolean_defaults/index.md) — Honors explicit YAML Boolean defaults with user-tool API contract coverage (#23888). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:yaml_boolean_defaults?expand=1).
- [`upgrade_advice_structured_like`](../../repositories/galaxy/branches/active/upgrade_advice_structured_like/index.md) — Moves `structured_like` qualification upgrade advice from 18.01 to a new 26.0 migration (fixes #23884). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:upgrade_advice_structured_like?expand=1).
- [`optional_input_gating`](../../repositories/galaxy/branches/active/optional_input_gating/index.md) — Runs workflow steps only when their optional inputs are present. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:optional_input_gating?expand=1).
- [`api_gotchas`](../../repositories/galaxy/branches/active/api_gotchas/index.md) — Documents API client best practices for external projects, plus a review rubric for API-driven work. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:api_gotchas?expand=1).
- [`ag_grid_36`](../../repositories/galaxy/branches/active/ag_grid_36/index.md) — Upgrades ag-grid to 36.2.0 with grid editing and renderer adaptations. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:ag_grid_36?expand=1).
- [`tool_open_tool_shed_ids`](../../repositories/galaxy/branches/active/tool_open_tool_shed_ids/index.md) — Finds Tool Shed tools by full GUID through tool panel search and tool card selectors. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:tool_open_tool_shed_ids?expand=1).
- [`issue_3899_pulsar_container_deps`](../../repositories/galaxy/branches/active/issue_3899_pulsar_container_deps/index.md) — Respects a Pulsar container job’s dependency-resolution opt-in (#3899). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_3899_pulsar_container_deps?expand=1).
- [`pulsar_mq_status_poll`](../../repositories/galaxy/branches/active/pulsar_mq_status_poll/index.md) — Opt-in `status_poll_interval` asks Pulsar MQ to resend lost job statuses; stops double finishes (revives #9911). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:pulsar_mq_status_poll?expand=1).

## Galaxy branches — needs polish (`branches_need_polish`)

- [`selenium_stories_core`](../../repositories/galaxy/branches/active/selenium_stories_core/index.md) — Writes Selenium and Playwright test screenshots as Markdown, HTML and PDF stories; tours narrate into stories. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:selenium_stories_core?expand=1).

## Galaxy branches — ready for final review (`branches_ready_for_final_review`)

- [`plugins_test_fake_provider`](../../repositories/galaxy/branches/active/plugins_test_fake_provider/index.md) — Tests plugin and agent HTTP inference with a local provider; preserves configurable inference settings. [#24051](https://github.com/galaxyproject/galaxy/pull/24051). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:plugins_test_fake_provider?expand=1).
- [`issue_19049_collection_type_picker`](../../repositories/galaxy/branches/active/issue_19049_collection_type_picker/index.md) — Adds select-or-text collection types and fixes workbook template browser selection. [#24055](https://github.com/galaxyproject/galaxy/pull/24055). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_19049_collection_type_picker?expand=1).

- [`fix_story_a11y`](../../repositories/galaxy/branches/active/fix_story_a11y/index.md) — Repairs Storybook-audited accessibility issues across shared controls, forms, collections and workflows. [#24046](https://github.com/galaxyproject/galaxy/pull/24046).
- [`upload_datatypes_composable`](../../repositories/galaxy/branches/active/upload_datatypes_composable/index.md) — Replaces upload datatype/dbkey providers with composables and shows load failures instead of empty selectors. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:upload_datatypes_composable?expand=1).
- [`playwright_timeout_retry_once`](../../repositories/galaxy/branches/active/playwright_timeout_retry_once/index.md) — Retries Playwright timeouts once during transitions; partly reverts 2825bb09e42. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:playwright_timeout_retry_once?expand=1).
- [`issue_23424_when_expression_validation`](../../repositories/galaxy/branches/active/issue_23424_when_expression_validation/index.md) — Rejects obsolete flat nested tool-input references when importing or updating workflows. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_23424_when_expression_validation?expand=1).
- [`issue_23980_static_restriction_default`](../../repositories/galaxy/branches/active/issue_23980_static_restriction_default/index.md) — Preselects defaults for statically restricted workflow text inputs, and lets the run form submit an allowed `""` (#23980). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_23980_static_restriction_default?expand=1).
- [`issue_23977_client_api_fanout_26.1`](../../repositories/galaxy/branches/active/issue_23977_client_api_fanout_26.1/index.md) — Spaces out client retries and removes hidden counts requests (#23977). [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.1...jmchilton:galaxy:issue_23977_client_api_fanout_26.1?expand=1).
- [`issue_19391_file_source_templates_config_dir`](../../repositories/galaxy/branches/active/issue_19391_file_source_templates_config_dir/index.md) — Adds drop-in configuration directories for file source and object store templates (#19391). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_19391_file_source_templates_config_dir?expand=1).
- [`issue_23897_xml_collection_output`](../../repositories/galaxy/branches/active/issue_23897_xml_collection_output/index.md) — Fixes XML `<output type="collection">` parsing and lets the XSD accept its static elements (#23897). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_23897_xml_collection_output?expand=1).
- [`issue_23914_page_card_actions`](../../repositories/galaxy/branches/active/issue_23914_page_card_actions/index.md) — Makes notebook card title and Edit/Share actions follow the current user and page, so a late user load shows Share. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_23914_page_card_actions?expand=1).
- [`issue_23521_conditional_case_resolution`](../../repositories/galaxy/branches/active/issue_23521_conditional_case_resolution/index.md) — Rejects conditional cases that resolve to nothing instead of running the last when-case (#23521). [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.0...jmchilton:galaxy:issue_23521_conditional_case_resolution?expand=1).
- [`it_container_epilog_docs`](../../repositories/galaxy/branches/active/it_container_epilog_docs/index.md) — Documents a Slurm epilog for killing leftover Interactive Tool containers (#13511). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:it_container_epilog_docs?expand=1).
- [`issue_23891_output_reference_resolver`](../../repositories/galaxy/branches/active/issue_23891_output_reference_resolver/index.md) — Resolves format_source and metadata_source against declared inputs at tool load (#23891). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_23891_output_reference_resolver?expand=1).
- [`issue_18642_framework_tool_coverage`](../../repositories/galaxy/branches/active/issue_18642_framework_tool_coverage/index.md) — Adds drill_down framework coverage, fixes relative from_file modeling and deprecates from_file (#18642). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_18642_framework_tool_coverage?expand=1).

## Galaxy branches — approved, opens when green (`branches_need_pr`)

None yet.

## Galaxy branches — still deciding on (`branches_need_decision`)

- [`nightly_release_targets_alternative`](../../repositories/galaxy/branches/active/nightly_release_targets_alternative/index.md) — Cross-release nightly alternative John rejected as too verbose; retained for Marius feedback. Reference only; do not PR.
- [`vitest_readability_with_churn`](../../repositories/galaxy/branches/active/vitest_readability_with_churn/index.md) — Preserves the readability history before score-2 pruning. Reference only; do not PR.
- [`vitest_story_a11y`](../../repositories/galaxy/branches/active/vitest_story_a11y/index.md) — Storybook axe checks and viewport review tools; reference-only prototype stacked on `vitest_story_play`. Do not PR.
- [`galaxy_ui_driver`](../../repositories/galaxy/branches/active/galaxy_ui_driver/index.md) — Standing branch for Galaxy changes motivated by gxui. Do not PR independently. Do not polish; Playwright owns it.
- [`move_markdown_conversion_to_util`](../../repositories/galaxy/branches/active/move_markdown_conversion_to_util/index.md) — Moves markdown HTML/PDF conversion out of `managers.markdown_util` into `galaxy.util`. Do not PR independently.
- [`workflow_input_pipe_names`](../../repositories/galaxy/branches/active/workflow_input_pipe_names/index.md) — Reserves pipes in input names, with three possible correction scopes. Decision: Choose validation-only, top-level correction, or nested correction. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:workflow_input_pipe_names?expand=1).
- [`subworkflow_mapping_when_alignment`](../../repositories/galaxy/branches/active/subworkflow_mapping_when_alignment/index.md) — Aligns mapped subworkflow `when` values with compatible collection inputs. Decision: Decide whether #23676 supersedes this work. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:subworkflow_mapping_when_alignment?expand=1).
- [`workflow_rerun_step_parameters`](../../repositories/galaxy/branches/active/workflow_rerun_step_parameters/index.md) — Spike: step params survive rerun, subworkflow export and invocation import; full run form prefilled. Decision: split into 4 issues; server-seeded vs client-merged prefill. Spike, do not PR as-is.
