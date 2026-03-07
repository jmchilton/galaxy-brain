# Review: WORKFLOW_OUTPUT_STEP_ORDER.md

## Theory Assessment: WRONG root cause, RIGHT diagnosis

The plan correctly identifies that `order_index` is non-deterministic and that the `to_dict()` sort doesn't help. But the **PYTHONHASHSEED / schema-salad hash theory is wrong**. The actual cause is far simpler.

### Root cause: `random.shuffle(self.steps)` in cwltool

Line 108 of `cwltool/workflow.py`:

```python
random.shuffle(self.steps)
```

cwltool **intentionally shuffles** its `WorkflowStep` list after construction — specifically to surface ordering-dependent bugs in workflow engines. This is exactly the kind of bug it's designed to catch.

- `self._workflow.steps` is `list[WorkflowStep]` — shuffled every load
- `self._workflow.tool["steps"]` is the raw CWL document dict — **never shuffled**, retains document order
- Galaxy's `step_proxies()` iterates `self._workflow.steps` (the shuffled one)
- With 2 steps, `random.shuffle` has exactly 2 permutations → **50% pass rate**

### Plan accuracy

| Claim | Correct? |
|-------|----------|
| `order_index` is wrong sort key | ✓ |
| Galaxy doesn't store outputSource position | ✓ |
| Non-determinism is in cwltool step ordering | ✓ |
| Caused by PYTHONHASHSEED / set usage | ✗ — it's `random.shuffle` |
| Code path trace (to_dict → Pydantic → JSON) | ✓ |
| Fix option 1 (source_index on WorkflowOutput) | Overkill — requires DB migration |
| Fix option 2 (force order_index consistency) | Fragile |

### Better fix: Option 3 — sort at Galaxy's boundary

Single-line fix in `WorkflowProxy.step_proxies()` (`parser.py:769`):

```python
# Before (uses shuffled order):
for i, step in enumerate(self._workflow.steps):

# After (deterministic by CWL step ID):
for i, step in enumerate(sorted(self._workflow.steps, key=lambda s: s.tool["id"])):
```

This neutralizes cwltool's shuffle at Galaxy's import boundary. Zero database changes. All downstream index assignments become deterministic.

### Remaining concern with Option 3

Sorting by `step.tool["id"]` gives alphabetical order, which may NOT match `outputSource` array order if someone writes:

```yaml
steps:
  zebra_step: ...
  alpha_step: ...
outputs:
  out:
    outputSource: [zebra_step/out, alpha_step/out]
```

Alphabetical sort would put alpha first, but `outputSource` says zebra first. However, this is still better than random order, and for the specific conformance test (step1/step2), alphabetical matches document order.

For full correctness, Galaxy would still need to sort the multi-output list by `outputSource` array position in `to_dict()`. But stabilizing step import order fixes the immediate 50% flakiness.

### Key insight: `self._workflow.tool` is stable

`get_outputs_for_label()` iterates `self._workflow.tool["outputs"]` — the raw CWL document, NOT the shuffled steps. So the outputSource array IS available at import time in document order. A fully correct fix could use this to assign a `source_index`.

## Prioritized Next Steps

1. **Verify** — Add `log.warning(f"CWL step {i}: {step.id}")` in `step_proxies()`, run test 5x, confirm step order varies
2. **Quick fix** — Sort `self._workflow.steps` by `step.tool["id"]` in `step_proxies()` (or better: once at `WorkflowProxy.__init__`)
3. **Audit** — Grep for all `self._workflow.steps` references in parser.py; the `runnables` property (line 775) also iterates it unsorted
4. **Validate** — Run test 20+ times post-fix
5. **Consider full fix** — Store outputSource array position during import so `to_dict()` can sort by it (only needed if alphabetical != document order matters)

## Risks

- Sorting by `step.tool["id"]` may not match document order for all CWL workflows (alphabetical vs YAML order)
- Other uses of `self._workflow.steps` (e.g., `runnables` property) may also need sorting
- UUID generation per step_proxy means step UUIDs differ per run regardless — probably fine since CWL tools match by content
