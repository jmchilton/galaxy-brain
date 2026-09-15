# Open PR and branch queue

GitHub state last refreshed: 2026-09-15.

## Open Galaxy PRs — ready from our side (`ready`)

- [#23502](https://github.com/galaxyproject/galaxy/pull/23502) — branch `issue_23489_toolshed_cache_rollback` — Description: Keeps one failed Tool Shed dependency cache from rolling back unrelated repository installs; blockers: none, two unrelated CI checks are red.
- [#23334](https://github.com/galaxyproject/galaxy/pull/23334) — branch `pja_warn_unsupported_mapped_over` — Description: Warns on unsupported post-job actions for jobless steps and hides their editor controls; blockers: none, two unrelated browser checks are red. 
- [#23229](https://github.com/galaxyproject/galaxy/pull/23229) — branch `data_validation` — Description: Adds repository linting for data-manager and reference-data bundles plus a standalone CLI; blockers: none, two unrelated CI checks are red.
- [#22860](https://github.com/galaxyproject/galaxy/pull/22860) — branch `extract_next` — Description: Extracts reproducible workflows and narrative reports from Galaxy notebook activity; blockers: none, three unrelated or infrastructure CI checks are red.
- [#23514](https://github.com/galaxyproject/galaxy/pull/23514) — branch `rescue-18938-conda-mulled-hash` — Description: Adds Galaxy's Conda environment hash mode to the mulled-hash CLI; blockers: none, one unrelated CI check is red.
- [#23500](https://github.com/galaxyproject/galaxy/pull/23500) — branch `toolshed_2_cleanup_dead_code` — Description: Removes dead Tool Shed code paths and obsolete compatibility scaffolding; blockers: none, two unrelated browser checks are red.
- [#23482](https://github.com/galaxyproject/galaxy/pull/23482) — branch `color_schema` — Description: Accepts missing or null workflow-comment colors and canonicalizes them to `none`; blockers: wait for CI on `a8dbfabad7` and Marius's confirmation.
- [#23340](https://github.com/galaxyproject/galaxy/pull/23340) — branch `review-nits` — Description: Collects small review fixes for redirects, repeat cloning, data tables, and visualizations; blockers: none, four unrelated CI checks are red.
- [#23325](https://github.com/galaxyproject/galaxy/pull/23325) — branch `k8s_job_docs_fix` — Description: Corrects stale Kubernetes runner documentation about generated job names; blockers: none, four unrelated CI checks are red.
- [#23324](https://github.com/galaxyproject/galaxy/pull/23324) — branch `23225-review-followups` — Description: Extracts reusable Kubernetes PV/PVC setup shared by interactive-tool integration tests; blockers: none, three unrelated CI checks are red.

## Open Galaxy PRs — needs attention (`attention`)

- [#23433](https://github.com/galaxyproject/galaxy/pull/23433) — branch `pick_value_input_readiness` — Description: Makes pick-value steps wait for every connected input before selecting runtime values; blockers: answer two unresolved Marius threads, one already addressed in `1ec7fb00f3` and one already answered inline.

## Draft Galaxy PRs — ready to undraft (`draft_ready`)

No PRs currently.

## Draft Galaxy PRs — waiting for CI (`ci_wait`)

- [#23436](https://github.com/galaxyproject/galaxy/pull/23436) — branch `22087-finishing-state-fixes` — Description: Adds a FINISHING job state and restart-safe Pulsar recovery for interrupted metadata; blockers: wait for CI on `16c2f4202b`, then reply to Marius's two review threads.

## Draft Galaxy PRs — needs author work (`author_work`)

- [#23455](https://github.com/galaxyproject/galaxy/pull/23455) — branch `pick_value_first_ok_or_skip` — Description: Adds a pick-value mode that ignores failed or null inputs and skips without usable values; blockers: depends on #23433 and has three completed red CI checks.
- [#23330](https://github.com/galaxyproject/galaxy/pull/23330) — branch `pja_guard_mapped_over_skipped` — Description: Prevents post-job actions from applying to skipped mapped-over workflow outputs; blockers: approved but depends on #23433 and has one completed red CI check.
- [#23326](https://github.com/galaxyproject/galaxy/pull/23326) — branch `htcondor_pulsar` — Description: Shares HTCondor mechanics with Pulsar and bounds held-job handling with a grace window; blockers: Pulsar #486 needs rebase and resolution of its hold/retry-policy thread.
- [#22996](https://github.com/galaxyproject/galaxy/pull/22996) — branch `wf_tool_state` — Description: Adds gxwf CLI tooling for static validation and conversion of stateful Galaxy workflows; blockers: refresh the stale branch and triage two completed red CI checks.
- [#22988](https://github.com/galaxyproject/galaxy/pull/22988) — branch `notebook_iframe` — Description: Explores embedded Galaxy notebooks in Loom with automatic synchronization; blockers: refresh the stale branch and triage failing CircleCI.
- [#21806](https://github.com/galaxyproject/galaxy/pull/21806) — branch `fix_copied_datasets` — Description: Fixes workflow extraction when datasets were copied across histories; blockers: refresh the stale branch and triage eight completed red CI checks.
- [#21199](https://github.com/galaxyproject/galaxy/pull/21199) — branch `test-stories` — Description: Adds executable tutorial stories for Galaxy developers and automated documentation; blockers: refresh the stale branch and triage two completed red package checks.
- [#19937](https://github.com/galaxyproject/galaxy/pull/19937) — branch `shed_redirect` — Description: Redirects a legacy Tool Shed URL pattern for Galaxy 26.0 compatibility; blockers: rebase and triage nine completed red CI checks.
- [#15868](https://github.com/galaxyproject/galaxy/pull/15868) — branch `typed_exceptions` — Description: Strengthens typing around Galaxy exception classes and their consumers; blockers: approved but needs a branch refresh and current CI.
- [#12238](https://github.com/galaxyproject/galaxy/pull/12238) — branch `collection_restructure_panel` — Description: Adds a panel for transforming dataset collection layouts; blockers: needs a branch refresh and current CI.
- [#9911](https://github.com/galaxyproject/galaxy/pull/9911) — branch `pulsar-mq-pull` — Description: Polls for Pulsar MQ jobs potentially missed by normal event handling; blockers: needs a branch refresh, current CI, and resolution of its old review thread.
- [#8846](https://github.com/galaxyproject/galaxy/pull/8846) — branch `job_files_refactor` — Description: Refactors the job-files API toward a microservice-compatible boundary; blockers: needs a branch refresh and current CI.

## Galaxy branches — needs a PR (`branches_need_pr`)

- Branch `issue_23544_collection_output_assertions` — Description: Detects bare element tests and permits nested collection size assertions; blockers: wait for fork CI on `388bb3423a`, then open a `release_26.1` PR for #23544; 20 focused tests and lint pass.
- Branch `test_case_validation_state_errors` — Description: Replays #23002 with current test-case state validation hardening; blockers: push and open the base PR against `dev` after its 24 passing focused tests.
- Branch `test_case_validation_model_parse_errors` — Description: Replays #23004 with tool-model parse reporting and case-insensitive Infinity bounds; blockers: push and open a stacked PR after the base branch; 26 focused tests pass.
- Branch `when_expression_analysis` — Description: Matches workflow `when` inputs structurally instead of by substring; blockers: triage four completed fork CI failures, then open using `OPT_INPUT_PR_2_DESCR.md`.
- Branch `issue_23424_when_expression_validation` — Description: Rejects obsolete pipe-delimited tool-input paths during workflow import; blockers: triage Mulled, Playwright, Selenium, and package failures on `2938c2448c6`, then open using `WHEN_VALIDATION_PR_DESCR.md`.
- Branch `optional_input_gating` — Description: Adds authoring and validation for running steps only when optional inputs are present; blockers: triage five completed fork CI failures, then open using `OPT_INPUT_PR_3_DESCR.md`.
- Branch `workflow_input_pipe_names` — Description: Upgrades legacy workflow input names and rejects reserved pipe delimiters; blockers: open using `workflow_input_pipe_names_pr_description.md`; only unrelated Selenium and release checks are red.
- Branch `cwl_fixes_5` — Description: Collects CWL validation, typing, output-path, and job-document compatibility fixes; blockers: rebase, replay subworkflow mapping, run conformance tests, and decide the PR split.
- Branch `subworkflow_mapping` — Description: Implements ordered-axis mapping and delayed pass-through for callable subworkflows; blockers: preserve four modified files, rebase 14 commits onto `dev`, validate, and open a PR.
- Branch `subworkflow_mapping_when_alignment` — Description: Aligns mapped subworkflow when-values with compatible collection inputs; blockers: determine its stack relationship, rebase, validate, and open a PR.
- Branch `parameter_model_optional_agreement` — Description: Aligns genome-build and drill-down optionality with focused coverage; blockers: rebase and run local validation before opening a PR.

## Open PRs in other projects (`other_prs`)

- [Pulsar #486](https://github.com/galaxyproject/pulsar/pull/486) — branch `htcondor2` — Description: Adds a queued HTCondor manager using shared Galaxy/Pulsar mechanics; blockers: rebase and resolve the hold/retry-policy review thread before Galaxy #23326.

- https://github.com/galaxyproject/iwc/pull/1366 - Expanded Agent Review Command- #1366
- https://github.com/galaxyproject/iwc/pull/1365 - Sync for iwc-lab
- https://github.com/galaxyproject/planemo/pull/1695 - Require workflow tests under the IWC lint profile
- https://github.com/galaxyproject/planemo/pull/1698 - Keeping other PRs red.
- 
