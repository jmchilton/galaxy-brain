---
type: research
subtype: pr
tags: [research/pr, galaxy/api, galaxy/client]
status: draft
created: 2026-02-13
revised: 2026-02-13
revision: 1
ai_generated: true
github_pr: 21706
github_repo: galaxyproject/galaxy
---

# PR #21706 Research Summary: Data Analysis Agent Integration

## PR Metadata

| Field | Value |
|-------|-------|
| **Title** | Data analysis agent integration |
| **Number** | #21706 |
| **URL** | https://github.com/galaxyproject/galaxy/pull/21706 |
| **State** | OPEN (not merged) |
| **Author** | qchiujunhao (JunhaoQiu) |
| **Base Branch** | dev |
| **Head Branch** | da-integration |
| **Changed Files** | 34 |
| **Additions** | 8,614 |
| **Deletions** | 103 |
| **Labels** | area/documentation, area/UI-UX, area/testing, kind/feature, area/API, area/util, area/dependencies, area/testing/integration |

## Summary

This PR integrates a "chat with your data" interactive tool into Galaxy's agent framework. It adds a new `data_analysis` agent type that uses DSPy (CodeReact/ReAct modules) to generate Python analysis code, which is then executed **in the browser** using Pyodide (a WebAssembly Python runtime). The generated code can load user-selected datasets, produce plots/tables/files, and upload the resulting artifacts back to Galaxy as history datasets.

The architecture is a multi-step loop:
1. User selects datasets in the ChatGXY UI and asks a question
2. The router agent detects a data analysis request and hands off to `DataAnalysisAgent`
3. `DataAnalysisAgent` uses DSPy to plan the analysis and generate Python code
4. The backend returns a `pyodide_task` in the response metadata
5. The frontend's Pyodide Web Worker executes the code in the browser
6. Results (stdout/stderr/artifacts) are POSTed back to the server via `/api/chat/exchange/{id}/pyodide_result`
7. The server generates a follow-up agent response incorporating the execution results
8. WebSocket streaming pushes the follow-up to the UI in real time

---

## Architecture Overview

```
User Query + Dataset Selection
        |
        v
  ChatGXY.vue (frontend)
        |
        v
  POST /api/chat  (with dataset_ids)
        |
        v
  QueryRouterAgent --> hand_off_to_data_analysis
        |
        v
  DataAnalysisAgent.process()
        |
        v
  GalaxyDSPyPlanner.plan()  (DSPy CodeReact/ReAct)
        |
        v
  Response with metadata.pyodide_task = { code, packages, files, alias_map }
        |
        v
  Frontend: usePyodideRunner -> pyodide.worker.ts (Web Worker)
        |
        v
  Pyodide executes Python, generates artifacts
        |
        v
  POST /api/chat/exchange/{id}/artifacts  (upload each artifact as HDA)
  POST /api/chat/exchange/{id}/pyodide_result  (submit execution results)
        |
        v
  ChatExecutionService -> DataAnalysisAgent (follow-up reasoning)
        |
        v
  WebSocket broadcast -> ChatGXY.vue updates UI
```

---

## File Inventory

### New Files (14 files -- none exist in current codebase)

| File | Lines | Purpose |
|------|-------|---------|
| `client/src/components/ChatGXY/pyodide.worker.ts` | ~570 | Web Worker: loads Pyodide, downloads datasets to virtual FS, executes Python, collects artifacts |
| `client/src/composables/usePyodideRunner.ts` | ~146 | Vue composable: manages Worker lifecycle, pending task map, result routing |
| `lib/galaxy/agents/data_analysis.py` | ~1047 | `DataAnalysisAgent` class: orchestrates DSPy planning, builds pyodide tasks, manages execution lifecycle |
| `lib/galaxy/agents/dataset_resolver.py` | ~62 | Resolves dataset references (by name/HID/ID) for DSPy tool calls |
| `lib/galaxy/agents/dspy_adapter.py` | ~634 | DSPy integration: `GalaxyDSPyPlanner`, `CodeCaptureTool`, `DatasetLookupTool`, `GalaxyDataAnalysisModule` |
| `lib/galaxy/agents/examples.json` | ~56 (JSON) | Few-shot examples for DSPy planner (EDA, correlation, histograms, ML, etc.) |
| `lib/galaxy/chat_dspy.py` | ~1940 | Vendored DSPy workflow from ChatAnalysis project (reference implementation) |
| `lib/galaxy/managers/chat_execution.py` | ~315 | `ChatExecutionService`: handles pyodide result submissions, follow-up reasoning, artifact collection creation |
| `lib/galaxy/util/pyodide.py` | ~259 | Shared utilities: `infer_requirements_from_python()`, `merge_execution_metadata()`, `dataset_descriptors_from_files()` |
| `doc/source/dev/data_analysis_temp_overview.md` | ~39 | Temporary implementation notes |
| `test/unit/agents/__init__.py` | 2 | Package init |
| `test/unit/agents/test_dspy_adapter_requirements.py` | ~36 | Unit tests for `infer_requirements_from_python()` |
| `test/unit/managers/__init__.py` | 2 | Package init |
| `test/unit/managers/test_chat_execution_metadata.py` | ~85 | Unit tests for `merge_execution_metadata()` |

### Modified Files (20 files)

| File | Current Status | Changes in PR |
|------|----------------|---------------|
| `.gitignore` | EXISTS | Adds `logs*.md` pattern |
| `client/src/api/index.ts` | EXISTS, **no PR changes present** | Adds `HDACustom` type export |
| `client/src/components/ChatGXY.vue` | EXISTS, **no PR changes present** | Massive expansion (~1800+ lines): dataset selection, Pyodide execution loop, WebSocket streaming, artifact display, collapsible intermediate steps, analysis steps UI. Renames `dataset_analyzer` -> `data_analysis`, `faChartBar` -> `faMicroscope` |
| `client/src/components/ChatGXY/ActionCard.vue` | EXISTS, **no PR changes present** | Minor: adds `shouldShowArtifacts` function |
| `client/src/composables/agentActions.ts` | EXISTS, **no PR changes present** | Adds `PYODIDE_EXECUTE` action type |
| `lib/galaxy/agents/__init__.py` | EXISTS, **no PR changes present** | Registers `DataAnalysisAgent` with try/except for optional deps |
| `lib/galaxy/agents/base.py` | EXISTS, **no PR changes present** | Adds `DATA_ANALYSIS` to `AgentType`, adds `USE_PYDANTIC_AGENT` flag, makes `agent` attribute Optional |
| `lib/galaxy/agents/orchestrator.py` | EXISTS, **no PR changes present** | Adds `data_analysis` to available agents list |
| `lib/galaxy/agents/prompts/orchestrator.md` | EXISTS, **no PR changes present** | Adds data_analysis to agent list |
| `lib/galaxy/agents/prompts/router.md` | EXISTS, **no PR changes present** | Adds routing rules for `hand_off_to_data_analysis` |
| `lib/galaxy/agents/router.py` | EXISTS, **no PR changes present** | Adds `_create_data_analysis_handoff()`, sentinel-based handoff to DataAnalysisAgent in `process()`, dataset context injection |
| `lib/galaxy/dependencies/__init__.py` | EXISTS, **no PR changes present** | Adds `check_dspy_ai()` method |
| `lib/galaxy/dependencies/conditional-requirements.txt` | EXISTS, **no PR changes present** | Adds `dspy-ai==2.5.43` and `itsdangerous==2.2.0` |
| `lib/galaxy/managers/agents.py` | EXISTS, **no PR changes present** | Adds dataset token signing (`itsdangerous`), `_execute_data_analysis_dspy()` method, `_build_pyodide_task()`, `_dataset_descriptors()` |
| `lib/galaxy/managers/chat.py` | EXISTS, **no PR changes present** | Adds `execution_result` role handling, `dataset_ids` in conversation data, richer message format for agents |
| `lib/galaxy/schema/agents.py` | EXISTS, **no PR changes present** | Adds `PYODIDE_EXECUTE` action type, `Artifact`, `ExecutionTask`, `ExecutionResult` models |
| `lib/galaxy/schema/schema.py` | EXISTS, **no PR changes present** | Adds `agent_type`, `dataset_ids` to `ChatPayload`; new `PyodideResultPayload` model; adds `exchange_id`, `agent_response`, `dataset_ids`, `routing_info` to `ChatResponse`; `extra="allow"` on `ChatResponse` |
| `lib/galaxy/webapps/galaxy/api/chat.py` | EXISTS, **no PR changes present** | Adds 6+ new endpoints: artifact upload, dataset download (signed token), WebSocket streaming, pyodide result submission; adds execution timeout/expiry logic, artifact URL refresh |
| `pyproject.toml` | EXISTS, **no PR changes present** | Adds `agents` optional dependency group |
| `test/integration/test_agents.py` | EXISTS, **no PR changes present** | Adds `test_chat_with_dataset_context_records_execution_metadata` |

---

## Key Patterns and Conventions

### 1. Optional Dependency Pattern
DSPy and itsdangerous are optional. All imports use try/except guards:
```python
try:
    from .data_analysis import DataAnalysisAgent
except ImportError:
    DataAnalysisAgent = None
```

### 2. USE_PYDANTIC_AGENT Flag
`DataAnalysisAgent` sets `USE_PYDANTIC_AGENT = False` because it uses DSPy instead of pydantic-ai. `BaseGalaxyAgent.__init__()` checks this flag.

### 3. Sentinel-Based Handoff
The router uses a string sentinel `__HANDOFF_TO_DATA_ANALYSIS__::` to signal handoff. When `process()` sees this prefix, it instantiates `DataAnalysisAgent` and runs it with the full context.

### 4. Signed Dataset Download Tokens
Uses `itsdangerous.URLSafeTimedSerializer` to create time-limited signed tokens for dataset downloads. The Pyodide worker fetches datasets via `/api/chat/datasets/{id}/download?token=...`.

### 5. WebSocket Streaming
A per-exchange WebSocket at `/api/chat/exchange/{id}/stream` pushes `exec_followup` messages to the frontend after pyodide result processing completes.

### 6. Pyodide Task Lifecycle
States: `pending` -> `running` -> `completed`/`error`/`timeout`. The frontend tracks these via `metadata.pyodide_status` and `pyodideExecutions` reactive map.

### 7. Collapsible Intermediate Messages
Multi-step analysis produces intermediate messages that are auto-collapsed in the UI. Only the final "complete" message is shown expanded.

---

## API Changes

### New Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/chat/datasets/{dataset_id}/download` | Stream dataset file with signed token auth |
| POST | `/api/chat/exchange/{exchange_id}/artifacts` | Upload Pyodide-generated artifacts as HDAs |
| POST | `/api/chat/exchange/{exchange_id}/pyodide_result` | Submit execution results, trigger follow-up |
| WS | `/api/chat/exchange/{exchange_id}/stream` | Real-time execution follow-up delivery |

### Modified Endpoints

| Method | Path | Changes |
|--------|------|---------|
| POST | `/api/chat` | Accepts `agent_type` and `dataset_ids` in body; returns `dataset_ids`, `agent_response`, `exchange_id` |
| GET | `/api/chat/exchange/{id}/messages` | Returns `execution_result` role messages, `dataset_ids`, refreshed artifact URLs, stale pyodide task expiry |

### Schema Changes

**`ChatPayload`**: Added `agent_type: Optional[str]`, `dataset_ids: Optional[list[str]]`

**`ChatResponse`**: Added `model_config = ConfigDict(extra="allow")`, `exchange_id`, `agent_response`, `dataset_ids`, `routing_info`

**New `PyodideResultPayload`**: `task_id`, `stdout`, `stderr`, `artifacts`, `metadata`, `success`

**`AgentResponse` (agents.py)**: Added `PYODIDE_EXECUTE` action type

**New models**: `Artifact`, `ExecutionTask`, `ExecutionResult`

---

## Frontend Changes

### ChatGXY.vue (massive expansion)
- **Dataset selector**: Uses `FormData` component to let users pick datasets from current history
- **Pyodide execution loop**: Manages Web Worker lifecycle, task queuing, retry limits
- **WebSocket integration**: Opens per-exchange WS connection for real-time updates
- **Artifact display**: Image previews, download buttons, size formatting
- **Analysis steps UI**: Thought/Action/Observation/Conclusion step rendering
- **Collapsible messages**: Auto-collapse intermediate steps, expand final results
- **Busy state**: `isChatBusy` computed ref blocks input during execution

### New Composable: usePyodideRunner.ts
- Singleton Web Worker pattern
- Promise-based task execution with stdout/stderr/status hooks
- Automatic artifact buffer extraction from Worker messages

### New Worker: pyodide.worker.ts
- Loads Pyodide v0.26.1 from CDN
- Package installation via `loadPackage` + micropip fallback
- Virtual filesystem: `/data` for inputs, `/tmp/galaxy/outputs_dir/generated_file` for outputs
- Seeds Python env with `load_dataset()`, `get_dataset_path()` helpers
- Pre-execution AST syntax check
- Post-execution scalar summary + new file detection
- Artifact collection with MIME type guessing

---

## Cross-Reference with Current Codebase

### Files That Need to Be Created (not in current codebase)
All 14 new files from the PR are absent. Key ones:
- `lib/galaxy/agents/data_analysis.py` (1047 lines)
- `lib/galaxy/agents/dspy_adapter.py` (634 lines)
- `lib/galaxy/managers/chat_execution.py` (315 lines)
- `lib/galaxy/util/pyodide.py` (259 lines)
- `client/src/composables/usePyodideRunner.ts` (146 lines)
- `client/src/components/ChatGXY/pyodide.worker.ts` (570 lines)

### Files That Exist But Have NOT Been Modified
Every existing file that the PR modifies (20 files) currently shows **no trace** of the PR's changes. Specifically:
- `HDACustom` type is not exported in `client/src/api/index.ts`
- `dataset_analyzer` still exists (not renamed to `data_analysis`) in `ChatGXY.vue`
- `PYODIDE_EXECUTE` not in `agentActions.ts` or `schema/agents.py`
- `DATA_ANALYSIS` not in `AgentType` class
- `USE_PYDANTIC_AGENT` flag not in `base.py`
- No handoff to data_analysis in `router.py`
- No `check_dspy_ai` in `dependencies/__init__.py`
- No `dspy-ai` or `itsdangerous` in `conditional-requirements.txt`
- No `dataset_ids` in `ChatPayload` or `ChatResponse`
- No `PyodideResultPayload` in `schema.py`
- No artifact/streaming/pyodide endpoints in `api/chat.py`
- No `ChatExecutionService` anywhere

### Notable Divergence Points
The current codebase's `ChatGXY.vue` still has `dataset_analyzer` (line 83) with `faChartBar`. The PR renames this to `data_analysis` with `faMicroscope`.

The current `base.py` has `agent: Agent[GalaxyAgentDependencies, Any]` as required (not Optional). The PR makes it Optional and adds the `USE_PYDANTIC_AGENT` bypass.

---

## Design Decisions

1. **Browser-side execution**: Code runs in Pyodide (WASM Python in browser) rather than server-side. This avoids sandboxing concerns on the server but limits available packages to those compiled for WASM.

2. **DSPy over pydantic-ai**: The data analysis agent uses DSPy's CodeReact/ReAct modules instead of pydantic-ai. This is why `USE_PYDANTIC_AGENT = False` exists.

3. **Signed download tokens**: Dataset downloads for Pyodide use `itsdangerous` signed tokens with configurable TTL (default 600s) rather than session cookies, since the Web Worker can't access cookies.

4. **Vendored reference**: `lib/galaxy/chat_dspy.py` (1940 lines) is a vendored copy from the ChatAnalysis project. It imports `psycopg2`, `pandas`, `dotenv`, `nicegui` etc. and appears to be a reference/legacy implementation that is NOT used at runtime.

5. **Artifact-as-HDA pattern**: Generated files are uploaded as standard Galaxy HDAs, maintaining compatibility with the existing history system. Multiple artifacts get grouped into a list collection.

6. **WebSocket for follow-ups**: Instead of polling, the UI opens a WebSocket per exchange to receive execution follow-up messages in real time.

7. **Intermediate message collapsing**: Multi-turn agent reasoning (plan -> execute -> observe -> refine) is collapsed in the UI to keep the conversation clean.

---

## Dependencies Added

- `dspy-ai==2.5.43` (conditional: when AI backend configured)
- `itsdangerous==2.2.0` (conditional: when AI backend configured)

---

## Test Coverage

- **Integration test**: `test_chat_with_dataset_context_records_execution_metadata` -- verifies dataset_ids flow through chat API and persist in exchange messages
- **Unit tests**:
  - `test_dspy_adapter_requirements.py` -- tests `infer_requirements_from_python()` (import mapping, explicit markers, stdlib filtering)
  - `test_chat_execution_metadata.py` -- tests `merge_execution_metadata()` (pyodide_context preference, descriptor fallback, plot/file inference from artifacts)

---

## Potential Integration Concerns

1. **`lib/galaxy/chat_dspy.py`** (1940 lines) imports heavy dependencies (`psycopg2`, `pandas`, `nicegui`) that may not be available. It appears to be unused reference code -- may want to exclude from integration.

2. The PR is based on `dev` branch, not `master`. There may be changes in dev that haven't reached the current `history_markdown` branch.

3. `ChatResponse` gets `ConfigDict(extra="allow")` which is a breaking schema change -- may affect API clients.

4. The `USE_PYDANTIC_AGENT` pattern in `BaseGalaxyAgent` changes the constructor signature for all agents.

5. The `agent: Optional[Agent]` change in base.py could have downstream effects if any code assumes `self.agent` is always set.

6. The `effective_agent_type` logic in `api/chat.py` prefers body `agent_type` over query param -- potential breaking change for existing callers using query param.
