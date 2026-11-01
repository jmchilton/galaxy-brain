# Galaxy: an absent optional collection wired into a `when`-false model operation crashes scheduling in `check_inputs_ready`

- Target: galaxyproject/galaxy (`lib/galaxy/tools/__init__.py` `DatabaseOperationTool.check_inputs_ready`, called from `lib/galaxy/tools/execute.py` before the skip is applied; same code on `release_26.1` and `dev`). Foundry tracking needed: yes, label `upstream/galaxy`; the data-flow/interface knowledge needs a "don't route absent optional collections into model operations" rule until fixed.
- Seen in: driver probe 3 for /home/ubuntu/foundry-runs/prose-wb2g-viralrecon-v0-2026-10-31 (`../prose-wb2g-viralrecon-v0-2026-10-31.bin/probe/intake/`, PROBE_RESULTS.md §3), planemo master 2a815808, Galaxy release_26.1, 2026-11-01. It forced decision D1 (split into Illumina and Nanopore workflows). Not a feedback-ledger entry.
- Existing issues/PRs: galaxy [#17029](https://github.com/galaxyproject/galaxy/issues/17029) "check_inputs_ready can fail" (2023, same traceback with `{'input': [[None, False]]}`), closed without a linked fix. Commit 7f3dce9bf43 (2026-03, mvdbeek) special-cased `HarmonizeTool` for its optional `input2` only, saying the base class "rightfully assumes all collection inputs are present". Related: finding [11](11-galaxy-when-skip-model-operation.md) (same family: model operations evaluate inputs before honouring `when`).

## Symptom
A workflow with an optional `sample_sheet:paired_or_unpaired` input left unset and a text gate selecting the other platform. The gated regular tool (`__SAMPLE_SHEET_TO_TABULAR__`) is skipped fine, but the gated `__CONVERT_SAMPLE_SHEET__` (a model operation) fails the invocation at scheduling: `AttributeError: 'NoneType' object has no attribute 'collection'` at `galaxy/tools/__init__.py:4073`, via `tools/actions/model_operations.py:53`. The step's `when` is false. An absent optional *dataset* into a null-gated `__BUILD_LIST__` skips cleanly (probe 3b), so the crash is collection-specific.

## Root cause
- `execute()` (`tools/execute.py:346-360`, 26.1) calls `tool_action.check_inputs_ready(...)` for every param combination first. The skip flag is read only later, per slice: `skip = slice_params.pop("__when_value__", None) is False` (`:379`).
- `ModelOperationToolAction.check_inputs_ready` (`model_operations.py:46-53`) collects inputs and calls `DatabaseOperationTool.check_inputs_ready` (`tools/__init__.py:4048-4080`). Its dataset loop guards `if input_dataset:` ("None is a possible input for optional inputs"); its collection loop does not, and dereferences `input_dataset_collection.collection` (`:4073`).
- Separately, `summary = input_dataset_collection.collection...` (`:4076`) sits outside the inner `for`, so only the last pair of a multi-pair key is state-checked.
- dev (2026-11-01) has the identical loop (`:3892-3899`).
Confidence: high for the code path; the probe traceback matches line for line. Not reproduced on dev.

## Evidence
- Probe workflow and log: `.bin/probe/intake/`; PROBE_RESULTS.md §3 (case 1 present: PASS; case 2 absent: scheduling failure), §3b (dataset variant PASS).
- Code: `git show release_26.1:lib/galaxy/tools/__init__.py` lines above; `HarmonizeTool.check_inputs_ready` override at `:4770-4777`.

## Proposed fix
1. In `execute()`, skip `check_inputs_ready` for combinations whose `__when_value__` is `False` (a skipped step needs no ready inputs). This also removes most of finding 11's exposure if `_produce_outputs` gets the matching guard.
2. In `DatabaseOperationTool.check_inputs_ready`, `continue` on a `None` collection (mirroring the dataset loop) and move the state summary inside the loop; drop the Harmonize-only override.
3. API test: optional collection input absent, gated `__CONVERT_SAMPLE_SHEET__` (or `__FILTER_FAILED_DATASETS__`) with `when: false` → invocation scheduled, step skipped.

## Draft issue
**Title:** `when: false` model-operation step crashes scheduling when its collection input is an absent optional workflow input (`check_inputs_ready`, NoneType `.collection`)

On release_26.1 (and dev), a collection operation gated off by `when` still has its inputs checked before the skip is applied. If an input is an optional workflow collection input that was not supplied, `DatabaseOperationTool.check_inputs_ready` dereferences `None` and the invocation fails:

```
galaxy/tools/actions/model_operations.py:53 check_inputs_ready
galaxy/tools/__init__.py:4073  if not input_dataset_collection.collection.populated_optimized:
AttributeError: 'NoneType' object has no attribute 'collection'
```

Reproducer: optional `sample_sheet:paired_or_unpaired` input left unset; a text input `platform=nanopore`; a step `__CONVERT_SAMPLE_SHEET__` with `in: {input: illumina_samples, when: platform}`, `when: $(inputs.when == 'illumina')`. Expected: step skipped, invocation scheduled. Actual: scheduling failure. An absent optional *dataset* in the same position is fine (the dataset loop guards `None`).

`tools/execute.py` runs `check_inputs_ready` over all combinations before reading `__when_value__`. Same traceback as #17029 (closed without a fix); 7f3dce9bf43 patched only `HarmonizeTool`. Suggested fix: don't check inputs for skipped combinations, and guard `None` in the base collection loop (also, the `summary =` line is outside the inner loop). Related: skipped model operations still run `produce_outputs` (separate report, finding 11).

**Foundry tracking comment** (label `upstream/galaxy`):
> Tracking galaxyproject/galaxy#NNNN: "`when: false` model-operation step crashes scheduling when its collection input is an absent optional workflow input". Until fixed, interface/data-flow guidance must not route an optional workflow collection input into a model operation (`__CONVERT_SAMPLE_SHEET__`, `__FILTER_*__`, `__APPLY_RULES__`, ...) even under a `when` gate; it forced the viralrecon build into one workflow per platform (2026-11-01).
