# Bookkeeping Models: ToolExecutionState + ToolSource Identity

Summary of model changes on `workflow_state_backfill` since `2109b9d6ff` (the
`fda0f58413 Add rmd filetype` merge), and how simple jobs, map-over jobs,
the History Graph, and history → workflow extraction all consume them.

## Commits in scope

```
07e1b23db3 Tool-source identity: persist tool_id/version/dynamic_tool; slim queue_jobs message
7d97dfeb73 Use ToolRequest state for workflow extraction
190f3177b9 Polish extraction: source-neutral structured-state seam + test trim
d4ebce5a8b Workflow extract: tool_request_ids primitive for jobless executions
fe599ce512 Rebuild schema.
e3b2adba94 Workflow extract: tool_request_ids covers queued/grey executions (#7003)
dfd629dce4 Workflow extract: recover tool identity off ToolSource; tighten ICJ mix guard
0415dd4624 Capture workflow tool-step request state via tool_execution_state
eecc209be6 fixup! Capture workflow tool-step request state via tool_execution_state
9109d06fbd History Graph UI integration prep (+ fixups 3e3ed076c7, e6e4f13308, 6e8ffef160, 49c769180f)
ef7a69c913 fixup! Tool-source identity ...
c067754e13 Converge on ToolExecutionState as the only payload seam
8bb8b20c12 TES docs: ICJ-supersedes framing + resolver-seam comments
decebd02b4 Centralize tool resolution in managers/tool_execution.py
4229a7f231 Unify extract_by_ids producer identity on ToolExecutionState.id
5194e2f388 Discriminate resolver outcome via ResolutionState
a64eb4f126 Walk Job -> WIS -> TES; reassert tool-not-None on extract
0fb619242f Move tool_source_id from ToolRequest to ToolExecutionState
8f5a92a0a2 Tighten tool_for_execution to a TES-shaped seam
79ff86fd5b Let WIS freely co-point with Job/ICJ at the same TES
1f87eebce3 Replace TRICA with TES-keyed TEICA; tighten TES back-pops to scalar
```

Five migrations:

- `0b49ffb1e890_add_tool_identity_columns_to_tool_source` — add
  `tool_id`, `tool_version`, `dynamic_tool_id` columns on `tool_source`.
- `28885b317f78_add_tool_execution_state` — new `tool_execution_state`
  table, four FKs, backfill from `tool_request`, drop
  `tool_request.request`.
- `29fe58dda936_add_tool_source_hash_source_class_uq` — add
  `identity_hash`, dedupe by `(hash, source_class, identity_hash)`, add
  unique constraint.
- `395148707459_move_tool_source_to_tool_execution_state` — add
  `tool_execution_state.tool_source_id` (NOT NULL FK), backfill from
  each `ToolRequest`'s `tool_source_id` into its linked TES, delete
  orphan workflow-step TES rows (unreleased branch), drop
  `tool_request.tool_source_id`.
- `10c4cd393d5a_drop_trica_and_tighten_tes_backpops` — replace the
  TR-keyed `tool_request_implicit_collection_association` (TRICA) with
  a TES-keyed `tool_execution_implicit_collection_association` (TEICA);
  backfill TEICA from TRICA via `TR.tool_execution_state_id` before
  dropping TRICA. Add partial-`UNIQUE(tool_execution_state_id)` on each
  of `tool_request`, `job`, `implicit_collection_jobs`,
  `workflow_invocation_step` so the TES back-pops are 1..[0,1] at the
  DB level.

Five migrations and matching ORM changes converge on one idea: a tool
execution's validated `request_internal` payload lives on its own row,
**`ToolExecutionState` (TES)**, and every consumer (jobs, ICJs, workflow
steps, tool requests, History Graph, workflow extraction) reaches it
through one source-neutral seam. Tool identity hangs off the execution
event (TES → ToolSource), not the request side.

---

## 1. `tool_source` becomes content + identity-addressable

Migrations `0b49ffb1e890` (identity columns), `29fe58dda936` (dedupe +
unique constraint), and `395148707459` (move FK from TR to TES).

`ToolSource` (`lib/galaxy/model/__init__.py:1402`) gains:

- `tool_id`, `tool_version`, `dynamic_tool_id` + relationship — tool
  identity is persisted on the row, not implied by the requester.
- `identity_hash` — sha256 over `("dynamic", id)` or
  `("static", tool_id, tool_version)`.
- `UNIQUE (hash, source_class, identity_hash)`.

`get_or_create_tool_source` (`lib/galaxy/managers/tool_source.py`) is the
single lookup-or-create helper used at tool-request **and**
workflow-step-TES mint time, with `IntegrityError` race rollback. The
old "always insert a new row with `hash='TODO'`" path is gone; the
identity-hash migration dedupes existing rows by repointing
`tool_request.tool_source_id` at the survivor.

After `395148707459`, the `tool_source_id` FK lives on `ToolExecutionState`
(NOT NULL), not on `ToolRequest`. Tool identity hangs off the **execution
event**: every TES knows its tool, and `ToolRequest` reaches identity via
`tr.tool_execution_state.tool_source`.

`QueueJobs`/Celery task no longer ship `raw_tool_source`,
`tool_source_class`, `tool_id`, `dynamic_tool_id`. The celery worker
reads identity off `tool_request.tool_execution_state.tool_source`
(`lib/galaxy/celery/tasks.py:534`). The payload is now just
`{ tool_request_id, ... }` plus runtime knobs.

---

## 2. `ToolExecutionState` — single payload seam

Migration `28885b317f78` creates the new table and FKs from four hosts:

```
tool_request.tool_execution_state_id
job.tool_execution_state_id                       -- only for non-mapped jobs
implicit_collection_jobs.tool_execution_state_id  -- canonical anchor for mapped executions
workflow_invocation_step.tool_execution_state_id  -- workflow step before ICJ exists / failure capture
```

`ToolExecutionState` (`lib/galaxy/model/__init__.py:1450`):

- `request` — the validated `request_internal` payload (nullable).
- `state` — `ToolExecutionStateValidity`
  (`not_validated` / `validated` / `validation_failed`). **Deliberately
  distinct** from `ToolRequest.state` (command lifecycle) and
  `WorkflowInvocationStep.state` (invocation lifecycle); only
  `validated` rows are trusted as a payload source.
- `tool_source_id` — NOT NULL FK to `ToolSource`; the per-execution
  tool identity (added in `395148707459`).
- back-populates (all 1..[0,1], `uselist=False`) to `tool_request`,
  `job`, `workflow_invocation_step`, `implicit_collection_jobs`, and
  forward to `tool_source`. The four scalar back-pops are enforced by
  a partial-`UNIQUE(tool_execution_state_id)` on each peer table
  (`10c4cd393d5a`). Multiple NULLs remain legal under UNIQUE in both
  PostgreSQL and SQLite, so rows without a TES link stay valid.

The migration also drops the now-redundant `tool_request.request` column
— the TES row is the only payload carrier.

### "ICJ supersedes its Jobs" invariant

`__strict_check_before_flush__` on `Job` and `ImplicitCollectionJobs`
(gated by `GALAXY_TEST_RAISE_EXCEPTION_ON_HISTORYLESS_HDA`) enforces a
single rule with two faces:

- A `Job` under an ICJ must **not** carry a direct TES FK.
- An `ICJ` with a TES FK must **not** have any constituent `Job` also
  carrying one.

`WIS` is **not** part of this invariant. WIS keeps its TES FK across
the execution event and co-points with either its Job (simple step) or
its ICJ (mapped step) at the same TES row. `TR` likewise co-points
with the materialized side (request + execution).

Backfill SQL respects this: every legacy `tool_request` gets a TES row
(reusing the id for a 1:1 mapping), joined jobs get the FK, but jobs
under an ICJ are then nulled out and the ICJ gets the shared TES. WIS
rows linked to such ICJs keep their FK — they co-point with the ICJ at
the same TES row.

---

## 3. Wire surface

- New endpoint `GET /api/tool_executions/{id}` returning
  `ToolExecutionModel` (`lib/galaxy/webapps/galaxy/api/tools.py:350`),
  with its own id-cipher namespace
  `TOOL_EXECUTION_STATE_ENCODE_KIND = "tool_exec_st"` so new producer
  ids cannot collide with same-pk historical `ToolRequest` ids in the
  graph.
- `WorkflowExtractionByIdsPayload` gains `tool_request_ids`
  (`lib/galaxy/schema/workflows.py:493`).

---

## 4. Tool resolution — one helper

`lib/galaxy/managers/tool_execution.py::tool_for_execution` is the
single helper that turns the captured tool identity into a `Tool`. It
takes one of two strategies, **explicitly** (no inference from kwargs):

- **`strategy="toolbox"`** — toolbox lookup is authoritative; if the
  tool is no longer registered, falls back to rebuild when a
  `ToolSource` is present. Default for Job-sourced executions.
- **`strategy="rebuild"`** — rebuild from the persisted `ToolSource`
  is authoritative; toolbox is the fallback. Default for
  ToolRequest-sourced executions, including jobless ones.

The strategy encodes which source is authoritative for the consumer
(live registry vs persisted blob), which the input shape can no longer
disambiguate — `8f5a92a0a2` made it required and renamed the prior
`"model"` value to `"rebuild"`.

Callers pass either `tool_execution_state=` (preferred — the TES
carries every identity primitive symmetrically via `tes.tool_source`)
or the identity primitives directly (`tool_id` / `tool_version` /
`dynamic_tool` / `tool_source`). The two shapes are mutually
exclusive. `ResolvedStructuredRequest` now carries the producing TES,
so extract routes it straight into `tool_for_execution` without
re-walking identity.

Toolbox `MessageException` is swallowed to `None` so display-time
callers (History Graph) don't need a try/except wrapper. Extract sites
re-assert `tool is not None` after the call because a missing tool at
extract time is a hard failure, not "no producer name to render" — see
`a64eb4f126`.

History Graph display, extract's job branch, and extract's tool-request
rebuild now all route through this one helper; the prior in-line
helpers (`_tool_from_request`, `_tool_for_job`) in `workflow/extract.py`
have dropped out. The rebuild path here is uncached;
`galaxy.celery.tasks` keeps a worker-local
`cached_create_tool_from_representation` for `queue_jobs` / `finish_job`
hot paths, and collapsing the two cache homes into one is a documented
follow-up (gated on dict-vs-str cache-key handling for in-process
callers).

---

## How simple jobs vs. map-over jobs leverage these

### Async-API tool-request path (writes)

`services/jobs.py::create` now:

1. Calls `get_or_create_tool_source(sa_session, tool)` —
   content+identity-deduped row.
2. Creates a
   `ToolExecutionState(request=request_internal_state.input_state, state=VALIDATED)`
   and links it to the new `ToolRequest`.
3. Sends a slim `QueueJobs` payload — celery worker fetches tool source
   and identity off the row.

In `JobSubmitter.queue_jobs` (`lib/galaxy/managers/jobs.py:2235`), the
payload is read through the new `tool_request_payload(tool_request)`
helper (reads through `tool_request.tool_execution_state.request`);
`dynamic_tool` is recovered from
`tool_request.tool_execution_state.tool_source.dynamic_tool`. Anything that used to mutate
`tool_request.request` (e.g. `__data_manager_mode`) now mutates
`tool_request.tool_execution_state.request`.

### `_execute` (`lib/galaxy/tools/execute.py:215`)

`_tool_execution_state_for_jobs(tool_request, invocation_step)` picks
the TES row to stamp on this execution. Then:

- **Simple job (no ICJ):** `job.tool_execution_state = tool_execution_state`
  is set on the Job directly. The TES came either from the user's
  tool_request (async API path) or from the workflow step (if
  `invocation_step` carried a validated one).
- **Map-over (`collection_info` truthy → ICJ created):** the FK is
  *not* stamped on the Job. Instead
  `ImplicitCollectionJobs.tool_execution_state = tool_execution_state`
  is set in `precreate_output_collections`. The ICJ is the canonical
  anchor for mapped executions, superseding its constituent Jobs.

For workflow tool steps the WIS carries the TES from step scheduling
time onward. Once
`WorkflowStepExecutionTracker.ensure_implicit_collections_populated`
produces the ICJ (mapped step) or `_execute` stamps the Job (simple
step), the same TES row is also referenced from that materialized
anchor — WIS and Job/ICJ co-point. No move, no null-out.

### Workflow-side TES synthesis (`lib/galaxy/workflow/modules.py:2296`)

`_capture_workflow_tool_request_state` synthesizes a `request_internal`
payload from the workflow step's resolved execution state plus a
per-iteration `validated_param_combinations` list. It deliberately:

- Produces one TES per **step execution** (the whole map-over, "Batch"
  form), never per iteration.
- Uses `MappedCollectionInput` descriptors (`src=hdca|dce`,
  `map_over_type`, `linked=True`) instead of the per-iteration sliced
  value, because the converter is the thing that re-applies the slice.
- Always writes a row; degrades to `state=validation_failed` (or
  `not_validated` for skipped conditional) without throwing — the
  workflow never blocks on capture failure.

The resulting TES is threaded into
`MappingParameters(..., validated_param_template, validated_param_combinations)`
and into `_execute`. Simple workflow tool steps and map-over steps go
through the same code; the only branch is which side gets the
materialized-anchor FK (Job for simple, ICJ for mapped) — WIS keeps
its FK either way.

---

## How the History Graph uses these

`lib/galaxy/managers/history_graph.py` builds a provenance graph keyed
on **TES id as the producer node**, not Job / ToolRequest / WIS id:

1. `_producers` collects candidate producers for every selected
   HDA/HDCA:
   - Job-side: `JobToOutputDatasetAssociation` /
     `JobToOutputDatasetCollectionAssociation` joined to Job.
   - Jobless collection-side:
     `HistoryDatasetCollectionAssociation → TEICA →
     ToolExecutionState → ToolRequest` (joined to `ToolSource` for
     identity) — how an empty map-over (tool request, zero jobs)
     still appears as a producer. TEICA replaces TRICA as the
     producer-side bookkeeping in `10c4cd393d5a`; it's keyed on TES
     (rekeying lifts the link off the request side onto the
     execution event) and is written once at execute time, so
     `HDCA.copy()` never carries a TEICA row. The walk therefore
     answers "what did this execution *originally* produce" without
     filtering out copies after the fact — the join itself excludes
     them.

2. For each Job it calls `resolve_structured_request(job=...)` from
   `lib/galaxy/managers/workflow_request_state.py`. That seam encodes
   the "ICJ-supersedes" rule with a fallback walk through the WIS:

   ```
   _tes_from_job:  if job is under ICJ → ICJ.tool_execution_state
                   elif job.tool_execution_state → it
                   elif job.workflow_invocation_step → WIS.tool_execution_state
   _tes_from_tool_request → tool_request.tool_execution_state
   ```

   The Job → WIS walk recovers TES.id for workflow tool executions
   whose capture wasn't `validated` (the writer always mints a WIS-side
   TES; `execute.py` only propagates the link to the Job on validation
   success — see `a64eb4f126`).

   The resolver always returns a `ResolvedStructuredRequest` (never
   `None`); a `state: ResolutionState` field discriminates the outcome:
   `VALIDATED` / `NOT_VALIDATED` / `VALIDATION_FAILED` / `MISSING`
   (no TES row at all). `source_id` is set whenever a TES exists;
   `payload` is populated only for `VALIDATED`. A `validated` row with a
   non-dict payload is a write-side bug and asserts. Consumers can
   choose to react state-specifically; both Graph and extract debug-log
   non-`VALIDATED` outcomes and treat the item as having no producer
   edge / no structured payload. `resolve_structured_request_payload`
   is the thin `Optional[dict]` wrapper for callers that only need the
   validated payload.

3. The returned `ResolvedStructuredRequest(source_id=tes.id, payload=...)`
   is the seam — **simple job and map-over job both collapse to one TES
   id**. So in the graph:
   - A simple-job execution = one producer node = TES id of
     `job.tool_execution_state`.
   - A map-over execution (N jobs in one ICJ) = one producer node = TES
     id of `icj.tool_execution_state`. All N output HDAs/HDCAs point at
     the same producer.
   - A jobless tool request = one producer node = TES id of
     `tool_request.tool_execution_state`.

4. Producer nodes are encoded with the dedicated
   `TOOL_EXECUTION_STATE_ENCODE_KIND` cipher (`_producer_ref`) and
   emitted with `src="tool_execution"`. Input edges are derived from
   `request_internal_input_refs(payload)` — from the validated TES
   payload itself, not from per-job `JobToInputDataset*` rows. Inputs
   come from the **declared request**, identical for every constituent
   job of a map-over.

5. If multiple producers resolve to the same item (shouldn't happen
   post-invariant, but defensive), the item is left node-only with a
   debug log.

---

## How history → workflow extraction uses these

`lib/galaxy/workflow/extract.py::extract_steps_by_ids` is the ID-based
path used by the new wire surface. The structured payload reaches it
via the same seam — extract uses the discriminated form so it can pick
up both `payload` and `source_id` (the latter is the tier-1 sort key):

```python
resolved = resolve_structured_request(job=job)                   # simple job
resolved = resolve_structured_request(icj=icj)                   # map-over
request_payload = tool_request_payload(tool_request)             # jobless / tool_request_ids
```

`_WorkItem` is the shared record (`job` optional, `tool_request`
optional, `request_payload` optional). Three sources, one downstream:

- **Simple job** (`job_ids`) — `resolve_structured_request(job=job)`;
  tool comes from `tool_for_execution(..., strategy="toolbox", tool_execution_state=resolved.tes)`
  (toolbox-first, rebuild as fallback); if the resolver state is not `VALIDATED` the legacy
  state walk fallback runs (gated by
  `workflow_extraction_fallback_to_legacy_state`) and the item sorts
  in tier 0 by `Job.id`.

- **Map-over / ICJ** (`implicit_collection_jobs_ids`): the service
  decides up front. `WorkflowsService.extract_by_ids` walks
  `icj.tool_execution_state.tool_request` for every submitted ICJ id;
  TR-backed ICJs are rebucketed into `tool_request_ids` before the
  call into `extract_steps_by_ids`. Inside extract, the
  `implicit_collection_jobs_ids` loop is therefore classic-only:
  representative job + `resolve_structured_request(icj=icj)` (reads
  `icj.tool_execution_state`, **not** the job's). A jobless classic
  ICJ has no source and is rejected. The previous per-HDCA peek
  through `tool_request_association` (TRICA) is gone; TR-backed output
  collections are now reached via the TES seam (`tr.output_collections`
  walks `tr.tool_execution_state.implicit_collection_associations` —
  TEICA rows).

- **Jobless tool request** (`tool_request_ids`, new) — same
  `_tool_request_work_item` path; works even when an empty collection
  produced zero jobs.

The structured branch `_structured_step_inputs_by_id` validates the
payload against the tool's parameter model and projects to workflow-step
state with `to_workflow_step_state`; associations are produced from
`request_internal_input_refs` rather than from `Job.input_dataset*`
rows, so map-over connections are wired to the pre-map input HDCAs (via
`implicit_input_collections` + the request refs), not to individual
sliced elements.

Sort ordering uses a 2-tuple `(tier, id)` on each `_WorkItem`:

- **Tier 1** — items the resolver grounded in a TES row. Keyed by
  `ToolExecutionState.id`. Job-sourced, classic-ICJ-sourced, and
  ToolRequest-sourced items all share this one comparable id space.
- **Tier 0** — TES-less items (pre-structured-capture historical
  executions reached via the `workflow_extraction_fallback_to_legacy_state`
  hybrid mode). Keyed by `Job.id`. Tier-0-first holds because such items
  are by definition pre-rollout and thus older than any tier-1 item.

Because tier-1 ids are universally comparable, the two prior
service-layer mix-guards (TR-keyed vs. job/ICJ-keyed in one payload;
job-keyed ICJs vs. TR-keyed ICJs) have dropped out — they existed only
because the underlying ids weren't comparable. The remaining cross-
payload validation (populated_state, output-collection presence,
job-must-not-have-ICJ, TR-state-`new` single-step gate, accessibility)
stays in `lib/galaxy/webapps/galaxy/services/workflows.py`.

---

## Net picture

Both the History Graph (read-side provenance) and structured workflow
extraction (read-side workflow synthesis) used to have to peek into
multiple shapes — `Job`, `ToolRequest`, `WorkflowInvocationStep`, ICJ —
to find a validated `request_internal`. After these changes they both
walk one seam: `resolve_structured_request(...) → ToolExecutionState`.
Simple jobs and map-over jobs become the same shape to consumers — they
differ only in which row owns the FK (`Job` vs. `ICJ`), and the
resolver hides that. Jobless executions (empty map-over, never-submitted
tool request) become first-class because the TES exists independently
of any Job.
