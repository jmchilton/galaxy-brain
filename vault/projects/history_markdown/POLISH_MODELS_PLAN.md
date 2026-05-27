# Polish Plan: ToolExecutionState Nest

Five-item polish pass on the ToolExecutionState (TES) nest in
`workflow_state_backfill`. Two doc-only items, one refactor, one
substantive consumer-API unification, one resolver-API change. Greenfield
on both consumer APIs (graph + extract-by-ids) makes the riskier items
cheap.

Order is dependency-respecting: docs → refactor (#4) → identity (#5) →
resolver shape (#6). #6 lands last so it can be informed by what #5
showed extraction actually needs.

## Item 1: Rename "exactly one path" → "ICJ supersedes children"

**Problem.** The invariant in `__strict_check_before_flush__` on `Job`,
`ICJ`, `WIS` and the docstrings on `ToolExecutionState` /
`28885b317f78_add_tool_execution_state.py` advertise "exactly one path."
Not true: `ToolRequest.tool_execution_state_id` and
`Job.tool_execution_state_id` legitimately point at the same TES (request
side + materialized side). The actual rule is "ICJ supersedes its child
Job/WIS." Misleading framing → future readers will think TR + Job is also
forbidden.

**Scope.**

- `lib/galaxy/model/__init__.py`:
  - `Job.__strict_check_before_flush__` docstring (~line 1768): rewrite.
  - `ImplicitCollectionJobs.__strict_check_before_flush__` docstring (~3034): rewrite.
  - `WorkflowInvocationStep.__strict_check_before_flush__` docstring (~10764): rewrite.
  - `ToolExecutionState` class docstring (1450): replace "consumers walk
    one source-neutral seam" with the actual rule + the resolver
    reference.
- `lib/galaxy/model/migrations/alembic/versions_gxy/28885b317f78_add_tool_execution_state.py`:
  module docstring line referencing "exactly one path" → rewrite.

**Decision: keep dunder name or rename method?** Verify whether
`__strict_check_before_flush__` is a SQLAlchemy event-hook-discovered
name (grep for `before_flush` listeners that walk session.dirty / new).
If hook-discovered, keep the dunder; if a regular method called
explicitly, rename to `_check_icj_supersedes_children`.

**Tests.** `test/unit/data/model/test_tes_path_invariant.py` already
covers the three rejection cases. Rename test functions to match new
naming; assertion bodies stay identical. No new tests.

**Effort.** ~30 min including the hook-name verification.

## Item 2: Docstring the canonical-access pattern on relationships

**Problem.** Today nothing stops a new consumer from doing
`job.tool_execution_state` directly and getting `None` for a mapped Job.
There is exactly one production reader (`_tes_from_job`) and one
intentional test reader (simple-workflow-step assertion). Future drift is
the risk; convention is the defense.

**Scope.** Single-line comments on three relationship declarations in
`lib/galaxy/model/__init__.py`:

```python
# Job-side link. NULL for mapped Jobs (the ICJ carries the TES). Read via
# galaxy.managers.workflow_request_state.resolve_structured_request, not
# this attribute directly.
tool_execution_state: Mapped[Optional["ToolExecutionState"]] = relationship(...)
```

Same idea on `ImplicitCollectionJobs.tool_execution_state` ("supersedes
the constituent Job/WIS links when set") and
`WorkflowInvocationStep.tool_execution_state` ("transitional: moved to
ICJ once mapped step produces an ICJ").

**Tests.** None.

**Effort.** ~5 min.

## Item 3: Centralize tool resolution

**Problem.** Three sites resolve a Tool from execution-time identity:

- `lib/galaxy/managers/history_graph.py::_resolve_tool_names` —
  `toolbox.get_tool(tool_id)` for display name.
- `lib/galaxy/workflow/extract.py::_tool_for_job` —
  `toolbox.get_tool(job.tool_id, tool_version)` for the full Tool.
- `lib/galaxy/workflow/extract.py::_tool_from_request` —
  `create_tool_from_representation(tool_source.source, ...)` for
  TR-sourced (rebuild path).

Three sites, two distinct resolution strategies, no centralization. A
fourth consumer will pick one arbitrarily.

**Design.** New module `lib/galaxy/managers/tool_execution.py` (cleaner
than colocating with `tool_source.py` — the helper is about producing a
Tool from execution-time identity, not about ToolSource per se).

```python
def tool_for_execution(
    app,
    toolbox: AbstractToolBox,
    *,
    tool_id: Optional[str],
    tool_version: Optional[str] = None,
    dynamic_tool: Optional[DynamicTool] = None,
    tool_source: Optional[ToolSource] = None,
    prefer: Optional[Literal["toolbox", "model"]] = None,
) -> Optional[Tool]:
    """Resolve a Tool for a captured execution event.

    prefer=None infers: model when tool_source is supplied, else toolbox.
    Pass prefer explicitly to override (e.g. toolbox-first with
    tool_source as a fallback).
    """
```

Reuse `cached_create_tool_from_representation` from `celery/tasks.py` for
the model path (caching parity with the celery worker). If the lru_cache
location is awkward to import, lift it into the new module instead.

**Call site migration.**

- `_resolve_tool_names` (graph): passes `tool_id` only (no tool_source);
  reads `.name`. Behavior unchanged.
- `_tool_for_job` (extract): passes `tool_id`, `tool_version`,
  `dynamic_tool`; toolbox lookup. Behavior unchanged.
- `_tool_from_request` (extract): passes `tool_source` (which carries
  `tool_id`, `dynamic_tool`); model rebuild. Behavior unchanged.

After migration, delete the two private helpers in `extract.py`.

**Tests.**

- New `test/unit/app/managers/test_tool_execution.py`. Red-to-green
  matrix (one test per row):
  - toolbox hit, no tool_source → toolbox tool returned.
  - toolbox miss, no tool_source → None.
  - toolbox miss, tool_source supplied → model rebuild.
  - toolbox hit, tool_source supplied, prefer=None → model (per
    inference).
  - toolbox hit, tool_source supplied, prefer="toolbox" → toolbox.
  - toolbox miss, tool_source supplied, prefer="toolbox" → model
    fallback.
- Existing HistoryGraphBuilder + extract tests should keep passing
  unchanged (pure refactor). Run both suites after migration.

**Effort.** ~2-3 hours including tests.

## Item 4: Unified producer identity on TES.id

**Problem.** Graph encodes producer nodes with `TES.id`
(`TOOL_EXECUTION_STATE_ENCODE_KIND`). Extraction sorts work items by
`Job.id` for job/ICJ items and `ToolRequest.id` for TR items, and
explicitly rejects payloads mixing the two spaces. Same execution event,
two identities depending on the consumer. Blocks graph-node →
extraction-unit linking and forces mix-guards that exist solely because
of the id-space split.

**Design.**

- `_WorkItem.sort_key` switches to `tes.id`. Resolved via
  `resolve_structured_request(job=..., icj=..., tool_request=...)` at
  work-item construction (same seam the resolver already exposes).
- Two mix-guards in
  `lib/galaxy/webapps/galaxy/services/workflows.py::_validate_extract_by_ids_payload`
  delete:
  - `tool_request_ids` cannot combine with `job_ids` /
    `implicit_collection_jobs_ids`.
  - Job-keyed ICJs cannot combine with TR-keyed ICJs.
- Tracking sets in the same validator (`job_keyed_icj_ids`,
  `tool_request_keyed_icj_ids`) delete with the second guard.

**TES.id monotonicity for dependency ordering.** TES is minted at
request creation (TR path) or step scheduling (workflow path), both of
which precede any Job in the same step. Across steps, the workflow
scheduler walks dependency order so a downstream step's TES is minted
after its upstream's. Job.id today is a heuristic in the same way —
swapping to TES.id preserves the heuristic without weakening it.

**Pre-TES legacy historical executions.** Workflow tool-step
executions that predate TES have no link. They are reachable only via
the legacy fallback (`workflow_extraction_fallback_to_legacy_state`).

Two options:

- **Option 5a (strict, recommended).** Require TES on every item in
  `extract_steps_by_ids`. Pre-TES items raise a clear error: "Job N has
  no validated tool execution state; this execution predates structured
  capture and cannot be extracted via the unified-identity path." The
  legacy fallback config option becomes a no-op (extraction always uses
  the structured path now). Simpler invariants; cleanest possible id
  space.
- **Option 5b (hybrid).** TES-having items sort by TES.id; TES-less
  items sort by Job.id and are appended/prepended in a second pass.
  Preserves legacy fallback semantics. Mix-guards still mostly go away
  but the "two id spaces" smell stays at a lower volume.

Recommend 5a + flip `workflow_extraction_fallback_to_legacy_state`
default to `false` in the same change. Greenfield consumer API; the
flag was a transitional safety net, and structured capture has been
landing on every new execution. Pre-TES historical extraction was never
the target user flow for `extract_by_ids` (the HID-based
`extract_steps` path is the historical one and is unaffected).

**Tests.**

- Drop test cases for the deleted mix-guards from
  `test/unit/workflows/test_extract_by_ids_validation.py`. Add tests
  asserting the previously-rejected mix shapes now succeed end-to-end
  (TR + Job in one payload, Job-keyed ICJ + TR-keyed ICJ in one
  payload).
- Add an integration test (or unit test on the in-memory sort) showing
  TES.id ordering matches the expected step dependency order for a
  representative TR-then-workflow execution chain.
- Add a unit test asserting pre-TES historical Job extraction raises
  with the new error (5a) and that
  `workflow_extraction_fallback_to_legacy_state=true` re-enables the
  old path (only if we keep the flag as escape hatch).
- Existing extraction tests should pass; this refactor is sort-key
  shape, not extraction semantics.

**Effort.** ~1 day. The work is mostly test churn: many extraction
tests assert specific ordering behavior; they'll need to switch from
"job_ids in this order" to "TES.id implied order."

## Item 5: Discriminated resolver outcome

**Problem.** `resolve_structured_request` returns
`Optional[ResolvedStructuredRequest]`. None collapses three distinct
failure modes: TES missing entirely, TES exists with
`state=not_validated` (skipped conditional step), TES exists with
`state=validation_failed` (capture attempted, payload rejected), TES
exists but `request` is not a dict (post-validation invariant break).
Consumers can't tell them apart. The validity enum (`TES.state`) was
introduced to express the "missing vs. attempted vs. validated"
distinction, but the resolver throws that distinction away.

**Design.** Always return a `ResolvedStructuredRequest`; never None.
Add a `ResolutionState` enum carrying both `ToolExecutionStateValidity`
values plus a `MISSING` sentinel for the no-TES case and `MALFORMED`
for the post-validation invariant break.

```python
# lib/galaxy/managers/workflow_request_state.py
class ResolutionState(str, Enum):
    VALIDATED = "validated"           # mirror of ToolExecutionStateValidity
    NOT_VALIDATED = "not_validated"   # mirror
    VALIDATION_FAILED = "validation_failed"  # mirror
    MISSING = "missing"               # no TES row at all (pre-TES historical)
    MALFORMED = "malformed"           # TES validated but request is not a dict

class ResolvedStructuredRequest(NamedTuple):
    state: ResolutionState
    source_id: Optional[int] = None    # TES.id when state != MISSING
    payload: Optional[dict] = None     # set only when state == VALIDATED
```

`resolve_structured_request_payload(...) -> Optional[dict]` keeps the
existing return shape — thin convenience for callers that only want the
validated payload. `tool_request_payload(tool_request)` already raises
`RequestInternalToWorkflowStateError` on missing/malformed — unchanged.

**Consumer use.**

- Graph: today drops items on `None` silently. New: continue dropping
  on non-VALIDATED, but log at debug with the actual `state` for
  diagnostics. Optional follow-on: surface a per-producer "no payload
  reason" in `truncated` / `producer_meta` so the UI can tell users
  "this producer's payload wasn't captured" vs. "this producer
  predates structured capture."
- Extract: today's behavior is "request_payload is None → legacy
  fallback if enabled." Under 5a (Item 4 above), legacy fallback is
  off by default, so the new shape is:
  - `VALIDATED` → structured path (today).
  - `MISSING` → "no TES; pre-structured execution, cannot extract."
  - `NOT_VALIDATED` → "step skipped at workflow time; cannot extract
    as a workflow step" (rare; happens for conditional steps).
  - `VALIDATION_FAILED` → "request capture failed validation; cannot
    extract reliably."
  - `MALFORMED` → log as a bug + same UX as VALIDATION_FAILED.
  Each gets its own error message rather than a single "no
  unambiguous tool request" line.

**Tests.**

- `test/unit/workflows/test_extract_tool_request_state.py` already
  exercises the resolver. Add one test per `ResolutionState` value
  asserting the returned tuple shape.
- Add extraction-side tests asserting each failure case raises with the
  state-specific error message.
- Graph-side: assert the debug log mentions the state value (or skip
  this assertion if log-format coupling is too brittle).

**Effort.** ~half day. Mostly mechanical at the consumer end (`if
result is None` → `if result.state != VALIDATED`).

## Suggested ordering and PR shape

| PR | Items | Why grouped |
|---|---|---|
| 1 | #1, #2 | Pure docs; safe to merge while design discussions on 4-6 continue. |
| 2 | #3 | Pure refactor, no behavior change. Lands before #4 so the centralized helper is in place. |
| 3 | #4 | Substantive consumer-API change; deserves its own PR + reviewers. |
| 4 | #5 | Resolver-shape change; touches both consumers, but smaller blast radius than #4. |

Total: ~2-3 days of work spread across 4 PRs.

## Unresolved questions

- #1: `__strict_check_before_flush__` — SQLAlchemy hook name (keep dunder) or rename method?
- #3: Use `cached_create_tool_from_representation` (celery lru_cache) inside the helper, or pure `create_tool_from_representation`? If the former, where does the cache live?
- #4 (Item 4 in numbering, #5 in TODO): Option 5a (strict, require TES) vs 5b (hybrid, two id spaces)? Recommendation: 5a.
- #4: Flip `workflow_extraction_fallback_to_legacy_state` default to `false` in the same PR, or follow-on?
- #4: Keep `workflow_extraction_fallback_to_legacy_state` as an escape-hatch config, or remove entirely after default flip?
- #5 (Item 5): Should graph surface "no payload reason" in the wire response (`truncated.no_payload_producers` or similar), or stay debug-log-only?
- #5: `MALFORMED` is theoretically unreachable post-validation. Keep the state for defense-in-depth, or assert and crash if encountered?
