# Bug: Galaxy preserves stale parameter keys in workflow tool_state across tool version upgrades

## Summary

When a workflow step's tool version is upgraded, parameter keys that no longer exist in the new tool definition persist in `tool_state`. This affects all upgrade paths: planemo-autoupdate, API import, the refactor/upgrade endpoint, and the workflow editor save cycle. The bug is **primarily backend** — rooted in `params_to_strings()`/`params_from_strings()` which blindly pass through all dict keys, not just declared tool inputs.

## Root cause

**File:** `lib/galaxy/tools/parameters/__init__.py`

### `params_to_strings()` (lines 348-353)

```python
rval = {}
for key, value in param_values.items():
    if key in params:
        value = params[key].value_to_basic(value, app, use_security=use_security)
    rval[key] = value  # ← emits ALL keys, not just those in params
```

### `params_from_strings()` (lines 363-381)

Same pattern — iterates all keys, passes through those not in `params` without filtering.

These two functions are the serialization/deserialization layer for tool state. Every workflow save/load path flows through them. Since they never filter unknown keys, stale params survive indefinitely through encode→decode cycles.

## Affected code paths

### 1. API import / planemo-autoupdate (primary vector for creating stale keys)

```
_workflow_from_raw_description (managers/workflows.py:782)
  → __module_from_dict (managers/workflows.py:1920)
    → module_factory.from_dict (modules.py:316)
      → recover_state(state, from_tool_form=False) (modules.py:378)
        → DefaultToolState.decode (tools/__init__.py:829)
          → params_from_strings ← passes through stale keys
      → save_to_step (modules.py:332)
        → get_state() → encode()
          → params_to_strings ← preserves stale keys
```

No layer in this chain strips unknown keys. When planemo bumps a tool version and re-imports the workflow, old keys ride along.

### 2. Refactor/upgrade endpoint

```
_apply_upgrade_tool (refactor/execute.py:458)
  → sets new tool_version on step (line 469)
  → _inject_for_updated_step → inject → from_workflow_step (modules.py:2785)
    → recover_state(step.tool_inputs, from_tool_form=False) (modules.py:326)
      → decode → params_from_strings ← stale keys preserved
  → get_tool_state (execute.py:472) → serialize with stale keys
```

### 3. Workflow editor version change (does NOT create stale keys)

```
FormTool.vue: onChangeVersion → postChanges
  → sends old form values + new tool_version to build_module API
  → build_module (api/workflows.py:535)
    → populate_state(trans, module.get_inputs(), inputs, module_state)
      ← iterates only NEW tool's declared inputs, drops unknown keys ✓
  → returns clean tool_state to frontend
```

The editor's version-change flow correctly drops stale keys via `populate_state`. **However**, at save time the editor passes `tool_state` as-is — so if a workflow was loaded with existing stale keys (from planemo or API import), the save cycle preserves them.

### 4. `check_and_update_param_values` (doesn't help)

`tools/__init__.py:2677` — uses `visit_input_values` which only iterates declared inputs. Validates/fixes known params but does NOT remove stale keys from the dict.

## Diagnosis: primarily backend

| Path | Creates stale keys? | Preserves existing stale keys? |
|------|---------------------|-------------------------------|
| planemo-autoupdate / API import | **Yes** | Yes |
| Refactor/upgrade endpoint | **Yes** | Yes |
| Workflow editor version change | No | N/A (clean state returned) |
| Workflow editor save | No | **Yes** (passes through) |

The frontend does not introduce stale keys during version change — `populate_state` in `build_module` correctly filters. But it propagates them if they already exist. The backend is the sole creator and the appropriate place to fix.

## Evidence from IWC workflows

See [IWC_BAD_STATE_FORENSICS.md](IWC_BAD_STATE_FORENSICS.md) for detailed case studies:

| Workflow | Tool | Orphan key | Created by |
|----------|------|-----------|-----------|
| pe-artic-variation.ga | multiqc/1.27+galaxy3 | `saveLog` | planemo-autoupdate bot |
| segmentation-and-counting.ga | ip_filter_standard/1.12.0+galaxy1 | `radius` | Human (via Galaxy editor/export) |
| segmentation-and-counting.ga | ip_threshold/0.18.1+galaxy3 | `dark_bg` | Human (via Galaxy editor/export) |

All three are true orphans — the param was renamed or removed in a tool refactor, then carried forward through a version upgrade.

## Impact

- Every exported `.ga` workflow with tool version upgrades potentially has stale keys
- Stale keys are harmless at runtime (Galaxy ignores them) but:
  - Prevent schema-based validation/linting of `tool_state`
  - Break round-trip native↔format2 conversion
  - Bloat workflow files
  - Can diverge from nested values (e.g., `block_size: "5"` at root vs `"0"` inside conditional), causing confusion

## Proposed fix

Filter unknown keys in `params_to_strings()`:

```python
rval = {}
for key, value in param_values.items():
    if key in params:
        value = params[key].value_to_basic(value, app, use_security=use_security)
        rval[key] = value if nested or value is None else str(dumps(value, sort_keys=True))
return rval
```

And in `params_from_strings()`:

```python
for key, value in param_values.items():
    param = params.get(key)
    if not param:
        continue
    # ... rest of decoding
```

### Won't this strip bookkeeping keys?

No. See [EXTRA_ROOT_KEYS_ISSUE.md](EXTRA_ROOT_KEYS_ISSUE.md) § "Won't the fix strip bookkeeping keys?" — `__page__`, `__rerun_remap_job_id__` are handled outside these functions; `chromInfo`, `__input_ext` are injected at job execution time; `__job_resource` is scrubbed during workflow extraction.

## Testing needed

1. Unit: existing `params_to_strings`/`params_from_strings` round-trip test should still pass
2. Integration: create workflow with conditional tool step → export `.ga` → assert no stale root keys
3. API: import workflow with stale keys → re-export → assert stale keys stripped
4. Upgrade: use refactor endpoint to upgrade tool version → verify clean state
