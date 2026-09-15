# Plan: Store `source_index` on WorkflowOutput for CWL outputSource Ordering

## Problem

CWL `outputSource` arrays define output order: `[step1/out, step2/out]` means step1's
output MUST come first. Galaxy doesn't store this position. It sorts by
`workflow_output.workflow_step.order_index`, which is derived from cwltool's
**intentionally shuffled** step list (`random.shuffle(self.steps)`). Result: 50% flaky
test for `multiple_input_feature_requirement`.

See `WORKFLOW_OUTPUT_STEP_ORDER.md` for full root cause analysis.

## Approach

Add a nullable `source_index` integer column to `workflow_output`. During CWL import,
populate it with each output's position in the `outputSource` array. In
`WorkflowInvocation.to_dict()`, sort by `source_index` (falling back to `order_index`
when `source_index` is NULL, i.e. for Galaxy native workflows).

## Changes

### 1. Alembic migration: add `source_index` column

New file: `lib/galaxy/model/migrations/alembic/versions_gxy/<hash>_add_source_index_to_workflow_output.py`

```python
"""Add source_index to workflow_output

Revision ID: <generated>
Revises: <pick any current head>
Create Date: <generated>
"""

import sqlalchemy as sa

from galaxy.model.migrations.util import (
    add_column,
    drop_column,
)

revision = "<generated>"
down_revision = "<pick head>"
branch_labels = None
depends_on = None

table_name = "workflow_output"
column_name = "source_index"


def upgrade():
    add_column(table_name, sa.Column(column_name, sa.Integer, nullable=True))


def downgrade():
    drop_column(table_name, column_name)
```

Uses `import sqlalchemy as sa` style consistent with 2025+ Galaxy migrations (e.g.
`71eeb8d91f92_workflow_readme.py`). Nullable so existing rows (all Galaxy native
workflows) are unaffected.

### 2. Model: add column + update constructor/copy/serialize

**File:** `lib/galaxy/model/__init__.py`

#### WorkflowOutput class (~line 9174)

Add mapped column:

```python
class WorkflowOutput(Base, Serializable):
    ...
    uuid: Mapped[Optional[Union[UUID, str]]] = mapped_column(UUIDType)
    source_index: Mapped[Optional[int]] = mapped_column(Integer, default=None)  # NEW
```

Update `__init__`:

```python
def __init__(self, workflow_step, output_name=None, label=None, uuid=None, source_index=None):
    ...
    self.source_index = source_index
```

Update `copy`:

```python
def copy(self, copied_step):
    copied_output = WorkflowOutput(copied_step)
    copied_output.output_name = self.output_name
    copied_output.label = self.label
    copied_output.source_index = self.source_index  # NEW
    return copied_output
```

Update `_serialize` (only include `source_index` when non-NULL, matching export pattern):

```python
def _serialize(self, id_encoder, serialization_options):
    rval = dict_for(
        self,
        output_name=self.output_name,
        label=self.label,
        uuid=str(self.uuid),
    )
    if self.source_index is not None:
        rval["source_index"] = self.source_index  # NEW
    return rval
```

#### WorkflowStep.create_or_update_workflow_output (~line 8963)

Add `source_index` parameter:

```python
def create_or_update_workflow_output(self, output_name, label, uuid, source_index=None):
    output = self.workflow_output_for(output_name)
    if output is None:
        output = WorkflowOutput(workflow_step=self, output_name=output_name)
    if uuid is not None:
        output.uuid = uuid
    if label is not None:
        output.label = label
    if source_index is not None:
        output.source_index = source_index  # NEW
    return output
```

#### WorkflowInvocation.to_dict() sort key (~line 9876)

Replace all three `sorted()` calls with a sort key that uses `source_index` when
available, falling back to `order_index`:

```python
def _output_sort_key(assoc):
    wo = assoc.workflow_output
    si = wo.source_index
    oi = wo.workflow_step.order_index
    # source_index takes priority when set (CWL workflows).
    # Use order_index as tiebreaker / fallback for Galaxy native.
    return (si if si is not None else float('inf'), oi)
```

Apply to all three loops (all association types have `assoc.workflow_output` with both
`source_index` and `workflow_step.order_index`, so one function suffices):

```python
# Line 9876 — datasets
for output_assoc in sorted(self.output_datasets, key=_output_sort_key):

# Line 9898 — collections
for output_assoc in sorted(self.output_dataset_collections, key=_output_sort_key):

# Line 9923 — values
for output_param in sorted(self.output_values, key=_output_sort_key):
```

When `source_index` is NULL (Galaxy native workflows), all outputs get `(inf, order_index)`
and sort falls back to `order_index` — identical to current behavior. No regression.

### 3. CWL parser: emit `source_index` in workflow_outputs dicts

**File:** `lib/galaxy/tool_util/cwl/parser.py`

#### WorkflowProxy.get_outputs_for_label() (~line 734)

The current code iterates `self._workflow.tool["outputs"]` and for each output iterates
its `split_references`. The position within the `outputSource` array is the `source_index`.

But there's a subtlety: CWL allows **multiple workflow-level outputs**, each with their
own `outputSource` (which may itself be an array). The `source_index` is the position
**within a single `outputSource` array** for a given workflow output.

Since Galaxy aggregates outputs by label (in `to_dict()`), we need a **global** source
index — the position across all references that share the same workflow output label.

Approach: build a global output position map first, then use it when emitting per-step
workflow_outputs.

```python
def get_outputs_for_label(self, label):
    outputs = []
    for output in self._workflow.tool["outputs"]:
        split_references = split_step_references(
            output["outputSource"],
            multiple=True,
            workflow_id=self.cwl_id,
        )
        for ref_index, (step, output_name) in enumerate(split_references):
            if step == label:
                output_id = output["id"]
                if "#" not in self.cwl_id:
                    _, output_label = output_id.rsplit("#", 1)
                else:
                    _, output_label = output_id.rsplit("/", 1)

                outputs.append(
                    {
                        "output_name": output_name,
                        "label": output_label,
                        "source_index": ref_index,  # NEW
                    }
                )
    return outputs
```

`ref_index` is the position of this step's output within the `outputSource` array of that
CWL workflow output. For `outputSource: [step1/out, step2/out]`:
- step1's output gets `source_index=0`
- step2's output gets `source_index=1`

This is the correct CWL-spec ordering.

### 4. Workflow import: pass `source_index` through

**File:** `lib/galaxy/managers/workflows.py` (~line 2017)

In the loop that creates WorkflowOutput objects from `step_dict["workflow_outputs"]`:

```python
for workflow_output in workflow_outputs:
    if not isinstance(workflow_output, dict):
        workflow_output = {"output_name": workflow_output}
    output_name = workflow_output["output_name"]
    ...
    uuid = workflow_output.get("uuid", None)
    label = workflow_output.get("label", None)
    source_index = workflow_output.get("source_index", None)  # NEW
    m = step.create_or_update_workflow_output(
        output_name=output_name,
        uuid=uuid,
        label=label,
        source_index=source_index,  # NEW
    )
```

### 5. Workflow export: include `source_index` in dict

**File:** `lib/galaxy/managers/workflows.py` (~line 1722)

```python
for workflow_output in step.unique_workflow_outputs:
    workflow_output_dict = dict(
        output_name=workflow_output.output_name,
        label=workflow_output.label,
        uuid=str(workflow_output.uuid) if workflow_output.uuid is not None else None,
    )
    if workflow_output.source_index is not None:  # NEW
        workflow_output_dict["source_index"] = workflow_output.source_index
    workflow_outputs_dicts.append(workflow_output_dict)
```

Only include when non-NULL so Galaxy native workflow exports are unchanged.

## Testing

### Red-to-green: the flaky conformance test

The test `test_conformance_v1_2_multiple_input_feature_requirement` currently passes ~50%.
After this fix it should pass deterministically.

To verify red first: run the test ~10 times and confirm at least one failure.

```bash
for i in $(seq 1 10); do
  pytest -x -s lib/galaxy_test/api/cwl/test_cwl_conformance_v1_2.py \
    -k multiple_input_feature_requirement 2>&1 | tail -1
done
```

After the fix: same loop should show 10/10 passes.

### Unit test: source_index round-trip

Add a unit test that:
1. Creates a WorkflowOutput with `source_index=1`
2. Serializes via `_serialize()`
3. Asserts `source_index` is present in output
4. Creates via `create_or_update_workflow_output(source_index=1)`
5. Asserts the value is stored

### Integration test: CWL import preserves source_index

Add a test that:
1. Imports the `multiple_input_feature_requirement.cwl` workflow
2. Inspects the stored WorkflowOutput objects
3. Asserts step1's output has `source_index=0` and step2's has `source_index=1`

## Implementation order

1. Create alembic migration
2. **Commit 1: migration only** (Galaxy convention — migrations in own commit)
3. Add `source_index` column to `WorkflowOutput` model + update `__init__`, `copy`,
   `_serialize`
4. Update `WorkflowStep.create_or_update_workflow_output` to accept `source_index`
5. Update `WorkflowProxy.get_outputs_for_label()` to emit `source_index`
6. Update workflow import in `workflows.py` to pass `source_index` through
7. Update workflow export in `workflows.py` to include `source_index`
8. Update `WorkflowInvocation.to_dict()` sort keys
9. Run conformance test in a loop to verify deterministic pass
10. **Commit 2: model + parser + import/export + sort key changes**

## Files touched

| File | Change |
|------|--------|
| `lib/galaxy/model/migrations/alembic/versions_gxy/<new>.py` | New migration |
| `lib/galaxy/model/__init__.py` | `WorkflowOutput` column + `to_dict()` sort |
| `lib/galaxy/tool_util/cwl/parser.py` | `get_outputs_for_label()` emits `source_index` |
| `lib/galaxy/managers/workflows.py` | Import + export pass `source_index` through |

## Resolved questions

- **Sort `step_proxies()` deterministically too (Option 1)?** No. `source_index` is the
  spec-correct fix. Option 1 only works when step IDs happen to sort in document order.
- **Other consumers of WorkflowOutput ordering?** Audited — only `to_dict()` is
  ordering-sensitive. `invocation_to_output()` in `cwl/util.py` reads from the API
  response dict produced by `to_dict()`, so it's covered. Five other locations
  (workflow modules, tools/execute, model store, RO-Crate, WES) build dicts keyed by
  name with no ordering sensitivity.
- **`source_index` in Pydantic schema?** No. The schema (`InvocationOutput` in
  `lib/galaxy/schema/invocation.py`) only exposes `id`, `src`, `workflow_step_id`.
  `WorkflowOutput` is never serialized to the API — ordering is baked into the list/dict
  structure by the time it hits the schema. `source_index` is purely an internal DB
  column controlling sort order.
