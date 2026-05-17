# Using Tool State Across Tool Requests and Workflows — Design Options

> **Date:** 2026-05-17
> **Status:** Decision record. Recommendation made (**STEP_STATE**); **EXEC_STATE** kept as north star.
> **Implements as:** [[CAPTURE_WORKFLOW_EXECUTION_STATE_PLAN]] (the utilitarian build plan).
> **Related:** [[PR 21932 - History Graph API]] · [[EXTRACT_TOOL_REQUEST_STATE_PLAN]] · [[GRAPH_WORKFLOW_EXTRACTION_PLAN]] · `vault/research/Component - Tool State Specification.md`

---

## At a glance

**Problem.** History Graph and structured workflow extraction both read the validated structured state off `ToolRequest.request`. Workflow invocations never create a `ToolRequest`. So workflow-produced data is invisible to the graph and lossy to extraction.

**The one real decision, on two axes:**

- *When* do we capture the structured state? **execution-time** vs read-time → settled: **execution-time** (read-time = **READ_TIME**, rejected).
- *Where* does it live? → **MINT** (a `ToolRequest`) vs **STEP_STATE** (a column on the workflow step) vs **EXEC_STATE** (a new shared value object).

| Label | One line | Verdict |
|---|---|---|
| **READ_TIME** | Don't store it; synthesize at read time behind an abstraction | ❌ rejected — inherits the lossiness we exist to kill |
| **MINT** | Workflows mint a `ToolRequest` | ⚠️ viable, but overloads the command object |
| **STEP_STATE** ★ | Capture at execute time → column on `workflow_invocation_step` + one resolver | ✅ **recommended** |
| **EXEC_STATE** | Extract a shared `ToolExecutionState`; `Job` points at it | 🌟 north star, deferred |

**Recommendation.** Land the decision-independent **atomic core** first (the converter + validity enum + feed the already-existing per-job persistence + instrument). Then **STEP_STATE** (additive column + resolver). Keep **EXEC_STATE** as the written north star — the resolver makes it a later consumer-transparent migration *if* a production backfill is ever independently justified.

**Why not EXEC_STATE now:** its benefit is gated behind a production data migration of Galaxy's two hottest provenance tables plus repointing just-merged + in-flight code, while `ToolRequest` is still churning. STEP_STATE delivers the same behavioral goal additively and reversibly, and is the literal first increment of EXEC_STATE.

Everything below is the detail behind this summary.

---

## The problem in full

A `ToolRequest` captures the *abstract, validated description* of a tool execution — the thing that makes a run reproducible and traceable even when one form submit fans out to many jobs. Two new features depend on it: the **History Graph** (provenance DAG, [[PR 21932 - History Graph API]]) and **structured workflow extraction** (history → reusable workflow, [[EXTRACT_TOOL_REQUEST_STATE_PLAN]]). Both read `ToolRequest.request`. But a `ToolRequest` is minted in exactly one place — the async tool-request API. **Workflow invocations never create one.** So anything a workflow produces is invisible to the graph and lossy to extraction. Workflow tool-step executions need to carry the same structured, validated state a direct tool request carries.

## Why this is subtle: `ToolRequest` is two things

```
            ┌─────────────────────────  ToolRequest  ─────────────────────────┐
            │                                                                 │
   COMMAND / LIFECYCLE                                VALUE / PROVENANCE
   state, state_message                               request  (request_internal)
   drives the Celery flow                             tool_source snapshot
   "a request was issued"                             job / implicit-collection links
            │                                                "this is what ran"
            └─ workflows will NEVER need this ─┘      └─ workflows DO need this ─┘
```

A workflow step has its own lifecycle (the invocation scheduler). It only ever wants the **value** half. **MINT** forces the *command* object to also be the provenance record for things never commanded through it — that is the design smell, and the root of every landmine below.

## The kernel every option shares

```
   resolved workflow step execution
   (param_combinations + collection_info)
            │
            ▼
   ┌─────────────────────────────────────────┐   inverse / sibling of the
   │  CONVERTER  → validated request_internal │   to_workflow_step_state
   │  (incl. Batch / linked map-over encoding)│   converter already in the
   └─────────────────────────────────────────┘   extraction branch
```

This converter is **required by every option, including READ_TIME**. It is the single hardest piece — the open risk is whether `Batch`/`linked` synthesis is *total* over nested `list:paired` and multi-input matched map-over. No option avoids it. So the decision is **not** "which is less work for the hard part." It is **when** the converter runs and **where** its output goes. Half the surrounding machinery already exists: `Job.tool_state` already persists validated per-job state on the API path; the workflow path simply never feeds it.

## Axis 1 — when: execution-time vs READ_TIME (rejected)

### READ_TIME — abstraction over `ToolRequest` + `WorkflowInvocationStep`, synthesize on read ❌

**Why it was on the table.** It was one of the two original framings: rather than make workflows produce request-shaped state, define a protocol — "give me the structured input refs + param state for this execution unit" — with two adapters (one trivially wrapping `ToolRequest`, one synthesizing from a `WorkflowInvocationStep` on demand). Consumers depend only on the protocol. Attractive because it needs **no schema and no write-path change**, and non-tool steps (input/parameter/pause/subworkflow) could ride the same protocol.

```
 graph / extraction ──► PROTOCOL ──► adapter(ToolRequest)         [trivial]
                                 └─► adapter(WorkflowInvocationStep)
                                       └─ synthesize request_internal
                                          AT READ TIME, every call
```

**Why it was rejected.**

- **Same kernel cost, run lazily** — it still needs the converter (the hard part), just on the read path, recomputed per graph/extraction call.
- **Strictly weaker fidelity for the historical case.** At execution time the resolved state is faithful and in hand. At read time, for an already-run step, you only have the static workflow-step template + lossy legacy `Job.tool_state` — exactly the "post-hoc state divergence" the whole initiative exists to eliminate. READ_TIME's workflow adapter is only as good as execution-time capture *if you also do execution-time capture* — at which point it is redundant.
- **Two code paths in lockstep forever** — the abstraction *is* a permanent branch; it fights the boundedness invariant the extraction plan deliberately bakes in (path chosen once, never branch downstream).
- **Layering inversion** — synthesis needs workflow connection-resolution (app-heavy `workflow/modules.py`). A protocol sitting where `ToolRequest`/`WorkflowInvocationStep` live (the model layer) cannot call that without dragging workflow runtime into the model or duplicating resolution.
- **Unstable surface** — graph, extraction, and notebook each need overlapping-but-different things; designing the union up front is guesswork.

**The takeaway that survives:** READ_TIME is the rejected pole of the *timing* axis. Its rejection is *why every surviving option captures at execution time*. The thin read-side **resolver** in STEP_STATE looks superficially like READ_TIME's protocol but is not: it reads an *already-captured, already-validated, persisted* payload — it never synthesizes.

## Axis 2 — where: MINT vs STEP_STATE vs EXEC_STATE (all execution-time)

### MINT — workflows mint a `ToolRequest`

```
 workflow step ──► CONVERTER ──► mint ToolRequest ──► Job.tool_request_id
                                                       graph/extraction unchanged
```

| ✅ Pros | ⚠️ Cons |
|---|---|
| Plumbing ~90% wired already (`execute.py` takes `Optional[ToolRequest]`) | Forces the command object to be a provenance record for non-commanded runs |
| Graph + extraction need *zero* changes — one identity space | A `ToolRequest` may now hold an **invalid** payload — breaks the invariant every consumer leans on |
| Smallest diff | Doesn't model non-tool steps; doesn't remove the legacy path for old runs |

### STEP_STATE — capture at execute time, store on the workflow step ★ recommended

```
 workflow step ──► CONVERTER ──► workflow_invocation_step.request
                                  + .request_state (validity enum)
                                          │
                              ┌───────────┴────────────┐
                              ▼                         ▼
                    RESOLVER (one seam) ────► graph + extraction
              (Job|ICJ|WIS) → (request_internal, request_state)
```

A new nullable column pair on `workflow_invocation_step`; one small resolver is the contract both consumers call. `ToolRequest` is untouched — workflows simply no longer get a fake one.

| ✅ Pros | ⚠️ Cons |
|---|---|
| **Strictly additive** — one column pair, no `Job` change, **no production data migration** | `ToolRequest`'s own command/value conflation still exists (just no longer *imposed* on workflows) |
| Doesn't disturb just-merged PR 21932 or the in-flight extraction branch | Graph still has a dual source internally (hidden behind the resolver) |
| No public API wire-shape change | Two payload homes until/unless EXEC_STATE |
| Validity carried explicitly as an enum — the invariant problem dissolves | |
| **Reversible**: the resolver is exactly the seam that makes EXEC_STATE a later *consumer-transparent* migration. STEP_STATE ⊂ EXEC_STATE's path | |

### EXEC_STATE — extract a shared value object (the north star)

```
 ToolRequest ──┐                       ┌── command/lifecycle stays on ToolRequest
               ├──► ToolExecutionState ◄┤
 WorkflowInvocationStep ──┘             └── Job.execution_state_id (uniform walk)
```

`ToolExecutionState` becomes the canonical provenance value object. `ToolRequest` keeps only its command role. `Job` points at the value object → History Graph walks `Job → ExecutionState` uniformly.

| ✅ Pros | ⚠️ Cons |
|---|---|
| Actually *fixes* the conflation; one provenance model for any future executor | Its signature benefit (uniform `Job` walk) **only materializes with a production data migration**: `tool_request.request` → new table + `Job` FK backfill on two of Galaxy's hottest tables |
| Graph builder simplifies (drop the dual source) — *if backfilled* | Without that backfill it degrades to "purity refactor, still dual-walk": ~all the cost, none of the headline benefit |
| Clean conceptual end-state | Repoints a consumer merged 17 days ago + a branch in flight today |
| | Ripples into the History Graph **public** wire shape (node type `"tool_request"`, id prefix `r`) |
| | Bets on `ToolRequest`'s shape being final while it is still churning (4 recent migrations) |

## Recommendation (detail)

**Execution-time capture → STEP_STATE. EXEC_STATE as the documented north star.** Sequence:

1. **Atomic core (decision-independent, lands first):** converter + validity enum + feed the already-existing per-job persistence + instrument it. No schema, no consumer-visible change, removable. Retires the one real technical risk (Batch/`linked` totality) before anyone argues about storage.
2. **STEP_STATE:** one additive column pair on `workflow_invocation_step` + one resolver; route the two consumers through it.
3. **EXEC_STATE:** stays the written north star. The resolver makes it a later consumer-transparent migration **if and when** a production data backfill is independently justified — or never needed.

### Why not just do EXEC_STATE now?

Not because it is hard to build — the code surface is ~4 files. Because its *value* is gated behind a production data migration of `job` + `tool_request` (Galaxy's hottest provenance tables) **plus** repointing a just-merged consumer and an in-flight branch, during the window when `ToolRequest` itself is still moving. STEP_STATE delivers the entire **behavioral** goal — workflows get first-class structured state; graph + extraction work uniformly via one seam — additively and reversibly, and is the literal first increment of EXEC_STATE, not a competing destination. "Just do EXEC_STATE" pulls an expensive, irreversible migration forward for a benefit you cannot realize without also doing the risky backfill.

### What STEP_STATE gives up (the honest trade)

STEP_STATE cures *"workflows should not get a fake `ToolRequest`."* It does **not** cure *"`ToolRequest` itself is two things."* Only EXEC_STATE does. If a future, independent reason makes the uniform `Job → ExecutionState` walk worth a production backfill, the resolver seam means EXEC_STATE lands without re-touching a single consumer. That is the whole point of choosing STEP_STATE first: it is the cheap, reversible prefix of the north star.

## Decision summary

| | READ_TIME | MINT | **STEP_STATE ★** | EXEC_STATE |
|---|---|---|---|---|
| Capture timing | read-time | execution | execution | execution |
| Converter (the kernel) | required (lazy) | required | required | required |
| New schema | none | none | 1 additive column pair | new model + `Job` FK |
| Production data migration | none | none | **none** | **required for the benefit** |
| Disturbs PR 21932 / in-flight branch | no | no | **no** | yes |
| Public API wire shape | unchanged | unchanged | **unchanged** | changes |
| Historical fidelity | **lossy** | faithful | faithful | faithful |
| Fixes `ToolRequest` conflation | no | no | partially (not imposed) | **yes** |
| Reversible / on the path to EXEC_STATE | n/a | n/a | **yes** | terminal |
| Validity invariant | n/a | **broken** | explicit enum | explicit on model |
| Verdict | ❌ rejected | ⚠️ viable | ✅ **recommended** | 🌟 north star |

## Open questions

- `request_state` enum members: `not_validated` / `validated` / `validation_failed` — add a 4th `converter_failed` for telemetry granularity?
- Does any existing consumer assume `ToolRequest` ⇒ valid? (Audit `_extract_inputs`; carried from [[PR 21932 - History Graph API]] §6.)
- `tool_source` snapshot: do provenance consumers need the serialized source blob, or is the workflow step's `tool_id`/version enough? (Determines whether STEP_STATE is two columns or three.)
- EXEC_STATE trigger: what *independent* need would justify the production backfill later — graph builder simplification alone, or only a broader provenance-model consolidation?
- `request_state` vs `WorkflowInvocationStep.state` (invocation lifecycle): different axes, deliberately `request_`-prefixed — confirm the name before it is in a migration.
