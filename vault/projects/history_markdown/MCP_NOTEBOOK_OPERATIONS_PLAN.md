---
type: plan
tags:
  - plan
  - galaxy/agents
  - galaxy/api
  - galaxy/mcp
  - galaxy/notebooks
status: draft
created: 2026-06-12
ai_generated: true
branch: mcp_notebooks
summary: "Add page/notebook operations to AgentOperationsManager and expose them via the FastMCP server, wrapping PagesService."
related_notes:
  - "[[PR 21942 - Shared Agent Operations and MCP Server]]"
  - "[[HISTORY_MARKDOWN_ARCHITECTURE]]"
---

# MCP Notebook (Page) Operations — Implementation Plan

## TL;DR

Galaxy Notebooks/Reports are `Page` rows. The MCP server (`api/mcp.py`) and shared
`AgentOperationsManager` (`agents/operations.py`) currently expose **zero** page
operations. This plan adds a thin set of page tools by wrapping the existing
`PagesService` — the same two-step pattern PR 21942 established for every other
domain (manager method ⟶ `@mcp.tool()`).

**Key finding that de-risks the design:** `content_editor` (the editable content
field) is already in **encoded-id space**, same as the entire rest of the MCP
surface. Raw DB ids never cross the API boundary. So no `resolve_hid` machinery,
no id-leak surface, no special id handling beyond the existing `decode_id`/`ID_FIELDS`
convention. See [[HISTORY_MARKDOWN_ARCHITECTURE]] §6 (corrected 2026-06-12).

**Scope (v1):** read + author notebooks and reports. CRUD + revisions. No HID
resolution tool, no streaming, no chat/agent-proxy.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| TOOL_NAMING | `*_page` (not `*_notebook`) | Matches API/service/`page_id`; notebook-vs-report is a `history_id`-presence distinction, not a separate type. Avoids a third naming layer. |
| CONTENT_FIELD | `get_page` returns `content_editor` always; expanded `content` only via opt-in `include_rendered` flag | `content_editor` is the round-trippable editable form in encoded-id space; expanded `content` can be large (inlined previews) and the agent rarely needs it. |
| HID_BRIDGE | None in v1 | MCP agent works in encoded-id space natively; embeds `history_dataset_id=<encoded>` directly from `get_history_contents`. `resolve_hid` is HID-space sugar the internal agent needs, MCP does not. |
| EDIT_SOURCE | Reuse `edit_source="agent"` on MCP writes | Zero schema/frontend change. Accepts that the revision badge won't distinguish external-MCP from in-app chat-agent edits; revisit only if provenance separation is later needed. |
| LIST_VISIBILITY | `list_pages` defaults to **own pages only**; `show_published`/`show_shared` are explicit opt-in params | Predictable least-surprise for an agent; avoids pulling in others' published pages unprompted. |
| SCOPE_REPORTS | Include reports (history_id null) | Same endpoints, zero extra cost; `history_id` is just an optional filter/field. |
| WRITE_TOOLS | Include create/update/revert; **defer** delete/undelete | Authoring is the point; destructive ops can wait and carry more permission risk. |
| DIRECTIVE_REF | Docstrings only in v1; defer a `get_directive_reference()` tool | Encoded-id directive syntax is short enough to document inline in create/update docstrings. |
| INTERNAL_MIGRATION | Out of scope | `PageAssistantAgent` keeps its HID-space path. Converging it onto shared ops is a separate follow-up. |

## Operations to add

All on `AgentOperationsManager`, mirroring `PagesService`. Each decodes incoming
encoded ids via `self.trans.security.decode_id(...)` then delegates to the service
(which enforces ownership/accessibility). Responses pass through
`_encode_ids_in_response`.

| Manager method | Wraps | MCP tool | Notes |
|----------------|-------|----------|-------|
| `list_pages(history_id=None, search=None, limit=100, offset=0, show_published=False, show_shared=False, deleted=False)` | `PagesService.index` | `list_pages` | Builds `PageIndexQueryPayload` with `show_own=True`, `show_published`/`show_shared` defaulting **False** (own-only). `history_id` set ⟶ notebooks. |
| `get_page(page_id, include_rendered=False)` | `PagesService.show` | `get_page` | Always returns `content_editor` + metadata; includes expanded `content` only when `include_rendered=True`. |
| `create_page(history_id=None, title=None, content=None, annotation=None)` | `PagesService.create` | `create_page` | `CreatePagePayload`. `content_format="markdown"` default. |
| `update_page(page_id, content=None, title=None, edit_source="agent")` | `PagesService.update` | `update_page` | `UpdatePagePayload`. New revision. |
| `list_page_revisions(page_id, sort_desc=False)` | `PagesService.list_revisions` | `list_page_revisions` | |
| `get_page_revision(page_id, revision_id)` | `PagesService.show_revision` | `get_page_revision` | Revision `content_editor` + `content`. |
| `revert_page_revision(page_id, revision_id)` | `PagesService.revert_revision` | `revert_page_revision` | Creates `edit_source="restore"` revision. |

### `ID_FIELDS` additions — NOT NEEDED (verified during implementation)

Originally planned to add `page_id`/`revision_id`/`latest_revision_id`/`source_invocation_id`
to `ID_FIELDS`. On inspection this is unnecessary: **every** id field on
`PageSummary`/`PageDetails`/`PageRevisionSummary` (`id`, `latest_revision_id`,
`revision_ids`, `source_invocation_id`, `history_id`, `page_id`) is already typed
`EncodedDatabaseIdField`, so `model_dump(mode="json")` emits encoded strings throughout —
no raw ints to encode, no leak. The page methods therefore skip `_encode_ids_in_response`
entirely and return `model_dump(mode="json")` directly. `ID_FIELDS` is left untouched.

### Manager method shape (template)

```python
def get_page(self, page_id: str, include_rendered: bool = False) -> dict[str, Any]:
    decoded_page_id = self.trans.security.decode_id(page_id)
    details = self.pages_service.show(self.trans, decoded_page_id)
    result = details.model_dump()
    if not include_rendered:
        result.pop("content", None)  # keep content_editor; drop heavy expanded form
    return self._encode_ids_in_response(result)

def update_page(
    self,
    page_id: str,
    content: Optional[str] = None,
    title: Optional[str] = None,
    edit_source: str = "agent",
) -> dict[str, Any]:
    decoded_page_id = self.trans.security.decode_id(page_id)
    payload = UpdatePagePayload(
        content=content, title=title, content_format="markdown", edit_source=edit_source
    )
    details = self.pages_service.update(self.trans, decoded_page_id, payload)
    return self._encode_ids_in_response(details.model_dump())
```

Add a lazy `pages_service` property mirroring the existing service properties
(`operations.py:100-160`):

```python
@property
def pages_service(self):
    if self._pages_service is None:
        from galaxy.webapps.galaxy.services.pages import PagesService

        self._pages_service = self.app[PagesService]
    return self._pages_service
```
(and init `self._pages_service: Optional[Any] = None` in `__init__`).

### MCP tool shape (template, `api/mcp.py`)

Follow the existing `@mcp.tool()` convention exactly — `api_key`/`ctx` params,
`_mcp_error_handler`, rich docstring with Args/Returns/NEXT STEPS:

```python
@mcp.tool()
def update_page(
    page_id: str,
    api_key: str,
    ctx: MCPContext,
    content: str | None = None,
    title: str | None = None,
) -> dict[str, Any]:
    """Update a Galaxy page (notebook or report), creating a new revision.

    Content is Galaxy-flavored markdown using ENCODED ids in directives, e.g.
    `history_dataset_id=f2db41e1fa331b3e` (get the encoded dataset id from
    get_history_contents / get_dataset_details). Do not use raw integer ids or
    HIDs in directives.

    Args:
        page_id: Encoded id of the page (from list_pages / create_page).
        content: New markdown content. Omit to leave content unchanged.
        title: New title. Omit to leave unchanged.

    Returns:
        Page details including content_editor (editable markdown) and content
        (rendered form).

    NEXT STEPS:
    - Inspect revisions: list_page_revisions(page_id)
    - Roll back: revert_page_revision(page_id, revision_id)
    """
    with _mcp_error_handler("update_page"):
        ops_manager = get_operations_manager(api_key, ctx)
        return ops_manager.update_page(page_id, content=content, title=title)
```

## Directive authoring guidance (docstrings, not code)

The one thing an MCP agent must learn from tool docs (since there is no
`resolve_hid`): how to embed datasets. Document in `create_page`/`update_page`
docstrings:

- Dataset display: `history_dataset_display(history_dataset_id=<encoded>)`
- Collection display: `history_dataset_collection_display(history_dataset_collection_id=<encoded>)`
- Encoded ids come from `get_history_contents` / `get_dataset_details`.

Optionally add a `get_directive_reference()` MCP tool later that emits the valid
directive table from `markdown_parse.VALID_ARGUMENTS` (mirrors what the internal
`PageAssistantAgent` injects into its system prompt). Deferred — docstrings cover v1.

## Testing (red→green)

Mirror the PR 21942 test split.

### Unit — `test/unit/app/managers/test_AgentOperationsManager.py`

Add a `TestAgentOperationsManagerPages` class with mocked `pages_service`:
1. `test_create_page_markdown` — payload built with `content_format="markdown"`, response ids encoded.
2. `test_create_page_with_history` — `history_id` decoded and threaded into `CreatePagePayload`.
3. `test_get_page_returns_both_content_fields` — asserts `content_editor` and `content` present.
4. `test_update_page_sets_edit_source_agent` — payload carries `edit_source="agent"`.
5. `test_list_pages_history_filter` — `PageIndexQueryPayload.history_id` set when passed.
6. `test_list_page_revisions` / `test_revert_page_revision` — service called with decoded ids.
7. `test_id_encoding_includes_page_id` — response with `page_id` int comes back encoded
   (guards the `ID_FIELDS` additions; **write this first, watch it fail red**).

### Integration — `test/integration/test_agents.py`

Extend `TestMCPServerSmoke` (or a sibling) with a real round-trip against an
`enable_mcp_server: True` server:
1. `create_page` (history-attached) ⟶ `get_page` ⟶ assert title/content survive.
2. `update_page` ⟶ `list_page_revisions` shows 2 revisions, second `edit_source="agent"`.
3. `update_page` with a `history_dataset_display(history_dataset_id=<encoded>)` directive ⟶
   `get_page` `content` (expanded) differs from `content_editor` (directive intact);
   `content_editor` round-trips byte-stable on a no-op re-save. **This is the
   encoded-id-space claim under test — make it fail first by asserting the wrong
   field, then green.**
4. `revert_page_revision` ⟶ latest content matches the reverted revision; new
   `edit_source="restore"` revision appended.

### Run

```
# from worktree, venv sourced, lib on PYTHONPATH
pytest test/unit/app/managers/test_AgentOperationsManager.py -k Pages -q
pytest test/integration/test_agents.py -k MCPServer -q
```
(Use /galaxy-backend-tests for the integration run.)

## Files touched

| File | Change |
|------|--------|
| `lib/galaxy/agents/operations.py` | +7 manager methods, `pages_service` property, `_pages_service` init (no `ID_FIELDS` change — see above) |
| `lib/galaxy/webapps/galaxy/api/mcp.py` | +7 `@mcp.tool()` callables |
| `test/unit/app/managers/test_AgentOperationsManager.py` | +`TestAgentOperationsManagerPages` (9 tests) |
| `test/integration/test_agents.py` | +registration assertion, +`test_mcp_page_lifecycle`, +`test_mcp_page_directive_and_revert` |

No schema changes, no migration, no config keys (rides existing `enable_mcp_server`).

## Status (2026-06-12)

**Implemented on branch `mcp_notebooks`.** Validated locally:
- 9 page unit tests pass (32 total in the file); `model_dump(mode="json")` direct-return confirmed.
- All 7 page tools register with FastMCP (43 tools total, was 36) — `get_mcp_app` runs clean.
- `operations.py` / `mcp.py` import cleanly.

Not yet run: the two integration round-trips require the full backend-tests harness
(server boot + Postgres). Run with `/galaxy-backend-tests` on `test/integration/test_agents.py -k MCPServer`.

## Rejected / deferred options

- **`*_notebook` tool names** — rejected. Backend has no notebook type; `Page` +
  `history_id` is the model. Naming MCP tools `notebook` invents a third vocabulary
  on top of API (`page`) and UI (`PAGE_LABELS`).
- **New `edit_source="mcp"` value** — deferred. Cleaner provenance, but needs a
  schema/enum touch and frontend label handling (`PageRevisionList` source badges).
  Reuse `"agent"` until there's a reason to distinguish.
- **`resolve_hid` MCP tool** — deferred. Only needed if we decide MCP agents should
  author in HID space for human-legibility parity with the internal agent. Encoded
  ids work today.
- **Migrating `PageAssistantAgent` onto shared ops** — out of scope. Would close the
  internal/external split PR 21942 flagged, but it's a refactor with its own test
  surface, independent of shipping MCP page tools.
- **`delete_page`/`undelete_page` now** — deferred to a follow-up; authoring is the
  v1 value, destructive ops carry more permission-surface risk.

## Resolved decisions (2026-06-12)

All six v1 questions are now settled — see the Decisions table:

1. `edit_source` ⟶ reuse `"agent"`.
2. `get_page` ⟶ `content_editor` always; expanded `content` only via `include_rendered=True`.
3. Reports ⟶ in scope.
4. `list_pages` default ⟶ own pages only (`show_published`/`show_shared` opt-in).
5. `delete_page`/`undelete_page` ⟶ deferred past v1.
6. Directive reference ⟶ docstrings only; `get_directive_reference()` deferred.

No open questions remain for v1; the plan is ready to implement.
