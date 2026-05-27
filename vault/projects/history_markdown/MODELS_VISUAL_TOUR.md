# Models Visual Tour — `workflow_state_backfill`

Companion to [BOOKKEEPING_MODELS.md](BOOKKEEPING_MODELS.md). Same material, visual-first. Aimed at devs reviewing the PR.

---

## TL;DR card

```
ToolExecutionState (TES) is the new seam for tool-execution payloads.
TES owns its ToolSource (tool identity): one row knows its tool + its payload.
Four rows can carry a FK at TES: ToolRequest, Job, ICJ, WIS.
Supersession: ICJ > {Job, WIS}.  (TR may co-point with materialized side.)
Writers: services/jobs.py + workflow modules mint the TES, _execute stamps it.
Readers: History Graph + workflow extract both walk one resolver to the TES.id.
```

---

## 1. Schema — BEFORE / AFTER

### BEFORE (dev today)

```mermaid
erDiagram
    TOOL_SOURCE {
        int id PK
        string hash
        json source
        string source_class
    }
    TOOL_REQUEST {
        int id PK
        int tool_source_id FK
        int history_id FK
        json request "validated payload lives HERE"
        string state
        json state_message
    }
    JOB {
        int id PK
        int tool_request_id FK "nullable"
    }
    IMPLICIT_COLLECTION_JOBS {
        int id PK
    }
    WORKFLOW_INVOCATION_STEP {
        int id PK
        int job_id FK "non-mapped step"
        int implicit_collection_jobs_id FK "mapped step"
    }
    TOOL_REQUEST_IMPLICIT_COLLECTION_ASSOCIATION {
        int id PK
        int tool_request_id FK
        int dataset_collection_id FK
        string output_name
    }

    TOOL_SOURCE ||--o{ TOOL_REQUEST : "implies identity"
    TOOL_REQUEST ||--o{ JOB : "tool_request_id"
    IMPLICIT_COLLECTION_JOBS ||--o{ JOB : "icj_association"
    WORKFLOW_INVOCATION_STEP }o--o| JOB : "non-mapped: wis.job_id"
    WORKFLOW_INVOCATION_STEP }o--o| IMPLICIT_COLLECTION_JOBS : "mapped: wis.implicit_collection_jobs_id"
    TOOL_REQUEST ||--o{ TOOL_REQUEST_IMPLICIT_COLLECTION_ASSOCIATION : implicit_collections
```

**Notice:**
- Tool identity is *implied* by the requester (no `tool_id` / `tool_version` columns on `ToolSource`).
- The validated payload only exists on `ToolRequest.request`. A workflow tool step has no payload row at all.
- `ToolSource.hash` is unconstrained; `hash='TODO'` rows accumulate.
- TRICA is the **producer-side** link for output HDCAs minted via the async tool-request API (closes the provenance gap for jobless / pre-job map-overs where no `JobToOutputDatasetCollectionAssociation` exists). It anchors on `ToolRequest`.

### AFTER (this branch)

```mermaid
erDiagram
    TOOL_SOURCE {
        int id PK
        string hash
        string identity_hash "NEW"
        json source
        string source_class
        string tool_id "NEW"
        string tool_version "NEW"
        int dynamic_tool_id FK "NEW"
    }
    TOOL_EXECUTION_STATE {
        int id PK
        json request "validated payload lives HERE"
        string state "not_validated|validated|validation_failed"
        int tool_source_id FK "NEW; NOT NULL; tool identity for this execution"
    }
    TOOL_REQUEST {
        int id PK
        int history_id FK
        int tool_execution_state_id FK "NEW; request.request column DROPPED; tool_source_id MOVED to TES"
        string state
    }
    JOB {
        int id PK
        int tool_request_id FK "nullable"
        int tool_execution_state_id FK "NEW; null when under ICJ"
    }
    IMPLICIT_COLLECTION_JOBS {
        int id PK
        int tool_execution_state_id FK "NEW; canonical for map-over"
    }
    WORKFLOW_INVOCATION_STEP {
        int id PK
        int job_id FK "non-mapped step"
        int implicit_collection_jobs_id FK "mapped step"
        int tool_execution_state_id FK "NEW; co-points with Job (simple) or ICJ (mapped)"
    }
    TOOL_EXECUTION_IMPLICIT_COLLECTION_ASSOCIATION {
        int id PK
        int tool_execution_state_id FK "NEW; keyed on TES not TR"
        int dataset_collection_id FK "to HDCA"
        string output_name
    }

    TOOL_SOURCE ||--o{ TOOL_EXECUTION_STATE : tool_source_id
    TOOL_EXECUTION_STATE ||--o| TOOL_REQUEST : tool_execution_state_id
    TOOL_EXECUTION_STATE ||--o| JOB : tool_execution_state_id
    TOOL_EXECUTION_STATE ||--o| IMPLICIT_COLLECTION_JOBS : tool_execution_state_id
    TOOL_EXECUTION_STATE ||--o| WORKFLOW_INVOCATION_STEP : tool_execution_state_id
    TOOL_REQUEST ||--o{ JOB : tool_request_id
    IMPLICIT_COLLECTION_JOBS ||--o{ JOB : icj_association
    WORKFLOW_INVOCATION_STEP }o--o| JOB : "non-mapped: wis.job_id"
    WORKFLOW_INVOCATION_STEP }o--o| IMPLICIT_COLLECTION_JOBS : "mapped: wis.implicit_collection_jobs_id"
    TOOL_EXECUTION_STATE ||--o{ TOOL_EXECUTION_IMPLICIT_COLLECTION_ASSOCIATION : implicit_collection_associations
```

**Notice:**
- Tool identity hangs off the **execution event**, not the request. One uniform invariant: every TES knows its tool.
- Dedupe by `UNIQUE(hash, source_class, identity_hash)` on `tool_source`.
- One payload table, four inbound FKs. `tool_request.request` and `tool_request.tool_source_id` both gone — TES is the canonical owner of both payload and identity.
- **WIS has two execution-side FKs**: `job_id` for simple steps, `implicit_collection_jobs_id` for mapped steps. They are mutually exclusive at the row level.
- **TES co-pointing is the rule, not the exception.** For a workflow step, WIS holds its TES forever; once the execution materializes, the Job (simple) or ICJ (mapped) is stamped with the *same* TES row. No move, no null-out. The only TES-pointer invariant is "ICJ supersedes its constituent Jobs": a Job under an ICJ doesn't carry TES — the ICJ does. WIS freely co-points with either Job or ICJ.
- **All four TES back-pops are 1..[0,1].** Enforced by a partial-`UNIQUE(tool_execution_state_id)` on each of `tool_request`, `job`, `implicit_collection_jobs`, `workflow_invocation_step` (PostgreSQL/SQLite multi-NULL-under-UNIQUE keeps rows without a TES link legal).
- **TRICA → TEICA.** The producer-side bookkeeping was rekeyed off `ToolRequest` onto `ToolExecutionState`. `ToolExecutionImplicitCollectionAssociation` (TEICA) is written once at execute time alongside the HDCA mint; `HDCA.copy()` does not carry a TEICA row. Readers (History Graph, `tr.output_collections`, `tool_request_detailed_to_model`) walk `HDCA → TEICA → TES → ToolRequest`, and the join itself excludes copies — no `copied_from_*_id IS NULL` filter needed. The earlier "drop TRICA, walk via `HDCA → ICJ → TES → TR`" approach was reversed because that walk would return copies as if they were originals: `HDCA.copy()` inherits `implicit_collection_jobs_id`. TEICA preserves TRICA's write-once originals-only semantic.

Migrations: `0b49ffb1e890` (identity cols on tool_source), `28885b317f78` (TES table + backfill + drop request column), `29fe58dda936` (identity_hash + unique), `395148707459` (move tool_source_id from TR to TES), `10c4cd393d5a` (replace TRICA with TEICA + UNIQUE TES back-pops).

### AFTER, tiered by responsibility

Same model, organized by what each layer is responsible for. Read top→bottom: each tier consumes the one above and is referenced by the one below.

```mermaid
flowchart TD
    subgraph T1["Tier 1 — PROVIDES SOURCE"]
        TS["ToolSource<br/>tool_id · tool_version · dynamic_tool_id<br/>identity_hash · source · source_class"]
    end

    subgraph T2["Tier 2 — RECORDS VALIDATED STATE"]
        TES["ToolExecutionState<br/>request · state · tool_source_id"]
    end

    subgraph T3["Tier 3 — TRACK JOB SCHEDULING"]
        TR["ToolRequest<br/>tool_execution_state_id · history_id · state"]
        WIS["WorkflowInvocationStep<br/>tool_execution_state_id · job_id · icj_id"]
    end

    subgraph T4["Tier 4 — JOB TRACKING"]
        JOB["Job<br/>tool_execution_state_id · tool_request_id"]
        ICJ["ImplicitCollectionJobs<br/>tool_execution_state_id"]
    end

    subgraph T5["Tier 5 — JOB MEMBERSHIP"]
        ICJJA["ImplicitCollectionJobsJobAssociation<br/>implicit_collection_jobs_id · job_id"]
    end

    TS  --> TES
    TES --> TR
    TES --> WIS
    TES --> JOB
    TES --> ICJ
    TR  --> JOB
    WIS -. "non-mapped (wis.job_id)" .-> JOB
    WIS -. "mapped (wis.icj_id)" .-> ICJ
    ICJ --> ICJJA
    JOB --> ICJJA
```

**How to read it:**
- Solid arrows = `tool_source_id` / `tool_execution_state_id` / `tool_request_id` / membership FK lineage (the canonical seam; arrow points from the referenced row down to the row carrying the FK).
- Dotted arrows = scheduling-time FKs that pin a JOB-tier row to its scheduling-tier owner (only one of `wis.job_id` / `wis.icj_id` populated per WIS row).
- Tiers 3 and 4 are **paired**: TR↔WIS are two scheduling surfaces (async-API vs workflow), JOB↔ICJ are two execution shapes (single vs map-over). Each pair shares the same TES seam.
- Tier 5 makes "ICJ supersedes its Jobs" mechanical: the invariant check walks ICJJA from an ICJ to its constituent Jobs and rejects any Job that also carries a TES FK. WIS can still co-point with either side at the same TES.

---

## 2. Who can own a TES row?

```mermaid
flowchart TD
    TES[ToolExecutionState row]

    TR[ToolRequest]
    J[Job - no ICJ]
    ICJ[ImplicitCollectionJobs]
    WIS[WorkflowInvocationStep]

    TR -- "request side" --> TES
    J  -- "simple job" --> TES
    ICJ -- "map-over canonical" --> TES
    WIS -- "workflow step (co-points with Job or ICJ)" --> TES

    J_UNDER_ICJ[Job under an ICJ]:::illegal
    BOTH[ICJ + its child Job]:::illegal

    J_UNDER_ICJ -. forbidden .-> TES
    BOTH -. forbidden .-> TES

    classDef illegal stroke:#c00,stroke-dasharray:5 3,color:#c00;
```

**The rule** (enforced by `__strict_check_before_flush__` on `Job` and `ICJ`):
ICJ supersedes its constituent Jobs. When the ICJ carries the link, no constituent Job may carry one too.

**Explicit co-pointing is allowed:**
- `ToolRequest` + materialized `Job`/`ICJ` at the same TES (request side + materialized side).
- `WIS` + `Job` (simple workflow step) at the same TES.
- `WIS` + `ICJ` (mapped workflow step) at the same TES.

---

## 3. Write paths

### 3a. Simple job (async tool-request API)

```mermaid
sequenceDiagram
    autonumber
    actor U as Client
    participant SVC as services/jobs.py::create
    participant TSM as get_or_create_tool_source
    participant DB as DB
    participant Q as QueueJobs (celery)
    participant JS as JobSubmitter.queue_jobs
    participant EX as tools/execute.py::_execute

    U->>SVC: tool request
    SVC->>TSM: lookup-or-create (identity_hash dedupe)
    TSM-->>DB: ToolSource row
    SVC->>DB: TES(state=VALIDATED, request=request_internal, tool_source=ToolSource)
    SVC->>DB: ToolRequest.tool_execution_state_id = TES.id
    SVC->>Q: { tool_request_id, ... }  (slim payload)
    Q->>JS: worker picks up
    JS->>DB: tool_request_payload(tool_request) → TES.request
    JS->>EX: _execute(...)
    EX->>DB: Job.tool_execution_state_id = TES.id
```

### 3b. Map-over (collection_info truthy → ICJ created)

Identical to 3a through step 8, then diverges:

```mermaid
sequenceDiagram
    autonumber
    participant EX as tools/execute.py::_execute
    participant POC as precreate_output_collections
    participant DB as DB

    EX->>POC: collection_info present
    POC->>DB: ICJ row created
    POC->>DB: ICJ.tool_execution_state_id = TES.id
    Note over DB: Job.tool_execution_state_id stays NULL (invariant)
```

### 3c. Workflow tool step

```mermaid
sequenceDiagram
    autonumber
    participant WM as workflow/modules.py::_capture_workflow_tool_request_state
    participant DB as DB
    participant EX as _execute
    participant TR as WorkflowStepExecutionTracker.ensure_implicit_collections_populated

    WM->>DB: TES always minted with tool_source=get_or_create_tool_source(tool)
    Note over WM,DB: tool_source FK on TES is NOT NULL — uniform with TR mint side
    WM->>DB: WIS.tool_execution_state_id = TES.id
    WM->>EX: MappingParameters carries validated_param_template/combinations
    EX->>TR: produce ICJ once outputs known (mapped step)
    TR->>DB: ICJ.tool_execution_state_id = TES.id (WIS link stays — co-pointing)
```

`_capture_workflow_tool_request_state` writes one TES per **step execution** (whole map-over), not per iteration. It uses `MappedCollectionInput` descriptors (`src=hdca|dce`, `map_over_type`, `linked=True`) instead of per-iteration sliced values — the converter re-applies the slice.

---

## 4. Read paths

### 4a. History Graph

```mermaid
flowchart LR
    HDA[HDA/HDCA]:::item --> P[_producers]
    P --> J[Job<br/>via JTODA/JTODCA]
    P --> TR[ToolRequest<br/>via HDCA→TEICA→TES→TR]

    J --> RJ["resolve_structured_request(job=...)"]
    TR --> RT["resolve_structured_request(tool_request=...)"]

    subgraph walk[_tes_from_job walk]
        direction TB
        Q1{job under ICJ?} -- yes --> ICJ_TES[ICJ.tool_execution_state]
        Q1 -- no --> Q2{job.tes set?}
        Q2 -- yes --> J_TES[Job.tool_execution_state]
        Q2 -- no --> WIS_TES[WIS.tool_execution_state]
    end

    RJ --> walk
    walk --> RR
    RT --> TR_TES[ToolRequest.tool_execution_state]
    TR_TES --> RR

    RR["ResolvedStructuredRequest(<br/>source_id=TES.id, payload, state)"]
    RR --> NODE[producer node = TES.id<br/>cipher=TOOL_EXECUTION_STATE_ENCODE_KIND<br/>src=tool_execution]
    NODE --> EDGES[input edges from<br/>request_internal_input_refs payload]

    classDef item fill:#eef
```

**Convergence** — three execution shapes, one producer node:

```mermaid
flowchart LR
    SJ[Simple job<br/>1 Job, 1 HDA] --> N1((TES.id))
    MO[Map-over<br/>N Jobs in 1 ICJ<br/>N HDAs] --> N1
    TR[Jobless tool request<br/>0 Jobs, 1 HDCA] --> N1
    N1 --> RENDER[1 producer node in graph]
```

### 4b. Workflow extraction (`extract_steps_by_ids`)

```mermaid
flowchart TD
    subgraph wire["wire payload (WorkflowExtractionByIdsPayload)"]
        J_IDS["job_ids"]
        ICJ_IDS["implicit_collection_jobs_ids"]
        TR_IDS["tool_request_ids"]
    end

    J_IDS --> J_WI["_WorkItem(job=...)"]
    ICJ_IDS --> SVC_ROUTE{"service:<br/>icj.tool_execution_state.tool_request set?"}
    SVC_ROUTE -- yes --> TR_IDS
    SVC_ROUTE -- no --> ICJ_CLASSIC["representative job<br/>+ resolve(icj=...)"]
    TR_IDS --> TR_WI["_tool_request_work_item"]

    J_WI --> SEAM
    ICJ_CLASSIC --> SEAM
    TR_WI --> SEAM

    SEAM["resolve_structured_request<br/>→ ResolvedStructuredRequest"]
    SEAM --> STATE{"state"}
    STATE -- "VALIDATED" --> T1["Tier 1<br/>key = TES.id"]
    STATE -- "NOT_VALIDATED,<br/>VALIDATION_FAILED,<br/>MISSING" --> LEG{"legacy fallback<br/>enabled?"}
    LEG -- "yes" --> T0["Tier 0<br/>key = Job.id"]
    LEG -- "no" --> SKIP["skip / hard fail"]

    T0 --> ORDER["sort key = (tier, id)"]
    T1 --> ORDER
```

**Why this matters** — tier-1 ids share one comparable space (TES.id), so the two service-layer mix-guards (TR-keyed vs. job-keyed; job-keyed ICJs vs. TR-keyed ICJs) dropped out. They existed only because the underlying ids weren't comparable.

**Routing happens at the service.** `WorkflowsService.extract_by_ids` walks `icj.tool_execution_state.tool_request` for every submitted ICJ id and moves the TR-backed ones into `tool_request_ids` before invoking `extract_steps_by_ids`. Extract therefore sees a clean TR/ICJ split: the `implicit_collection_jobs_ids` loop handles classic map-overs only, and the prior per-HDCA peek through `tool_request_association` is gone.

Associations come from `request_internal_input_refs(payload)`, **not** `JobToInputDataset*` rows — so map-over connections wire to pre-map input HDCAs, not sliced elements.

---

## 5. Tool resolution — one helper

```mermaid
flowchart TD
    CALL["tool_for_execution(<br/>strategy=, tool_execution_state=,<br/>tool_id=, tool_version=,<br/>dynamic_tool=, tool_source=)"]
    CALL --> SHAPE{input shape}
    SHAPE -- "tool_execution_state=" --> TES_DERIVE[derive all 4 primitives<br/>from tes.tool_source]
    SHAPE -- "primitives" --> PRIM[use kwargs directly]
    SHAPE -- "both supplied" --> ERR[TypeError: mutually exclusive]

    TES_DERIVE --> STRAT{strategy}
    PRIM --> STRAT

    STRAT -- "toolbox" --> TB
    STRAT -- "rebuild" --> MR

    TB[toolbox lookup first<br/>authoritative for registered tools]
    MR[rebuild from ToolSource first<br/>authoritative for TR-sourced / jobless]

    TB -- MessageException / miss --> FB1[fallback: rebuild]
    MR -- not found --> FB2[fallback: toolbox]

    TB --> RET[Tool or None]
    MR --> RET
    FB1 --> RET
    FB2 --> RET
```

- `strategy=` is **required** (`"toolbox"` or `"rebuild"`) — no more inference from kwargs. `"rebuild"` was renamed from the prior `"model"`.
- `tool_execution_state=` is the preferred input shape: the TES carries every identity primitive symmetrically via its `tool_source`. Mutually exclusive with the primitive kwargs.
- `ResolvedStructuredRequest` now carries the producing TES, so extract routes it straight in without re-walking identity.
- Display sites (History Graph) get `None` on failure — `MessageException` is swallowed.
- Extract sites re-assert `tool is not None` because a missing tool at extract time is a hard failure.
- One call site for all three consumers: History Graph display, extract's job branch, extract's tool-request rebuild. The prior `_tool_from_request` / `_tool_for_job` inline helpers in `workflow/extract.py` are gone.
- Cache: rebuild path here is uncached; `galaxy.celery.tasks` keeps a worker-local `cached_create_tool_from_representation` for `queue_jobs`/`finish_job` hot paths. Collapsing the two cache homes is a documented follow-up.

---

## 6. Migrations at a glance

| Revision | Touches | Adds | Drops | Backfill |
|---|---|---|---|---|
| `0b49ffb1e890` | `tool_source` | `tool_id`, `tool_version`, `dynamic_tool_id` cols | — | Identity from existing requesters where derivable |
| `28885b317f78` | `tool_execution_state` (new), `tool_request`, `job`, `icj`, `wis` | TES table + 4 inbound FK cols | `tool_request.request` | One TES per `tool_request` (reuse id, 1:1); join to Job FK; null Job FK if Job has ICJ and stamp ICJ. WIS FKs left intact — WIS co-points with Job/ICJ at the same TES. |
| `29fe58dda936` | `tool_source` | `identity_hash` col + `UNIQUE(hash, source_class, identity_hash)` | duplicate rows (repoint to survivor) | Compute identity_hash; merge duplicates by repointing `tool_request.tool_source_id` |
| `395148707459` | `tool_execution_state`, `tool_request` | `tool_execution_state.tool_source_id` (NOT NULL FK) | `tool_request.tool_source_id`; orphan TES rows (no path to a ToolSource) | Copy `tool_source_id` from each TR to its linked TES; clear WIS link + DELETE any TES still NULL; promote column to NOT NULL |
| `10c4cd393d5a` | `tool_execution_implicit_collection_association` (new), `tool_request_implicit_collection_association`, `tool_request`, `job`, `implicit_collection_jobs`, `workflow_invocation_step` | TEICA table; `UNIQUE(tool_execution_state_id)` on each of the four TES-back-pop tables (partial via NULL-permissive UNIQUE) | TRICA table | Upgrade: create TEICA, lift TR-keyed rows via `tool_request.tool_execution_state_id` into TES-keyed TEICA rows, then drop TRICA. Skip TRICA rows whose TR has no TES (pre-EXEC_STATE imports). Downgrade: recreate TRICA, repopulate from TEICA via TES→TR. |

---

## 7. Glossary

| Term | Class | Role |
|---|---|---|
| **TES** | `ToolExecutionState` | Validated `request_internal` payload; one row per execution event |
| **TR** | `ToolRequest` | User-facing tool-request mint; request side of an execution |
| **ICJ** | `ImplicitCollectionJobs` | Canonical anchor for a map-over execution |
| **WIS** | `WorkflowInvocationStep` | Workflow tool step row; transient TES owner before ICJ exists |
| **TRICA** | `ToolRequestImplicitCollectionAssociation` | *Replaced by TEICA in `10c4cd393d5a`.* Was the TR-keyed producer link to output HDCAs. Still appears in the BEFORE diagram. |
| **TEICA** | `ToolExecutionImplicitCollectionAssociation` | TES-keyed producer link to output HDCAs. Written once at execute time; copies of an HDCA do not carry a TEICA row, so reader walks (`HDCA → TEICA → TES → TR`) naturally return originals only. |
| **JTODA / JTODCA** | `JobToOutputDataset(Collection)Association` | Job-side producer link |

---

## See also

- [BOOKKEEPING_MODELS.md](BOOKKEEPING_MODELS.md) — prose-level summary, commit list, file:line anchors.
- `lib/galaxy/managers/workflow_request_state.py` — `resolve_structured_request` resolver.
- `lib/galaxy/managers/tool_execution.py` — `tool_for_execution` helper.
- `lib/galaxy/managers/tool_source.py` — `get_or_create_tool_source`.
- `lib/galaxy/workflow/modules.py::_capture_workflow_tool_request_state` — workflow-side TES writer.
- `lib/galaxy/workflow/extract.py::extract_steps_by_ids` — read-side extract.
- `lib/galaxy/managers/history_graph.py` — read-side graph build.
