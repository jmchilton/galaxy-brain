# pick_value: Dismissed Alternatives

These alternatives were considered and rejected in favor of a `PickValueModule` workflow module. See [PROBLEM_AND_GOAL.md](./PROBLEM_AND_GOAL.md) for the chosen approach.

## 1. Synthetic pick_value tool insertion at CWL import time

During CWL import, inject a real `pick_value` expression tool step wired to the source steps.

**Why dismissed:**
- The existing `pick_value` tool (bundled at `tools/expression_tools/pick_value.xml`) cannot return arrays — it always produces a scalar. `all_non_null` mode is impossible without extending or replacing the tool.
- Expression tools cannot produce output collections (`ExpressionTool.parse_outputs()` enforces this). `File[]` results from `all_non_null` need HDCAs.
- Mapping CWL pickValue semantics to tool parameters is fragile — requires constructing `tool_state` with `__current_case__` indices, repeat entries, and conditional parameter nesting.
- Tool must be loaded at import time. Dependency on tool availability adds a failure mode.
- CWL-only — doesn't benefit Galaxy-native workflows at all.
- Pattern B (scatter + pickValue) doesn't fit the tool model — it's not a multi-source problem, it's a collection-filtering problem.

## 2. Native database support: `pick_value` column on `WorkflowOutput` + runtime post-processing

Add a `pick_value` column to the `workflow_output` table. For multi-source CWL outputs, create multiple `WorkflowOutput` objects with the same label on different steps. At execution end, post-process outputs by label, applying pickValue logic.

**Why dismissed:**
- Duplicate labels on `WorkflowOutput` violates Galaxy conventions. The workflow editor flags duplicate labels as warnings (`output_label_duplicate` in `_workflow_to_dict_editor()`). Suppressing warnings for pick_value adds special-case logic.
- `WorkflowInvocation.add_output()` has no dedup — recording per-step AND aggregated outputs creates duplicates unless recording is deferred (Option B), which adds lifecycle complexity to `invoke()`.
- Requires a database migration for a column that's only meaningful for CWL workflows.
- Runtime post-processing in `invoke()` (after all steps scheduled, before setting SCHEDULED state) is fragile — must handle delayed steps, re-invocations, and the READY→SCHEDULED state transition.
- Doesn't benefit Galaxy-native workflows — no editor UI, no way for users to set `pick_value` on outputs.

## 3. New `WorkflowOutputSource` join table

Keep one `WorkflowOutput` per label. Add a `workflow_output_source` table linking a single output to multiple (step, output_name) pairs. Runtime iterates sources.

**Why dismissed:**
- Adds a new table + model class + relationships for a feature that can be expressed as a workflow step.
- Still requires runtime post-processing (same lifecycle complexity as alternative 2).
- Import/export/copy must all handle the new relationship.
- More relational modeling for something that's conceptually a computation node, not a data relationship.
- Galaxy already has the module/step abstraction for workflow-level computation. A pick_value module is the idiomatic Galaxy approach.
