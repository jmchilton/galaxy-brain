# Plan: `__current_case__` API Test + Cleaning Option

**Branch:** `wf_tool_state`
**Date:** 2026-03-15

## Background

`__current_case__` is a bookkeeping key in native `.ga` tool_state that records which conditional branch was active when the workflow was saved. It's an integer index into the conditional's `when` list.

**Why it's safe to strip:**
- `DefaultToolState.decode()` → `params_from_strings()` skips `__current_case__` (not a declared input, filtered at `parameters/__init__.py:367-368`)
- `check_and_update_param_values()` / `populate_state()` recomputes it from the test parameter value via `get_current_case()` (`parameters/__init__.py:267,519,642,748`)
- Static proof: IWC corpus — 2074+ steps, zero degrade when stripping bookkeeping
- Execution proof: all 24 framework workflow tests pass with `GALAXY_TEST_STRIP_BOOKKEEPING_FROM_WORKFLOWS=1` in CI

**What exists:**
- `strip_bookkeeping_from_workflow()` in `clean.py` already strips `__current_case__` along with all other bookkeeping keys
- `--strip bookkeeping` in the CLI does this via the category/policy system
- But there's no way to strip ONLY `__current_case__` without also stripping `__page__`, `__rerun_remap_job_id__`, `chromInfo`, etc.
- No API test that proves a *wrong* `__current_case__` is harmless at execution time

---

## Part 1: API Test — Wrong `__current_case__` is harmless

**Goal:** Prove that Galaxy ignores a persisted `__current_case__` by uploading a workflow with a deliberately wrong value and executing it successfully.

**File:** `lib/galaxy_test/api/test_workflows.py` (add to `TestWorkflowsApi`)

### Test: `test_wrong_current_case_ignored_on_execution`

**Strategy:**
1. Upload a Format2 workflow using `multiple_versions_changes` v0.2 with a conditional:
   - `cond.bool_to_select: "b"` (selects case index 1, the second `<when>`)
2. Download as native `.ga`
3. Manually patch `tool_state` to set `__current_case__: 0` (WRONG — should be 1 for "b")
4. Re-import the tampered `.ga`
5. Execute the workflow
6. Assert execution succeeds — output contains "Version 0.2"
7. Download the workflow again and assert `__current_case__` has been corrected to 1

**Why `multiple_versions_changes` v0.2:** It has a `cond` conditional with select param `bool_to_select` having options `a` (index 0) and `b` (index 1, default). Setting the test value to `"b"` but `__current_case__` to `0` creates a deliberate mismatch.

```python
def test_wrong_current_case_ignored_on_execution(self):
    # Upload Format2 workflow with conditional set to case "b" (index 1)
    workflow_id = self.workflow_populator.upload_yaml_workflow("""
class: GalaxyWorkflow
inputs: {}
steps:
  step:
    tool_id: multiple_versions_changes
    tool_version: "0.2"
    state:
      inttest: 1
      floattest: 1.0
      cond:
        bool_to_select: "b"
""", fill_defaults=False)
    # Download native, inject wrong __current_case__
    native = self._download_workflow(workflow_id)
    step = list(native["steps"].values())[0]
    tool_state = json.loads(step["tool_state"])
    # "b" is index 1, but we set 0 (wrong)
    assert tool_state["cond"]["__current_case__"] == 1  # confirm correct before tampering
    tool_state["cond"]["__current_case__"] = 0  # WRONG
    step["tool_state"] = json.dumps(tool_state)
    native["name"] = "Wrong current_case test"
    # Re-import tampered workflow
    tampered_id = self.workflow_populator.create_workflow(native)
    # Execute — should succeed despite wrong __current_case__
    with self.dataset_populator.test_history() as history_id:
        self.workflow_populator.invoke_workflow_and_wait(
            tampered_id, history_id=history_id
        )
        content = self.dataset_populator.get_history_dataset_content(history_id)
        assert "Version 0.2" in content
    # Download again — __current_case__ should be corrected
    fixed = self._download_workflow(tampered_id)
    fixed_step = list(fixed["steps"].values())[0]
    fixed_state = json.loads(fixed_step["tool_state"])
    assert fixed_state["cond"]["__current_case__"] == 1
```

### Test: `test_missing_current_case_execution`

**Strategy:** Same as above but completely remove `__current_case__` from the conditional dict.

```python
def test_missing_current_case_execution(self):
    workflow_id = self.workflow_populator.upload_yaml_workflow("""
class: GalaxyWorkflow
inputs: {}
steps:
  step:
    tool_id: multiple_versions_changes
    tool_version: "0.2"
    state:
      inttest: 1
      floattest: 1.0
      cond:
        bool_to_select: "b"
""", fill_defaults=False)
    native = self._download_workflow(workflow_id)
    step = list(native["steps"].values())[0]
    tool_state = json.loads(step["tool_state"])
    del tool_state["cond"]["__current_case__"]
    step["tool_state"] = json.dumps(tool_state)
    native["name"] = "Missing current_case test"
    tampered_id = self.workflow_populator.create_workflow(native)
    with self.dataset_populator.test_history() as history_id:
        self.workflow_populator.invoke_workflow_and_wait(
            tampered_id, history_id=history_id
        )
        content = self.dataset_populator.get_history_dataset_content(history_id)
        assert "Version 0.2" in content
```

### Placement

Add after the existing stale-key tests (after line ~1319 in `test_workflows.py`), grouped with them. Both tests use `@skip_without_tool("multiple_versions_changes")`.

### Running

```bash
# API tests (slow — starts Galaxy server)
pytest lib/galaxy_test/api/test_workflows.py -k "test_wrong_current_case" -x
pytest lib/galaxy_test/api/test_workflows.py -k "test_missing_current_case_execution" -x
```

---

## Part 2: `--strip-current-case` option for `galaxy-workflow-clean-stale-state`

**Goal:** Let users strip `__current_case__` specifically without stripping all bookkeeping keys.

### Approach A: Dedicated boolean flag (recommended)

Add `--strip-current-case` as a standalone boolean flag that strips only `__current_case__` keys from conditional dicts. This is independent of the category/policy system.

**Rationale:** `__current_case__` has a unique property among bookkeeping keys — it's provably redundant (recomputed from test param value). Other bookkeeping keys like `__page__` and `__rerun_remap_job_id__` serve different purposes. A dedicated flag makes the intent clear.

#### Changes

**`_cli_common.py`** — Add to `add_stale_key_args()`:
```python
if mode == "clean":
    # ... existing --preserve/--strip args ...
    parser.add_argument(
        "--strip-current-case",
        action="store_true",
        help="Strip __current_case__ keys from conditional dicts. "
        "These are recomputed on import from the test parameter value.",
    )
```

**`clean.py`** — New function + integrate into `strip_stale_keys()` and `clean_stale_state()`:

```python
def _strip_current_case_recursive(state: dict) -> list[str]:
    """Strip __current_case__ keys from all conditional dicts, recursively."""
    removed = []
    for key, value in list(state.items()):
        if key == "__current_case__":
            del state[key]
            removed.append(key)
        elif isinstance(value, dict):
            for r in _strip_current_case_recursive(value):
                removed.append(f"{key}.{r}")
        elif isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, dict):
                    sub_removed = _strip_current_case_recursive(parsed)
                    if sub_removed:
                        state[key] = json.dumps(parsed)
                        for r in sub_removed:
                            removed.append(f"{key}.{r}")
            except (json.JSONDecodeError, ValueError):
                pass
    return removed
```

Add `strip_current_case: bool = False` to `CleanOptions` model. Thread it through `clean_stale_state()` → applied per-step after the main stale-key stripping pass. Also apply in the workflow-level loop to handle subworkflows.

**`scripts/workflow_clean_stale_state.py`** — `CleanOptions.from_namespace()` reads `args.strip_current_case`.

### Approach B: New stale key category (alternative)

Split `__current_case__` out of `BOOKKEEPING` into its own category `CURRENT_CASE`.

```python
class StaleKeyCategory(Enum):
    BOOKKEEPING = "bookkeeping"        # __page__, __rerun_remap_job_id__, etc.
    CURRENT_CASE = "current-case"      # __current_case__ only
    STALE_ROOT = "stale-root-keys"
    STALE_BRANCH = "stale-branch-data"
    UNKNOWN = "unknown"
    RUNTIME_LEAK = "runtime-leak"
```

Then `--strip current-case` strips only `__current_case__`. `--strip bookkeeping` would still strip the other bookkeeping keys but NOT `__current_case__` by default. `--strip all` strips everything.

**Tradeoff:** More consistent with category system, but changes the semantics of `--strip bookkeeping` (it would no longer include `__current_case__`). This could surprise users who already use `--strip bookkeeping` expecting it to strip everything.

### Recommendation

**Approach A** — dedicated `--strip-current-case` flag. Simpler, no semantic change to existing categories, clear intent.

---

## Part 3: Apply to `strip_bookkeeping_from_workflow()`

The existing `strip_bookkeeping_from_workflow()` already strips `__current_case__` (it's in `_NATIVE_BOOKKEEPING_KEYS`). No change needed there.

But we should also add `strip_current_case_from_workflow()` as a public API for stripping only `__current_case__`:

```python
def strip_current_case_from_workflow(workflow_dict: NativeWorkflowDict) -> None:
    """Strip __current_case__ keys from all tool_state in a workflow."""
    for step in workflow_dict.get("steps", {}).values():
        if step.get("type") == "subworkflow" and "subworkflow" in step:
            strip_current_case_from_workflow(step["subworkflow"])
        tool_state_str = step.get("tool_state")
        if tool_state_str and isinstance(tool_state_str, str):
            tool_state = json.loads(tool_state_str)
            _strip_current_case_recursive(tool_state)
            step["tool_state"] = json.dumps(tool_state)
```

---

## Implementation Order

1. **RED test** — Add `test_wrong_current_case_ignored_on_execution` and `test_missing_current_case_execution` to `test_workflows.py`. Run to confirm they pass (these are "prove existing behavior" tests, not red-green — they should pass immediately since Galaxy already recomputes `__current_case__`).

2. **CLI option** — Add `--strip-current-case` flag:
   - `_cli_common.py`: add arg
   - `clean.py`: add `_strip_current_case_recursive()`, `strip_current_case_from_workflow()`, integrate into `CleanOptions` and `clean_stale_state()`
   - `scripts/workflow_clean_stale_state.py`: thread through

3. **Unit test** — Add test in `test/unit/tool_util/workflow_state/` verifying `--strip-current-case` removes only `__current_case__` and leaves other bookkeeping intact.

4. **Manual verification** — Run against an IWC workflow with conditionals to confirm `__current_case__` keys are stripped.

---

## Files to Change

| File | Change |
|------|--------|
| `lib/galaxy_test/api/test_workflows.py` | +2 test methods (~40 lines) |
| `packages/tool_util/galaxy/tool_util/workflow_state/clean.py` | +`_strip_current_case_recursive()`, +`strip_current_case_from_workflow()`, modify `CleanOptions`, modify `clean_stale_state()` |
| `packages/tool_util/galaxy/tool_util/workflow_state/_cli_common.py` | +`--strip-current-case` arg |
| `packages/tool_util/galaxy/tool_util/workflow_state/scripts/workflow_clean_stale_state.py` | Thread `strip_current_case` through |
| `test/unit/tool_util/workflow_state/test_clean.py` (or similar) | +unit test for strip-current-case |

---

## Unresolved Questions

- Approach A (dedicated flag) vs B (new category) for the CLI? Recommended A but open to B if consistency with category system is preferred.
- Should `--strip-current-case` also be available in `galaxy-workflow-validate` (to validate as-if stripped)?
- Should the `strip_current_case_from_workflow()` function be exposed in the package's `__init__.py` public API?
- Should we also add `--strip-current-case` to `galaxy-workflow-roundtrip-validate`?
