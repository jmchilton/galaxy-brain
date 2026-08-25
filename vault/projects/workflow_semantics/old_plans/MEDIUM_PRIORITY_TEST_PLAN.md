# Medium Priority Test Plan

4 tests from RESEARCH_GAPS_MEDIUM_PRIORITY.md. Ordered by priority. Q13 (in-flight jobs on timeout) skipped — timing-fragile, and the behavior is intentional; documented instead.

Reference for test patterns: existing .gxwf.yml/.gxwf-tests.yml files in `lib/galaxy_test/workflow/`.

---

## Test 1: Two-Level Nested PJA Parameter Substitution (Q20) — HIGH

**Files:** `runtime_parameters_nested_two_levels.gxwf.yml` + `.gxwf-tests.yml`

**What it proves:** Text parameters flow through TWO subworkflow boundaries and are correctly substituted in PJA RenameDatasetAction at the deepest level.

**Existing one-level test:** `replacement_parameters_nested.gxwf.yml`

### Workflow

```yaml
class: GalaxyWorkflow
inputs:
  test_input: data
  rename_text: text
outputs:
  out:
    outputSource: subworkflow_level1/output
steps:
  subworkflow_level1:
    run:
      class: GalaxyWorkflow
      inputs:
        test_input_level1: data
        rename_text_level1: text
      outputs:
        output:
          outputSource: subworkflow_level2/output
      steps:
        subworkflow_level2:
          run:
            class: GalaxyWorkflow
            inputs:
              test_input_level2: data
              rename_text_level2: text
            outputs:
              output:
                outputSource: cat_step/out_file1
            steps:
              cat_step:
                tool_id: cat1
                outputs:
                  out_file1:
                    rename: "#{rename_text_level2} output"
                in:
                  input1: test_input_level2
          in:
            test_input_level2: test_input_level1
            rename_text_level2: rename_text_level1
    in:
      test_input_level1: test_input
      rename_text_level1: rename_text
```

### Tests

```yaml
- doc: |
    Text parameter "my_custom_name" passes through parent -> level1 -> level2
    where it's used in output rename PJA. Verifies substitution across two
    subworkflow boundaries.
  job:
    test_input:
      class: File
      path: 1.txt
    rename_text:
      value: "my_custom_name"
      type: raw
  outputs:
    out:
      class: File
      metadata:
        name: "my_custom_name output"
```

---

## Test 2: Nested Subworkflow Error Path Tracing (Q16) — HIGH

**This one is an API test, not a .gxwf.yml framework test.** It needs to inspect invocation messages for `workflow_step_index_path`.

**File:** Add to `lib/galaxy_test/api/test_workflows.py`

**What it proves:** `workflow_step_index_path` is correctly populated when a tool fails inside a deeply nested subworkflow (3 levels).

### Design

Build a 3-level workflow: Parent → Subworkflow A → Subworkflow B → tool that fails.

The innermost tool should be something that reliably fails. Options:
- Use a tool with invalid parameter that causes job error
- Use a `when` expression that evaluates to non-boolean (causes `when_not_boolean` failure with known path)

The `when_not_boolean` approach is cleaner — it's a workflow evaluation failure, not a job failure, and the path building code at `run.py:288-296` explicitly handles this case.

### Sketch

```python
def test_nested_subworkflow_error_includes_step_path(self):
    workflow_id = self.workflow_populator.upload_yaml_workflow("""
class: GalaxyWorkflow
inputs:
  input_file: data
steps:
  outer_sub:
    run:
      class: GalaxyWorkflow
      inputs:
        inner_input: data
      outputs:
        out:
          outputSource: inner_sub/out
      steps:
        inner_sub:
          run:
            class: GalaxyWorkflow
            inputs:
              deep_input: data
            outputs:
              out:
                outputSource: failing_step/out_file1
            steps:
              failing_step:
                tool_id: cat1
                in:
                  input1: deep_input
                when: $("not_a_boolean")
          in:
            deep_input: inner_input
    in:
      inner_input: input_file
""")
    # Run workflow, wait for failure
    # Check invocation messages for workflow_step_index_path
    # Path should trace through outer_sub and inner_sub step indices
```

**Key assertion:** `invocation["messages"][0]["workflow_step_index_path"]` is a list of step indices tracing the path from parent through subworkflows.

**Note:** The exact step indices depend on ordering. The implementer should inspect the created workflow to determine expected indices, or use `step_details=True` on the invocation response.

---

## Test 3: Job Cache Miss on Parameter Change (Q19) — MODERATE

**File:** Add to `lib/galaxy_test/api/test_workflows.py` near existing cache tests (~line 7021+)

**What it proves:** Changing a tool parameter causes a cache miss even with `use_cached_job=True`.

### Design

```python
def test_cache_miss_on_parameter_change(self):
    # 1. Run simple workflow with text param "value_a", use_cached_job=True
    # 2. Run again with same param "value_a" -> cache HIT (verify copied_from_job_id set)
    # 3. Run again with param "value_b" -> cache MISS (verify no copied_from_job_id)
```

Use a workflow with a text parameter connected to a tool input (e.g. cat_data_and_sleep or similar tool that accepts a param). The existing `test_run_workflow_use_cached_job_*` tests show the pattern.

**Key assertions:**
- Run 2: job has `copied_from_job_id` (cache hit)
- Run 3: job has no `copied_from_job_id` (cache miss, new execution)

---

## Test 4: format_source Override Behavior (Q12) — MODERATE

**This is tricky as a .gxwf.yml test** because it depends on a tool that declares both `format` and `format_source`. Most existing tools use format_source without a conflicting format declaration.

**Better approach:** Use existing `format_source` tools and verify the output format matches the input format, not the declared format. The existing test `test_expression_tool_output_in_format_source` partially covers this.

**Simplest new test:** A workflow where a tool with `format_source="input1"` receives a .bed input and verify output is .bed (not the tool's declared default format).

### Workflow sketch

```yaml
class: GalaxyWorkflow
inputs:
  input_file: data
outputs:
  out:
    outputSource: format_source_tool/output
steps:
  format_source_tool:
    tool_id: collection_creates_pair_format
    in:
      input1: input_file
```

### Test sketch

```yaml
- doc: |
    Verify format_source copies input format to output.
    Input is .bed, tool uses format_source="input1",
    output should inherit .bed format.
  job:
    input_file:
      class: File
      value: 1.bed
      ftype: bed
  outputs:
    out:
      ftype: bed
```

**Note:** The implementer should verify `collection_creates_pair_format` exists and has `format_source`. If not, find a suitable tool in `test/functional/tools/` or create a minimal one.

---

## Implementation Notes

- Tests 1, 4 are framework tests (.gxwf.yml + .gxwf-tests.yml)
- Tests 2, 3 are API tests (Python, add to test_workflows.py)
- Run one test at a time per CLAUDE.md instructions (Galaxy tests are heavy)
- For API tests, follow existing patterns in the same file for workflow creation, invocation, and assertion
- For the Q16 test, `$("not_a_boolean")` as a when expression is the cleanest way to trigger a known failure with a predictable error path
