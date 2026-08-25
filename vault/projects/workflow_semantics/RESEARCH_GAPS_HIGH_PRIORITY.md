# Research Gaps: High Priority Findings

Deep code analysis of three previously open questions: job failure propagation (Q1), pause step dependencies (Q2), and scheduling iteration state persistence (Q14).

---

## Q1: Job Failure Propagation to Downstream Steps

### Answer

Two distinct failure paths exist depending on connection type:

**Path 1: Non-data connections (parameters)**
- `__check_implicitly_dependent_step()` at `run.py:333-362`
- Checks `job.state` BEFORE step inputs are evaluated
- If `job.state != job.states.OK` → `FailWorkflowEvaluation` with `InvocationFailureJobFailed`
- Entire workflow fails immediately

**Path 2: Data connections only**
- Job state check never runs (implicit dep check only iterates `non_data_connection` inputs at run.py:328-329)
- Downstream step fails later when `replacement_for_connection()` finds dataset in ERROR state
- `FailWorkflowEvaluation` with `InvocationFailureDatasetFailed`

### Key Code Locations

```
run.py:323-332  __check_implicitly_dependent_steps()  — iterates non_data_connection inputs
run.py:333-362  __check_implicitly_dependent_step()    — checks job.state, raises on failure
run.py:557-590  replacement_for_connection()            — checks dataset.is_ok for non-data inputs
```

### Important Nuance

The failure reason differs: `InvocationFailureJobFailed` (non-data path) vs `InvocationFailureDatasetFailed` (data path). Both result in workflow failure, but through different code paths. A step with ONLY data connections to a failed upstream job will fail on dataset state, not job state.

### Test Evidence

`test_workflow_resume_from_failed_step` (test_workflows.py:2560-2611) shows the failure → pause → rerun recovery path. Failed dataset appears with state "error", downstream pause step enters "paused" state.

---

## Q2: Pause Step Implicit Dependencies

### Answer

Pause steps do NOT create implicit dependencies. Unconnected downstream steps run immediately.

### How It Works

1. `__check_implicitly_dependent_steps()` (run.py:323-332) only checks `non_data_connection` inputs
2. Pause steps use DATA connections (dataset in → dataset out), so they're never checked by the implicit dependency system
3. Downstream steps that consume pause output are blocked because `replacement_for_connection()` finds `STEP_OUTPUT_DELAYED` (run.py:515-517) and raises `DelayedWorkflowEvaluation`
4. Steps NOT connected to the pause step run immediately — no implicit waiting

### The TODO Explained

The TODO at `run.py:345` ("Handle implicit dependency on stuff like pause steps") sits inside the job state checking loop. Pause steps have NO jobs, so the loop body never executes. The TODO is about whether pause steps need special job-finished checking, not about adding new implicit ordering dependencies.

### PauseModule Behavior

- `PauseModule.execute()` (modules.py:1915-1920): marks output as delayed, returns None
- `recover_mapping()` (modules.py:1922-1938): handles user action — approve (continue) or reject (cancel)
- Pause steps can exist without downstream connections — they just sit in the workflow

---

## Q14: State Persistence Across Scheduling Iterations

### Answer

Hybrid approach: step outputs are persisted in DB, but WorkflowProgress is rebuilt fresh and runtime state is recomputed.

### What's Persisted in the Database

| Model | What's Stored |
|---|---|
| `WorkflowInvocationStep` (model:10319) | state, action, job_id, implicit_collection_jobs_id |
| `WorkflowRequestStepState` (model:10618) | Tool input runtime state as JSON (`value` field) |
| Step output associations (model:10825, 10844) | Dataset and collection output links |
| `WorkflowRequestToInputDataset` (model:10638, 10667) | Workflow-level data/collection inputs |
| `WorkflowRequestInputStepParameter` (model:10699) | Parameter inputs |

### What's Rebuilt Fresh Each Iteration

1. **WorkflowProgress instance** — created new (run.py:186-198), `self.outputs` dict starts empty
2. **Tool info** — `inject_all()` reloads tool metadata (run.py:441)
3. **Runtime state** — `compute_runtime_state()` recomputes from persisted JSON (run.py:445)
4. **Step state** — `decode_runtime_state()` reconstructs from persisted data (run.py:453)
5. **`param_map`** — raw parameter dictionary from original invocation, not recomputed

### Output Recovery Flow

For already-completed steps (run.py:456-457):
1. Check `invocation_step.state == "scheduled"`
2. Call `_recover_mapping(invocation_step)` → `modules.recover_mapping()` (modules.py:564-576)
3. Read persisted `output_datasets` and `output_dataset_collections` associations
4. Reconstruct `outputs` dict and call `set_step_outputs(already_persisted=True)`

### Key Implication

Parameter evaluations are effectively recomputed each iteration (runtime state decoded fresh from JSON). Step outputs from completed steps are recovered from DB, not re-executed. This means:
- Completed steps: outputs recovered, no re-execution
- Delayed steps: re-evaluated from scratch with recovered upstream outputs
- Expression evaluations: re-run each iteration (could theoretically produce different results if inputs changed, but inputs are persisted)

### Remaining Ambiguity

Are `when_expression` results persisted? The step's invocation state being "scheduled" implies the when check passed, but if a step was delayed before reaching when evaluation, it would be re-evaluated on the next iteration.

---

## Summary: What's Now Resolved

| Question | Status | Key Finding |
|---|---|---|
| Q1 | **Fully answered** | Two failure paths: job state (non-data) vs dataset state (data-only) |
| Q2 | **Fully answered** | No implicit deps; blocking is via STEP_OUTPUT_DELAYED on connected outputs |
| Q14 | **Fully answered** | Hybrid: DB persists outputs/state, Progress rebuilt fresh, runtime recomputed |
