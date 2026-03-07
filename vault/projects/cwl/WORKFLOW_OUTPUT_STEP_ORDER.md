# CWL MultipleInputFeatureRequirement: Non-deterministic Output Ordering

## Test

`test_conformance_v1_2_multiple_input_feature_requirement` — passes ~50% of the time.

Workflow has two independent steps (step1→"hello", step2→"world") with `outputSource: [step1/out, step2/out]`. Expected: `["hello\n", "world\n"]`.

## Previous Fix (1e391768c7)

Sorted `WorkflowInvocation.to_dict()` output associations by `workflow_output.workflow_step.order_index`. This sorts by Galaxy's internal step ordering — not by the CWL `outputSource` array position.

## What the fix does correctly

The sort is on the right code path:
- Outputs ARE HDAs going through `output_datasets`
- Pydantic serialization preserves list order
- Test framework correctly reads the API response
- `invocation_to_output()` preserves list order from the API

Full chain: `to_dict()` → `WorkflowInvocationResponse` Pydantic model → JSON → `invocation_response.json()` → `invocation_to_output()` → `get_output_as_object()` → `cwltest.compare.compare()`.

## The problem: `order_index` is the wrong sort key

The sort key `workflow_output.workflow_step.order_index` represents the step's position in Galaxy's topological sort, derived from the order cwltool returns the steps. The CWL spec says the `outputSource` ARRAY order defines the result array order — `[step1/out, step2/out]` means step1's output MUST be first.

Galaxy doesn't store the `outputSource` array position anywhere. It only stores which step each WorkflowOutput belongs to. The sort by `order_index` only works if step definition order matches `outputSource` array order — a coincidence, not a guarantee.

## Root Cause: cwltool intentionally shuffles steps

`cwltool/workflow.py:108`:

```python
random.shuffle(self.steps)
```

cwltool **intentionally randomizes** its `WorkflowStep` list after construction — specifically to surface ordering-dependent bugs in workflow engines. This is exactly the kind of bug it's designed to catch.

Key distinction:
- `self._workflow.steps` → `list[WorkflowStep]` — **shuffled every load**
- `self._workflow.tool["steps"]` → raw CWL document dict — **never shuffled**, retains document order

Galaxy's `step_proxies()` iterates `self._workflow.steps` (the shuffled one):

```python
for i, step in enumerate(self._workflow.steps):
    proxies.append(build_step_proxy(self, step, i + num_input_steps))
```

With 2 steps, `random.shuffle` has exactly 2 permutations:
- Run A: shuffle gives `[step1, step2]` → `order_index` step1=0, step2=1 → sort gives `[hello, world]` → **PASS**
- Run B: shuffle gives `[step2, step1]` → `order_index` step2=0, step1=1 → sort gives `[world, hello]` → **FAIL**

Each test run starts a new Galaxy server process → ~50% pass rate.

## How to verify

Add a `log.warning` in `WorkflowProxy.step_proxies()` to log the step IDs in iteration order:

```python
def step_proxies(self):
    if self._step_proxies is None:
        proxies = []
        num_input_steps = len(self._workflow.tool["inputs"])
        for i, step in enumerate(self._workflow.steps):
            log.warning(f"CWL step {i}: {step.id}")  # <-- add this
            proxies.append(build_step_proxy(self, step, i + num_input_steps))
        self._step_proxies = proxies
    return self._step_proxies
```

Run the test several times. If step1 and step2 swap positions between runs, this confirms the theory.

## Fix Options

### Option 1: Sort steps at Galaxy's import boundary (quick fix, no migration)

Sort `self._workflow.steps` by a deterministic key in `step_proxies()`:

```python
for i, step in enumerate(sorted(self._workflow.steps, key=lambda s: s.tool["id"])):
```

Or better, sort once at `WorkflowProxy.__init__` and store as `self._sorted_steps`.

**Pros**: Single-line fix, zero DB changes, neutralizes cwltool's shuffle.
**Cons**: Alphabetical by step ID may not match `outputSource` array order if step names don't sort in document order. For the specific conformance test (step1/step2), alphabetical == document order.

### Option 2: Store `source_index` on WorkflowOutput (full fix, needs migration)

Add a `source_index` column to the `workflow_output` table during CWL import, capturing each output's position in the `outputSource` array. Sort by `source_index` in `to_dict()`.

**Pros**: Fully correct per CWL spec regardless of step naming.
**Cons**: Requires Alembic migration, heavier change.

### Option 3: Sort multi-output list by `outputSource` position at `to_dict()` time

Reconstruct the `outputSource` order at serialization time. This is fragile because `to_dict()` doesn't have access to the CWL workflow definition.

**Not recommended.**

### Recommendation

Start with Option 1. It fixes the immediate 50% flakiness with minimal risk. If a CWL workflow is later found where alphabetical step ID order doesn't match `outputSource` order, upgrade to Option 2.

Also audit other uses of `self._workflow.steps` — the `runnables` property (`parser.py:775`) also iterates it unsorted.

## Key code locations

| Location | Role |
|----------|------|
| `cwltool/workflow.py:108` | `random.shuffle(self.steps)` — the root cause |
| `lib/galaxy/tool_util/cwl/parser.py:765` | `step_proxies()` — iterates shuffled cwltool steps |
| `lib/galaxy/tool_util/cwl/parser.py:831` | `WorkflowProxy.to_dict()` — builds Galaxy step dicts from CWL |
| `lib/galaxy/tool_util/cwl/parser.py:734` | `get_outputs_for_label()` — iterates `tool["outputs"]` (stable, not shuffled) |
| `lib/galaxy/model/__init__.py:9876` | `to_dict()` sort of `output_datasets` by `order_index` |
| `lib/galaxy/model/__init__.py:9637` | `add_output()` dispatches to `output_datasets` / `output_values` / `output_collections` |
| `lib/galaxy/workflow/steps.py:15` | `attach_ordered_steps()` — topsort + order_index assignment |
| `lib/galaxy/tool_util/cwl/util.py:661` | `invocation_to_output()` — extracts outputs from API response |
| `lib/galaxy_test/base/populators.py:400` | `CwlRun.get_output_as_object()` — converts to CWL JSON for comparison |
