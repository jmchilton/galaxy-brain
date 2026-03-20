# Workflow State: Current Plan

## What Exists

**Branch:** `wf_tool_state` (24 commits ahead of `dev`)

### Tooling built (in `lib/galaxy/tool_util/workflow_state/`)

- **Conversion** (`convert.py`, `_walker.py`): native↔format2 state conversion for all param types (conditionals, repeats, sections, subworkflows)
- **Validation** (`validation_native.py`, `validation_format2.py`): validate step `tool_state` against tool's declared inputs via Pydantic meta-models
- **Stale state cleaning** (`clean.py`): strip undeclared keys from native `.ga` tool_state
- **Tool cache** (`toolshed_tool_info.py`, `cache.py`): ToolShed API fetch + filesystem cache for `ParsedTool` metadata
- **Round-trip test harness** (`test_roundtrip.py`): 43/43 per-step, 16/16 full round-trip — stock tools

### CLIs (entry points in `packages/tool_util/setup.cfg`)

- `galaxy-workflow-validate` — validate all steps in a workflow against tool definitions
- `galaxy-workflow-clean-stale-state` — strip stale keys from `.ga` files (`--diff` for review)
- `galaxy-tool-cache` — populate/inspect/clear ToolShed tool metadata cache

### Core bug fix

`params_to_strings()`/`params_from_strings()` in `lib/galaxy/tools/parameters/__init__.py` — now filter to declared inputs only, preventing stale keys from surviving save/load cycles.

### IWC corpus validation

Ran against all 111 IWC workflows (509 unique tools, all cached):
- **2074 steps OK, 64 FAIL** across 25 workflows
- 124 stale keys total — dominated by tool-upgrade residue and runtime value leakage
- Full breakdown in `IWC_REVIEW_SUMMARY.md`

---

## Phase 1: Upstream `hidden_data` parameter modeling

**Goal:** Get `hidden_data` parameter type support into Galaxy 26.0.

**Branch:** `hidden_data_parameters_26_0` (exists, not yet green)

### 1.1: Fix tool test framework issue

The branch has a test framework problem blocking CI. Diagnose and fix — the `hidden_data` modeling itself (commit `7662e14a37` on `wf_tool_state`) is solid, the issue is in how the test harness handles this param type.

### 1.2: CI validation

Get the branch green. Run tool tests, API tests, and any integration tests that exercise tools with `hidden_data` params (e.g. cufflinks pattern from IWC review).

### 1.3: PR against 26.0

Open PR targeting `release_26.0`. This unblocks ToolShed tools that use `hidden_data` (cufflinks, possibly EMBOSS/rdock) from being modeled by the parameter factory.

---

## Phase 2: PR the `params_to_strings` fix upstream

**Goal:** Get the core stale-key-stripping fix into `dev`.

### 2.1: Isolate the fix commit

Cherry-pick or extract from the branch:
- `e2eb2ee70e` — RED tests (new test tools + API tests proving stale keys persist)
- `e32e9da58f` — fix in `params_to_strings`/`params_from_strings`

These two commits are self-contained: new test tools (`multiple_versions_removed` v0.1/v0.2), 3 API tests in `test_workflows.py`, and the two-line fix. No dependency on the rest of the branch.

### 2.2: CI validation

Run full API + integration test suite to confirm no regressions. The fix only drops keys not in the tool's declared inputs — bookkeeping keys (`__page__`, `__rerun_remap_job_id__`) are handled outside `params_to_strings` and are unaffected. See `EXTRA_ROOT_KEYS_ISSUE.md` analysis.

### 2.3: PR

Open PR against `dev` with the red-to-green test pair. Reference `STALE_STATE_ISSUE.md` analysis in the PR description.

---

## Phase 3: Fix runtime value leakage into persisted state

**Goal:** Prevent `__workflow_invocation_uuid__` and `__identifier__` from entering `.ga` files at the source. Root cause analysis in `STALE_STATE_BOOKKEEPING.md`.

### 3.1: `modules.py` encode fallback

**File:** `lib/galaxy/workflow/modules.py` ~line 374

**Bug:** When `DefaultToolState.encode()` raises `ValueError`, the fallback returns raw `self.state.inputs` — bypassing `params_to_strings` entirely. Runtime keys like `__workflow_invocation_uuid__` leak through.

**Fix:** Filter the fallback return through the tool's declared inputs before returning. Or: call `params_to_strings` with `ignore_errors=True` instead of falling back to raw state.

**Test:** Create a workflow from a history invocation where `__workflow_invocation_uuid__` is present → export → assert key is absent.

### 3.2: `extract.py` cleanup gap

**File:** `lib/galaxy/workflow/extract.py` ~lines 430-487

**Bug:** `__cleanup_param_values()` only strips keys matching `{prefix + key}_*` (underscore suffix). Pipe-delimited `__identifier__` keys (`input_name|__identifier__`) don't match this pattern and escape cleanup.

**Fix:** Add explicit stripping of `|__identifier__` keys in `__cleanup_param_values()`, or add a post-cleanup pass that drops any key containing `__identifier__`.

**Test:** Execute a tool with collection inputs → extract workflow from history → assert no `__identifier__` keys in step `tool_inputs`.

### 3.3: Decide on `__workflow_invocation_uuid__` injection

Currently injected into the `params` dict at `tools/execute.py:223`. Consider moving it to a separate runtime-only dict that never touches the serialization path. This is a design question — may be deferred if the fallback fix (3.1) is sufficient.

### 3.4: PR

Can be combined with Phase 2 PR or separate. These fixes are independent of the `workflow_state` tooling — they're Galaxy core bugs.

---

## Phase 4: Clean stale state in IWC workflows

**Goal:** Submit PRs to the IWC repository cleaning all 124 stale keys across 25 workflows.

### 4.1: Generate cleaned workflows

```bash
galaxy-workflow-clean-stale-state --recursive /path/to/iwc/workflows/ --populate-cache
```

Review diffs with `--diff` mode first.

### 4.2: Validate cleaned output

Re-run `galaxy-workflow-validate` against cleaned files — expect 0 FAIL.

### 4.3: PR to IWC

Open PR(s) against IWC repo. Could be one bulk PR or grouped by failure category:
- Tool-upgrade stale keys (saveLog, trim_front2/trim_tail2, images, etc.)
- Runtime leak keys (`__workflow_invocation_uuid__`, `__identifier__`)
- Tool-specific orphans (racon, flye, mfassignr, etc.)

Reference the Galaxy fix PR so reviewers understand why these keys are stale and that the fix prevents recurrence.

---

## Phase 5: Execution equivalence

**Goal:** Prove round-tripped workflows execute identically, and that `__current_case__` omission is safe.

### 5.0: Source-level validation (DONE)

Validated `__current_case__` redundancy via static analysis of the IWC corpus using `galaxy-workflow-validate --strip-bookkeeping`.

**Findings:**
- Full IWC corpus: 2074+ steps validated with and without bookkeeping keys
- Initial run: 6 steps flipped OK→FAIL — all caused by a bool/string type mismatch bug in `_select_which_when_native()`, not by genuine `__current_case__` dependency
- Fix: `_test_value_matches_discriminator()` in `_walker.py` — bidirectional bool/string coercion for conditional discriminator matching
- After fix: **zero steps degrade** when stripping bookkeeping. 3 steps improve (bookkeeping keys were themselves stale)
- 1 IWC workflow (interproscan) has a genuine test-value/`__current_case__` disagreement — `__current_case__` was masking stale data from an inactive branch

**Why `__current_case__` is safe to strip:** `params_from_strings()` (`lib/galaxy/tools/parameters/__init__.py:267`) recomputes `__current_case__` from the test parameter value via `get_current_case()` every time tool state is deserialized. The execution engine reads the recomputed value, not the persisted one.

**Write-up:** `CURRENT_CASE_WALKING_ISSUE.md`

### 5.1: `__current_case__` stripping execution test (DONE)

Empirical proof via the 24 framework workflow tests that `__current_case__` is unnecessary at execution time.

**Approach:** `GALAXY_TEST_STRIP_BOOKKEEPING_FROM_WORKFLOWS=1` env var in `WorkflowPopulator.upload_yaml_workflow()` (`lib/galaxy_test/base/populators.py`). When set: upload Format2 → download native → strip bookkeeping via `strip_bookkeeping_from_workflow()` → re-upload stripped native. Parallels the existing `round_trip_format_conversion` download-transform-reupload cycle.

**Result:** All 24 framework workflow tests pass with bookkeeping stripped. CI green. Confirms that `params_from_strings()` correctly recomputes `__current_case__` from the test parameter value at load time — the persisted value is redundant.

### 5.2: Round-tripped workflow execution

For the 16 native workflows passing full round-trip:
1. Run original native workflow through Galaxy test infra
2. Run round-tripped native' through same infra
3. Compare: same jobs created, same outputs

**File:** `test/integration/workflows/test_roundtrip_execution.py`

Heavy (needs running Galaxy + test tools). Selective CI runs, not every build.

---

## Phase 6: Format2 export from Galaxy

**Goal:** Galaxy exports workflows as clean format2 with `state` (not `tool_state`).

### 6.1: Export function

```python
def export_workflow_to_format2(workflow_dict: dict, get_tool_info: GetToolInfo) -> dict:
    """Export native workflow as format2 with clean `state` blocks.

    Per tool step: convert_state_to_format2() → Format2State(state, in_).
    Falls back to tool_state for steps that fail conversion.
    """
```

Currently `gxformat2.export.from_galaxy_native()` produces `tool_state` (JSON strings) because it has no tool definitions. The schema-aware path uses `convert_state_to_format2()` per step.

### 6.2: API endpoint

Extend `GET /api/workflows/{id}/download` with `format=format2`:
- Uses `CombinedGetToolInfo` (stock + ToolShed)
- Returns format2 with `state` blocks where conversion succeeds
- Falls back to `tool_state` with warning annotation for steps that fail

### 6.3: Round-trip validation gate

Only offer format2 export for workflows that pass round-trip validation. If any step fails, warn user and offer native-only export.

---

## Phase 7: External tooling support

**Goal:** Enable format2 workflow validation without a Galaxy instance.

### 7.1: JSON Schema generation from Pydantic meta-models

```python
def format2_state_json_schema(parsed_tool: ParsedTool) -> dict:
    model = WorkflowStepToolState.parameter_model_for(parsed_tool.inputs)
    return model.model_json_schema(mode="validation")
```

Nearly free — `pydantic_template("workflow_step")` already exists for all param types.

### 7.2: Tool Shed API endpoint for workflow state schema

`GET /api/tools/{trs_tool_id}/version/{version}/workflow_state_schema` — returns JSON Schema for format2 `state` blocks. IDEs, linters, AI agents validate without Galaxy.

### 7.3: gxformat2 lint integration

Extend `gxformat2/lint.py` with optional schema-aware validation:
- When tool defs available (ToolShed API, cache, or local), validate `state` against meta-models
- When not available, fall back to structural-only lint
- `gxformat2` stays dependency-free — tool defs passed as `ParsedTool` dicts or JSON Schemas
- `galaxy-tool-cache` provides the bridge

---

## Phase Summary

| Phase | Delivers | Status |
|-------|----------|--------|
| 1: `hidden_data` upstream | `hidden_data` param modeling in Galaxy 26.0 | Branch exists, not green — test framework issue |
| 2: PR stale key fix | `params_to_strings` fix + tests in Galaxy dev | Ready to PR |
| 3: Fix runtime leakage | `modules.py` fallback + `extract.py` cleanup fixes | Needs implementation |
| 4: Clean IWC workflows | PRs to IWC repo removing 124 stale keys | Blocked on Phase 2 (for "fix prevents recurrence" story) |
| 5: Execution equivalence | `__current_case__` proof, round-trip execution comparison | 5.0 + 5.1 done — `__current_case__` proven redundant (static + execution) |
| 6: Format2 export | Galaxy export API with `state` blocks | Depends on Phase 5 confidence |
| 7: External tooling | JSON Schema, ToolShed API, gxformat2 lint | Depends on Phase 2 |

**Parallelism:** Phase 1 is independent and highest priority (26.0 target). Phases 2-4 are the stale-state story (mostly sequential — fix, then prevent, then clean). Phase 5 is independent and can run in parallel with anything. Phases 6-7 depend on confidence from earlier phases.

---

## Unresolved Questions

- Should the `modules.py`/`extract.py` fixes (Phase 3) be in the same PR as the `params_to_strings` fix (Phase 2), or separate?
- IWC cleanup (Phase 4): one bulk PR or grouped by failure category?
- Should `__workflow_invocation_uuid__` injection be moved out of the `params` dict entirely (Phase 3.3), or is the fallback fix sufficient?
- Of the 64 failing IWC steps, how many become clean after stale key stripping alone vs need model/conversion fixes?
- What is the specific tool test framework issue on `hidden_data_parameters_26_0`?
