---
type: research
subtype: pr
tags: [research/pr, galaxy/api, galaxy/client]
status: draft
created: 2026-02-13
revised: 2026-02-13
revision: 1
ai_generated: true
github_pr: 21692
github_repo: galaxyproject/galaxy
---

# PR #21692 Research: Standardize Agent API Schemas and Response Metadata

## PR Metadata

| Field | Value |
|-------|-------|
| **Title** | [26.0] Standardize agent API schemas and response metadata |
| **State** | MERGED |
| **Base Branch** | `release_26.0` |
| **Head Branch** | `agent-response-standardization` |
| **Author** | Dannon Baker (`dannon`) |
| **Reviewer** | mvdbeek (APPROVED) |
| **Merge Commit** | `b8b3ba4e2c` |
| **Commits** | 14 |
| **Date Range** | 2026-01-28 to 2026-02-11 |

## Summary

Cleanup/standardization pass on Galaxy's AI agent system before the 26.0 release. The PR addresses five themes:

1. **Consistent response metadata** - agent responses were losing metadata (exchange_id, token usage, model name) when routed through the router agent. Added `_build_metadata()` / `_build_response()` helper methods to base agent class.
2. **Schema typing** - `ChatResponse.agent_response` changed from untyped `dict[str, Any]` to `Optional[AgentResponse]`. Added `processing_time`, `exchange_id`, `regenerate`, `save_exchange` fields.
3. **API deprecation** - `/api/ai/agents/query` deprecated (duplicates `/api/chat`). Dead fields (`routing_info`, `stream`) removed.
4. **Suggestion validation** - `model_validator` on `ActionSuggestion` enforces required params per action type (TOOL_RUN needs tool_id, SAVE_TOOL needs tool_yaml, VIEW_EXTERNAL needs url). TOOL_RUN suggestions validated against toolbox. REFINE_QUERY action type removed.
5. **Enum consistency** - `ConfidenceLevel` enum used everywhere instead of raw strings. Unused `HandoffInfo` schema removed. `TokenUsage` model removed.

## Files Changed (15 files)

### Agent Core (Backend Python)

| PR Path | Local Path | Status | +/- |
|---------|------------|--------|-----|
| `lib/galaxy/agents/base.py` | Same | Unchanged after merge | +120/-46 |
| `lib/galaxy/agents/custom_tool.py` | Same | Unchanged after merge | +37/-31 |
| `lib/galaxy/agents/error_analysis.py` | Same | Unchanged after merge | +30/-52 |
| `lib/galaxy/agents/orchestrator.py` | Same | Unchanged after merge | +4/-4 |
| `lib/galaxy/agents/router.py` | Same | Unchanged after merge | +141/-51 |
| `lib/galaxy/agents/tools.py` | Same | Unchanged after merge | +33/-39 |

### Schema (Backend Python)

| PR Path | Local Path | Status | +/- |
|---------|------------|--------|-----|
| `lib/galaxy/schema/agents.py` | Same | No drift | +25/-9 |
| `lib/galaxy/schema/schema.py` | Same | Drifted (history notebook schemas added) | +21/-0 |

### API Endpoints (Backend Python)

| PR Path | Local Path | Status | +/- |
|---------|------------|--------|-----|
| `lib/galaxy/webapps/galaxy/api/agents.py` | Same | Unchanged after merge | +39/-16 |
| `lib/galaxy/webapps/galaxy/api/chat.py` | Same | Unchanged after merge | +23/-9 |

### Frontend (TypeScript/Vue)

| PR Path | Local Path | Status | +/- |
|---------|------------|--------|-----|
| `client/src/api/schema/schema.ts` | Same | Drifted (regenerated with history notebook types) | +35/-14 |
| `client/src/components/ChatGXY.vue` | Same | Unchanged after merge | +86/-38 |

### Tests

| PR Path | Local Path | Status | +/- |
|---------|------------|--------|-----|
| `test/integration/test_agents.py` | Same | Unchanged after merge | +22/-7 |
| `test/unit/app/test_agents.py` | Same | Unchanged after merge | +46/-19 |
| `test/unit/schema/test_action_suggestion.py` | Same | New file, no drift | +139/-0 |

## Drift Analysis

The PR merge commit (`b8b3ba4e2c`) is included in the local `history_markdown` branch. All 15 files still exist at their original paths. No files were moved or renamed.

**Files with post-merge drift:**
- `lib/galaxy/schema/schema.py` -- History notebook schemas added (CreateHistoryNotebookPayload, UpdateHistoryNotebookPayload, HistoryNotebookSummary, etc.) and page provenance FK fields (source_invocation_id, source_history_notebook_id). Unrelated to the PR.
- `client/src/api/schema/schema.ts` -- Regenerated to include history notebook types and file source template validation changes. Unrelated to the PR.

**Files with no drift (PR content fully intact):**
All 13 other files are untouched after the merge. The agent system code from this PR is exactly as merged.

## Key Technical Decisions

### 1. `_build_response()` / `_build_metadata()` Pattern

Base class gained two helper methods that all agents use instead of constructing `AgentResponse` directly:

```python
def _build_metadata(self, method, result=None, query=None, agent_data=None, fallback=False, error=None):
    # Always includes: model name, method
    # Conditionally: token usage, query_length, fallback/error info
    # agent_data goes both flat (backwards compat) and under 'agent_data' key

def _build_response(self, content, confidence, method, result=None, query=None,
                     suggestions=None, agent_data=None, fallback=False, error=None, reasoning=None):
    # Wraps _build_metadata + AgentResponse construction
```

Pattern: agents call `self._build_response(content=..., confidence=ConfidenceLevel.HIGH, method="structured", ...)` instead of raw `AgentResponse(...)`. This ensures every response has model name and token usage.

### 2. Router Handoff Serialization

The router passes delegated agent responses through output functions. Before this PR, only `result.content` (a string) was passed back, losing all metadata. Now uses JSON serialization:

```python
def _serialize_handoff(self, response, target_agent):
    return json.dumps({"__handoff__": True, "content": ..., "metadata": ..., "suggestions": ..., ...})
```

In `router.process()`, the content is checked for `__handoff__` to reconstruct the full `AgentResponse`. A `ValidationError` catch handles malformed suggestions gracefully.

### 3. ActionSuggestion Validation

Pydantic `model_validator` enforces that action suggestions have the right parameters:

```python
@model_validator(mode="after")
def validate_parameters(self):
    if self.action_type == ActionType.TOOL_RUN:
        if not self.parameters.get("tool_id"):
            raise ValueError("TOOL_RUN requires 'tool_id' parameter")
    elif self.action_type == ActionType.SAVE_TOOL:
        if not self.parameters.get("tool_yaml"):
            raise ValueError("SAVE_TOOL requires 'tool_yaml' parameter")
    elif self.action_type == ActionType.VIEW_EXTERNAL:
        if not self.parameters.get("url"):
            raise ValueError("VIEW_EXTERNAL requires 'url' parameter")
```

CONTACT_SUPPORT and DOCUMENTATION have no required params.

### 4. Suggestion Philosophy Change

Before: keyword-matching heuristics in base class created vague TOOL_RUN suggestions (without tool_id). After: `_extract_suggestions()` returns empty list by default. Only concrete, executable actions with proper params are suggested. TOOL_RUN suggestions are validated against the toolbox before creation.

### 5. REFINE_QUERY Removal

`REFINE_QUERY` action type removed entirely. Rationale: agents should ask clarifying questions conversationally, not via action buttons. The frontend can't meaningfully execute a "refine query" action.

### 6. ChatResponse Schema Enhancement

```python
class ChatResponse(BaseModel):
    response: str
    error_code: int
    error_message: str | None
    agent_response: Optional[AgentResponse]  # NEW - typed, was untyped dict
    exchange_id: Optional[int]               # NEW
    processing_time: Optional[float]         # NEW
```

Frontend removed `as any` casts now that types are correct.

### 7. Deprecation of `/api/ai/agents/query`

Endpoint now logs a warning and docstring says DEPRECATED. `/api/chat` is the canonical endpoint. `routing_info` and `stream` fields removed from `AgentQueryRequest`/`AgentQueryResponse`.

### 8. `save_exchange` Parameter

Added to `/api/ai/agents/error-analysis` and `/api/ai/agents/custom-tool` endpoints. Opt-in feedback tracking for non-job-based queries. Creates general chat exchanges when `save_exchange=True`.

### 9. `regenerate` Parameter

Added to `ChatPayload`. When `True`, bypasses cached responses for job-based queries. Uses `Optional[bool] = None` (not `bool = False`) so TypeScript schema generation doesn't make it required.

## Code Patterns and Conventions

1. **ConfidenceLevel enum everywhere** - `ConfidenceLevel.HIGH`, `ConfidenceLevel.MEDIUM`, `ConfidenceLevel.LOW` instead of raw strings `"high"`, `"medium"`, `"low"`. Construction via `ConfidenceLevel(string_value)`.

2. **Optional fields default to None** for TypeScript - Fields with `default=False` generate as required in the TypeScript client schema. Changed to `default=None` and handle `None as False` in API handlers.

3. **agent_data dual storage** - Agent-specific metadata goes both at the top level (backwards compat) and under a namespaced `agent_data` key in response metadata.

4. **Token usage extraction** - New `extract_usage_info(result)` function pulls `input_tokens`, `output_tokens`, `total_tokens` from pydantic-ai results.

5. **Model serialization for storage** - `agent_response.model_dump()` before JSON storage in chat exchanges to avoid `json.dumps` crash on Pydantic objects.

6. **Frontend response stats** - ChatGXY.vue now shows agent type, model name, and token count in a `.response-stats` footer on each message.

7. **Inline imports moved to module level** - Final commit moved imports from inside test methods to top of test files (review feedback from mvdbeek).

## Review Notes

- Single review comment from mvdbeek: move inline imports to module level in tests. Addressed in final commit `c1ef2e17`.
- Review approved by mvdbeek.
- PR targeted `release_26.0` branch.
- All 14 commits are logically sequenced, each addressing a specific concern.
