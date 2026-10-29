# Galaxy Issue Backlog

Triage index for `galaxyproject/galaxy` issues, per [`MY_ISSUES_INDEX.md`](../../../agents/_shared/MY_ISSUES_INDEX.md); detail lives in `vault/repositories/galaxy/issues/`. Branch and PR state lives in [`MY_BRANCHES.md`](../branches/MY_BRANCHES.md).

GitHub state last refreshed: 2026-10-27. Every open issue below is assigned to jmchilton.

## Waiting on John (`needs_decision`)

- [#22710](https://github.com/galaxyproject/galaxy/issues/22710) — invocations never capture validated tool request state; 4-day attempt failed; decide: restart from MINT or salvage TES shape? [notes](needs_decision/22710/index.md)
- [#23444](https://github.com/galaxyproject/galaxy/issues/23444) — canonical nested parameter-reference syntax for YAML tools; decide: answer mvdbeek's two scoping questions. [notes](needs_decision/23444/index.md)
- [#22739](https://github.com/galaxyproject/galaxy/issues/22739) — extract `Tool.to_json` into `ToolFormBuilder`; plan published; decide: agree on the plan before code moves. [notes](needs_decision/22739/index.md)
- [#24303](https://github.com/galaxyproject/galaxy/issues/24303) — no way to declare output collection type as input type plus a list level (Nest, #24190); decide: attribute name and scope of shared `type_source` rule. [notes](needs_decision/24303/index.md)
- [#24308](https://github.com/galaxyproject/galaxy/issues/24308) — `type_source` output type disagrees with bound input (direct match vs map-over); decide: concrete type for mapped outputs vs #24227. [notes](needs_decision/24308/index.md)

## In motion (`wip`)

- [#24457](https://github.com/galaxyproject/galaxy/issues/24457) — after password reset, client keeps stale CSRF token; login fails "Wrong session token"; fix on `galaxy_ui_driver` (76c58d2fb7f). [notes](wip/24457/index.md)
- [#19325](https://github.com/galaxyproject/galaxy/issues/19325) — `value_json="null"` for optional selects undocumented; branch `issue_19325_optional_select_test_docs`. [notes](wip/19325/index.md)
- [#21788](https://github.com/galaxyproject/galaxy/issues/21788) — extraction gives empty workflow for empty collections; PR [#21806](https://github.com/galaxyproject/galaxy/pull/21806) (`fix_copied_datasets`). [notes](wip/21788/index.md)
- [#21789](https://github.com/galaxyproject/galaxy/issues/21789) — extraction misses tools for dynamic nested collections; PR [#21806](https://github.com/galaxyproject/galaxy/pull/21806) (`fix_copied_datasets`). [notes](wip/21789/index.md)
- [#21971](https://github.com/galaxyproject/galaxy/issues/21971) — schema-aware workflow tool state validation; PR [#22996](https://github.com/galaxyproject/galaxy/pull/22996) (`wf_tool_state`), link inferred from scope. [notes](wip/21971/index.md)
- [#23261](https://github.com/galaxyproject/galaxy/issues/23261) — native license acceptance for tools (`<license_agreement>`); branch `licenses`. [notes](wip/23261/index.md)
- [#23424](https://github.com/galaxyproject/galaxy/issues/23424) — validate `when` expression input references at import; branch `issue_23424_when_expression_validation`. [notes](wip/23424/index.md)
- [#23428](https://github.com/galaxyproject/galaxy/issues/23428) — are pipes allowed in subworkflow input names; branch `workflow_input_pipe_names`. [notes](wip/23428/index.md)
- [#23521](https://github.com/galaxyproject/galaxy/issues/23521) — unmatched conditional case silently runs the last `<when>`; branch `issue_23521_conditional_case_resolution`. [notes](wip/23521/index.md)
- [#23884](https://github.com/galaxyproject/galaxy/issues/23884) — `structured_like` upgrade advice names the wrong profile; branch `upgrade_advice_structured_like`. [notes](wip/23884/index.md)
- [#23888](https://github.com/galaxyproject/galaxy/issues/23888) — YAML tool authoring models vs loader dialects; first slice branch `yaml_boolean_defaults`. [notes](wip/23888/index.md)
- [#23891](https://github.com/galaxyproject/galaxy/issues/23891) — `format_source` resolves internal job keys; branch `issue_23891_output_reference_resolver`. [notes](wip/23891/index.md)
- [#23902](https://github.com/galaxyproject/galaxy/issues/23902) — unqualified `format_source` resolves only via legacy alias; branch `issue_23902_qualified_output_references` (stacked on #23891's). [notes](wip/23902/index.md)
- [#23897](https://github.com/galaxyproject/galaxy/issues/23897) — XML `<output type="collection">` never parsed; branch `issue_23897_xml_collection_output`. [notes](wip/23897/index.md)
- [#23914](https://github.com/galaxyproject/galaxy/issues/23914) — notebook card hides Share when user loads late; branch `issue_23914_page_card_actions`. [notes](wip/23914/index.md)
- [#24220](https://github.com/galaxyproject/galaxy/issues/24220) — tool form drop matches collections by plain `endsWith`; branch `issue_20657_input_processing_mode` (26.0 backport). [notes](wip/24220/index.md)
- [#24221](https://github.com/galaxyproject/galaxy/issues/24221) — option paging/merge drops a collection's map-over entry; branch `issue_20657_input_processing_mode` (26.1 backport). [notes](wip/24221/index.md)
- [#24379](https://github.com/galaxyproject/galaxy/issues/24379) — editor lint flags rename `${name}` filled by a parameter input; extract fix can't succeed; branch `untyped_param_lint_declared_labels`. [notes](wip/24379/index.md)
- [#24410](https://github.com/galaxyproject/galaxy/issues/24410) — UDT `$(inputs.x.element_identifier)` is `null` when mapped over a list from tool form/API; branch `udt_element_identifier_api_test`. [notes](wip/24410/index.md)
- [#24411](https://github.com/galaxyproject/galaxy/issues/24411) — job cache reuses a job with another `element_identifier` (plain↔mapped, list↔list); branch `issue_24411_job_cache_identifier_25.1`. [notes](wip/24411/index.md)
- (large) [#24441](https://github.com/galaxyproject/galaxy/issues/24441) — Tool Shed upload API `dry_run` half-built; report new installable revision vs in-place overwrite; branch `issue_24441_tool_shed_upload_dry_run`. [notes](wip/24441/index.md)
- [#24531](https://github.com/galaxyproject/galaxy/issues/24531) — disabled history item edit button never shows "not yet editable" tooltip; branch `issue_24531_edit_disabled_tooltip_26.2`. [notes](wip/24531/index.md)

## Queued (`queued`)

- [#24601](https://github.com/galaxyproject/galaxy/issues/24601) — Auto/Advanced Build List clears history selection on open, lost if user leaves; next: after #24487 lands on dev, clear on create via store signal. [notes](queued/24601/index.md)
- [#24550](https://github.com/galaxyproject/galaxy/issues/24550) — direct-download URLs live 24 h on aws_s3/generic_s3/cloud, docs say ~1 h; next: `direct_download_expires_in` setting + per-backend red tests. [notes](queued/24550/index.md)
- [#24546](https://github.com/galaxyproject/galaxy/issues/24546) — object store cache monitor never starts w/o Celery; `enable_cache_monitor` gate defaults False; next: red unit test + drop gate. [notes](queued/24546/index.md)
- [#24532](https://github.com/galaxyproject/galaxy/issues/24532) — Delete Account modal shows generic error; checks `err_code === 403` vs server's 403004; next: named constant + red vitest. [notes](queued/24532/index.md)
- [#24485](https://github.com/galaxyproject/galaxy/issues/24485) — collection test `count`/`element_count`/`max` of 0 skipped by truthiness check; next: `is not None` + unit test. [notes](queued/24485/index.md)
- [#24481](https://github.com/galaxyproject/galaxy/issues/24481) — mapped list outputs over sample sheets precreate invalid collection types; next: red regression test for composition. [notes](queued/24481/index.md)
- [#24476](https://github.com/galaxyproject/galaxy/issues/24476) — ParsedTool output models drop `<filter>`, conditional outputs look unconditional; next: red unit test on `output_filter.xml`. [notes](queued/24476/index.md)
- [#24474](https://github.com/galaxyproject/galaxy/issues/24474) — collection parameter validation accepts undeclared types; next: red API test for incompatible direct HDCA inputs. [notes](queued/24474/index.md)
- [#24469](https://github.com/galaxyproject/galaxy/issues/24469) — building collection from history selection leaves selection mode on, stale count (since 25.0); next: red vitest + restore handler. [notes](queued/24469/index.md)
- [#24305](https://github.com/galaxyproject/galaxy/issues/24305) — workflow API saves duplicate output labels (server check dead); invocation hides outputs; next: red API tests. [notes](queued/24305/index.md)
- [#24309](https://github.com/galaxyproject/galaxy/issues/24309) — custom build from FASTA not listed until jobs finish + reload; next: red API test for pending state. [notes](queued/24309/index.md)
- (unassigned) [#24315](https://github.com/galaxyproject/galaxy/issues/24315) — error report forms shown when emails unconfigured; invocation feedback always claims success; next: UI repro, then config flag branch. [notes](queued/24315/index.md)
- (unassigned) [#24316](https://github.com/galaxyproject/galaxy/issues/24316) — Filter1: missing column → traceback; `stop_err` exits 0 so errors finish green (profile 24.2); next: red tool tests + exit 1. [notes](queued/24316/index.md)
- [#24226](https://github.com/galaxyproject/galaxy/issues/24226) — server `effective_collection_type` under-strips `X:paired_or_unpaired` over matching input, too many jobs; next: red tests on 26.0. [notes](queued/24226/index.md)
- [#24172](https://github.com/galaxyproject/galaxy/issues/24172) — column param on not-ready dataset shows "No options available.", blocks queuing; next: red test for `textable`. [notes](queued/24172/index.md)
- [#24173](https://github.com/galaxyproject/galaxy/issues/24173) — invocation view selections (step/job/input/output) have no shareable URL; next: route query params. [notes](queued/24173/index.md)
- [#24174](https://github.com/galaxyproject/galaxy/issues/24174) — rerun doesn't record which invocation it came from; next: implement from proposal. [notes](queued/24174/index.md)
- [#24175](https://github.com/galaxyproject/galaxy/issues/24175) — rerun of imported invocation 500s on step params; next: port spike fix after #24178 helpers. [notes](queued/24175/index.md)
- [#24176](https://github.com/galaxyproject/galaxy/issues/24176) — full run form ignores invocation on rerun; next: server-seeded prefill from spike. [notes](queued/24176/index.md)
- [#24200](https://github.com/galaxyproject/galaxy/issues/24200) — workflow input validators rewritten on import (negate/extra ranges/messages lost); next: land red repro. [notes](queued/24200/index.md)
- [#24219](https://github.com/galaxyproject/galaxy/issues/24219) — selected collection off the first option page lost on tool form refresh (not pinned); next: red API test, server pin helper. [notes](queued/24219/index.md)
- [#24177](https://github.com/galaxyproject/galaxy/issues/24177) — simplified rerun form silently drops tool step params; next: after #24176, route to full form. [notes](queued/24177/index.md)
- [#24178](https://github.com/galaxyproject/galaxy/issues/24178) — subworkflow step params in request export can't be posted back (500); next: PR spike's re-keying helpers. [notes](queued/24178/index.md)
- (large) [#22709](https://github.com/galaxyproject/galaxy/issues/22709) — meta-issue: workflow extraction overhaul (notebook → graph → workflow); next: track individual bugs separately. [notes](queued/22709/index.md)
- (large) [#22954](https://github.com/galaxyproject/galaxy/issues/22954) — Format 2 workflows have no layout round-trip; next: scope across gxformat2, editor and IWC. [notes](queued/22954/index.md)
- (large) [#22999](https://github.com/galaxyproject/galaxy/issues/22999) — flag workflow outputs ephemeral to skip metadata; next: check whether deferred datasets are the mechanism. [notes](queued/22999/index.md)
- [#23895](https://github.com/galaxyproject/galaxy/issues/23895) — `fill_defaults` import drops or crashes on nested repeat connections; next: shared descent helper, red API tests. [notes](queued/23895/index.md)
- [#23457](https://github.com/galaxyproject/galaxy/issues/23457) — GCP Batch sizing diverged between Galaxy and Pulsar; next: decide where the shared helper lives. [notes](queued/23457/index.md)
- [#22743](https://github.com/galaxyproject/galaxy/issues/22743) — Playwright coverage for chat context and docked panel; next: implement from the written plan. [notes](queued/22743/index.md)
- [#22534](https://github.com/galaxyproject/galaxy/issues/22534) — no way to tell whether a workflow needs updating; next: scope against refactor/upgrade machinery. [notes](queued/22534/index.md)
- [#23766](https://github.com/galaxyproject/galaxy/issues/23766) — schema.org `funding` parity beyond tool XML; next: workflow model/API slice. [notes](queued/23766/index.md)
- [#23667](https://github.com/galaxyproject/galaxy/issues/23667) — job metrics lost under extended metadata; next: red test. [notes](queued/23667/index.md)
- [#23678](https://github.com/galaxyproject/galaxy/issues/23678) — pages have no `/pages/view?id=` route; next: client redirect route. [notes](queued/23678/index.md)
- [#21242](https://github.com/galaxyproject/galaxy/issues/21242) — transient `test_delete_job_with_message`; race fixes merged; next: PR dropping the transient decorator, then close. [notes](queued/21242/index.md)
- [#21380](https://github.com/galaxyproject/galaxy/issues/21380) — transient `test_list_list_copy`; next: reproduce and diagnose. [notes](queued/21380/index.md)
- [#21244](https://github.com/galaxyproject/galaxy/issues/21244) — transient Selenium `test_history_dataset_auto_detect_datatype`; next: diagnose from the stack trace. [notes](queued/21244/index.md)
- [#21225](https://github.com/galaxyproject/galaxy/issues/21225) — transient `test_tool_discovery_landing` card-link wait; next: diagnose, likely an easy wait fix. [notes](queued/21225/index.md)
- [#21224](https://github.com/galaxyproject/galaxy/issues/21224) — transient `test_sharing_private_history_default_permission`; next: diagnose. [notes](queued/21224/index.md)
- [#13460](https://github.com/galaxyproject/galaxy/issues/13460) — quay.io: support more than one namespace; next: add multi-namespace support. [notes](queued/13460/index.md)
- [#3713](https://github.com/galaxyproject/galaxy/issues/3713) — cut tool's output section fails linting; next: re-lint `cut.xml` and fix what still fails. [notes](queued/3713/index.md)
- [#22195](https://github.com/galaxyproject/galaxy/issues/22195) — optional text `""` vs `null` can't be entered in forms; next: tests pinning `""` vs `null`. [notes](queued/22195/index.md)
- [#22191](https://github.com/galaxyproject/galaxy/issues/22191) — disabling a required input forces the legacy run form; next: best-practices warning plus root cause. [notes](queued/22191/index.md)
- [#20902](https://github.com/galaxyproject/galaxy/issues/20902) — detect-common-error false positive for single-item collection into `multiple`; next: red test. [notes](queued/20902/index.md)
- [#14684](https://github.com/galaxyproject/galaxy/issues/14684) — malformed gxformat2 import shows unhelpful error; next: surface lint/validation detail. [notes](queued/14684/index.md)
- [#18351](https://github.com/galaxyproject/galaxy/issues/18351) — report editor ignores map-over, embed breaks rendering; next: red test. [notes](queued/18351/index.md)
- [#13926](https://github.com/galaxyproject/galaxy/issues/13926) — link-shared report page datasets not viewable logged out; next: decide whether link sharing grants access. [notes](queued/13926/index.md)
- [#20964](https://github.com/galaxyproject/galaxy/issues/20964) — `show_column_headers` no effect on tabular; next: client option to read headers from the file. [notes](queued/20964/index.md)
- [#21052](https://github.com/galaxyproject/galaxy/issues/21052) — changing datatype of a deferred dataset; next: prototype the change path. [notes](queued/21052/index.md)
- [#20376](https://github.com/galaxyproject/galaxy/issues/20376) — rerun forms lose collection inputs in imported histories; next: reproduce. [notes](queued/20376/index.md)
- [#21219](https://github.com/galaxyproject/galaxy/issues/21219) — Sentry `Cannot copy a NoneType to a collection element`; next: find the source via the improved message. [notes](queued/21219/index.md)
- [#18153](https://github.com/galaxyproject/galaxy/issues/18153) — anon users see broken object store selection; next: decide hide or fix. [notes](queued/18153/index.md)
- [#19391](https://github.com/galaxyproject/galaxy/issues/19391) — `file_source_templates_config_dir` option; next: add it. [notes](queued/19391/index.md)
- [#21811](https://github.com/galaxyproject/galaxy/issues/21811) — make `uv run` work from the Galaxy root; next: retry `uv.lock` with current tooling. [notes](queued/21811/index.md)
- [#3899](https://github.com/galaxyproject/galaxy/issues/3899) — dependencies resolved for jobs that run in Docker; next: check on dev. [notes](queued/3899/index.md)
- [#23977](https://github.com/galaxyproject/galaxy/issues/23977) — client page loads fan out /api/ requests (invocations list 165, 96 × 429 on test); next: dedupe datatypes fetch, red request-count test. [notes](queued/23977/index.md)
- [#23978](https://github.com/galaxyproject/galaxy/issues/23978) — `parameters/` test tools use ignored `ext=`; 17 tools fail XSD, CI skips them; next: fix after issue_18642 lands, add to CI. [notes](queued/23978/index.md)
- [#23980](https://github.com/galaxyproject/galaxy/issues/23980) — workflow text param with static allowed values ignores its default in the run form; next: per-option `selected` from default + red unit test. [notes](queued/23980/index.md)
- [#23981](https://github.com/galaxyproject/galaxy/issues/23981) — workflow rename `#{name }` with padding silently renders empty (hits IWC VGP5); next: always strip + flip parity test row. [notes](queued/23981/index.md)
- [#23983](https://github.com/galaxyproject/galaxy/issues/23983) — TEMP SSE/notification overrides left in E2E workflows; two are dead keys; next: revert PR (coordinate with #23976). [notes](queued/23983/index.md)
- [#24031](https://github.com/galaxyproject/galaxy/issues/24031) — storage badge tooltips and `.html` tooltip `aria-label`s show literal HTML tags; next: badge `.html` + directive label fix, red vitest. [notes](queued/24031/index.md)
- [#24035](https://github.com/galaxyproject/galaxy/issues/24035) — nested `GTooltip` text joins `GButton`/`GLink` accessible names; next: shared relocate composable from `GPopover`, red vitest. [notes](queued/24035/index.md)
- [#24036](https://github.com/galaxyproject/galaxy/issues/24036) — collapsible `Heading` toggle button has no accessible name or `aria-expanded`; next: `useUid` id + `aria-labelledby`/`aria-expanded`, red vitest. [notes](queued/24036/index.md)
- [#24037](https://github.com/galaxyproject/galaxy/issues/24037) — `GModal` `<dialog>` and its × close button have no accessible name; next: `titleId` + `aria-labelledby`, name close, red vitest. [notes](queued/24037/index.md)
- [#24138](https://github.com/galaxyproject/galaxy/issues/24138) — invocation Steps tab step headers freeze while invocation runs (regression #20719); next: watcher in `useInvocationGraph`, red component vitest. [notes](queued/24138/index.md)
- [#22745](https://github.com/galaxyproject/galaxy/issues/22745) — invocation graph freezes mid run; O(n²) 3 s refresh measured, comment posted; next: hoist PR + idle-refresh test. [notes](queued/22745/index.md)
- [#24350](https://github.com/galaxyproject/galaxy/issues/24350) — `has_line_matching` wraps regex as `^e$` (ungrouped) but docs match `has_text_matching`; next: red unit test, split annotation, regen. [notes](queued/24350/index.md)
- [#24376](https://github.com/galaxyproject/galaxy/issues/24376) — library folder download Selenium test lacks `test_` prefix; stale selector + zip name; next: rename, fix both, run. [notes](queued/24376/index.md)
- [#24471](https://github.com/galaxyproject/galaxy/issues/24471) — workflow import 500s (IntegrityError) when an embedded UDT follows a step with an output/PJA; next: red API test in `test_workflows.py`, UDT pre-pass. [notes](queued/24471/index.md)


## Blocked on others (`blocked`)

- [#24551](https://github.com/galaxyproject/galaxy/issues/24551) — metadata-file / extra-file downloads pull through object store cache, fail past cache size; blocked on: #24484 merging. [notes](blocked/24551/index.md)
- [#22598](https://github.com/galaxyproject/galaxy/issues/22598) — Tool Shed contents hidden from anonymous users after bot traffic; blocked on: an infrastructure decision (natefoo, mvdbeek). [notes](blocked/22598/index.md)
- [#23183](https://github.com/galaxyproject/galaxy/issues/23183) — warm pool of interactive tool instances; blocked on: startup metrics showing which part is slow. [notes](blocked/23183/index.md)

## Untriaged (`untriaged`)

- [#1810](https://github.com/galaxyproject/galaxy/issues/1810) — Simplified User-Facing Dataset Collection Model
- [#19234](https://github.com/galaxyproject/galaxy/issues/19234) — Missing batch mode info for paired data
- [#19677](https://github.com/galaxyproject/galaxy/issues/19677) — Type annotation imports breaking the package structure
- [#20540](https://github.com/galaxyproject/galaxy/issues/20540) — Implement UI for Fixed Length Collections (records)
- [#20657](https://github.com/galaxyproject/galaxy/issues/20657) — Always show and explain how collections / `multiple="true"` data inputs are processed
- [#20900](https://github.com/galaxyproject/galaxy/issues/20900) — Add validation step in workflow submission / scheduling
- [#21015](https://github.com/galaxyproject/galaxy/issues/21015) — Cannot provide multiple selection text input for multiple selection tool input
- [#23935](https://github.com/galaxyproject/galaxy/issues/23935) — Drop handsontable after 26.2 is branched.
- [#24438](https://github.com/galaxyproject/galaxy/issues/24438) — Select values with comma are handled incorrectly in tests
- [#24389](https://github.com/galaxyproject/galaxy/issues/24389) — Testing: duplicate parameters in repeats are not reported (when inside conditional)
- [#24375](https://github.com/galaxyproject/galaxy/issues/24375) — Workflow text input restrictions lose data through the editor's `value:label,...` string
- [#24335](https://github.com/galaxyproject/galaxy/issues/24335) — Markdown editor cell menus lose keyboard focus after selecting an item
- [#24328](https://github.com/galaxyproject/galaxy/issues/24328) — Installing data_manager_fetch_index_maf stops Galaxy from starting
- [#24273](https://github.com/galaxyproject/galaxy/issues/24273) — Scheduled Selenium tests are failing
- [#24264](https://github.com/galaxyproject/galaxy/issues/24264) — Library dataset iteration fails
- [#24188](https://github.com/galaxyproject/galaxy/issues/24188) — Rename post-job action yields "<galaxy.model.HistoryDatasetAssociation(...)>" when a subworkflow text input is fed from an expression tool
