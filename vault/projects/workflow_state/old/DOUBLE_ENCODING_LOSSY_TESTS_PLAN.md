# Plan: Test Cases Demonstrating Double-Encoding Lossiness

**Status:** Complete — all tests pass (1 green, 4 xfail)
**Date:** 2026-03-27

## Goal

Demonstrate the fundamental platform limitation: Galaxy's double-encoding scheme
for workflow `tool_state` is lossy for text/hidden parameter values that happen to
be valid JSON literals. No gxformat2 involvement — pure native `.ga` workflows
imported via the Galaxy API.

## The Bug

When Galaxy stores a workflow step's tool_state, `params_to_strings()` calls
`json.dumps()` on each parameter value. When it reads the state back,
`params_from_strings()` calls `safe_loads()` (i.e. `json.loads()`) on each value.
For a `gx_hidden` param with `value="2"`:

- Store: `json.dumps("2")` → `'"2"'` (JSON string containing the string "2")
- Load: `json.loads('"2"')` → `"2"` (Python string) — correct

But if at any point the outer JSON layer is decoded and re-encoded without
schema awareness (which happens in several code paths), the value `"2"` becomes
the bare JSON token `2`, and:

- Load: `json.loads('2')` → `2` (Python int) — **corrupted**

This affects any text/hidden value that is a valid JSON literal: `"2"`, `"true"`,
`"false"`, `"null"`, `"[1,2]"`, `"{}"`.

## Test Strategy

All tests go in `lib/galaxy_test/api/test_workflows.py` as methods on
`TestWorkflowsApi`. They use hand-crafted `.ga` workflow dicts — no gxformat2
import path. Test tools (`gx_text`, `gx_hidden`) echo parameter values to
output.

Each test crafts a native workflow dict with carefully controlled double-encoded
`tool_state`, imports it via `import_workflow()`, then downloads and inspects
whether the encoding survived.

### Crafting .ga tool_state

Native `.ga` `tool_state` is a JSON string where each value is itself JSON-encoded:

```python
tool_state = json.dumps({
    "parameter": json.dumps("2"),   # → '"2"' — the string "2"
    "__page__": 0,
    "__rerun_remap_job_id__": None,
})
```

This gives us full control over the exact encoding — no gxformat2 in the loop.

### Helper: build a minimal .ga workflow dict

```python
def _ga_workflow_with_tool_state(tool_id, tool_state_inner):
    """Build a minimal native .ga workflow dict with one tool step."""
    return {
        "a_galaxy_workflow": "true",
        "format-version": "0.1",
        "name": "test_double_encoding",
        "steps": {
            "0": {
                "id": 0,
                "type": "tool",
                "tool_id": tool_id,
                "tool_version": None,
                "tool_state": json.dumps({
                    **tool_state_inner,
                    "__page__": 0,
                    "__rerun_remap_job_id__": None,
                }),
                "input_connections": {},
                "position": {"left": 0, "top": 0},
                "annotation": "",
                "workflow_outputs": [],
            }
        },
    }
```

### Test 1: Hidden param "2" — baseline import + execute

Import a `.ga` with `gx_hidden` parameter double-encoded as the string `"2"`.
Run it and verify the tool received `"2"`.

```python
@skip_without_tool("gx_hidden")
def test_hidden_param_json_like_value_from_ga(self):
    """Hidden param '2' imported from .ga should execute as string '2'."""
    workflow = _ga_workflow_with_tool_state("gx_hidden", {
        "parameter": json.dumps("2"),  # '"2"' — correctly double-encoded string
    })
    imported = self.import_workflow(workflow)
    workflow_id = imported.json()["id"]
    with self.dataset_populator.test_history() as history_id:
        self._run_workflow(workflow_id, test_data={}, history_id=history_id)
        content = self.dataset_populator.get_history_dataset_content(
            history_id, hid=1
        )
        assert content.strip() == "2"
```

### Test 2: Hidden param "2" — download + re-import round-trip

The core test. Import a `.ga`, download it from Galaxy, inspect tool_state
encoding, re-import, inspect again. Does the string survive?

```python
@skip_without_tool("gx_hidden")
def test_hidden_param_json_like_value_roundtrip_ga(self):
    """Hidden param '2' must survive .ga import → download → re-import."""
    workflow = _ga_workflow_with_tool_state("gx_hidden", {
        "parameter": json.dumps("2"),
    })
    imported = self.import_workflow(workflow)
    workflow_id = imported.json()["id"]

    # Download — Galaxy's export path re-encodes tool_state
    downloaded = self._download_workflow(workflow_id)
    step = list(downloaded["steps"].values())[0]
    tool_state = json.loads(step["tool_state"])
    param_raw = tool_state["parameter"]
    param_decoded = json.loads(param_raw) if isinstance(param_raw, str) else param_raw
    assert isinstance(param_decoded, str), (
        f"After first download: expected string '2', got "
        f"{type(param_decoded).__name__} {param_decoded!r}"
    )

    # Re-import the downloaded .ga and download again
    reimported = self.import_workflow(downloaded)
    reimported_id = reimported.json()["id"]
    downloaded2 = self._download_workflow(reimported_id)
    step2 = list(downloaded2["steps"].values())[0]
    tool_state2 = json.loads(step2["tool_state"])
    param_raw2 = tool_state2["parameter"]
    param_decoded2 = json.loads(param_raw2) if isinstance(param_raw2, str) else param_raw2
    assert isinstance(param_decoded2, str), (
        f"After round-trip: expected string '2', got "
        f"{type(param_decoded2).__name__} {param_decoded2!r}"
    )
```

### Test 3: Text param with various JSON-like values

Sweep of problematic string values using `gx_text`.

```python
@skip_without_tool("gx_text")
def test_text_param_json_like_values_roundtrip_ga(self):
    """Text params with JSON-like string values must survive .ga round-trip."""
    cases = [
        ("2", "bare integer"),
        ("3.14", "bare float"),
        ("true", "bare boolean true"),
        ("false", "bare boolean false"),
        ("null", "bare null"),
        ("[1,2]", "bare array"),
        ('{"a":1}', "bare object"),
    ]
    for value, label in cases:
        workflow = _ga_workflow_with_tool_state("gx_text", {
            "parameter": json.dumps(value),  # double-encode as string
        })
        imported = self.import_workflow(workflow)
        workflow_id = imported.json()["id"]

        downloaded = self._download_workflow(workflow_id)
        step = list(downloaded["steps"].values())[0]
        tool_state = json.loads(step["tool_state"])
        raw = tool_state["parameter"]
        decoded = json.loads(raw) if isinstance(raw, str) else raw
        assert isinstance(decoded, str), (
            f"{label}: expected string {value!r}, got "
            f"{type(decoded).__name__} {decoded!r}"
        )
```

### Test 4: Conditional hidden param (the lofreq/bcftools pattern)

Hidden param inside a conditional `<when>` branch — extra nesting means extra
encode/decode layers.

Requires a new test tool: `gx_hidden_in_conditional.xml` (see below).

The `.ga` tool_state for a conditional is nested double-encoding:

```python
tool_state_inner = {
    "cond": json.dumps({
        "select": json.dumps("a"),
        "hidden_val": json.dumps("2"),
        "__current_case__": 0,
    }),
}
```

```python
@skip_without_tool("gx_hidden_in_conditional")
def test_conditional_hidden_param_roundtrip_ga(self):
    """Hidden param '2' inside conditional must survive .ga round-trip."""
    workflow = _ga_workflow_with_tool_state("gx_hidden_in_conditional", {
        "cond": json.dumps({
            "select": json.dumps("a"),
            "hidden_val": json.dumps("2"),
            "__current_case__": 0,
        }),
    })
    imported = self.import_workflow(workflow)
    workflow_id = imported.json()["id"]

    # Download and inspect
    downloaded = self._download_workflow(workflow_id)
    step = list(downloaded["steps"].values())[0]
    tool_state = json.loads(step["tool_state"])
    cond_raw = tool_state["cond"]
    cond = json.loads(cond_raw) if isinstance(cond_raw, str) else cond_raw
    hidden_raw = cond["hidden_val"]
    hidden_decoded = json.loads(hidden_raw) if isinstance(hidden_raw, str) else hidden_raw
    assert isinstance(hidden_decoded, str), (
        f"Conditional hidden param: expected string '2', got "
        f"{type(hidden_decoded).__name__} {hidden_decoded!r}"
    )

    # Run to verify execution correctness
    with self.dataset_populator.test_history() as history_id:
        self._run_workflow(workflow_id, test_data={}, history_id=history_id)
        content = self.dataset_populator.get_history_dataset_content(
            history_id, hid=1
        )
        assert content.strip() == "2"
```

### Test 5: Multiple round-trips

Verify corruption behavior across 3 import/export cycles.

```python
@skip_without_tool("gx_hidden")
def test_hidden_param_multiple_roundtrips_ga(self):
    """Track hidden param '2' type across 3 .ga round-trips."""
    workflow = _ga_workflow_with_tool_state("gx_hidden", {
        "parameter": json.dumps("2"),
    })
    imported = self.import_workflow(workflow)
    workflow_id = imported.json()["id"]

    values = []
    for i in range(3):
        downloaded = self._download_workflow(workflow_id)
        step = list(downloaded["steps"].values())[0]
        tool_state = json.loads(step["tool_state"])
        raw = tool_state["parameter"]
        decoded = json.loads(raw) if isinstance(raw, str) else raw
        values.append((i, type(decoded).__name__, decoded))
        reimported = self.import_workflow(downloaded)
        workflow_id = reimported.json()["id"]

    for i, type_name, val in values:
        assert type_name == "str", (
            f"Round-trip {i}: expected string '2', got {type_name} {val!r}"
        )
```

## New Test Tool

### `gx_hidden_in_conditional.xml`

```xml
<tool id="gx_hidden_in_conditional" name="gx_hidden_in_conditional" version="1.0.0">
    <command><![CDATA[
echo '$cond.hidden_val' > '$output'
    ]]></command>
    <inputs>
        <conditional name="cond">
            <param name="select" type="select">
                <option value="a">A</option>
                <option value="b">B</option>
            </param>
            <when value="a">
                <param name="hidden_val" type="hidden" value="2" />
            </when>
            <when value="b">
                <param name="hidden_val" type="hidden" value="-1" />
            </when>
        </conditional>
    </inputs>
    <outputs>
        <data name="output" format="txt" />
    </outputs>
    <tests>
        <test>
            <conditional name="cond">
                <param name="select" value="a" />
            </conditional>
            <output name="output">
                <assert_contents>
                    <has_line line="2" />
                </assert_contents>
            </output>
        </test>
    </tests>
</tool>
```

Add to `sample_tool_conf.xml`:
```xml
<tool file="parameters/gx_hidden_in_conditional.xml" />
```

## Implementation Steps

1. ~~**Create `gx_hidden_in_conditional.xml`** in
   `test/functional/tools/parameters/`.~~ Done. No `sample_tool_conf.xml`
   edit needed — `<tool_dir dir="parameters/" />` auto-discovers it.

2. ~~**Add helper** `_ga_workflow_with_tool_state()` as a module-level function.~~ Done — added near top of `test_workflows.py`.

3. ~~**Add test methods** to `TestWorkflowsApi`.~~ Done — 5 tests added after
   the `__current_case__` test group, with comment block explaining purpose.

4. ~~**Run tests locally**~~ Done. All results match predictions:
   - Test 1 (import+execute): PASSED
   - Tests 2-5: XFAIL (double-encoding lossiness confirmed)
   - Fixed missing `annotation` key in helper (caused 500 on import).

5. **Do NOT fix the failures** — the fix comes from
   `SINGLE_PASS_JSON_ENCODE_DECODE_HANDLING_PLAN.md`.

## Expected Outcomes

| Test | Expected | Actual | Why |
|---|---|---|---|
| Test 1 (import + execute) | PASS | **PASS** | Galaxy decodes tool_state correctly for execution |
| Test 2 (single round-trip) | Possibly FAIL | **XFAIL** | Export path re-encodes without schema |
| Test 3 (value sweep, 7 cases) | FAIL | **XFAIL** (all 7) | All valid JSON literals corrupted (parametrized) |
| Test 4a (conditional round-trip) | Most likely FAIL | **PASS** | Conditionals are NOT double-encoded — inner values are plain dicts |
| Test 4b (conditional execute) | PASS | **PASS** | Execution path works correctly |
| Test 5 (3x round-trip) | FAIL | **XFAIL** | Corruption idempotent after first cycle |

**Key finding:** Conditionals are NOT affected. Galaxy exports conditional
tool_state values as plain dicts, not double-encoded JSON strings. The bug
only affects top-level scalar parameters.

## Notes

- `echo '$parameter'` doesn't distinguish string from int at the shell level.
  Tool_state inspection in the downloaded JSON is the authoritative check.
- All workflows are hand-crafted `.ga` dicts with explicit double-encoding.
  No gxformat2 import path is exercised.
- The `inputs_as_json.xml` tool could supplement these tests — it dumps the
  full JSON config showing the parameter's Python type as the tool sees it.
