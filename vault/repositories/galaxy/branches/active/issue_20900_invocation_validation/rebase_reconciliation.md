# Rebase onto dev — 2026-11-04

Old head `07377e10531` (24 commits on dev `88127f42979`), preserved as `backup/issue_20900_before_dev_rebase_20261104` on the fork. New base: dev `7e16f446410`, after all eight extracted PRs merged.

## Dropped, already on dev

Each drop was checked against `origin/dev` by grepping for the symbol or behavior it carries, not just by patch-id. Patch-ids matched for only 2 of the 24 commits.

| Old commits | Landed as |
| --- | --- |
| `f7e252fdc84`, `f4624d8a331`, `0b06e9b9838` | #24671 (`no_add_to_history`/`ds_map`; mvdbeek added the schema description) |
| `ad758573225` | Abandoned generator; not upstream |
| `5a70ce77551`, `9ad2cb8416e`, `4db12b71305` | #24265 |
| `dcf298cc432`, `23f2007e101` | #24171 |
| `55a8da51904` | #24169 |
| `00ac5674c12` + tool part of `7b6ec3613e0` | #24209 (`_check_workflow_tools`, `ToolLike.is_workflow_compatible`) |
| `3cc7c4d4580` + completion-hook part of `3ee9cce9cf0` | #24202 (`_check_on_complete`) |
| object-store part of `3ee9cce9cf0`, `2c16fe1ff1e` | #24197 (inline in `build_workflow_run_configs`) |
| `ac2ebe9175d` | #24203 (`_validate_subworkflow_input_connections`, `disconnected_subworkflow_inputs_message`) |
| `119716e6a2f`, `basic.py` hunk/doctest of `820e1afa4f0` | Dropped per decision; upstream per-entry `TextToolParameter` validation |

## Carried forward

The kept changes were ported as a net three-way merge per file (old base → old head, onto dev), since the replayed commits edited code the extractions later reshaped. In conflicts, dev won for anything an extraction carried.

- `modules.py`: `InputParameterModule.validate_input_value` (type/restriction/validator checks), `InputModule.validate_input_content` (deleted inputs, dataset-vs-collection; see below for collection type). `validate_input_value` now takes the runtime `input_param`, so `run_request.py` keeps dev's `step_cannot_run_exception` 400 for an invalid stored default (3f65dd5a1f2, mvdbeek) before validating the value.
- `run_request.py`: validate-before-side-effects restructure. Inputs are resolved and validated for every batch entry, and step state is populated, before any history is created or input is copied. Uses dev's `workflow_step_name` instead of the old `_step_name`. Duplicate helpers were dropped (`_validate_object_store_ids`, the old subworkflow-connection copy, `_get_input_or_not_found`).
- `landing.py` / `services/workflows.py`: the claimed landing request is looked up (ownership checked) before `build_workflow_run_configs`. `_create_landing_request_association` takes that model.
- Tests: 16 API tests/helpers from the old head that dev lacks, plus the landing manager unit test. Two old tests were dropped as duplicates of dev's `*_creates_no_history` versions (object store, on-complete).

## Fixes for the four recorded reds

All four pass on dev's code, so the branch caused them. All pass now.

- `test_run_replace_params_over_default`, `test_workflow_rerun_with_use_cached_job_hides_output`: 500 when the payload carries `replacement_params: null`. Now `payload.get(...) or {}`, the same for `resource_params`.
- `test_mapping_and_subcollection_mapping`, `test_workflow_resume_with_mapped_over_collection_input`: the collection-type check rejected `list:paired`/`list:list:paired` for a `list` input step, which dev accepts. An untyped `collection` input has no `collection_type` in gxformat2, but by invocation the module state reads it as `list`, so typed and untyped inputs can't be told apart. **Dropped the collection-type comparison** (and `test_run_with_incompatible_collection_type`), keeping dataset-vs-collection and deleted checks. Decision for John: restore a type check only with a way to tell an explicit type from the default.

## Commits

On dev `7e16f446410`: `4d36b40d9ab` baseline tests, `fc239a42cf3` validate before side effects, `3c9b3fbed60` landing check. Head `3c9b3fbed60`, force-pushed. Hardening has since rewritten these commits; [implementation debrief](implementation_debrief.md) has the current history.

Baseline tests (9 cases) pass on dev's sources; the 18 other new cases fail there at their own status/message/no-history assertions.

## Local checks

- API (`test_workflows.py`, related selection): 74 passed + 12 collection/input reruns passed after the collection fix; the 4 old reds green.
- `test_landing.py` API: 20 passed.
- Unit: `test/unit/workflows/` + `test_landing.py`: 298 passed, 1 skipped.
- ruff, black, isort, pre-commit hooks clean; mypy on changed lines flags only `list[list]` in a signature moved unchanged from dev.

## Implementation snapshot

```text
created .../differential-review/snapshots/20261104T154002Z-implementation-3c9b3fbed607.json
  implementation @ 3c9b3fbed607 vs origin/dev (merge-base 7e16f446410c)
  first snapshot: 3 commits, 6 files, 28 hunks
```
