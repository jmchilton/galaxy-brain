# The Unmodeled Tool State: Effective Step State

A white paper on a concept that exists in Galaxy's tool-execution
machinery but isn't named in the
[12-state taxonomy](../../research/Component%20-%20Tool%20State%20Specification.md):
the per-step payload that sits between the user-facing request and
the per-iteration job state. It is the natural unit of a workflow
step, and the source of several inconsistencies in how TR-sourced
and WIS-sourced executions are treated.

---

## Premise

Galaxy formally models 12 tool-state representations, generated from
the same `ToolParameterBundleModel` via `pydantic_template()` per
representation. Two relevant endpoints of the spectrum:

- `request_internal` — what the user submitted, post-decode. Allows
  `{"__class__": "Batch", "values": [...]}` wrappers around both
  collection map-overs and plain HDA batches.
- `job_internal` — what a single Job sees. No Batch wrappers; every
  parameter resolved to a concrete value; required-fields enforced.

Between submission and the N Jobs that run, Galaxy expands the request
into N param combinations. Each param combination is `job_internal`.
The request itself is `request_internal`. There's no name for the
**level above the per-iteration combination but below the whole
request** — the granularity at which a workflow editor would see
"one step."

This paper traces that unnamed level. Where is it materialized? Where
is it merely waved at? Why does it matter?

---

## The cardinality the state needs to express

Take a request with three independently varying axes:

| Axis                | Example                                                                                                                      | Behaviour                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Collection map-over | `{"src": "hdca", "id": 7}` on a `data` input where the collection has 5 elements                                             | One iteration per element → 5 |
| Plain-HDA batch     | `{"__class__": "Batch", "values": [{"src": "hda", "id": 1}, {"src": "hda", "id": 2}, {"src": "hda", "id": 3}]}` (MULTIPLIED) | One iteration per value → 3   |
| Scalar parameter    | `iterations: 100`                                                                                                            | Same for all iterations       |

`expand_meta_parameters_async`
(`lib/galaxy/tools/parameters/meta.py:348-394`) produces the cartesian
product: `3 × 5 = 15` `ToolStateJobInstanceT` entries. Each becomes
one `Job`.

Now ask: how many *workflow steps* should an extraction of these 15
Jobs produce? Not 15 (one per Job — would duplicate). Not 1 (one per
TR — would lose the batch dimension). The right answer is **3**: one
step per non-mapped batch combination, each step embedding the
5-element map-over as a single mapped input.

The concept the user identified is exactly this: **all map-over
parameters together, duplicated per other input that is batched but
not mapped over.** Call it "effective step state."

It is the workflow-step shape of one tool execution event, where
"event" means "a single step worth of work, however many concrete
jobs that produces."

---

## What it is not

It is not any of the 12 modeled states:

- **`request_internal` / `request_internal_dereferenced`:** holds the
  full submission, including the non-mapped batch wrapper. One TR
  has one `request_internal`. It's a strict superset of effective
  step state along the non-mapped-batch axis.
- **`job_internal`:** holds one fully-expanded iteration. 15 Jobs =
  15 `job_internal` payloads. It's a strict subset along both the
  map-over and the non-mapped-batch axis.
- **`workflow_step` / `workflow_step_linked`:** describes a workflow
  *design* (the step as a user authored it), not a step *execution*
  (the step as it actually ran with concrete inputs).

The thing has a different shape than any of these. It looks like
`request_internal` with the non-mapped Batch axis split out, and the
mapped Batch axis collapsed to a single descriptor.

---

## Where it lives in the code today

The concept is *implemented* — it has to be, because workflow-side
TES capture depends on it. But it's never given a name in the state
taxonomy, and only one of the two consumers (workflow execution)
actually materializes it. The TR async path uses
`request_internal` directly.

### 1. `MappedCollectionInput` — the per-input map-over descriptor

`lib/galaxy/tool_util/parameters/convert.py:330-345`

```python
@dataclass
class MappedCollectionInput:
    """Source-neutral description of a collection an input was mapped over."""
    src: str               # "hdca" | "dce"
    id: int
    map_over_type: Optional[str] = None
    linked: bool = True
```

One per mapped input. Replaces the per-iteration sliced collection
element in the effective-step payload. The whole 5-element map-over
collapses to a single `MappedCollectionInput` reference.

The docstring describes it as a "small record" that "keeps the
converter free of SQLAlchemy objects and unit testable" — but its
real role is to encode "this input was map-overed" without enumerating
the slice.

### 2. `from_workflow_execution_state` — the synthesizer

`lib/galaxy/tool_util/parameters/convert.py:348-389`

```python
def from_workflow_execution_state(
    resolved_tool_state: Dict[str, Any],
    mapped_inputs: Dict[str, MappedCollectionInput],
    input_models: ToolParameterBundle,
) -> RequestInternalToolState:
    """Synthesize request_internal from a resolved workflow tool-step execution.

    ``resolved_tool_state`` is the *whole-step* resolved input state -
    every connection already resolved to its concrete upstream
    ``{src, id}`` and scalars to their values - **not** a per-job
    expansion or a representative sliced combination..."""
```

This is the closest thing to a named constructor. Inputs the step
mapped over are replaced with their parent collection reference wrapped
in a length-1 Batch (`linked=True`); every other value passes through
unchanged.

Two telling details:

- **Return type is `RequestInternalToolState`.** The synthesized
  effective step state is *shoehorned into* the request_internal
  representation because no dedicated state class exists. The
  semantics differ — map-over wrappers are 1-element Batch
  placeholders, not the original multi-element selections — but the
  Pydantic model is the same.
- **Length-1 Batch hack.** The comment explains: "wrapped in a
  length-1 Batch (so the forward `to_workflow_step_state` never trips
  its 'exactly one value' guard)." The 1-element wrapper exists
  specifically because `to_workflow_step_state`
  (`convert.py:282-327`) validates that mapped inputs have exactly
  one Batch value. The shape is a workaround for the absence of a
  dedicated state.

### 3. `_capture_workflow_tool_request_state` — the writer

`lib/galaxy/workflow/modules.py:2324-…`

Synthesizes the effective step state for a workflow tool step and
mints a TES from it:

```python
# One row per step execution (the whole map-over, Batch form), never
# per-iteration. Always recorded so the resolver can distinguish
# "we tried, capture didn't validate" from "no capture attempted."
tool_execution_state = ToolExecutionState(
    request=validated_param_template.input_state if validated_param_template is not None else None,
    state=request_state.value,
)
```

(`modules.py:3065-3074`)

The phrase **"the whole map-over, Batch form"** is the canonical
internal name for this concept. It is not used consistently and not
elevated to a type, but it is what the writer is producing.

The synthesized payload is held in `validated_param_template` (see
next).

### 4. `MappingParameters.validated_param_template` — the in-flight slot

`lib/galaxy/tools/execute.py:81-95`

```python
class MappingParameters(NamedTuple):
    param_template: ToolStateJobInstanceT
    param_combinations: list[ToolStateJobInstancePopulatedT]
    validated_param_template: Optional[RequestInternalDereferencedToolState] = None
    validated_param_combinations: Optional[list[JobInternalToolState]] = None
```

The slot that carries the effective step state through `_execute`.
Note the type: `RequestInternalDereferencedToolState` — the same
borrowed clothes as in `from_workflow_execution_state`.

Two parallel slots:

- `validated_param_template` — the effective step state (one value,
  whole-step).
- `validated_param_combinations` — one `JobInternalToolState` per
  iteration (per-Job state).

`param_template`/`param_combinations` carry the legacy
(non-Pydantic-validated) shapes alongside. Four parallel
representations of the same payload, two of which are
post-`pydantic_template()`-validated. None of the four is the
"effective step state" by name.

### 5. `WIS.tool_execution_state.request` — the only intentional persistent home

The TES row minted at `modules.py:3071` is the only place an
effective step state is *intentionally* stored in the database. Its
`request` column is typed `JSONType`, with no Pydantic-level
discriminator from a plain `request_internal`.

A TR-side TES.request also carries the information that would let a
reader reconstruct the effective step state — it holds the
cartesian-product seed, and the splitting rule (one slice per
non-mapped Batch combination, mapped collections collapsed) is
deterministic. But no writer treats the TR-side TES as carrying
effective step state, and no reader splits it that way. The
information is latent on the TR side, materialized only on the WIS
side.

So the concept exists in the database, but only on one of the two
scheduling surfaces (WIS), and only as a JSON blob in a column that
nominally holds a different state representation.

---

## Where it is waved at but not materialized

### Resolver hides the granularity mismatch from consumers

`managers/workflow_request_state.py:103-122` (`_resolved_from_tes`)
returns a `ResolvedStructuredRequest` carrying `state`, `source_id`,
and `payload`. Only `state == VALIDATED` populates `payload`; other
states return `source_id` (when a TES exists) with `payload=None`.
Consumers (History Graph, extract) filter on
`state == VALIDATED` before reading the payload
(`history_graph.py:477-478`, `extract.py:763-783`). The resolver also
walks a three-step fallback hierarchy for Jobs
(`workflow_request_state.py:68-92`): Job-under-ICJ → Job.tool_execution_state → Job.workflow_invocation_step.tool_execution_state. This lets a Job recover the
WIS-side TES even when the workflow-step capture didn't validate
(staying orderable by TES.id rather than dropping to legacy Job.id).

Consumers therefore never see "TR-side TES vs WIS-side TES" as
distinct things — both surface as a `source_id` they can sort and
compare. The granularity asymmetry described above is invisible at
the resolver seam, which is part of why it took this long to name.

### TR async path — passes `request_internal` through unchanged

`services/jobs.py::create` mints a TES whose `request` column holds
the user's original `request_internal_state.input_state`
(`services/jobs.py:268-276`):

```python
tool_execution_state = ToolExecutionState(
    request=request_internal_state.input_state,
    state=ToolExecutionStateValidity.VALIDATED,
)
```

That payload retains the full `{"__class__": "Batch", "values": [...]}`
wrapper for *both* map-over and non-mapped-batch axes. No splitting on
non-mapped batches. No collapse of mapped collections to descriptors.

Functionally: a TR-side TES holds the cartesian-product seed; a
WIS-side TES holds one slice of it. They are the same column with
two different semantics, and consumers (extract, History Graph) are
expected to figure out which they have by looking at the payload
contents.

### Extraction — pretends the level doesn't exist

`workflow/extract.py:838-841` (`tool_request_ids` path):

```python
for tool_request_id in tool_request_ids:
    tool_request = sa_session.get(ToolRequest, tool_request_id)
    work_items.append(_tool_request_work_item(trans, tool_request))
```

One work_item per TR. The work_item's `request_payload` is
`tool_request_payload(tool_request)` — the TR-side TES payload, which
is the cartesian-product seed. The extracted WorkflowStep gets that
payload as its `tool_inputs`. The non-mapped batch dimension is
preserved in the JSON wrapper but never split into N steps. A
batch-of-3 TR extracts as one step whose inputs include a 3-element
Batch.

The `job_ids` path produces one work_item per Job
(`extract.py:760-783`) and sorts them by `(tier, TES.id)`. Multiple
Jobs sharing a TES (the regression case from `CURRENT_PROBLEMS.md`)
produce duplicate work_items. No collapse to "effective steps."

So the TR side never reaches "effective step state" — extraction
operates either on the unsplit cartesian-product TR payload, or on
the per-Job leaf. The middle is skipped.

### History Graph — accidentally correct, if the data shape is allowed

`managers/history_graph.py:474-498` collapses producers by
`source_id` (TES.id) per item. For a batch-of-N TR, all N output HDAs
*would* collapse to one producer node because the resolver returns the
same `source_id` for each Job. The graph would render one producer
feeding N outputs — the right shape for batch.

The qualifier matters: commit `1f87eebce` (already on this branch)
added `UNIQUE(tool_execution_state_id)` on `job`, which prevents N
Jobs from sharing one TES. So today the data shape that would exercise
the graph's correct collapse can't be inserted — the regression in
`CURRENT_PROBLEMS.md` rejects the second Job at flush time. The
graph's correctness is conditional on the revert landing.

But even then, the graph treats this as "one execution produced N
outputs," not as "N effective steps each produced one output." It
doesn't model the effective-step level either; it just papers over the
absence of one by collapsing on TES.id.

---

## Why the concept matters

Several recent design pain points are symptoms of the missing state:

1. **The `1f87eebce` regression** (see `CURRENT_PROBLEMS.md`). The
   commit added `UNIQUE(tool_execution_state_id)` on `Job`, encoding
   "one TES = one Job." That is true if "execution" means
   "effective step" — and on the WIS side, where TES is minted
   per-effective-step, it would hold. It is false on the TR side,
   where TES is minted per-TR and the same row carries N Jobs across
   the cartesian product. The UNIQUE conflates the two granularities
   because there is no type-level distinction between a "per-TR TES"
   and a "per-effective-step TES."
2. **Workflow extraction undercounts batch TRs.** The TR path emits
   one step for a batch-of-N submission instead of N. The TR-side
   TES doesn't carry effective-step state, so extract has nothing to
   iterate over, and the cartesian-product payload survives intact
   in the extracted step. The extracted workflow re-runs as one
   batched execution, which is reasonable for some use cases and
   surprising for others.
3. **`from_workflow_execution_state` returns the wrong type.** The
   synthesizer produces an effective step state but declares its
   return type as `RequestInternalToolState`. Readers
   (`to_workflow_step_state`) then have to special-case the
   length-1 Batch shape to avoid tripping the "exactly one value"
   guard intended for a different invariant. The wrapper exists
   because the type system can't distinguish "Batch from user input"
   from "Batch placeholder for a mapped collection."
4. **The `validated_param_template` slot in `MappingParameters` is
   typed `RequestInternalDereferencedToolState`** for the same
   reason. Four parallel slots, none named for what they actually
   carry.
5. **WIS-side and TR-side TES rows are different shapes in the
   same column, and minted at different granularities.** On the WIS
   side, each step execution gets one TES (holding its effective step
   state — one TES per "step worth of work"). On the TR side, each
   submission gets one TES (holding the cartesian-product seed), and N
   Jobs share it. Same column, two writer contracts, two
   cardinalities. The resolver
   (`resolve_structured_request`) hides this from consumers, but the
   schema and the type system make no distinction.

---

## What the concept could be called

The codebase has, at different sites, called it:

- "whole-step request template"
  (`convert.py:362`, in the docstring of
  `from_workflow_execution_state`)
- "the whole map-over, Batch form"
  (`modules.py:3065`, in the comment above the WIS-side TES mint)
- `validated_param_template`
  (`execute.py:88`, the carrying slot in `MappingParameters`)
- "step execution"
  (used throughout BOOKKEEPING_MODELS.md, but ambiguously — sometimes
  meaning "the whole map-over" and sometimes "a single Job")

If it were to be promoted to a named state in the 12-state taxonomy,
candidate names:

- **`step_execution`** — symmetric with `job_internal`, descriptive
  of the granularity. Conflicts mildly with the existing informal
  use of "step execution" in commentary.
- **`effective_request`** — descriptive of the relationship to
  `request_internal`. New term, no prior baggage.
- **`mapped_request_internal`** — emphasises the map-over-collapsed
  shape. Verbose; doesn't capture the batch-split axis.

None of these is in current use. The convention so far has been to
piggyback on `request_internal` / `request_internal_dereferenced`
and let consumers infer the granularity from context.

---

## What materializing it would look like

A speculative sketch — not a proposal, just a marker of what's
missing:

1. **A 13th state in the taxonomy.** A new `StateRepresentationT`
   literal (e.g., `step_execution`) with a `pydantic_template`
   variant per parameter type. The model would accept
   `MappedCollectionInput`-style references for data/collection
   inputs and forbid `{"__class__": "Batch"}` wrappers anywhere
   else. (Currently `from_workflow_execution_state` emits a
   length-1 Batch as a workaround; a dedicated state would have
   a first-class `MappedCollection` parameter shape instead.)
2. **Conversion entry points in `convert.py`:**
   - `to_step_execution(request_internal, mapped_inputs)` — the
     synthesizer currently spelled `from_workflow_execution_state`.
   - `split_batches_to_step_executions(request_internal)` — the
     TR-side splitter that today does not exist. Walks the
     non-mapped Batch wrappers in a TR payload and yields one
     step_execution per batch combination, preserving any mapped
     collection axes as `MappedCollectionInput` descriptors.
3. **Schema:** `TES.request` typed (in code, not DB) as the new
   state. The TR-side mint would produce *N* TES rows (one per
   split) instead of one row carrying the cartesian-product seed.
   This restores the 1:1 TES↔Job invariant the
   `1f87eebce` commit assumed, at the cost of multiplying TES rows
   on TR-side batch submissions.
4. **Extraction:** the `tool_request_ids` path would iterate one
   work_item per TES (not per TR) and produce N steps for an
   N-batch TR. Symmetric with the WIS-side path, which already
   does this.

The cost is real: TR↔TES becomes 1:N instead of 1:1, the TR mint
path becomes more complex, and the `28885b317f78` backfill
("reuse id, 1:1") would need rethinking. The benefit is that the
schema and the state taxonomy would each express what's actually
true, and the WIS-side and TR-side flows would converge on a single
granularity.

---

## Summary

| Question                                     | Answer                                                                                                                                                                                              |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does the concept exist in the code?          | Yes — in `MappedCollectionInput`, `from_workflow_execution_state`, `validated_param_template`, and the WIS-side TES payload.                                                                        |
| Is it named?                                 | Inconsistently — "whole-step request template," "Batch form," "validated_param_template," "step execution."                                                                                         |
| Is it materialized?                          | Once, on the WIS side, in `TES.request`. Never on the TR side.                                                                                                                                      |
| Is it modeled as a state representation?     | No — piggybacks on `request_internal` / `request_internal_dereferenced`.                                                                                                                            |
| What problems are downstream of its absence? | The `1f87eebce` UNIQUE regression; batch-TR extraction undercounting; type-system gaps in `from_workflow_execution_state`; TR-side and WIS-side TES rows being different shapes in the same column. |

The concept is real, load-bearing, and unnamed. Making it
first-class would not be a small change, but it would dissolve a
class of asymmetries that currently live in the seams between
`request_internal` and `job_internal`.

---

## See also

- `BOOKKEEPING_MODELS.md` — the TES seam in detail.
- `MODELS_VISUAL_TOUR.md` — the schema-and-flow diagrams.
- `CURRENT_PROBLEMS.md` §1 — the UNIQUE regression and its
  framing as a cardinality mismatch.
- `../../research/Component - Tool State Specification.md` — the
  12-state taxonomy this paper proposes adding to.
- `lib/galaxy/tool_util/parameters/convert.py:282-389` —
  `to_workflow_step_state` and `from_workflow_execution_state`, the
  closest existing converters.
- `lib/galaxy/workflow/modules.py:2300-2380` —
  `_mapped_inputs_from_collection_info` and
  `_capture_workflow_tool_request_state`, the WIS-side writer.
- `lib/galaxy/tools/execute.py:81-95` — `MappingParameters`, the
  in-flight slot.
