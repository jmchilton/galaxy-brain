# Open PR and branch queue

GitHub state last refreshed: 2026-09-24.

Merged 2026-09-24: #23659 and #23668.

Merged 2026-09-23: #23619, #23620, and #23628.

Merged 2026-09-22: #23229, #23599, #23606, #23618, #23621, #23622, #23623, #23624, #23629, #23630, #23644, and #23652.

Merged 2026-09-21: #23574, #23594, #23598, #23600, #23601, #23602, #23603, #23605, #23607, #23608, #23610, and #23611.

## Open Galaxy PRs — ready from our side (`ready`)

- [#22860](https://github.com/galaxyproject/galaxy/pull/22860) — branch `extract_next` — Description: Extracts reproducible workflows and narrative reports from Galaxy notebook activity; blockers: rebased onto `dev` 2026-09-24 (`a8f6d5b313b`), now mergeable; await the fresh run (44 checks pending).
- [#23672](https://github.com/galaxyproject/galaxy/pull/23672) — branch `toolshed_vitest_upgrade` — Description: Bumps Tool Shed frontend vitest from 1.6.1 to 3.2.7, superseding stale dependabot #22856; blockers: undrafted 2026-09-24 after rebasing onto `dev` (`b074a333084`); await the re-run (38 checks pending).
- [#23593](https://github.com/galaxyproject/galaxy/pull/23593) — branch `csv_col_assertions_delimiter` — Description: Uses dataset delimiter metadata for profile-26.2 column assertions; blockers: none (one CI failure judged transient; see [notes](csv_col_assertions_delimiter_notes.md)).
- [#23433](https://github.com/galaxyproject/galaxy/pull/23433) — branch `pick_value_input_readiness` — Description: Waits for every connected pick-value input before selecting runtime values; blockers: awaiting mvdbeek on the remaining review thread.
- [#23334](https://github.com/galaxyproject/galaxy/pull/23334) — branch `pja_warn_unsupported_mapped_over` — Description: Hides job-only actions on pick-value steps and warns about saved configurations; blockers: none (two known transient or infrastructure CI failures).

## Draft Galaxy PRs — ready to undraft (`draft_ready`)

- [#19937](https://github.com/galaxyproject/galaxy/pull/19937) — branch `shed_redirect` — Description: Redirects a legacy Tool Shed URL for Galaxy 26.0 compatibility; blockers: none — approved by mvdbeek 2026-09-23; six of eight reds are already red on `release_26.0` itself and two are unrelated timeouts.
- [#23666](https://github.com/galaxyproject/galaxy/pull/23666) — branch `toolshed_quasar_upgrade` — Description: Bumps Tool Shed frontend Quasar from 2.18.6 to 2.33.1, superseding stale dependabot #23195; blockers: none (54 green, 2 skipped).
- [#23665](https://github.com/galaxyproject/galaxy/pull/23665) — branch `codex/vitest-4.1.11-clean` — Description: Bumps client vitest tooling to 4.1.11, superseding stale #23501, with one resourceWatcher test fixup; blockers: none (29 green).
- [#23663](https://github.com/galaxyproject/galaxy/pull/23663) — branch `csv_parse_upgrade` — Description: Upgrades csv-parse to 7.0.2 with a csv-parse-only lockfile and real parser test coverage; blockers: none (29 green); scoped alternative to #23484.
- [#23651](https://github.com/galaxyproject/galaxy/pull/23651) — branch `issue_22451_extract_job_errors` — Description: Raises specific, contextual errors for two workflow-extraction failures; blockers: none (56 green; the one red is a quay.io read timeout in Converter tests).

## Draft Galaxy PRs — waiting for CI (`ci_wait`)

- [#23681](https://github.com/galaxyproject/galaxy/pull/23681) — branch `map_over_extraction` — Description: Refactors workflow evaluation ahead of #23676; blockers: await CI on `49c2f8b18cf` (37 checks still queued or running), then triage.
- [#23704](https://github.com/galaxyproject/galaxy/pull/23704) — branch `toolshed_delegate_publishing` — Description: Lets push collaborators update Tool Shed metadata and shows repository ownership; blockers: await CI on `67292711f30` (rebased onto `dev` 67d542579a4, `Locators` conflict with #23536 resolved); prior run was 55 green with the mypy strict ratchet the only red — ignore it, line-shift false positives handled separately.

## Draft Galaxy PRs — needs author work (`author_work`)

- [#23697](https://github.com/galaxyproject/galaxy/pull/23697) — branch `issue_22852_sdist_tests` — Description: Ships Galaxy's sample tool corpus inside galaxy-tool-util so packaged unit tests resolve fixtures from the wheel; blockers: dropped the unsatisfiable `galaxy-util>=26.2.dev0` floor 2026-09-25 (`3e59264159f`); await the re-run, then decide how to re-guarantee `is_shed_guid` for packagers.
- [#23698](https://github.com/galaxyproject/galaxy/pull/23698) — branch `issue_23339_packaged_test_driver` — Description: Stacked on #23697; lets `galaxy_test.driver` import and configure itself from wheels instead of `galaxy_directory()`; blockers: restacked on #23697 2026-09-25 (`96df7d42ab7`); await the re-run, then triage its own Python linting and test-class-name reds.
- [#23676](https://github.com/galaxyproject/galaxy/pull/23676) — branch `subworkflow_mapping` — Description: Brings subworkflow mapping inline between the workflow editor and the backend; blockers: triage 28 red checks across API, integration, framework, and database-index jobs.
- [#23455](https://github.com/galaxyproject/galaxy/pull/23455) — branch `pick_value_first_ok_or_skip` — Description: Adds a pick-value mode that skips failed, null, or unusable inputs; blockers: depends on #23433 and has three red CI checks.
- [#23330](https://github.com/galaxyproject/galaxy/pull/23330) — branch `pja_guard_mapped_over_skipped` — Description: Prevents post-job actions from applying to skipped mapped-over outputs; blockers: approved but depends on #23433 and has one red CI check.
- [#23326](https://github.com/galaxyproject/galaxy/pull/23326) — branch `htcondor_pulsar` — Description: Shares HTCondor mechanics with Pulsar and bounds held-job handling; blockers: Pulsar #486 needs a rebase and resolution of its hold/retry-policy thread.
- [#22996](https://github.com/galaxyproject/galaxy/pull/22996) — branch `wf_tool_state` — Description: Adds gxwf CLI tooling for validating and converting stateful workflows; blockers: resolve merge conflicts and triage two red CI checks.
- [#22988](https://github.com/galaxyproject/galaxy/pull/22988) — branch `notebook_iframe` — Description: Explores embedded Galaxy notebooks in Loom with automatic synchronization; blockers: resolve merge conflicts and triage CircleCI.
- [#21806](https://github.com/galaxyproject/galaxy/pull/21806) — branch `fix_copied_datasets` — Description: Fixes workflow extraction for datasets copied across histories; blockers: resolve merge conflicts and triage eight red CI checks.
- [#21199](https://github.com/galaxyproject/galaxy/pull/21199) — branch `test-stories` — Description: Adds executable tutorial stories and automated developer documentation; blockers: resolve merge conflicts and triage two red package checks.
- [#12238](https://github.com/galaxyproject/galaxy/pull/12238) — branch `collection_restructure_panel` — Description: Adds a panel for transforming dataset collection layouts; blockers: resolve merge conflicts and obtain current CI.
- [#9911](https://github.com/galaxyproject/galaxy/pull/9911) — branch `pulsar-mq-pull` — Description: Polls for Pulsar MQ jobs missed by normal event handling; blockers: resolve merge conflicts, refresh CI, and resolve the old review thread.
- [#8846](https://github.com/galaxyproject/galaxy/pull/8846) — branch `job_files_refactor` — Description: Refactors the job-files API toward a microservice-compatible boundary; blockers: resolve merge conflicts and obtain current CI.

## Galaxy branches — needs a PR (`branches_need_pr`)

- Branch `api_gotchas` — Description: Documents API client best practices for external projects, plus a review rubric for API-driven work; blockers: WIP — review the 156-line doc for accuracy against current `dev`, then prepare a description and open a PR.
- Branch `composite_upload_preserve_source` — Description: Stops composite and extra_files uploads from moving (deleting) the user's linked source files; blockers: await fork CI on `8085ef92188`, then open against `release_26.0` using [the prepared description](composite_upload_preserve_source_pr_description.md).
- Branch `issue_23521_conditional_case_resolution` — Description: Rejects unresolved conditional cases instead of silently selecting the last case; blockers: prepare a description and open against `release_26.0`; runtime reachability remains unproven in [the investigation](23521_current_case_theory.md).
- Branch `issue_23521_empty_collection_single_data_param` — Description: Returns a named 400 when a collection reaches a non-multiple data parameter; blockers: open against `release_26.1` using [the prepared description](issue_23521_pr_description.md).
- Branch `playwright_hover_away` — Description: Adds `hover_away()` and rejects unsupported Playwright action chains; blockers: open against `release_26.1` using [the prepared description](playwright_hover_away_pr_description.md).
- Branch `metadata_lazy_imports` — Description: Combines metadata lazy imports with Phase 0 while preserving compatibility checks; blockers: await fork CI on `5c5a491de0b` (rebased onto `dev` 2026-09-23), prepare the description, and open a PR.
- Branch `metadata_tool_models_lightweight` — Description: Moves tool model definitions behind lightweight package imports; blockers: await fork CI, prepare the description, and open a PR.
- Branch `metadata_schema_states_lightweight` — Description: Makes schema imports lightweight and moves model states into a small module; blockers: await fork CI, prepare the description, and open a PR.
- Branch `metadata_runtime_imports` — Description: Defers optional agent, Celery, and Pulsar imports during app loading; blockers: await fork CI, prepare the description, and open a PR.
- Branch `when_expression_analysis` — Description: Matches workflow `when` inputs structurally instead of by substring; blockers: triage four red fork checks, then open using `OPT_INPUT_PR_2_DESCR.md`.
- Branch `issue_23424_when_expression_validation` — Description: Rejects obsolete pipe-delimited tool-input paths during workflow import; blockers: triage four red check groups on `2938c2448c6`, then open using `WHEN_VALIDATION_PR_DESCR.md`.
- Branch `optional_input_gating` — Description: Runs workflow steps only when optional inputs are present; blockers: triage five red fork checks, then open using `OPT_INPUT_PR_3_DESCR.md`.
- Branch `workflow_input_pipe_names` — Description: Reserves pipes in input names with three possible correction scopes; blockers: fix lint and mypy failures, then choose a scope from [the comparison](workflow_input_pipe_names_versions.md).
- Branch `resubmit_static_chain_test_26.1` — Description: Tests repeated resubmission through static destinations with per-hop environment values; blockers: recover the fork-only branch, choose the target and coauthor trailer, then open using [the prepared description](resubmit_static_chain_test_pr_description.md).
- Branch `cwl_fixes_5` — Description: Collects CWL validation, typing, output-path, and job-document fixes; blockers: rebase, replay subworkflow mapping, run conformance tests, and choose the PR split.
- Branch `subworkflow_mapping_when_alignment` — Description: Aligns mapped subworkflow `when` values with compatible collection inputs; blockers: determine its stack relationship, rebase, validate, and open a PR.

## Galaxy branches — still deciding on (`branches_need_decision`)

_Empty._

## Important Open PRs in other projects (`other_prs`)

- [Pulsar #486](https://github.com/galaxyproject/pulsar/pull/486) — branch `htcondor2` — Description: Adds a queued HTCondor manager shared with Galaxy; blockers: rebase and resolve the hold/retry-policy thread before Galaxy #23326.
- [IWC #1366](https://github.com/galaxyproject/iwc/pull/1366) — branch `codex/expand-claude-review-command` — Description: Expands the agent review command for IWC workflows; blockers: needs review.
- [IWC #1365](https://github.com/galaxyproject/iwc/pull/1365) — branch `deploy-report-only-on-failure` — Description: Reports deployment status only after an actual failure; blockers: needs review.
- [Planemo #1695](https://github.com/galaxyproject/planemo/pull/1695) — branch `issue-1693-iwc-missing-tests-error` — Description: Requires workflow tests under the IWC lint profile; blockers: rerun CI after #1698 and triage any remaining failures.
- [Planemo #1697](https://github.com/galaxyproject/planemo/pull/1697) — branch `issue-1694-iwc-changelog-date` — Description: Validates dates in IWC changelog headings; blockers: needs review (CI is green).
