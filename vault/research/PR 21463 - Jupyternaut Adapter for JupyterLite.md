---
type: research
subtype: pr
tags:
  - research/pr
  - galaxy/api
github_pr: 21463
github_repo: galaxyproject/galaxy
status: draft
created: 2026-02-13
revised: 2026-02-13
revision: 1
ai_generated: true
---

# PR #21463 Research Summary

## PR Metadata

- **Title**: Add Jupyternaut adapter for JupyterLite integration
- **State**: MERGED (merged 2026-01-06 by `guerler`)
- **Base branch**: `dev`
- **Head branch**: `jupyterlite_adapter`
- **Reviews**: 32 review actions
- **Resolves**: galaxyproject/galaxy-visualizations#123

## Summary

This PR adds an OpenAI Chat Completions compatibility endpoint at `/api/plugins/{plugin_name}/chat/completions` to support the Jupyternaut AI assistant inside JupyterLite visualizations. The endpoint acts as a server-side proxy that:

1. Looks up the visualization plugin by name and extracts an `ai_prompt` from its `<specs>` XML config
2. Injects a Galaxy-controlled system prompt (ignoring any client-supplied system prompts)
3. Forwards the request to a configurable OpenAI-compatible backend using `AsyncOpenAI`
4. Supports both streaming (SSE) and non-streaming responses
5. Enforces rate limiting (30/minute via slowapi), message limits, tool count/size limits, and token caps

Galaxy retains control by injecting the system prompt server-side and explicitly ignoring system prompts in the request payload. The endpoint is marked as `unstable`.

## Files Changed (PR vs Local State)

### 1. `lib/galaxy/webapps/galaxy/api/plugins.py`
- **PR path**: `lib/galaxy/webapps/galaxy/api/plugins.py`
- **Local path**: `/Users/jxc755/projects/worktrees/galaxy/branch/history_markdown/lib/galaxy/webapps/galaxy/api/plugins.py`
- **Status**: EXISTS, SIGNIFICANTLY EVOLVED since PR merge

**Key drift**:
- PR had class named `FastAPIAI` with only the chat endpoint; local has `FastAPIPlugins` which also contains the `index()` and `show()` API endpoints (the old `PluginsController` using `BaseGalaxyAPIController` has been completely removed)
- PR router tag was `tags=["jobs"]` (likely a bug); local uses `tags=["plugins"]`
- PR `ChatToolFunction` had a `parameters` field; local version uses `model_config = dict(extra="allow")` instead of explicit `parameters` field
- PR `ChatTool` had no `model_config`; local adds `model_config = dict(extra="allow")`
- PR had `create_error()` as method name; local uses `_create_error()` (prefixed private)
- PR `_create_error` had `status_code` as positional with default before content kwarg; local swaps to `JSONResponse(content=..., status_code=...)` proper ordering
- PR had no `APIError` handling; local wraps the `client.chat.completions.create()` call in `try/except APIError` to forward upstream provider error bodies
- PR assistant message handling was simpler (only content OR tool_calls); local correctly handles assistant messages that have BOTH content AND tool_calls simultaneously
- Local adds `PluginDatasetEntry`, `PluginDatasetsResponse` models for the `show()` endpoint
- Local adds `VisualizationPluginResponse` import and typed return on `show()`
- Local adds `GET /api/plugins` (index) and `GET /api/plugins/{id}` (show) as FastAPI routes, replacing the old WSGI controller entirely
- Local imports `Union`, `Query`, `HistoryDatasetAssociation`, `DecodedDatabaseIdField`, `DependsOnTrans`, `SessionRequestContext`

### 2. `lib/galaxy/webapps/galaxy/fast_app.py`
- **PR path**: `lib/galaxy/webapps/galaxy/fast_app.py`
- **Local path**: `/Users/jxc755/projects/worktrees/galaxy/branch/history_markdown/lib/galaxy/webapps/galaxy/fast_app.py`
- **Status**: EXISTS, MATCHES PR intent

The PR introduced slowapi rate limiting infrastructure (`galaxy_rate_limit_key`, `limiter`, `app.state.limiter`, exception handler). All of this is present in local. Additional local changes include the `history_notebooks` tag in `api_tags_metadata` and `ai`/`chat` tags.

### 3. `lib/galaxy/visualization/plugins/plugin.py`
- **PR path**: `lib/galaxy/visualization/plugins/plugin.py`
- **Local path**: `/Users/jxc755/projects/worktrees/galaxy/branch/history_markdown/lib/galaxy/visualization/plugins/plugin.py`
- **Status**: EXISTS, MATCHES PR with minor ordering differences

PR alphabetized `to_dict()` fields and added `href` via `url_for`. Local matches this ordering and content.

### 4. `lib/galaxy/visualization/plugins/config_parser.py`
- **PR path**: `lib/galaxy/visualization/plugins/config_parser.py`
- **Local path**: `/Users/jxc755/projects/worktrees/galaxy/branch/history_markdown/lib/galaxy/visualization/plugins/config_parser.py`
- **Status**: EXISTS, MATCHES PR (comments cleaned up)

The PR simplified comments around params parsing. Local matches. The method is called `parse_plugin` locally (renamed from `parse_visualization`).

### 5. `client/src/api/schema/schema.ts`
- **PR path**: `client/src/api/schema/schema.ts`
- **Local path**: `/Users/jxc755/projects/worktrees/galaxy/branch/history_markdown/client/src/api/schema/schema.ts`
- **Status**: EXISTS, CONTAINS PR additions

The `ChatCompletionRequest`, `ChatMessage`, `ChatTool`, `ChatToolFunction` types and the `/api/plugins/{plugin_name}/chat/completions` path are present in local schema. Line numbers have shifted due to other additions.

### 6. `client/visualizations.yml`
- **PR path**: `client/visualizations.yml`
- **Local path**: `/Users/jxc755/projects/worktrees/galaxy/branch/history_markdown/client/visualizations.yml`
- **Status**: EXISTS, VERSION FURTHER BUMPED

PR bumped jupyterlite from `0.0.17` to `0.0.28`. Local is now at `0.0.30`.

### 7. `test/integration/test_plugins.py`
- **PR path**: `test/integration/test_plugins.py`
- **Local path**: `/Users/jxc755/projects/worktrees/galaxy/branch/history_markdown/test/integration/test_plugins.py`
- **Status**: EXISTS, SIGNIFICANTLY EXPANDED

**Key drift**:
- PR class was `TestAiApi`; local is `TestVisualizationPluginsApi`
- Local adds `test_index()` and `test_show_returns_all_fields()` tests for the new FastAPI plugin endpoints
- Local adds `test_assistant_content_and_tool_calls_preserved()` to verify combined content+tool_calls forwarding
- Local adds `test_tool_description_preserved()` to verify extra fields pass through
- Local adds `test_provider_error_body_forwarded()` testing `APIError` propagation
- Local imports `APIError` and `cast` from `openai`

### 8. `test/integration/test_visualization_plugins/jupyterlite/static/jupyterlite.xml`
- **PR path**: `test/integration/test_visualization_plugins/jupyterlite/static/jupyterlite.xml`
- **Local path**: `/Users/jxc755/projects/worktrees/galaxy/branch/history_markdown/test/integration/test_visualization_plugins/jupyterlite/static/jupyterlite.xml`
- **Status**: EXISTS, EXPANDED

PR had a minimal fixture (description, data_source, entry_point, specs/ai_prompt). Local adds `<params>`, `<tags>`, `<help>`, `<tests>`, and an additional `<custom_setting>` in specs. Description text also changed from "AI chat integration tests" to "visualization plugin integration tests".

## New Files in Local (Not in PR)

The local codebase has added:
- `lib/galaxy/schema/visualization.py` - Contains `VisualizationPluginResponse` pydantic model used by the new FastAPI `show()` endpoint (all plugin fields typed with Field definitions)

## Key Technical Decisions and Patterns

### Architecture
- **Plugin-scoped AI proxy**: Not a generic OpenAI proxy. Each visualization plugin declares an `ai_prompt` in its XML `<specs>` section; the endpoint resolves which plugin and injects the correct prompt.
- **Server-side prompt injection**: System prompts from the client are ignored. Galaxy prepends two system messages: a generic `GALAXY_PROMPT` and the plugin-specific `ai_prompt`.
- **CBV (Class-Based Views)**: Uses `@router.cbv` pattern with `DependsOnApp`, `DependsOnUser` dependency injection.

### Rate Limiting
- Uses `slowapi` library with a custom key function (`galaxy_rate_limit_key`) that identifies users by API key, session cookie, or IP address.
- Limit: 30 requests/minute on the chat completions endpoint.
- The limiter is attached to `app.state.limiter` during FastAPI initialization.

### Message Processing
- Strips all client-supplied `system` role messages
- Validates each message, only forwarding `assistant`, `user`, and `tool` roles
- Caps at 1024 messages total
- Local version correctly handles assistant messages with both `content` and `tool_calls` (PR version only handled one or the other)

### Tool Handling
- Maximum 128 tools
- Per-tool size limit of 16KB (serialized JSON)
- Tools are validated and cast to `ChatCompletionToolParam`

### Streaming
- SSE streaming via `StreamingResponse` with `text/event-stream` media type
- Async generator yields `data: {json}\n\n` chunks followed by `data: [DONE]\n\n`
- Client close is handled in `finally` block

### Token Limits
- Default: 1024 tokens
- Maximum: 8192 tokens
- Temperature: 0.3, Top-P: 0.9

### Error Handling
- PR used `log.debug` for all errors (review feedback changed from `log.error`)
- Local adds `APIError` exception handling to forward upstream provider error bodies and status codes

## Reviewer Feedback Themes

Key review feedback from `mvdbeek`:
1. **Use Pydantic models** for request validation (led to `ChatCompletionRequest`, `ChatMessage`, etc.)
2. **Better naming** - reviewer pushed back on names like "compat", endpoint was scoped under plugins
3. **Use slowapi** for rate limiting (already in use by Galaxy)
4. **Don't log errors for non-errors** - switched to `log.debug`
5. **Consider simpler proxy approach** - reviewer questioned whether Galaxy needs to validate messages or just proxy raw. Author argued prompt injection and validation justified the processing.
6. **Extra fields handling** - reviewer wanted `extra="allow"` on Pydantic models to pass through unknown fields

## Drift Summary

| Aspect | PR State | Local State |
|--------|----------|-------------|
| Class name | `FastAPIAI` | `FastAPIPlugins` |
| Router tag | `"jobs"` (bug) | `"plugins"` |
| Legacy controller | Still present | Fully removed |
| Plugin REST endpoints | Not included | `GET /api/plugins`, `GET /api/plugins/{id}` added |
| Assistant messages | Content OR tool_calls | Content AND tool_calls |
| APIError handling | None | Catches and forwards |
| ChatToolFunction.parameters | Explicit field | `extra="allow"` |
| Test class | `TestAiApi` (5 tests) | `TestVisualizationPluginsApi` (10 tests) |
| jupyterlite version | 0.0.28 | 0.0.30 |
| Test fixture XML | Minimal | Expanded with params, tags, help, tests |
| VisualizationPluginResponse | Not in PR | New schema model |
