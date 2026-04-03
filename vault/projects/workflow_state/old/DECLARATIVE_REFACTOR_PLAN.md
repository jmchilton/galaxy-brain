# Declarative Test Framework for Workflow Operations

## Problem

gxformat2 has a clean declarative test runner (`test_declarative_normalized.py`) that drives YAML expectation files against workflow operations — but it's locked inside the test suite. Galaxy has sophisticated workflow operations (clean, roundtrip, stateful conversion, export) that could use the same pattern but currently rely on imperative sweep tests that are harder to write targeted assertions for.

## Goal

1. Export gxformat2's declarative test infrastructure as a reusable library
2. Use it in Galaxy to write YAML-driven declarative tests for workflow_state operations

---

## Commit 1 (gxformat2): Export declarative test runner as `gxformat2.testing`

### New module: `gxformat2/testing.py`

Extract from `tests/test_declarative_normalized.py` into an importable module:

- `navigate(obj, path)` — path-based object navigation (`$length`, dict key, attribute, list index, `{field: value}` search)
- `assert_value(obj, expected)` — exact equality
- `assert_value_contains(obj, expected)` — substring check
- `assert_value_set(obj, expected_items)` — unordered set comparison
- `assert_value_matches(obj, pattern)` — regex match (new, for error message assertions)
- `load_expectation_cases(expectations_dir)` — yield `(test_id, case_dict)` from YAML files
- `run_declarative_case(case, operations, load_fixture)` — execute one test case: load fixture, run operation, check assertions (or `expect_error`)
- `DeclarativeTestSuite` — lightweight class that bundles operations dict + fixture loader, provides `pytest_params()` for parametrization and `run(test_id, case)` for execution

Key design: **operations and fixture loading are injected** — gxformat2 provides the test harness, callers provide their own operations dict and fixture loader. gxformat2's own tests become a thin wrapper that passes its `OPERATIONS` dict and `examples.load`.

### Refactor `tests/test_declarative_normalized.py`

Import from `gxformat2.testing` instead of defining everything inline. Proves the extraction works and keeps gxformat2's own tests green.

### Assertion mode extensions

gxformat2 currently supports `value`, `value_contains`, `value_set`. Add to `gxformat2/testing.py`:

- **`value_matches`** — regex match for error messages, useful for `expect_error` cases
- **`value_truthy` / `value_falsy`** — for boolean-ish results (e.g., `roundtrip.success`)
- **`value_type`** — assert `isinstance` (e.g., result is a `dict`, `list`, `str`)

### Files touched

- `gxformat2/testing.py` (new)
- `tests/test_declarative_normalized.py` (refactor to use new module)

---

## Commit 2 (Galaxy): Add declarative expectation YAML tests for workflow_state operations

### New test module: `test/unit/tool_util/workflow_state/test_declarative.py`

```python
from gxformat2.testing import DeclarativeTestSuite

OPERATIONS = {
    "clean": _clean_op,           # wraps clean_stale_state + returns result model
    "roundtrip": _roundtrip_op,   # wraps roundtrip pipeline
    "export_format2": _export_op, # wraps export_workflow_to_format2
    "validate_native": ...,
    "validate_format2": ...,
    "to_native_stateful": ...,
}

suite = DeclarativeTestSuite(OPERATIONS, _load_fixture)

@pytest.mark.parametrize("test_id,case", suite.pytest_params())
def test_declarative(test_id, case):
    suite.run(test_id, case)
```

### Operation wrappers

Each Galaxy operation needs a thin wrapper that:

1. Takes a workflow dict (loaded from fixture)
2. Sets up tool info (via `setup_tool_info` / functional tool cache)
3. Runs the operation
4. Returns a navigable result object (dict or Pydantic model) for assertions

The existing `functional_tool_info.py` helper already provides `GetToolInfo` callbacks for IWC sweep tests. The declarative test wrappers should reuse it. For synthetic fixtures where tools don't exist in any toolshed, we may need mock tool info or fixtures that use framework test tools.

### New expectation files in `test/unit/tool_util/workflow_state/expectations/`

Candidate files:

- `clean_stale_state.yml` — fixture → clean → assertions about removed keys, step results
- `roundtrip.yml` — fixture → native→f2→native → assertions about diff classification, failure classes, benign artifacts
- `export_format2.yml` — fixture → export → assertions about output format2 structure (no `__current_case__`, proper `state` blocks)
- `validate_native.yml` — fixture → validate → assertions about validation results
- `validate_format2.yml` — fixture → validate_format2 → assertions about validation results
- `to_native_stateful.yml` — fixture → stateful f2→native → assertions about tool_state encoding

### Fixture strategy

- **No tool definitions needed** (structural validation, basic conversion): use gxformat2's shipped examples via `gxformat2.examples.load`
- **Tool definitions needed** (clean, roundtrip, stateful conversion): use Galaxy's existing framework test workflows from `lib/galaxy_test/workflow/` or the IWC fixtures cached at `test/unit/workflows/iwc/`

### Files touched

- `test/unit/tool_util/workflow_state/test_declarative.py` (new)
- `test/unit/tool_util/workflow_state/expectations/*.yml` (new, multiple)

---

## Commit 3 (Galaxy, optional): Migrate existing imperative assertions to declarative YAML

Cherry-pick the most valuable existing imperative tests from `test_workflow_validation.py`, `test_roundtrip.py`, etc. and express them as expectation YAML entries. Incremental — start with a few high-value cases to prove the pattern, don't migrate everything at once.

---

## Unresolved Questions

1. **Fixture loading for tool-dependent operations** — should `DeclarativeTestSuite` accept a fixture loader that takes extra context (like `GetToolInfo`), or should the operation wrappers close over the tool info? Leaning toward the latter (operation wrappers handle their own setup).

2. **Result shape normalization** — Galaxy operations return Pydantic models (`WorkflowCleanResult`, `RoundTripResult`). The navigator already handles attribute access. Should we also support `.model_dump()` dicts, or just navigate the live model? Live model is simpler and works with the existing navigator.

3. **Should `gxformat2.testing` avoid pulling pytest into main deps?** The module itself doesn't need to import pytest — only `DeclarativeTestSuite.pytest_params()` would. Could make pytest a soft/lazy import.

Yes please ideally - if this isn't possible lets discuss strategies once refactoring is done.

4. **Scope of commit 2** — start with which operations? Options: (a) `clean` + `roundtrip` since they have the richest result models and most to assert on, or (b) `validate_*` since those are simpler and prove the pattern faster.

5. **Expectations dir ownership** — Galaxy-specific operations belong Galaxy-side. But if we add format2-level operations that Galaxy also tests, those expectations could live in gxformat2. Need a clear boundary.

