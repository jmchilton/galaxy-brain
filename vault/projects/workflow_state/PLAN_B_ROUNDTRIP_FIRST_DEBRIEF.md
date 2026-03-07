# Plan B Debrief: Round-Trip First (IWC-Driven)

**Commit:** `be3344f8c2` on branch `wf_tool_state`
**Date:** 2026-03-07

## Results

**35/42 workflows passing (83%)**

7 failures:
- 6 tool registry version mismatches (parse_error) — tools exist but version lookup fails
  - `pick_value` 0.1.0, `param_value_from_file` 0.1.0, `multi_select` 0.1
- 1 model gap (format2_validation) — `__MERGE_COLLECTION__` tool fails post-conversion validation

1 expected failure: `test_workflow_missing_tool.ga` (intentionally uses nonexistent tool)

## What Was Built

### test/unit/workflows/test_roundtrip.py (~625 lines)
- Failure classification enum (TOOL_NOT_FOUND, CONVERSION_ERROR, etc.)
- Structured result types (StepResult, RoundTripResult)
- Comparison logic: compare_tool_state, compare_connections, compare_steps
- Type-aware value equivalence (_values_equivalent)
- Sweep runner across 42 workflows (15 native, 25 framework, 2 unit)
- Individual passing tests for baseline workflows
- `full_roundtrip_native()` — full native->format2->native->compare pipeline (exists but not yet called from tests)

### validation_native.py — major extensions
- `_decode_double_encoded_values()` — recursive per-value JSON decode
- `_merge_inputs_into_state_dict()` — recursive ConnectedValue injection from input_connections
- All parameter types now validated: text, color, hidden, genomebuild, group_tag, baseurl, directory_uri, select, data_column, drill_down, section, rules
- Conditional branch selection with `__current_case__` fallback
- Repeat state with `repeat_inputs_to_array` integration
- Replacement parameter passthrough

### convert.py — major extensions
- All parameter types now converted (was ~2, now ~15)
- `_convert_scalar_value()` — type-specific coercion (int, float, bool, select multiple)
- Conditional, repeat, section recursive conversion
- Rules passthrough
- `_validate_converted_result()` — post-conversion validation using WorkflowStepLinkedToolState
- `_inject_connected_value()` — ConnectedValue injection for connected params in validation
- Replacement parameter detection and bypass

## Plan vs Reality

| Plan Said | What Happened | Assessment |
|---|---|---|
| Phase 1: 2-3 weeks, 3-5 workflows | 1 session, 35/42 workflows | Scope collapsed — phases 1+2 merged |
| Phase 2: visitor-based pipeline replacing per-type code | Per-type approach extended to all types | Simpler, works well. Visitor pattern unnecessary overhead for this |
| Phase 2: use `visit_input_values()` | Manual recursive conversion | More explicit, easier to debug |
| Phase 1: only build harness + catalog failures | Also fixed most failures | Good — faster progress |

Deviations all make sense. The per-type approach is explicit and debuggable. The visitor pattern would've added indirection without clear benefit given the current code structure.

## Gaps / Issues Found

1. **`full_roundtrip_native()` not exercised** — the full native->format2->native'->compare pipeline exists but no test calls it. Current tests only verify per-step conversion succeeds, not that the round-trip produces equivalent output.

2. **Tool version mismatches** — 6 failures from tools where the stock registry has a different version than what the workflow references. Needs version-tolerant lookup or registry expansion.

3. **`__MERGE_COLLECTION__` model gap** — WorkflowStepLinkedToolState doesn't accept ConnectedValue for all parameter types. The code silently passes on "ConnectedValue" errors (line 114 of convert.py) which is a workaround, not a fix.

4. **Replacement param validation skipped** — `_state_has_replacement_params()` bails out of post-conversion validation entirely. These states are unvalidated.

5. **No format2->native->format2 comparison** — framework workflows go format2->native->format2 conversion but only check per-step conversion success, not structural equivalence of the format2 output.

## Proposed Next Steps (prioritized)

### P0: Wire up full round-trip comparison tests
- Call `full_roundtrip_native()` from tests, assert on diffs
- This is the actual deliverable (D5) — per-step conversion passing != round-trip passing

### P1: Fix tool version lookup
- 6 of 7 failures are version mismatches
- Either add version-tolerant fallback to GET_TOOL_INFO or expand stock tool registry
- Would get to 41/42 passing

### P2: Fix WorkflowStepLinkedToolState ConnectedValue acceptance
- Model should accept ConnectedValue for all parameter types
- Fixes __MERGE_COLLECTION__ failure and removes silent error swallowing in convert.py

### P3: Add format2 direction comparison
- Build format2->native->format2'->compare pipeline
- Verify structural equivalence in the format2 direction

### P4: Subworkflow support
- Plan flagged this as early priority
- 2 native test workflows with subworkflows exist but aren't in the test inventory

### P5: IWC workflow corpus (Phase 3 of plan)
- Toolshed tool support via GetToolInfo
- Representative IWC workflows for real-world coverage

### P6: Execution equivalence testing (Phase 3 of plan)
- Run original and round-tripped workflows, compare outputs
- Requires Galaxy instance
