# PickValueModule Post Job Actions — Debrief

## What was done

Added PJA support to PickValueModule — change datatype, rename, tags, remove tags, column set. Users can configure these in the workflow editor UI and they execute during workflow invocation without a Job object.

### Backend (`lib/galaxy/workflow/modules.py`)

- PJA round-trip: `__init__`, `from_dict`, `from_workflow_step`, `save_to_step`, `get_post_job_actions` — mirrors ToolModule pattern
- Execution: `_apply_post_job_actions` delegates to `ActionBox.execute_on_mapped_over` — no duplicated action logic, gets rename `#{var|basename}` template substitution for free
- `_to_pja` helper converts dict/PostJobAction values for DB persistence

### Backend (`lib/galaxy/job_execution/actions/post.py`)

- Added `execute_on_mapped_over` to `ChangeDatatypeAction` — handles HDA and HDCA (collection element iteration)
- Added `execute_on_mapped_over` to `ColumnSetAction` — extracted `_apply_column_set` to deduplicate with job-based `execute()`
- Neither added to `mapped_over_output_actions` list (avoids changing existing tool behavior)

### Frontend

- `FormPickValue.vue` — renders `FormSection` under "Additional Options" heading when `datatypes` available; accepts `datatypes`, `nodeInputs`, `postJobActions` props
- `FormDefault.vue` — extracts PJA data from `useStepProps`, passes to FormPickValue, wires `onChangePostJobActions` event
- `NodeInspector.vue` — forwards `onChangePostJobActions` from FormDefault to parent Index.vue

### gxformat2 (`~/projects/worktrees/gxformat2/branch/pick_value`)

- `converter.py` — `transform_pick_value` now processes `out` section for PJAs (same pattern as tool steps)
- `export.py` — added `_convert_post_job_actions` call for pick_value export (round-trip)
- Syntax: `out: { output: { change_datatype: txt } }` — same as tool steps, no special shorthand

### Framework workflow tests (4 tests, all passing)

| Test | PJAs | Assertion |
|------|------|-----------|
| `pick_value_change_datatype` | `change_datatype: txt` | `ftype: txt` |
| `pick_value_rename` | `rename: "picked_result"` | `metadata.name` |
| `pick_value_add_tag` | `add_tags: [picktag]` | `metadata.tags` |
| `pick_value_multi_pja` | change_datatype + rename + add_tag | all three |

## What works well

- PickValueModule PJA handling mirrors ToolModule — consistent codebase pattern
- gxformat2 round-trip complete (converter + exporter)
- Frontend event chain properly wired end-to-end
- `ColumnSetAction._apply_column_set` refactor is a DRY improvement
- Reuse of `ActionBox.execute_on_mapped_over` avoids duplicating action logic

## Known issues

### 1. Bug: PJAs applied to skipped outputs

**Severity: High**

In `first_or_skip` mode when all inputs are null, a skipped HDA (`expression.json`) is created and `_apply_post_job_actions` runs unconditionally. `ChangeDatatypeAction` would corrupt the skipped HDA's datatype away from `expression.json`, breaking downstream skip detection.

The job-based `ChangeDatatypeAction.execute()` has a `if job.state == SKIPPED: return` guard, but `execute_on_mapped_over` does not.

**Fix:** Add skip guard at top of `_apply_post_job_actions`:
```python
if self._is_null_or_skipped(output):
    return
```

### 2. `_to_pja` fallback key parsing

**Severity: Low**

When `value` is neither dict nor PostJobAction, `action_type` defaults to the full concatenated key (e.g., `"ChangeDatatypeActionoutput"` instead of `"ChangeDatatypeAction"`). Unlikely to hit — frontend always sends dicts, `from_workflow_step` produces PostJobAction objects.

### 3. `ColumnSetAction.execute_on_mapped_over` on HDCA

**Severity: Low**

Would fail on collection output (`all_non_null` mode) since collections lack `.metadata`. Low probability — column set on a collection is unusual.

## Test gaps

- No framework test for `when: false` (skipped output + PJA) — would catch issue #1
- No framework test for `all_non_null` mode with PJAs (HDCA output path)
- No framework test for `RemoveTagDatasetAction` or `ColumnSetAction`
- No framework test for rename template substitution (`#{input_name}`)
- No frontend unit tests for PJA rendering/events in `FormPickValue.test.ts`

## Files changed

| File | Change |
|------|--------|
| `lib/galaxy/workflow/modules.py` | PJA round-trip + execution |
| `lib/galaxy/job_execution/actions/post.py` | `execute_on_mapped_over` for ChangeDatatypeAction, ColumnSetAction |
| `client/.../FormPickValue.vue` | FormSection PJA UI |
| `client/.../FormDefault.vue` | Wire PJA events + pass props |
| `client/.../NodeInspector.vue` | Forward `onChangePostJobActions` from FormDefault |
| `client/.../FormPickValue.test.ts` | Type assertion fix for Vue 2 compat |
| `lib/galaxy_test/workflow/pick_value_*.gxwf*.yml` | 4 framework test pairs |
| `gxformat2/converter.py` | PJA handling in `transform_pick_value` |
| `gxformat2/export.py` | PJA export for pick_value round-trip |
