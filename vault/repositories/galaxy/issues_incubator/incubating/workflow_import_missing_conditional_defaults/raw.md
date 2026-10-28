# Workflow import should accept omitted conditional selectors when the tool defines a default case

> **Investigation update, 2026-10-26: already fixed.** Galaxy [PR #24272](https://github.com/galaxyproject/galaxy/pull/24272) merged this generic missing-selector fix into `release_26.1` on October 20. All 13 direct API import cases pass with the fix. Removing only its five-line visitor change reproduces eight HTTP 500 failures, including fastp's exact `KeyError: 'eval_dups'`. Recommend accepting the rejection as a duplicate of an existing fix and not filing a new issue. The earlier development checkout lacked the fix, and the initial investigation missed it on the release branch. See [the full follow-up and comparison](../../../../../repositories/galaxy-tool-util-ts/branches/active/issue_202_fill_defaults/galaxy_import_followup.md).

## Historical draft (superseded)

Agent-to-agent issue draft, queued 2026-10-26 at John's request. Intended repository: `galaxyproject/galaxy`.

## Target and requested direction

Target **`release_26.1` unless a maintainer pushes back**. John explicitly requested this target. Treat this as a workflow-import correctness fix for the existing sparse tool-state contract, not a new requirement that workflow authors serialize every default. Reproduce on that branch and keep the patch appropriate for a maintenance release. If the fix genuinely needs newer infrastructure, explain that constraint before changing the target.

Do not resolve this by requiring all conditional test parameters in workflow documents or by silently selecting an arbitrary branch. Where the tool defines a default case, workflows should support the same omission semantics as the tool-request API. Fully materialized execution/job state remains a separate representation.

## Problem and user impact

A minimal fastp workflow passes the tool-state schema but its import into Galaxy 26.1 was reported to fail with HTTP 500 / `KeyError: 'eval_dups'`. The absent parameter is the selector for `duplicated_reads|handling_options`, an entirely omitted subtree with a tool-defined default. The workflow author should not need to enumerate unrelated default selectors to import the workflow.

The downstream response is currently galaxy-tool-util-ts PR #207: add a blanket missing-selector check under `gxwf validate --strict-state`, plus `gxwf fill-defaults`. The normalization command can be useful for compatibility, but making this a semantic validation failure encodes a Galaxy importer limitation as the workflow-state contract. The Python models intentionally accept these omissions.

This affects programmatically authored workflows and conversion tooling in particular. The original report says a script filled 361 parameters across 33 steps before the containing workflow imported and ran; this is reported evidence from that run, not a reproduction performed for this draft.

## Related material

- Original report and exact fastp example: https://github.com/jmchilton/galaxy-tool-util-ts/issues/202
- Downstream workaround PR: https://github.com/jmchilton/galaxy-tool-util-ts/pull/207
- PR head inspected: `31c5985490c3d253d4a1cff2d691ae314fa5c7d8`.
- ParsedTool fixture: https://github.com/jmchilton/galaxy-tool-util-ts/blob/31c5985490c3d253d4a1cff2d691ae314fa5c7d8/packages/cli/test/fixtures/fastp_1.4.0%2Bgalaxy0.json
- Workflow fixture: https://github.com/jmchilton/galaxy-tool-util-ts/blob/31c5985490c3d253d4a1cff2d691ae314fa5c7d8/packages/cli/test/fixtures/workflows/issue-202-fastp.gxwf.yml
- Vault design context: `vault/research/Component - Tool State Specification.md` and `vault/research/PR 20935 - Tool Request API.md`. These are background notes; verify details against the target branch because the code has evolved since the notes were written.

## Exact reported workflow

```yaml
class: GalaxyWorkflow
inputs:
  reads: {type: collection, collection_type: "list:paired"}
outputs:
  report: {outputSource: fastp/report_json}
steps:
  fastp:
    tool_id: toolshed.g2.bx.psu.edu/repos/iuc/fastp/fastp/1.4.0+galaxy0
    tool_version: 1.4.0+galaxy0
    in:
      single_paired|paired_input: reads
    state:
      single_paired:
        single_paired_selector: paired_collection
        paired_input: {__class__: ConnectedValue}
        merge_reads: {merge: ''}
        adapter_trimming_options: {disable_adapter_trimming: false, detect_adapter_for_pe: true}
        global_trimming_options: {}
      filter_options:
        quality_filtering_options: {disable_quality_filtering: false}
        length_filtering_options: {disable_length_filtering: false, length_required: 15}
        low_complexity_filter: {enable_low_complexity_filter: false}
      output_options: {report_html: true, report_json: true}
```

Reported Galaxy 26.1 traceback:

```text
File ".../galaxy/tools/parameters/grouping.py", line 780, in value_to_basic
    rval[self.test_param.name] = self.test_param.value_to_basic(value[self.test_param.name], app)
KeyError: 'eval_dups'
```

The downstream PR flags these six omitted selectors:

```text
duplicated_reads|handling_options: eval_dups
read_mod_options|polyg_tail_trimming: trimming_select
read_mod_options|polyx_tail_trimming: polyx_trimming_select
read_mod_options|cutting_by_quality_options|cut_front_select: cut_front
read_mod_options|cutting_by_quality_options|cut_tail_select: cut_tail
read_mod_options|cutting_by_quality_options|cut_right_select: cut_right
```

Note that the reported failure is not limited to present-but-incomplete containers: the first failing `duplicated_reads` section is absent altogether. Cover both situations.

## Independently checked evidence

The preceding investigation ran Python model/conversion checks against local Galaxy commit `1e6125acd93b22a682043509e9549b124546fd25` (2026-10-20). It loaded the exact ParsedTool and workflow fixtures from PR #207, constructed `ToolParameterBundleModel(parameters=fixture['inputs'])`, and checked:

1. `WorkflowStepLinkedToolState(state).validate(bundle)` passes for the original sparse workflow state.
2. Replacing only `single_paired.paired_input` with `{'src': 'hdca', 'id': 'encoded-test-id'}` makes the same sparse state valid under strict `RequestToolState`.
3. `decode(request_state, bundle, lambda _: 123)` succeeds and preserves the absence of `duplicated_reads` in `request_internal`.
4. `fill_static_defaults(deepcopy(internal.input_state), bundle, 26.1)` followed by `JobInternalToolState(filled).validate(bundle)` passes and supplies all six selectors.

Relevant filled values include:

```python
duplicated_reads = {
    'handling_options': {'eval_dups': '--dont_eval_duplication'}
}
# The other five missing selectors resolve to '' for this tool version.
# Empty-string selectors are valid case values; do not treat them as absent.
```

These checks establish model acceptance and deterministic default expansion. They do **not** establish live API execution or reproduce the workflow-import traceback end to end. The decode callback used a stand-in ID, not a real dataset collection. The implementer must reproduce import and execution using real fixtures.

The locally available `origin/release_26.1` ref was also inspected at `4d652be1cd8b87c691cf9c2340333a913e00284b`: `Conditional.value_to_basic()` contains the same unconditional selector indexing. That ref was not freshly fetched for this draft; do not present it as the current remote head or imply the preceding Python checks ran on that release branch.

## Why omission is valid

In `lib/galaxy/tool_util_models/parameters.py`, `ConditionalParameterModel.pydantic_template()` creates a `When_<selector>___absent` model when `when.is_default_when` is true, except for `job_internal` and `job_runtime`. Its discriminator chooses this model when the selector key is missing. The default case's child schema still governs which children are accepted.

The contract is therefore:

- Request and workflow representations can omit selectors with a declared default case.
- The selected case is determined by tool metadata, not guessed from whichever child names happen to be present.
- Job/runtime representations record effective values and require materialized selectors.
- Missing is distinct from an explicit null, false, or empty string. Existing schema rules remain authoritative.

`test/unit/tool_util/parameter_specification.yml`, notably `gx_conditional_boolean` and `gx_conditional_boolean_checked`, already specifies accepted omitted selectors and rejects child parameters belonging to the wrong case. The former also explicitly rejects omitted selectors in `job_internal`/`job_runtime` state.

The API implementation in `lib/galaxy/webapps/galaxy/services/jobs.py::create` validates strict requests and decodes them while preserving omissions in stored `request_internal`. `Tool.expand_incoming_async()` in `lib/galaxy/tools/__init__.py` fills static defaults for job instances, populates dynamic defaults, and validates `JobInternalToolState`. Verify the corresponding implementation on `release_26.1` before relying on newer details.

## Likely failure boundary and implementation direction

The legacy workflow path uses `DefaultToolState`, workflow module recovery, legacy parameter visitors, and `value_to_basic()` serialization. In the inspected code:

- `lib/galaxy/tools/parameters/__init__.py::visit_input_values` creates `{}` for absent sections/conditionals.
- `lib/galaxy/tools/parameters/grouping.py::Conditional.value_to_basic` immediately indexes `value[self.test_param.name]` and resolves a case from that value.
- `lib/galaxy/workflow/modules.py` contains `recover_state`, `get_state`, `add_dummy_datasets`, connection augmentation, and a `fill_defaults` recovery path. Trace the actual import options and ordering rather than assuming that enabling an existing flag is sufficient.

Fix the boundary where valid sparse workflow state becomes legacy state requiring concrete selectors. Reuse the declared-default semantics; avoid a second, inconsistent inference policy. A workflow-aware adapter/default initialization step may be appropriate. The precise placement should follow a failing import regression test, not this draft's hypothesis alone.

Do not blindly invoke `fill_static_defaults` over workflow state: its current documented contract is `job_internal`, and workflow state has connections/runtime values and deferred choices that job state does not. Likewise, do not assume a shallow merge with a tool's initial state correctly handles nested sections, active cases, repeats, or explicit values.

Preserve explicit selectors and values, input connections, and children of the selected branch. Handle connected selectors according to the existing workflow semantics; do not replace them with defaults or accidentally serialize children from a guessed runtime case. Compute any legacy `__current_case__` consistently with the resolved selector. The separate downstream discussion about validating stale `__current_case__` is related but need not enlarge this fix.

Keep author-supplied sparse state and effective initialized state conceptually separate. Materialize values only where the existing workflow machinery needs them; do not change request provenance or require authors to persist defaults merely to pass validation. Decide and test the workflow persistence/export behavior explicitly.

## Regression coverage and acceptance criteria

Prefer a small framework tool that reproduces the fastp structure without a Tool Shed install. Retain the real fastp example as the motivating case.

1. **Import regression:** format2 workflow with an omitted section containing a defaulted conditional imports successfully instead of HTTP 500. Add present-empty section and present-empty conditional variants. Exercise the equivalent native workflow path as appropriate.
2. **Nested defaults:** cover several nested conditionals/sections and selectors with boolean and select defaults, including valid `false` and empty-string values. The effective branch and values must match an explicitly populated equivalent workflow.
3. **Explicit overrides:** an explicitly selected non-default branch remains selected; its child values survive. Do not populate inactive-case children.
4. **Connections:** preserve data connections and connected/runtime selector behavior. Include a conditional inside an existing repeat and a repeat instance introduced by an input connection if the chosen adaptation touches repeat construction.
5. **Invalid input:** no arbitrary branch inference when no default exists; wrong-case children and invalid explicit selectors retain appropriate validation behavior. Invalid states must not escape as uncaught `KeyError`s or become silently valid through normalization.
6. **Execution and persistence:** import, export/re-import, and invoke the minimal workflow; verify the intended branch executes and produces the same result as the explicitly defaulted equivalent. Opening or saving through the editor must not reintroduce the failure or lose connections.
7. **Representation parity:** retain the request/workflow model tests that allow omission and the job-state tests that require concrete values. Add focused tests for the workflow adaptation, rather than tightening the schemas to hide the bug.

Run the relevant unit tests and Galaxy workflow/API regression tests on `release_26.1`. A schema-only test is insufficient: the bug is the disagreement between accepted state and actual import/serialization.

## Downstream coordination

The issue should explain why galaxy-tool-util-ts #207's blanket `--strict-state` rejection is an older-server compatibility check, not the intended semantic contract. `gxwf fill-defaults` may remain an explicit workaround/export operation for affected Galaxy versions. A separate compatibility diagnostic is preferable to permanently redefining valid sparse workflow states as invalid.

No Galaxy issue was filed and no comment or change was made to PR #207 during this investigation. This file is the requested handoff to the issue-queuing agent.
