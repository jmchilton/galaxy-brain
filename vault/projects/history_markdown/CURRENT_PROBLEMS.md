# Current Problems — `workflow_state_backfill`

Running ledger of problems uncovered while reviewing the branch. Each
entry: what's broken, why, where, what to do.

---

## 1. `UNIQUE(tool_execution_state_id)` on `job` rejects batch tool requests

**Status:** regression, not yet released. Introduced by
`1f87eebce3 Replace TRICA with TES-keyed TEICA; tighten TES back-pops to scalar`
(migration `10c4cd393d5a`).

### Symptom

A tool request whose request input expands to N>1 param combinations
without a collection map-over (i.e., a Batch over plain HDAs) fails on
the second Job insert with a UNIQUE constraint violation on
`job.tool_execution_state_id`. The first Job stamps the TR's TES; the
second Job tries to stamp the same TES and is rejected.

The shape that triggers it (example request body):

```json
{
  "inputs": {
    "input_file": {
      "__class__": "Batch",
      "values": [{"src": "hda", "id": 1}, {"src": "hda", "id": 2}]
    }
  }
}
```

Two Jobs, one TR, one TES → second insert violates the UNIQUE.

### Root cause

The commit tightened all four TES back-pops from list to scalar:

- `TES.tool_request`
- `TES.job`              ← the wrong one
- `TES.workflow_invocation_step`
- `TES.implicit_collection_jobs`

…and added partial-`UNIQUE(tool_execution_state_id)` on each peer
table (`lib/galaxy/model/migrations/alembic/versions_gxy/10c4cd393d5a_drop_trica_and_tighten_tes_backpops.py:46-51`,
`:89`).

Three of the four are sound — `ToolRequest`, `WorkflowInvocationStep`,
and `ImplicitCollectionJobs` are 1:1 with TES by writer construction:

- TR mints exactly one TES at request-creation time
  (`services/jobs.py:268-276`).
- WIS mints exactly one TES at step scheduling time
  (`workflow/modules.py:3071-3076`).
- ICJ is stamped with the parent execution's TES once at create time
  (`tools/execute.py:648`).

`Job` is loose. The stamp at `tools/execute.py:261-262` runs once per
param combination inside `_execute`:

```python
if tool_execution_state is not None and execution_tracker.collection_info is None:
    job.tool_execution_state = tool_execution_state
```

The same `tool_execution_state` instance is reused for every iteration.
For a batch TR with `collection_info is None` and
`len(execution_tracker.param_combinations) > 1`, all N Jobs stamp the
same TES row, and the UNIQUE rejects the 2nd…Nth.

### Why the framing slipped

The commit message ("tighten TES back-pops to scalar") encoded the
WIS-side invariant — one WIS = one step execution event = at most one
materialized Job XOR one ICJ. That framing is correct for the constrained
scheduling surface (WIS), but TR is the looser scheduling surface and
inherits Job's 1:N cardinality through TES. The constraint walked an
asymmetric invariant onto a symmetric column.

See `EFFECTIVE_STEP_STATE.md` for the deeper framing: TR and WIS sit at
different granularities of "an execution," and the schema needs to
honor both.

### Reachability of the broken case

Confirmed reachable on the async TR path:

- `expand_meta_parameters_async`
  (`lib/galaxy/tools/parameters/meta.py:348-394`) classifies
  `{"__class__": "Batch", "values": [...]}` over HDA refs as MATCHED or
  MULTIPLIED — same as collection map-over — but only adds to
  `collections_to_match` when the batch value wraps an HDCA/DCE source
  (`__collection_multirun_parameter`). Plain-HDA Batch produces N
  param combinations with `collection_info = None`.
- `services/jobs.py::queue_jobs` ingests this shape unchanged
  (`tool_request_payload(tool_request)` → `RequestInternalToolState`).
- `_execute` then loops `execute_single_job` N times, stamping all N
  Jobs with the same TES at the gated stamp site.

This is a long-standing tool-input pattern (multi-file submission
without HDCA wrapping), not a hypothetical.

### Affected readers — quick survey

- **History Graph (`managers/history_graph.py:474-498`):** safe today.
  Collapses by `source_id` per item, so N Jobs sharing one TES render
  as one producer node feeding N outputs. The current scalar back-pop
  blocks the data shape from existing, but the reader is already
  correct for the loose-cardinality world.
- **Extraction (`workflow/extract.py:760-783`, `job_ids` path):**
  does not dedup work_items by TES.id. N batch Jobs submitted to
  extract would produce N duplicate WorkflowStep rows. This is a
  separate bug (independent of the UNIQUE) but in the same family.
- **Extraction (`workflow/extract.py:838-841`, `tool_request_ids`
  path):** correct — one TR → one work_item, payload sourced from
  TES.request (the original batched input_state).

### Recommended fix

1. **Revert the Job UNIQUE.** Drop
   `uq_job_tool_execution_state_id` from migration
   `10c4cd393d5a`. Keep the other three UNIQUEs — TR/WIS/ICJ remain
   genuinely 1:1.
2. **Flip `TES.job` back to `list["Job"]`** (`model/__init__.py:1485`)
   with `uselist` defaulted and `back_populates="tool_execution_state"`.
   `Job.tool_execution_state` stays scalar.
3. **Update docs to reflect "TES↔Job is 1:N for batch TRs."** The
   BOOKKEEPING_MODELS and MODELS_VISUAL_TOUR notice lists currently
   say the four back-pops are scalar; that's now true for three of
   four.
4. **Fold the `job_ids` extract dedup** into the same PR or as an
   immediate follow-up: collapse adjacent work_items sharing
   `(tier, source_id)` after the sort at
   `workflow/extract.py:850`. Tests should cover the batch-of-N
   extraction shape.

### Open question

Does any production install already carry data that depended on the
UNIQUE? Since `10c4cd393d5a` is on this unreleased branch, no — but
verify before merging the revert that no fixture or test relies on
the constraint being there.
