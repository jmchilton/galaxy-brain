# Initial review: galaxyproject/galaxy#24346

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: claude-opus-5-5
- Effort: medium
- Reviewed commit: `684e1ce9bcc`
- PR: "Accept the MCP API key from an x-api-key header" (dannon, base `dev`)

## Verdict

Small, well-scoped, approvable. No real bugs found. Header-wins precedence, keeping the
`api_key` argument, and leaving `Authorization: Bearer`/`?key=` out are all explicitly argued
in the PR description and not re-litigated here. Integration tests cover each resolution
case against a real server. The remaining items are hardening and nits.

Tests not run locally (worktree has no `.venv`; borrowing another checkout's venv hit a
conftest path mismatch). CI covers them.

## What it does

- `get_operations_manager` now resolves the key via `_resolve_api_key(api_key, get_http_headers())`:
  `x-api-key` header, else `api_key` argument, else error. Lookup still goes through
  `UserManager.by_api_key`, same as REST `get_api_user`.
- Every tool's `api_key: str` becomes `api_key: ApiKey = None` (an `Annotated[str | None, Field(description=...)]`),
  with `ctx` moved before it so it can default. MCP calls are keyword-based, and no direct Python
  callers of the tool functions exist (`test_agents.py` goes through an MCP client), so the reorder is safe.
- The header name comes from `galaxy.webapps.galaxy.api.api_key_header.model.name`.
- Config docs for `enable_mcp_server` updated (schema, sample, rst kept in sync).

## Findings

### P3 1: Header read depends on fastmcp's default credential-stripping list

`get_http_headers()` with no arguments drops headers fastmcp considers credentials. In 4.1.0
the docstring says it strips "credential headers like `authorization` and `cookie`". `x-api-key`
isn't on that list today. If a later fastmcp adds it (`pyproject.toml` allows `fastmcp>=2.13.0`,
no upper bound), the header is silently dropped. Header-only clients then get "API key required",
and when the model also passes an `api_key`, the argument quietly wins, which reverses the
precedence the PR wants. The integration tests would catch this on a pin bump, so it's low risk,
but it's cheap to make explicit. `include=` only exists in newer fastmcp (2.14.4 has just
`include_all`), so `get_http_headers(include_all=True)` is the portable choice. Reading
`get_http_request().headers` directly is another option, and its lookup is also case-insensitive.

### P3 2: Share a named constant instead of reaching into `api_key_header.model.name`

`API_KEY_HEADER = api_key_header.model.name` reads FastAPI's OpenAPI security model to get a
string. It reuses the REST source of truth, which is good, but it's an indirect, lightly
documented attribute path. The dict lookup also only works because the name happens to be lowercase:
`get_http_headers` lowercases its keys, and `.get(API_KEY_HEADER)` would miss if the REST name were
ever written `X-API-Key`. A module-level `API_KEY_HEADER_NAME = "x-api-key"` in
`lib/galaxy/webapps/galaxy/api/__init__.py`, used by both `APIKeyHeader(name=...)` and `mcp.py`,
is clearer. The `connect` docstring also hard-codes `x-api-key`, unlike the f-string uses elsewhere.
That's fine, just inconsistent.

### P3 3: Schema description still nudges the model to ask the user for their key

The `ApiKey` description says "Only ask the user for a key if a call fails with 'API key
required'". The PR exists because a user pasted their key into a chat. When a header-less client
fails, the more useful prompt is "tell the user to add an `x-api-key` header to their MCP client
config", and the error message already says that. Consider dropping "ask the user for a key" from the
description, or rewording it to "ask the user to configure the header (or, if their client can't send
headers, to provide a key)".

### P3 4: `_resolve_api_key` unit tests duplicate the integration tests

`test_resolve_api_key_*` in `test/unit/webapps/api/test_mcp.py` exercise a one-line `or` chain.
`TestMCPApiKey` already covers header-only, argument-only, header-wins, empty-argument fallback, and
no-key against a real server. Per review focus (prefer integration over trivial unit tests), these
unit tests could be dropped. Optional.

## Reuse / abstraction notes (no action required in this PR)

- MCP and REST now share the header name and `UserManager.by_api_key`, but the "key from query,
  else header, else OIDC bearer" policy still lives only inside the FastAPI dependency
  `get_api_user`. The PR description already proposes pulling that body into a plain helper both
  paths call. That is the right follow-up, and it would also give MCP OAuth support.
- Precedence differs by design: REST prefers `?key=` over `x-api-key`, while MCP prefers the header
  over the model-supplied argument. The PR description justifies this. Worth a one-line comment if
  the shared helper ever lands, so nobody "unifies" it the wrong way.
- Imports are all at module top.
