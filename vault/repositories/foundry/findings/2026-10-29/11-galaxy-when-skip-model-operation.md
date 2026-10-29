# Galaxy: a `when`-skipped model-operation step still runs `produce_outputs`, so content-reading collection operations fail the invocation

- Target: galaxyproject/galaxy (the defect is in `ModelOperationToolAction`, unchanged on `release_26.1` and `dev`); Foundry tracking needed: yes. Two ledger entries ask Molds and the invocation-failure reference to document the workaround until Galaxy is fixed.
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-smrnaseq-v1-2026-10-29, phase 10 planemo attempt 1, test case 1 (`no_genome_raised_threshold`), Galaxy release_26.1 @ 1b8690e1, 2026-10-29. Ledger: `galaxy-model-operation-ignores-when-skip-relabel`, `invocation-reference-silent-on-gated-model-operation`.
- Existing issues/PRs: no duplicate. Searched issues and PRs for when/skip with relabel, model/database operation, conditional collection operation, and the error text. Related history: #16632 (23.1, added skip handling for DB-operation steps, `06a43944048`), #21142 (new datasets for skipped DB-op outputs), #24286 (don't overwrite inputs when skipping nested collections). All three keep `produce_outputs` on the skip path.

## Symptom
The invocation failed at scheduling (`unexpected_failure`, step 68 `genome_stats_relabelled`, `__RELABEL_FROM_FILE__` 1.1.0) with "Relabel mapping file contains less lines than there are collection elements to relabel." No job failed. The step's `when` was false. Its labels input `genome_suffix_ids/outfile` came from a step gated on the same boolean, so it was a skipped dataset holding the single line `null`. Its collection input had 2 skipped elements. 2 > 1, so the step raised.

## Root cause
`when: false` reaches the tool action as `skip=True`, but the model-operation action evaluates the tool's real logic first and applies the skip afterwards:
- `lib/galaxy/workflow/modules.py` `ToolModule.execute` stores `execution_state.inputs["__when_value__"]` (26.1 :3021, dev :3297). `lib/galaxy/tools/execute.py` turns it into `skip = ... is False` and calls `execute_single_job(..., skip=skip)` (26.1 :379-380, dev :378-379).
- `lib/galaxy/tools/actions/model_operations.py` `ModelOperationToolAction.execute` passes `skip` to `_produce_outputs` (26.1 :122-132, dev :122-130). `_produce_outputs` calls `tool.produce_outputs(...)` unconditionally (26.1 :161-169, dev :157-163). Only then does `if skip:` mark outputs populated and `set_skipped` (26.1 :178-196, dev :172-190).
- `HistoryDatasetAssociation.set_skipped` writes `json.dumps(None)`, so a skipped dataset reads as one line, `null` (`lib/galaxy/model/__init__.py` 26.1 :5585-5600).
- `RelabelFromFileTool.produce_outputs` reads the labels file and raises a `MessageException` on a count mismatch (`lib/galaxy/tools/__init__.py` 26.1 :4934-4976, dev :4748-4790). In a workflow this becomes an invocation failure.

Any error raised by `produce_outputs` therefore fails a step that should have been skipped. Content-reading operations are affected; structural ones are not:
- `__RELABEL_FROM_FILE__`: raises (txt count check, `strict`, tabular column checks).
- `__SORTLIST__` with `sort_type: file`: raises (the line count never matches a skipped `expression.json`).
- `__FILTER_FROM_FILE__` and `__TAG_FROM_FILE__`: no raise. They read `null` and produce outputs that are then marked skipped, so the result is harmless.
- `__APPLY_RULES__`, zip/unzip, flatten, nest, filter-failed/empty: structure only. The existing tests `test_conditional_skip_on_database_operation_*` (`lib/galaxy_test/api/test_workflows.py` dev :8632-8790) cover only `__FILTER_FAILED_DATASETS__`.
- It also fails when the labels file is real but wrong: a skipped step still validates its content.

Confidence: high. The code path is read on both refs, and the run's database shows the `null` labels dataset and the scheduler-thread log line `Calling produce_outputs, tool is RelabelFromFileTool`. The minimal reproducer below was not run separately against a fresh Galaxy.

## Evidence
- Run: `workflow-debug-report.md` (case 1 section: invocation message, step states, `null` labels file on disk, hazard survey). `foundry-feedback.ledger.yml:548-570`. `galaxy-workflow.gxwf.yml:1636-1675` holds the workaround (`genome_suffix_ids` ungated, relabel still gated). `open-requirements.ledger.yml:357-358`: attempt 2 case 1 passed after the repair.
- Source: `~/.planemo/gx_repo` (bare), `1b8690e1` and `dev` @ `44f71e8bc07` (2026-10-29). `model_operations.py` differs between them only in typing and `tags` plumbing. `release_26.1` tip `d61b1ca6` does not touch these files.

## Proposed fix
On `skip=True`, do not run content-dependent `produce_outputs` logic. Two options:
1. (preferred) Add `DatabaseOperationTool.produce_skipped_outputs(...)`. By default it delegates to `produce_outputs`, so structural tools keep their exact output shape. Override it in `RelabelFromFileTool`, `SortTool`, `TagFromFileTool` and `FilterFromFileTool` to copy the input collection's elements unchanged into each declared output (both outputs for filter). Call it from `_produce_outputs` when `skip` is set. The existing skip branch then marks everything skipped.
2. (smaller) Wrap `produce_outputs` in `try/except MessageException` when `skip` is set, and fall back to option 1's pass-through. This avoids per-tool overrides but hides real bugs in the structural tools.
Test: add the reproducer as an API test next to `test_conditional_skip_on_database_operation_collection_output`, plus a `__SORTLIST__` file-mode variant.

## Draft issue
**Title:** Skipped (`when: false`) `__RELABEL_FROM_FILE__` / `__SORTLIST__` steps still evaluate their inputs and fail the invocation

A collection-operation step whose `when` evaluates to false still runs the tool's `produce_outputs` before the outputs are marked skipped (`lib/galaxy/tools/actions/model_operations.py`, `_produce_outputs`: `tool.produce_outputs(...)` is called unconditionally, and `if skip:` is applied afterwards). If the operation reads dataset content, a skipped step can raise. That happens when the content comes from another skipped step (a skipped dataset contains `null`), or when the content simply doesn't validate. The `MessageException` then fails the whole invocation (`unexpected_failure`).

Reproducer (release_26.1 and dev), run with `run_relabel: false`:

```yaml
class: GalaxyWorkflow
inputs:
  input_collection: {type: collection, collection_type: list}
  labels_source: data
  run_relabel: boolean
steps:
  make_labels:
    tool_id: cat1
    in: {input1: labels_source, run_relabel: run_relabel}
    when: $(inputs.run_relabel)
  relabel:
    tool_id: __RELABEL_FROM_FILE__
    in: {input: input_collection, how|labels: make_labels/out_file1, run_relabel: run_relabel}
    state: {how: {how_select: txt, strict: false}}
    when: $(inputs.run_relabel)
test_data:
  input_collection:
    collection_type: list
    elements: [{identifier: A, content: "a"}, {identifier: B, content: "b"}]
  labels_source: {type: File, value: 1.bed}
  run_relabel: {value: false, type: raw}
```

Expected: both steps are skipped and the invocation is scheduled. Actual: invocation `failed` at `relabel` with "Relabel mapping file contains less lines than there are collection elements to relabel." (`make_labels` output is a skipped dataset containing `null`, 1 line, against 2 elements). `__SORTLIST__` with `sort_type: file` fails the same way. `__FILTER_FROM_FILE__`/`__TAG_FROM_FILE__` don't raise, but still compute against `null`. Suggested fix: on skip, have content-reading operations pass the input elements through unchanged instead of running their logic, then mark the outputs skipped as today. Workaround: don't gate the labels/sort-file producer; the relabel step can stay gated.

**Foundry tracking comment** (label `upstream/galaxy`):
> Tracking upstream galaxyproject/galaxy#NNNN: "Skipped (`when: false`) `__RELABEL_FROM_FILE__` / `__SORTLIST__` steps still evaluate their inputs and fail the invocation." Until it is fixed, data-flow/template guidance should never `when`-gate the label/sort-file producer of a gated `__RELABEL_FROM_FILE__` or `__SORTLIST__` (file mode), and `galaxy-workflow-invocation-failure-reference` should list this `unexpected_failure` pattern. Ledger: `galaxy-model-operation-ignores-when-skip-relabel`, `invocation-reference-silent-on-gated-model-operation`.
