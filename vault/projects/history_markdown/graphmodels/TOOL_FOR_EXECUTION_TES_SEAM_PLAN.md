# Consumers Seam: `tool_for_execution(tool_execution_state=...)`

## Goal

Now that every `ToolExecutionState` carries `tool_source` (NOT NULL), tighten the read-side seam so consumers say "give me a Tool for this TES" instead of plumbing `tool_id` / `tool_version` / `tool_source` separately. Builds on `d2c46b5c53` (move tool_source_id to TES) and `decebd02b4` (centralize tool resolution).

Two related changes here, both essentially greenfield (consumers were added in the last two weeks; no legacy callers to preserve).

## Scope

Read-side only. No schema changes. Two coordinated edits + simplifications at call sites + an API tightening on `tool_for_execution`.

## Change A: `tool_for_execution` — explicit strategy, TES kwarg

Three shifts on `lib/galaxy/managers/tool_execution.py::tool_for_execution`:

1. **Rename `prefer` → `strategy`, make required, drop inference.** The old "infer from which kwargs were passed" rule was load-bearing semantics (live registry vs persisted source — which is authoritative) expressed as an accident of the call site's shape. Once TES becomes the universal input shape, the input no longer disambiguates. The strategy has to be stated. Inference dies; `strategy=None` raises `TypeError`.

2. **Add `tool_execution_state` kwarg, mutually exclusive with the primitives.** When set, derive all four primitives (`tool_id`, `tool_version`, `dynamic_tool`, `tool_source`) symmetrically from `tes.tool_source`, even though each strategy reads only two — keeps the per-strategy fallback (toolbox-first falls back to model when toolbox misses) working without callers needing to know which primitives each strategy consumes. Passing primitives alongside `tool_execution_state=` raises.

3. **No precedence rule.** TES kwarg and primitive kwargs don't overlap; one way in.

```python
def tool_for_execution(
    app, toolbox, *,
    strategy: ResolutionStrategy,                              # required
    tool_execution_state: Optional[ToolExecutionState] = None, # OR the primitives below
    tool_id=None, tool_version=None,
    dynamic_tool=None, tool_source=None,
) -> Optional[Tool]:
    if tool_execution_state is not None:
        if any(x is not None for x in (tool_id, tool_version, dynamic_tool, tool_source)):
            raise TypeError("tool_execution_state= is mutually exclusive with identity primitives")
        ts = tool_execution_state.tool_source
        tool_id = ts.tool_id
        tool_version = ts.tool_version
        dynamic_tool = ts.dynamic_tool
        tool_source = ts
    # ... existing strategy dispatch unchanged ...
```

Strategy declarations at each call site:

| Site | strategy | Why |
|---|---|---|
| History Graph name resolution | `"toolbox"` | Live registered tool is authoritative for display |
| Extract Job branch | `"toolbox"` | Standalone job's tool is registered |
| Extract classic ICJ branch | `"toolbox"` | Same |
| Extract tool-request branch | `"model"` | Tool may not be registered (jobless / removed); persisted source authoritative |

## Change B: `ResolvedStructuredRequest` carries the TES row

`lib/galaxy/managers/workflow_request_state.py::ResolvedStructuredRequest` adds a `tool_execution_state` field. The resolver already loads the row in `_resolved_from_tes(tes)`; exposing it is free.

```python
class ResolvedStructuredRequest(NamedTuple):
    state: ResolutionState
    source_id: Optional[int] = None
    payload: Optional[dict] = None
    tool_execution_state: Optional[ToolExecutionState] = None   # NEW
```

Field name matches the model attribute (consistent with the `tool_for_execution` kwarg). Invariant: `tool_execution_state is None ⟺ state == MISSING`. Asserted in `_resolved_from_tes`. Docstring notes the field is valid only for the lifetime of the producing session (it's a live SQLA row, not pure data).

`resolve_structured_request_payload` (the `Optional[dict]` shortcut) stays untouched.

## Call-site simplifications

| Site | Before | After |
|---|---|---|
| `workflow/extract.py` `_tool_request_work_item` | `tool_source=tool_request.tool_execution_state.tool_source` | `tool_execution_state=tool_request.tool_execution_state, strategy="model"` |
| `workflow/extract.py` job branch | `tool_id=job.tool_id, tool_version=job.tool_version` | `tool_execution_state=resolved.tool_execution_state, strategy="toolbox"` |
| `workflow/extract.py` classic-ICJ branch | `tool_id=rep.tool_id, tool_version=rep.tool_version` | `tool_execution_state=resolved.tool_execution_state, strategy="toolbox"` |
| `managers/history_graph.py::_resolve_tool_names` | unchanged | unchanged — pure tool-id name lookup, no TES in scope at that layer; passes `strategy="toolbox"` explicitly per Change A |

The extract job and classic-ICJ branches' tool resolution thus gains a model-rebuild fallback for free (TES.tool_source is NOT NULL). Owned as a feature: extract becomes resilient when a tool is no longer registered but is rebuildable from persisted source.

## Out of scope

- `cached_create_tool_from_representation` cache-home consolidation. Still a separate follow-up (gated on dict-vs-str cache key for in-process callers).
- Any change to `tool_request_payload` / `tool_request_payload_or_empty` — they read `request`, not identity.
- Threading TES through `history_graph.py::_producer_nodes` / `_resolve_tool_names`. Name resolution there is a pure `tool_id → name` lookup off `producer_meta`; feeding a full TES in would mean restructuring `producer_meta` for no payoff. Stays on the primitive `tool_id=` path.

## Tests

- `test_extract_tool_request_state.py`: extend two cases to assert `resolved.tool_execution_state is tes`.
- `test_modules.py` capture tests: unchanged (capture path doesn't touch resolver).
- `test_HistoryGraphBuilder.py`: existing tests already exercise the resolver via the graph build; the producer-Tool resolution simplification is covered by them.
- New: one unit test for `tool_for_execution(tool_execution_state=tes, strategy="toolbox")` deriving identity correctly.
- New: one unit test that `tool_for_execution(...)` without `strategy=` raises `TypeError`.
- New: one unit test that mixing `tool_execution_state=` and any primitive kwarg raises.

## Validation

1. `pytest test/unit/workflows/test_extract_tool_request_state.py`
2. `pytest test/unit/app/managers/test_HistoryGraphBuilder.py`
3. `pytest test/unit/workflows/` + `test/unit/webapps/` + `test/unit/app/managers/` sweep.

## Rejected alternatives

- **Keep `prefer` with inference, infer model when TES kwarg present.** Trades one form of implicit semantics for another and quietly flips the default for any caller that today relies on toolbox-default. Rejected because the strategy is load-bearing enough to deserve a declaration.
- **Separate `tool_for_tes(tes, strategy=...)` helper.** Keeps the primitive API single-purpose. Rejected because it doubles the function surface for one extra line of intent at call sites; with `strategy` required and TES/primitives mutually exclusive, the single helper carries both shapes cleanly.
- **Allow `tool_execution_state=` to coexist with primitive overrides ("explicit primitive wins").** Introduces a precedence rule that has no real call site needing it. Rejected as gratuitous.

## Open questions

1. Rename `ResolutionStrategy` literal values? Today `"toolbox"` / `"model"`. With `strategy=` becoming a required declaration at call sites, the values get read more often. `"toolbox"` is fine; `"model"` is vague — `"rebuild"` or `"tool_source"` would read more directly. Lean toward `"rebuild"`. Decide before the rename diff lands so we change both at once.
2. Should `_resolved_from_tes` assert `tool_execution_state is None ⟺ state == MISSING`, or rely on construction discipline? Plan: assert. Cheap and catches resolver-side bugs.
3. Worth inlining `tool_request_payload(tool_request)` callers to `resolved.payload` once they all go through the resolver? Separate cleanup; not in this PR.
