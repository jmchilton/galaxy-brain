# TICK — 2026-10-13 evening

Reviewed all 59 queue entries, live PR states and current fork-head check rollups. Upstream dev: `63192fd64e46234a7a1aa933e44d8e0930112ccf`.

## Queue changes

- `plugins_test_fake_provider` → `ready`. GitHub now reports OPEN, non-draft and mergeable at `cc3fe81fbc50`; this TICK did not change draft status. Relevant Integration coverage passes. The only failed workflow is the previously diagnosed unrelated Pulsar package-import failure. Reclassified to `ready`.
- `issue_24031_badge_tooltip_html` → `ready`. GitHub now reports OPEN, non-draft and mergeable at `b21056e70b8`; this TICK did not change draft status. Fresh CI remains queued/running, with no failures in the snapshot. Reclassified to `ready`; this is not a claim that current-head CI has finished.
- `fix_story_a11y` → `ready`. GitHub now reports OPEN, non-draft and mergeable at `175e7d5a183`; this TICK did not change draft status. Current-head browser/client checks pass. Package runs 38261321068 and 38351349686 fail importing removed `pulsar.client.build_client_manager`, outside the accessibility change. Reclassified to `ready` and requested failed-job reruns.
- `issue_11743_copy_tags_iterable` → `ready`. GitHub now reports OPEN, non-draft and mergeable at its unchanged head; this TICK did not change draft status. The sole failure remains the diagnosed macOS 3.14 client-cache restoration failure. Reclassified to `ready` and requested its failed-job rerun.
- `notebook_iframe` → `branches_need_decision`. GitHub reports PR #22988 CLOSED and unmerged. Moved to `branches_need_decision`; closing the PR is not abandonment. The record and local branch remain active. No rebase or cleanup performed. John needs to decide whether to retain, revive, or explicitly abandon it.
- `issue_3899_pulsar_container_deps` → `branches_implemented`. Current fork head `05e0c26b297a743b69ff14401ab9a535cd11e858` has passing Integration, including both `test_host_job_resolves_dependencies_in_pulsar` and `test_container_job_skips_dependency_resolution_in_pulsar` in [run 38430289612](https://github.com/jmchilton/galaxy/actions/runs/38430289612). The sole red is release-script run 38430289239, which compares the old fork master version (`VERSION_MINOR = None`) against the expected release value; unrelated to dependency resolution. Promoted to `branches_implemented`; failed release-script jobs were rerun. No PR approval or publication inferred.
- `pulsar_mq_status_poll` → `branches_implemented`. Current fork head `9d225eb5eb0dba8c4dc2fe981e453a0bebab5360` has passing Integration: `TestEmbeddedMessageQueuePulsarLostStatusUpdate::test_status_poll_recovers_lost_complete_status` passed in [run 38430282752](https://github.com/jmchilton/galaxy/actions/runs/38430282752). The earlier unreleased-Pulsar blocker is cleared on this head. Remaining reds are unrelated: mulled zlib container building fails while conda retrieves channel metadata (run 38430282896), and the release script compares old fork master `VERSION_MINOR = None` (run 38430282944). Promoted to `branches_implemented`; requested failed-job reruns. No PR approval or publication inferred.

## Actions and limits

- Requested 27 failed-job reruns for diagnosed unrelated failures; all accepted. Reruns do not establish fresh passing coverage.
- No draft-setting changes, new PRs, branch pushes or rebases. Remaining draft CI is pending, or the branch has independent design/read-through instructions.
- `branches_need_polish` and `branches_need_pr` are empty. Final-review branches remain awaiting John.
- `licenses` stays needs CI: its lone successful docs check does not exercise license requirements. Other needs-CI entries retain their documented relevant or undiagnosed failures and missing coverage.
- All ten open PRs by jmchilton created since 2026-10-10 are already in the queue. No missing PRs to add.

## Conflicts

Read-only merge-tree checks used actual release bases for release branches and the current sample-sheet parent for ag-grid. Release branches `issue_23977_client_api_fanout_26.1`, `resubmit_static_chain_test_26.1`, and `issue_23521_conditional_case_resolution` have no conflicts with their actual release bases. Conflicting branches retain their documented substantial reconciliation requirements; no original worktrees or branch refs changed.

- `vitest_readability`: 10 paths. `client/packages/ui/src/components/GCheckbox.test.ts`, `client/src/components/Form/Elements/FormNumberList.test.ts`, `client/src/components/Form/FormElement.test.js`, `client/src/components/History/Content/Collection/CollectionProgress.test.js`, `client/src/components/History/CurrentHistory/HistoryOperations/SelectionOperations.test.js`. Additional paths omitted.
- `subworkflow_mapping`: 4 paths. `client/src/components/Workflow/Editor/test-data/parameter_steps.json`, `lib/galaxy/tool_util_models/__init__.py`, `lib/galaxy/workflow/modules.py`, `mypy.ini`.
- `fix_copied_datasets`: 3 paths. `lib/galaxy/workflow/extract.py`, `lib/galaxy_test/api/test_workflow_extraction.py`, `test/unit/workflows/test_extract_summary.py`.
- `collection_restructure_panel`: 4 paths. `client/src/components/History/ContentItem/DatasetCollection/DscMenu.vue`, `client/src/components/History/ContentItem/DatasetCollection/DscUI.vue`, `doc/source/dev/debugging_galaxy.md`, `doc/source/dev/debugging_tests.md`.
- `pulsar-mq-pull`: 3 paths. `lib/galaxy/jobs/__init__.py`, `lib/galaxy/jobs/runners/__init__.py`, `lib/galaxy/jobs/runners/pulsar.py`.
- `vitest_real_api_calls`: 5 paths. `client/src/components/Form/FormElement.test.js`, `client/src/components/Markdown/Sections/Elements/JobElements.test.ts`, `client/src/components/Sharing/UserSharing.test.ts`, `client/src/components/TagsMultiselect/HeadlessMultiselect.test.ts`, `client/src/utils/upload.test.ts`.
- `issue_20900_invocation_validation`: 3 paths. `lib/galaxy/tools/parameters/basic.py`, `lib/galaxy/workflow/run_request.py`, `lib/galaxy_test/api/test_workflows.py`.
- `tool_form_job_count`: 1 paths. `lib/galaxy/util/permutations.py`.
- `cwl_fixes_5`: 79 paths. `.github/workflows/bioblend.yaml`, `.github/workflows/build_client.yaml`, `.github/workflows/build_container_image.yaml`, `.github/workflows/check_test_class_names.yaml`, `.github/workflows/client-unit.yaml`. Additional paths omitted.
- `licenses`: 10 paths. `client/packages/api-client/src/schema/schema.ts`, `client/src/components/Tool/ToolForm.test.ts`, `client/src/components/Tool/ToolForm.vue`, `client/src/components/Workflow/Run/WorkflowRun.test.js`, `client/src/components/Workflow/Run/WorkflowRunForm.vue`. Additional paths omitted.
- `extract_next_followups`: 2 paths. `client/src/components/Common/GCard.test.ts`, `client/src/components/Common/GCard.vue`.
- `yaml_boolean_defaults`: 5 paths. `lib/galaxy/tool_util/parameters/convert.py`, `lib/galaxy/tool_util/parser/interface.py`, `lib/galaxy/tool_util/parser/util.py`, `lib/galaxy/tools/__init__.py`, `lib/galaxy_test/base/populators.py`.
- `upgrade_advice_structured_like`: 2 paths. `lib/galaxy/tool_util/linters/output.py`, `lib/galaxy/tool_util/xsd/galaxy.xsd`.
- `issue_23980_static_restriction_default`: 1 paths. `lib/galaxy/workflow/modules.py`.
- `ag_grid_36`: 9 paths. `client/src/components/Collections/PairedOrUnpairedListCollectionCreator.vue`, `client/src/components/Collections/common/DisplayCollectionAsSheet.vue`, `client/src/components/Collections/sheet/SampleSheetGrid.test.ts`, `client/src/components/Collections/sheet/SampleSheetGrid.vue`, `client/src/components/Collections/sheet/useSampleSheetGrid.test.ts`. Additional paths omitted.

## Reruns

- `plugins_test_fake_provider`: [run 38330158218](https://github.com/galaxyproject/galaxy/actions/runs/38330158218) — requested.
- `fix_story_a11y`: [run 38351349686](https://github.com/galaxyproject/galaxy/actions/runs/38351349686) — requested.
- `issue_11743_copy_tags_iterable`: [run 37773026992](https://github.com/galaxyproject/galaxy/actions/runs/37773026992) — requested.
- `vitest_real_api_calls`: [run 38347319493](https://github.com/jmchilton/galaxy/actions/runs/38347319493) — requested.
- `integration_ci_scope`: [run 37976218891](https://github.com/jmchilton/galaxy/actions/runs/37976218891) — requested.
- `issue_23978_parameter_tools_xsd`: [run 37879977381](https://github.com/jmchilton/galaxy/actions/runs/37879977381) — requested.
- `issue_20657_input_processing_mode`: [run 37667847372](https://github.com/jmchilton/galaxy/actions/runs/37667847372) — requested.
- `issue_20657_input_processing_mode`: [run 37667847870](https://github.com/jmchilton/galaxy/actions/runs/37667847870) — requested.
- `issue_20657_input_processing_mode`: [run 37667848042](https://github.com/jmchilton/galaxy/actions/runs/37667848042) — requested.
- `issue_20657_input_processing_mode`: [run 37667847664](https://github.com/jmchilton/galaxy/actions/runs/37667847664) — requested.
- `issue_20657_input_processing_mode`: [run 37667848057](https://github.com/jmchilton/galaxy/actions/runs/37667848057) — requested.
- `issue_20657_input_processing_mode`: [run 37667847933](https://github.com/jmchilton/galaxy/actions/runs/37667847933) — requested.
- `issue_20657_input_processing_mode`: [run 37667848013](https://github.com/jmchilton/galaxy/actions/runs/37667848013) — requested.
- `tool_form_job_count`: [run 37636763488](https://github.com/jmchilton/galaxy/actions/runs/37636763488) — requested.
- `tool_form_job_count`: [run 37636763610](https://github.com/jmchilton/galaxy/actions/runs/37636763610) — requested.
- `tool_form_job_count`: [run 37636764649](https://github.com/jmchilton/galaxy/actions/runs/37636764649) — requested.
- `tool_form_job_count`: [run 37636764521](https://github.com/jmchilton/galaxy/actions/runs/37636764521) — requested.
- `tool_form_job_count`: [run 37636764574](https://github.com/jmchilton/galaxy/actions/runs/37636764574) — requested.
- `tool_form_job_count`: [run 37636764775](https://github.com/jmchilton/galaxy/actions/runs/37636764775) — requested.
- `tool_form_job_count`: [run 37636764711](https://github.com/jmchilton/galaxy/actions/runs/37636764711) — requested.
- `tool_form_job_count`: [run 37636764654](https://github.com/jmchilton/galaxy/actions/runs/37636764654) — requested.
- `toolshed_repository_contents`: [run 37950058968](https://github.com/jmchilton/galaxy/actions/runs/37950058968) — requested.
- `tool_open_tool_shed_ids`: [run 38167310135](https://github.com/jmchilton/galaxy/actions/runs/38167310135) — requested.
- `issue_3899_pulsar_container_deps`: [run 38430289239](https://github.com/jmchilton/galaxy/actions/runs/38430289239) — requested.
- `pulsar_mq_status_poll`: [run 38430282944](https://github.com/jmchilton/galaxy/actions/runs/38430282944) — requested.
- `pulsar_mq_status_poll`: [run 38430282896](https://github.com/jmchilton/galaxy/actions/runs/38430282896) — requested.
- `fix_story_a11y`: [run 38261321068](https://github.com/galaxyproject/galaxy/actions/runs/38261321068) — requested.

## Validation and sync

`make validate`: 122 files, zero errors, 15 advisory warnings. Existing edits from other sessions were preserved. Tracking sync uses an isolated index so only this TICK’s status changes and appended evidence are committed.
