# Research Gaps: Medium Priority Findings

Deep code analysis of five remaining open questions: Q12 (format_source), Q13 (timeout job cleanup), Q16 (nested error tracing), Q19 (job cache invalidation), Q20 (nested PJA substitution).

---

## Q13: In-Flight Jobs on Invocation Timeout

### Answer: In-Flight Jobs Keep Running — Intentional

The timeout path at `run.py:204-215` calls `set_state(FAILED)` directly and returns immediately. It does NOT call `cancel_invocation_steps()`.

**Contrast with user cancellation:** The scheduler (`scheduling_manager.py:443-448`) handles CANCELLING state by calling `cancel_invocation_steps()` which sets all in-flight jobs to `Job.states.DELETING`. Timeout skips this entirely.

**What happens:**
1. Invocation state → FAILED
2. Job states → UNCHANGED (remain running/queued)
3. Jobs continue executing, unaware of timeout
4. Job outputs land in history but invocation won't track them

**The asymmetry with cancellation is deliberate, not an oversight.** Cancellation is an explicit user request to stop; failure is not. A workflow that fails on one branch may still have unrelated branches whose results the user wants, and killing them would discard already-purchased compute. `fail()` therefore marks the invocation terminal and leaves jobs alone.

This applies to every failure pathway, not just timeout — `fail()` is shared by the three `run.py` handlers (`FailWorkflowEvaluation`, `MessageException`, bare `Exception`) and the timeout early-return. Only the `CANCELLING` branch in `scheduling_manager.py` calls `cancel_invocation_steps()`.

**If this is ever revisited**, a prototype making `fail()` stop jobs the way cancellation does — including the sibling-branch and timeout tests it needs — lives at [`jmchilton:invocation_failure_cancels_jobs`](https://github.com/jmchilton/galaxy/tree/invocation_failure_cancels_jobs). It works; it was not proposed because the behavior above is a policy choice, not a defect.

### Related Defect Found While Prototyping

`cancel_invocation_steps()` sets every unfinished job to `DELETING` unconditionally. A job that never reached a runner has nothing watching it, so it never advances to `DELETED` and strands in `DELETING`. Today this is only reachable as a sub-second race — cancelling within one handler poll of a job being created, with that job's inputs still valid — which is why it has gone unnoticed. The branch above splits the update on `job_runner_name` (NULL goes straight to `DELETED`). Worth a standalone fix independent of the policy question.

---

## Q16: Error Path Tracing Through Nested Subworkflows

### Answer: Mechanism Exists via `workflow_step_index_path`

Galaxy DOES build error paths through nesting. At `run.py:288-296`, when a `FailWorkflowEvaluation` is caught and the current step is a subworkflow, the step's `order_index` is appended to `workflow_step_index_path` in the error message.

**Schema support:** `InvocationMessageBase` (schema/invocation.py:121-124) has `workflow_step_index_path: Optional[list[int]]` — a list of step indices from parent through subworkflows.

**DB persistence:** `WorkflowInvocationMessage` (model:10240) stores this as JSON.

**What's NOT tested:** No integration test verifies that `workflow_step_index_path` is correctly populated for deeply nested (3+ level) subworkflows. The mechanism exists in code but lacks test coverage.

### Proposed Test

```yaml
# Three-level nested workflow where innermost step fails
# Parent -> SubworkflowA (step 1) -> SubworkflowB (step 0) -> failing_tool (step 0)
# Expected: invocation message has workflow_step_index_path = [1, 0]
# (path excludes the failing step itself, includes parent steps leading to it)
```

This would be an API test in `test_workflows.py` that:
1. Creates a 3-level nested workflow with a tool that always fails at the innermost level
2. Runs the workflow
3. Checks `invocation["messages"][0]["workflow_step_index_path"]` matches expected path

**Verdict:** Test would add significant value — regression prevention for an untested code path.

---

## Q19: Job Cache Invalidation

### Answer: No Explicit Invalidation — Cache Uses DB Parameter Matching

Cache lookup lives in `managers/jobs.py:450-647` (`JobSearch.by_tool_input()` and `__search()`).

**What's compared for a cache hit:**
1. Tool ID + version (exact)
2. User ID
3. Job state (default: OK)
4. Input dataset IDs and source types
5. All non-ignored tool parameters (JSON-serialized, sorted keys, byte-for-byte comparison)

**Ignored parameters** (don't affect cache):
- `__use_cached_job__`, `__workflow_invocation_uuid__`, `__when_value__`
- `__input_ext`, `chromInfo`, `dbkey`
- Parameters ending in `|__identifier__`

**How cache reuse works:** Galaxy creates a NEW job with `copied_from_job_id` pointing to the original. Output datasets reference the same underlying `dataset` object — no re-execution.

**Can entries be invalidated?** No. Cache entries are immutable DB job records. Deleting outputs, deleting jobs, or marking datasets as deleted won't prevent reuse. The ONLY way to get a cache miss is to change an input parameter or dataset.

### Proposed Test

A `test_cache_miss_on_parameter_change` test would:
1. Run workflow with param=A, `use_cached_job=True` → first run
2. Run again with same param=A → cache hit (verify `copied_from_job_id`)
3. Run again with param=B → cache miss (verify no `copied_from_job_id`)

**Verdict:** Moderate value — documents the exact invalidation boundary.

---

## Q20: Runtime Parameter Substitution Through Two Nesting Levels

### Proposed Test

**File:** `runtime_parameters_nested_two_levels.gxwf.yml`

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

**File:** `runtime_parameters_nested_two_levels.gxwf-tests.yml`

```yaml
- doc: |
    Test that runtime text parameters are correctly substituted through two
    levels of nested subworkflows. Parent passes "my_custom_name" through
    level1 -> level2 where it's used in PJA RenameDatasetAction.
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

**What it proves:** Text parameters defined at parent level flow through two subworkflow boundaries and are correctly substituted in output rename actions at the deepest level.

---

## Q12: format_source Behavior

### Answer: Silent Override, No Validation

`format_source` resolution lives in `tools/actions/__init__.py:1246-1357` (`determine_output_format()`).

**How it works:**
1. Start with declared `format` attribute (e.g. "data", "fasta")
2. If `format_source` is set, look up the referenced input dataset
3. Extract the source dataset's extension via `get_ext_or_implicit_ext()` (respects implicit conversions)
4. **Silently override** the declared format with the source's extension
5. If lookup fails (bad reference), silently retain the declared format (try/except pass)

**Key behaviors:**
- `format_source` ALWAYS overrides `format` when lookup succeeds — no compatibility check
- `get_ext_or_implicit_ext()` returns the implicit parent type if the dataset was implicitly converted
- Failure is silent — no error, no warning, just falls back to declared format
- Late evaluation path (`evaluation.py:349-365`) handles expression.json outputs separately

**Conflict example:** Output declares `format="fasta"` + `format_source="input1"` where input1 is tabular → output becomes tabular. No validation, no error.

### Proposed Test

```yaml
# Workflow where format_source input has a different format than declared output
# Tool output declares format="txt" but format_source="input1"
# Input1 is a .bed file
# Expected: output has format "bed" (format_source wins silently)
```

**Verdict:** Test would document the silent override contract. Moderate value — mostly confirms existing behavior rather than testing an edge case.

---

## Summary: Test Priorities

| Question | Finding | Test Value | Priority |
|---|---|---|---|
| Q13 | In-flight jobs keep running on failure/timeout (intentional) | Low (timing-fragile) | Documented as known behavior |
| Q16 | workflow_step_index_path exists but untested for deep nesting | **High** (regression prevention) | Write test |
| Q19 | DB-based cache, no invalidation possible | Moderate (documents boundary) | Write test |
| Q20 | Two-level PJA substitution untested | **High** (extends existing coverage) | Write test |
| Q12 | format_source silently overrides, no validation | Moderate (confirms contract) | Write test |
