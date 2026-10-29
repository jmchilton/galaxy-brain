# Galaxy: a user tool's `multiple: true` input fed a workflow reduction gets `[{id: File}]`, because deferred materialization rebuilds the subcollection without `collection_type`

- Target: galaxyproject/galaxy (`model/deferred.py` + `tools/evaluation.py`, the same code on `release_26.1` @ d61b1ca and `dev` @ 44f71e8). Foundry tracking needed: yes, label `upstream/galaxy`, because note rev 2 (619ae0a7) carries a workaround that should go once Galaxy is fixed.
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-callings-v0-2026-10-29, phase 10 planemo attempt 2, job `cb61fcad4bdff794` (ASEReadCounter UDT), Galaxy 26.1.3.dev0, 2026-10-29. Evidence: `workflow-debug-report.md`, `.scratch/attempt-2/{ase_run.sh,ase_job_full.json}`. Ledger: `galaxy-udt-reduced-dce-loses-collection-type` (major), `udt-authoring-note-multiple-data-shape-wrong-for-workflow-reduction` (major).
- Existing issues/PRs: near-duplicate galaxy #24414 (open, item 1: "`type: data, multiple: true` fed a `list:list` in a workflow ... `inputs.x.map(...)` renders `undefined`"). It blames the legacy `to_cwl` route in general and names no fix; its linked PR #24415 fixes only the hidden expression error. Related: #23888 / #24365 (YAML tool dialects, no input-shape change), #24410 (`element_identifier` null on map-over). Foundry: #672 (UDT note leaves the `inputs.x` object shape open). No PR touches `deferred.py` or `_deferred_objects`.

## Symptom
The UDT's `bams` input (`data`, `multiple: true`) is connected to a `list:list` (sample > replicate) and maps over the outer level, so each sample's inner list reduces into one job. Both BAMs reach the job (`bams1`, `bams2` in job inputs), but `inputs.bams` is `[{"rep1": File, "rep2": File}]`. `inputs.bams.flat().map(b => b.path)` yields `'undefined'`, so `run.sh` has `for bam in 'undefined'; do` and `samtools index` fails (exit 1). For a direct tool request the same input is `[File, File]`.

## Root cause
Workflow UDT jobs on 26.1 have no `job.tool_state`, so `UserToolEvaluator.build_param_dict` takes the deprecated `to_cwl` branch (`tools/evaluation.py` 26.1 :1149-1162, dev :1186-1199). The reduction is persisted as `bams = [<inner-list DCE>]`. Then:
1. `ToolEvaluator._deferred_objects` marks any one-element list holding an HDCA/DCE as deferred ("handle single list reduction as a collection input"), without checking `has_deferred_data` (26.1 :436-446, dev :449-459). The sibling `find_deferred_collections` does check it.
2. `_materialize_objects` sends that DCE to `materialize_collection_input` (26.1 :346-352). `materialize_collection_instance` returns an HDCA unchanged when nothing is deferred (`model/deferred.py` 26.1 :354), but `_materialize_collection_element` has no such guard. It always rebuilds, and `_materialize_collection` creates `DatasetCollection()` with no `collection_type`, `fields` or `column_definitions` (26.1 :364-373, dev :468-477). `_replaced_deferred_objects` writes this copy back into `incoming`.
3. `to_cwl` emits an array only when `collection_type == "list"`. With `None`, the copy takes the "record or nested lists" branch and becomes `{element_identifier: File}` (`workflow/modules.py` 26.1 :319-340, dev :388-410).

So the input's shape comes from a lossy copy made for datasets that were never deferred. Without step 2 the legacy path gives `[[File, File]]`, which `.flat()` handles. This is a Galaxy bug, not documented behaviour: the same parameter has a different contract by route, and `to_cwl` would render the inner `list` as an array if the type survived.

dev also captures a workflow ToolRequest (`workflow/modules.py` dev :2507, `_capture_workflow_tool_request_state`) and passes validated combinations to `MappingParameters` (dev :3330). If a reduced input validates there, the job takes `runtimeify`, whose `adapt_dataset` raises "DCE ... does not reference an HDA" for a subcollection DCE (`tools/runtime.py` dev :169, 26.1 :114). Which path a dev workflow job takes was not verified live.

## Evidence
- Rendered `ase_run.sh`: the single-data inputs `reference` and `sites` render real paths, and the loop renders exactly one `'undefined'`.
- Offline reproduction (debug report §3) used release_26.1's own `materialize_collection_input`, `to_cwl` and the QuickJS engine. The observed path gives `[{rep1, rep2}]` and the child's `collection_type` is `None`. Without the rebuild it gives `[[File, File]]`, and on the request route `[File, File]`.
- Galaxy's UDT multiple-data tests (`cat_multiple_user_defined.yml`, `gx_data_multiple_user.yml`) cover only the tool-request route.
- Attempt 5 went green using the `flatMap` template (`run-summary.md`).

Minimal reproducer: a gxformat2 workflow with a `list:list` input connected to an embedded UDT with `x: {type: data, multiple: true}` and `shell_command: echo '$(JSON.stringify(inputs.x))' > out.json`. Expected `[File, File]` (or at least `[[...]]`). On 26.1 you get `[{"<inner id>": File, ...}]`.

## Proposed fix
1. `deferred.py`: in `_materialize_collection_element`, return the element unchanged when `not element.has_deferred_data`, as `materialize_collection_instance` does. Have `_materialize_collection` copy `collection_type`, `fields` and `column_definitions`.
2. `evaluation.py` `_deferred_objects`: only queue the single-reduction list when `value[0].has_deferred_data`.
3. Add an API test: a workflow with a UDT `multiple: true` data input reduced from a `list:list` (and the same from a deferred `list:list`), asserting `[File, File]`. Longer term, give workflow UDT jobs validated state so `runtimeify` is the single contract (#24414), and make its `adapt_dataset` flatten a subcollection DCE for a multiple data parameter.

## Local Mold fix 619ae0a7 (trim, keep the idiom)
It documents real behaviour of deployed 26.1 servers, and the `flatMap` idiom is safe on all three shapes. Authors need it today, so it is not pure papering. But it presents the shape as how Galaxy works ("can hand the job"), not as a defect. Trim the wording to: "Galaxy release_26.1 bug (galaxyproject/galaxy#NNNN): a workflow reduction hands `[{id: File}]`; until fixed, flatten with ...", and note that the plain `.map` form is correct once the fix lands. Link the Foundry tracking issue so the paragraph is removed when the fix ships. No eval change is needed.

## Draft issue
Title: User tools: a workflow reduction into a `multiple: true` data input arrives as `[{identifier: File}]`; deferred materialization drops `collection_type`

> On release_26.1, a user tool whose `type: data, multiple: true` input is fed a subcollection reduction in a workflow (a `list:list` mapped over the outer level) sees `inputs.x == [{"rep1": File, "rep2": File}]`, so `inputs.x.map(f => f.path)` renders `undefined`. A tool request gets `[File, File]`.
> Cause: `ToolEvaluator._deferred_objects` (`tools/evaluation.py` :436-446) queues any one-element DCE list for materialization without checking `has_deferred_data`. `deferred._materialize_collection` (:364-373) then rebuilds the subcollection as `DatasetCollection()` without `collection_type`. The legacy `to_cwl` (`workflow/modules.py` :319-340) renders a collection with no type as a dict keyed by identifier. The same lines are on dev.
> Fix: skip non-deferred elements in `_materialize_collection_element`, copy `collection_type`/`fields`/`column_definitions`, and gate the single-reduction branch on `has_deferred_data`. Add an API test with a UDT reduction from a `list:list`. This narrows item 1 of #24414.

Foundry tracking comment (label `upstream/galaxy`):

> galaxy-user-tool-authoring rev 2 tells authors to flatten `multiple: true` data inputs (`flatMap(... Object.values ...)`) because of galaxyproject/galaxy#NNNN: "a workflow reduction into a `multiple: true` data input arrives as `[{identifier: File}]`; deferred materialization drops `collection_type`". Once that fix ships in the minimum supported Galaxy, remove the workaround paragraph and go back to the plain `.map` idiom. Seen in the CalliNGS-NF brief-to-galaxy run (2026-10-29, ASEReadCounter UDT).
