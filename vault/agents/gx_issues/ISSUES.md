# Galaxy Issue Backlog

Triage index for `galaxyproject/galaxy` issues, per [`ISSUES_INDEX.md`](../_shared/ISSUES_INDEX.md); detail lives in `vault/repositories/galaxy/issues/`. Branch and PR state lives in `vault/agents/gx_branches/MY_BRANCHES.md`.

GitHub state last refreshed: 2026-10-06. Every open issue below is assigned to jmchilton.

## Waiting on John (`needs_decision`)

- [#22710](https://github.com/galaxyproject/galaxy/issues/22710) — invocations never capture validated tool request state; 4-day attempt failed; decide: restart from MINT or salvage TES shape? [notes](../../repositories/galaxy/issues/needs_decision/22710/index.md)
- [#23444](https://github.com/galaxyproject/galaxy/issues/23444) — canonical nested parameter-reference syntax for YAML tools; decide: answer mvdbeek's two scoping questions. [notes](../../repositories/galaxy/issues/needs_decision/23444/index.md)
- [#22739](https://github.com/galaxyproject/galaxy/issues/22739) — extract `Tool.to_json` into `ToolFormBuilder`; plan published; decide: agree on the plan before code moves. [notes](../../repositories/galaxy/issues/needs_decision/22739/index.md)

## In motion (`wip`)

- [#19325](https://github.com/galaxyproject/galaxy/issues/19325) — `value_json="null"` for optional selects undocumented; branch `issue_19325_optional_select_test_docs`. [notes](../../repositories/galaxy/issues/wip/19325/index.md)
- [#21788](https://github.com/galaxyproject/galaxy/issues/21788) — extraction gives empty workflow for empty collections; PR [#21806](https://github.com/galaxyproject/galaxy/pull/21806) (`fix_copied_datasets`). [notes](../../repositories/galaxy/issues/wip/21788/index.md)
- [#21789](https://github.com/galaxyproject/galaxy/issues/21789) — extraction misses tools for dynamic nested collections; PR [#21806](https://github.com/galaxyproject/galaxy/pull/21806) (`fix_copied_datasets`). [notes](../../repositories/galaxy/issues/wip/21789/index.md)
- [#21971](https://github.com/galaxyproject/galaxy/issues/21971) — schema-aware workflow tool state validation; PR [#22996](https://github.com/galaxyproject/galaxy/pull/22996) (`wf_tool_state`), link inferred from scope. [notes](../../repositories/galaxy/issues/wip/21971/index.md)
- [#23261](https://github.com/galaxyproject/galaxy/issues/23261) — native license acceptance for tools (`<license_agreement>`); branch `licenses`. [notes](../../repositories/galaxy/issues/wip/23261/index.md)
- [#23424](https://github.com/galaxyproject/galaxy/issues/23424) — validate `when` expression input references at import; branch `issue_23424_when_expression_validation`. [notes](../../repositories/galaxy/issues/wip/23424/index.md)
- [#23428](https://github.com/galaxyproject/galaxy/issues/23428) — are pipes allowed in subworkflow input names; branch `workflow_input_pipe_names`. [notes](../../repositories/galaxy/issues/wip/23428/index.md)
- [#23521](https://github.com/galaxyproject/galaxy/issues/23521) — unmatched conditional case silently runs the last `<when>`; branch `issue_23521_conditional_case_resolution`. [notes](../../repositories/galaxy/issues/wip/23521/index.md)
- [#23695](https://github.com/galaxyproject/galaxy/issues/23695) — testing docs lack skip-when-site-down; branch `issue_23695_testing_docs_site_down`. [notes](../../repositories/galaxy/issues/wip/23695/index.md)
- [#23884](https://github.com/galaxyproject/galaxy/issues/23884) — `structured_like` upgrade advice names the wrong profile; branch `upgrade_advice_structured_like`. [notes](../../repositories/galaxy/issues/wip/23884/index.md)
- [#23888](https://github.com/galaxyproject/galaxy/issues/23888) — YAML tool authoring models vs loader dialects; first slice branch `yaml_boolean_defaults`. [notes](../../repositories/galaxy/issues/wip/23888/index.md)
- [#23891](https://github.com/galaxyproject/galaxy/issues/23891) — `format_source` resolves internal job keys; branch `issue_23891_output_reference_resolver`. [notes](../../repositories/galaxy/issues/wip/23891/index.md)
- [#23897](https://github.com/galaxyproject/galaxy/issues/23897) — XML `<output type="collection">` never parsed; branch `issue_23897_xml_collection_output`. [notes](../../repositories/galaxy/issues/wip/23897/index.md)
- [#23900](https://github.com/galaxyproject/galaxy/issues/23900) — rename leaves literal `#{...}` after an empty placeholder; branch `issue_23900_rename_single_pass`. [notes](../../repositories/galaxy/issues/wip/23900/index.md)
- [#23914](https://github.com/galaxyproject/galaxy/issues/23914) — notebook card hides Share when user loads late; branch `issue_23914_page_card_actions`. [notes](../../repositories/galaxy/issues/wip/23914/index.md)
- [#23917](https://github.com/galaxyproject/galaxy/issues/23917) — vitest auto-stubs drop `COMPONENT_V_MODEL: false`; branch `issue_23917_compat_vmodel_stubs`. [notes](../../repositories/galaxy/issues/wip/23917/index.md)
- [#23930](https://github.com/galaxyproject/galaxy/issues/23930) — Tool Shed update swaps short/long description (26.1 regression); branch `issue_23930_shed_update_descriptions`. [notes](../../repositories/galaxy/issues/wip/23930/index.md)

## Queued (`queued`)

- (large) [#22709](https://github.com/galaxyproject/galaxy/issues/22709) — meta-issue: workflow extraction overhaul (notebook → graph → workflow); next: track individual bugs separately. [notes](../../repositories/galaxy/issues/queued/22709/index.md)
- (large) [#21659](https://github.com/galaxyproject/galaxy/issues/21659) — progress towards a History Graph View; next: scope a first increment. [notes](../../repositories/galaxy/issues/queued/21659/index.md)
- (large) [#22954](https://github.com/galaxyproject/galaxy/issues/22954) — Format 2 workflows have no layout round-trip; next: scope across gxformat2, editor and IWC. [notes](../../repositories/galaxy/issues/queued/22954/index.md)
- (large) [#22999](https://github.com/galaxyproject/galaxy/issues/22999) — flag workflow outputs ephemeral to skip metadata; next: check whether deferred datasets are the mechanism. [notes](../../repositories/galaxy/issues/queued/22999/index.md)
- [#23902](https://github.com/galaxyproject/galaxy/issues/23902) — unqualified `format_source` resolves only via legacy alias; next: red tests once #23891's branch lands. [notes](../../repositories/galaxy/issues/queued/23902/index.md)
- [#23895](https://github.com/galaxyproject/galaxy/issues/23895) — `fill_defaults` import drops or crashes on nested repeat connections; next: shared descent helper, red API tests. [notes](../../repositories/galaxy/issues/queued/23895/index.md)
- [#23457](https://github.com/galaxyproject/galaxy/issues/23457) — GCP Batch sizing diverged between Galaxy and Pulsar; next: decide where the shared helper lives. [notes](../../repositories/galaxy/issues/queued/23457/index.md)
- [#22743](https://github.com/galaxyproject/galaxy/issues/22743) — Playwright coverage for chat context and docked panel; next: implement from the written plan. [notes](../../repositories/galaxy/issues/queued/22743/index.md)
- [#22534](https://github.com/galaxyproject/galaxy/issues/22534) — no way to tell whether a workflow needs updating; next: scope against refactor/upgrade machinery. [notes](../../repositories/galaxy/issues/queued/22534/index.md)
- [#23766](https://github.com/galaxyproject/galaxy/issues/23766) — schema.org `funding` parity beyond tool XML; next: workflow model/API slice. [notes](../../repositories/galaxy/issues/queued/23766/index.md)
- [#23667](https://github.com/galaxyproject/galaxy/issues/23667) — job metrics lost under extended metadata; next: red test. [notes](../../repositories/galaxy/issues/queued/23667/index.md)
- [#23678](https://github.com/galaxyproject/galaxy/issues/23678) — pages have no `/pages/view?id=` route; next: client redirect route. [notes](../../repositories/galaxy/issues/queued/23678/index.md)
- [#21242](https://github.com/galaxyproject/galaxy/issues/21242) — transient `test_delete_job_with_message`; race fixes merged; next: PR dropping the transient decorator, then close. [notes](../../repositories/galaxy/issues/queued/21242/index.md)
- [#21380](https://github.com/galaxyproject/galaxy/issues/21380) — transient `test_list_list_copy`; next: reproduce and diagnose. [notes](../../repositories/galaxy/issues/queued/21380/index.md)
- [#21244](https://github.com/galaxyproject/galaxy/issues/21244) — transient Selenium `test_history_dataset_auto_detect_datatype`; next: diagnose from the stack trace. [notes](../../repositories/galaxy/issues/queued/21244/index.md)
- [#21225](https://github.com/galaxyproject/galaxy/issues/21225) — transient `test_tool_discovery_landing` card-link wait; next: diagnose, likely an easy wait fix. [notes](../../repositories/galaxy/issues/queued/21225/index.md)
- [#21224](https://github.com/galaxyproject/galaxy/issues/21224) — transient `test_sharing_private_history_default_permission`; next: diagnose. [notes](../../repositories/galaxy/issues/queued/21224/index.md)
- [#13460](https://github.com/galaxyproject/galaxy/issues/13460) — quay.io: support more than one namespace; next: add multi-namespace support. [notes](../../repositories/galaxy/issues/queued/13460/index.md)
- [#3713](https://github.com/galaxyproject/galaxy/issues/3713) — cut tool's output section fails linting; next: re-lint `cut.xml` and fix what still fails. [notes](../../repositories/galaxy/issues/queued/3713/index.md)
- [#22195](https://github.com/galaxyproject/galaxy/issues/22195) — optional text `""` vs `null` can't be entered in forms; next: tests pinning `""` vs `null`. [notes](../../repositories/galaxy/issues/queued/22195/index.md)
- [#22191](https://github.com/galaxyproject/galaxy/issues/22191) — disabling a required input forces the legacy run form; next: best-practices warning plus root cause. [notes](../../repositories/galaxy/issues/queued/22191/index.md)
- [#20902](https://github.com/galaxyproject/galaxy/issues/20902) — detect-common-error false positive for single-item collection into `multiple`; next: red test. [notes](../../repositories/galaxy/issues/queued/20902/index.md)
- [#14684](https://github.com/galaxyproject/galaxy/issues/14684) — malformed gxformat2 import shows unhelpful error; next: surface lint/validation detail. [notes](../../repositories/galaxy/issues/queued/14684/index.md)
- [#18351](https://github.com/galaxyproject/galaxy/issues/18351) — report editor ignores map-over, embed breaks rendering; next: red test. [notes](../../repositories/galaxy/issues/queued/18351/index.md)
- [#13926](https://github.com/galaxyproject/galaxy/issues/13926) — link-shared report page datasets not viewable logged out; next: decide whether link sharing grants access. [notes](../../repositories/galaxy/issues/queued/13926/index.md)
- [#20964](https://github.com/galaxyproject/galaxy/issues/20964) — `show_column_headers` no effect on tabular; next: client option to read headers from the file. [notes](../../repositories/galaxy/issues/queued/20964/index.md)
- [#21052](https://github.com/galaxyproject/galaxy/issues/21052) — changing datatype of a deferred dataset; next: prototype the change path. [notes](../../repositories/galaxy/issues/queued/21052/index.md)
- [#20376](https://github.com/galaxyproject/galaxy/issues/20376) — rerun forms lose collection inputs in imported histories; next: reproduce. [notes](../../repositories/galaxy/issues/queued/20376/index.md)
- [#21219](https://github.com/galaxyproject/galaxy/issues/21219) — Sentry `Cannot copy a NoneType to a collection element`; next: find the source via the improved message. [notes](../../repositories/galaxy/issues/queued/21219/index.md)
- [#18153](https://github.com/galaxyproject/galaxy/issues/18153) — anon users see broken object store selection; next: decide hide or fix. [notes](../../repositories/galaxy/issues/queued/18153/index.md)
- [#19391](https://github.com/galaxyproject/galaxy/issues/19391) — `file_source_templates_config_dir` option; next: add it. [notes](../../repositories/galaxy/issues/queued/19391/index.md)
- [#18750](https://github.com/galaxyproject/galaxy/issues/18750) — user-defined S3 file source import fails; next: confirm on dev, add the `s3fs` property. [notes](../../repositories/galaxy/issues/queued/18750/index.md)
- [#21811](https://github.com/galaxyproject/galaxy/issues/21811) — make `uv run` work from the Galaxy root; next: retry `uv.lock` with current tooling. [notes](../../repositories/galaxy/issues/queued/21811/index.md)
- [#18642](https://github.com/galaxyproject/galaxy/issues/18642) — framework test gaps: `from_file`/`dynamic_options` drill-downs and selects; next: test tools. [notes](../../repositories/galaxy/issues/queued/18642/index.md)
- [#13037](https://github.com/galaxyproject/galaxy/issues/13037) — bug report emails should name the job's conda env or container; next: add them. [notes](../../repositories/galaxy/issues/queued/13037/index.md)
- [#11743](https://github.com/galaxyproject/galaxy/issues/11743) — collection tagging parameter cleanup; next: the three cleanups. [notes](../../repositories/galaxy/issues/queued/11743/index.md)
- [#3899](https://github.com/galaxyproject/galaxy/issues/3899) — dependencies resolved for jobs that run in Docker; next: check on dev. [notes](../../repositories/galaxy/issues/queued/3899/index.md)
- [#22451](https://github.com/galaxyproject/galaxy/issues/22451) — Sentry `Failed to extract job.`; diagnostics merged in [#23651](https://github.com/galaxyproject/galaxy/pull/23651), root cause open; next: root-cause via #22709. [notes](../../repositories/galaxy/issues/queued/22451/index.md)

## Blocked on others (`blocked`)

- [#15515](https://github.com/galaxyproject/galaxy/issues/15515) — "show inputs/outputs" broken for imported histories; blocked on: ahmedhamidawan's WIP [#15573](https://github.com/galaxyproject/galaxy/pull/15573), stale since 2023. [notes](../../repositories/galaxy/issues/blocked/15515/index.md)
- [#22598](https://github.com/galaxyproject/galaxy/issues/22598) — Tool Shed contents hidden from anonymous users after bot traffic; blocked on: an infrastructure decision (natefoo, mvdbeek). [notes](../../repositories/galaxy/issues/blocked/22598/index.md)
- [#23183](https://github.com/galaxyproject/galaxy/issues/23183) — warm pool of interactive tool instances; blocked on: startup metrics showing which part is slow. [notes](../../repositories/galaxy/issues/blocked/23183/index.md)

## Untriaged (`untriaged`)

- [#1684](https://github.com/galaxyproject/galaxy/issues/1684) — More Refined Docker Support for Tools
- [#1810](https://github.com/galaxyproject/galaxy/issues/1810) — Simplified User-Facing Dataset Collection Model
- [#5822](https://github.com/galaxyproject/galaxy/issues/5822) — Rules Widget - Post Merge Smaller Tweaks
- [#10915](https://github.com/galaxyproject/galaxy/issues/10915) — Performance Testing Metrics Aggregation and Comparison
- [#10916](https://github.com/galaxyproject/galaxy/issues/10916) — Performance Testing at Scale
- [#13511](https://github.com/galaxyproject/galaxy/issues/13511) — Galaxy interactive tools with slurm and docker - docker container is not removed when tool is finished.
- [#19049](https://github.com/galaxyproject/galaxy/issues/19049) — Add a dedicated interface for collection types in Workflow input field
- [#19234](https://github.com/galaxyproject/galaxy/issues/19234) — Missing batch mode info for paired data
- [#19677](https://github.com/galaxyproject/galaxy/issues/19677) — Type annotation imports breaking the package structure
- [#20540](https://github.com/galaxyproject/galaxy/issues/20540) — Implement UI for Fixed Length Collections (records)
- [#20657](https://github.com/galaxyproject/galaxy/issues/20657) — Always show and explain how collections / `multiple="true"` data inputs are processed
- [#20900](https://github.com/galaxyproject/galaxy/issues/20900) — Add validation step in workflow submission / scheduling
- [#21015](https://github.com/galaxyproject/galaxy/issues/21015) — Cannot provide multiple selection text input for multiple selection tool input
- [#23935](https://github.com/galaxyproject/galaxy/issues/23935) — Drop handsontable after 26.2 is branched.
