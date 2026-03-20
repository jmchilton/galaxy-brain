# History Pages: Architecture & Feature Summary

> **Branch:** `history_pages`
> **Date:** 2026-03-14
> **Status:** Feature-complete, pre-merge

---

## 1. What Are History Pages?

History Pages are markdown documents tied to Galaxy histories. They let users (and AI agents) document, annotate, and share analysis narratives alongside the data that produced them. A history can have multiple pages, and each page supports an AI assistant that can read history contents and propose edits.

History Pages are built on the existing Galaxy **Page** model — they are regular Pages with an optional `history_id` foreign key. This unified model means history-attached and standalone pages share the same editor, revision system, AI chat, and API surface. The difference is contextual: history pages gain access to history-aware AI tools and are accessed through the history panel rather than the pages grid.

Every save creates an immutable revision, edits from humans and agents are tracked separately via `edit_source`, and the revision system supports preview and one-click rollback.

---

## 2. Standalone Pages vs History Pages

The system supports two page contexts through a single unified editor (`PageEditorView`):

| Aspect | Standalone Pages | History Pages |
|--------|-----------------|---------------|
| **Entry point** | Grid list (`/pages/list`) or direct URL | History panel "Pages" button |
| **Route** | `/pages/editor?id=X` | `/histories/:historyId/pages/:pageId` |
| **`history_id`** | null | Set — scopes page to a history |
| **AI chat tools** | Text editing only (no history tools) | Full history tools: `list_history_datasets`, `get_dataset_info`, `get_dataset_peek`, `get_collection_structure`, `resolve_hid` |
| **Drag-and-drop** | From toolbox directives | Also from history panel (datasets/collections) |
| **Permissions modal** | Yes (`ObjectPermissionsModal`) | No — inherits from history sharing |
| **Save & View** | Yes (slug-based published URL) | No (history context, no slug) |
| **Page list** | Grid (`/pages/list`) | Inline `HistoryPageList` within history panel |
| **Window Manager** | "View in Window" grid action | Click from list opens in WinBox |
| **Auto-create** | No | `resolveCurrentPage()` creates on first visit |

Both modes share: editor UI, revision system, AI chat, dirty tracking, diff views, and the same API endpoints.

---

## 3. User Stories

### Researcher documenting an analysis

> *"I ran a ChIP-seq pipeline and want to write up what I did and what the results mean, with embedded dataset previews and plots, right next to the history that contains the data."*

- Opens history panel -> clicks "Pages" button
- System auto-creates a page titled after the history
- Types markdown prose; uses the toolbox to insert dataset references (`history_dataset_display(...)`)
- Drags a dataset from the history panel into the editor -- directive auto-inserted
- Clicks Preview to see rendered markdown with live dataset embeds
- Saves; revision #1 recorded with `edit_source="user"`

### AI-assisted page editing

> *"I have 50 datasets from a variant-calling run. I want the AI to summarize what's in my history and draft a methods section."*

- Opens page -> toggles chat panel (split view: 60% editor / 40% chat)
- Types: "Summarize the datasets in this history and draft a Methods section"
- Agent calls `list_history_datasets` -> `get_dataset_info` -> `resolve_hid` tools
- Agent returns a `section_patch` proposal targeting `## Methods`
- User sees a per-section diff with checkboxes; accepts the Methods section, rejects the Introduction rewrite
- Applied content creates revision with `edit_source="agent"`
- Conversation persists across panel close/reopen and page refresh

### Sharing and publishing

> *"My analysis is complete. I want to share the page read-only."*

- Shared histories expose their pages in read-only display mode to other users
- Standalone pages use the Permissions modal to manage sharing, publishing, and slug assignment

### Reviewing past AI conversations

> *"I had a great chat with the AI last week about my RNA-seq results. I want to pick up where I left off."*

- Opens page -> toggles chat panel
- Clicks chat history icon to open `PageChatHistoryList`
- Browses past conversations with timestamps
- Selects a previous exchange to resume it
- Can also delete old conversations to keep things tidy

### Revision history and rollback

> *"The agent's last edit broke my formatting. I want to go back."*

- Opens revision panel (right sidebar, 300px)
- Sees revision list with timestamps and source badges: "Manual", "AI", "Restored"
- Clicks an old revision to preview it read-only
- Can compare revision against current content or previous revision (three view modes)
- Clicks "Restore" -> creates a new revision from old content (`edit_source="restore"`)

---

## 4. Architecture Overview

```
+---------------------------------------------------------------------------+
|                          Frontend (Vue 3)                                  |
|                                                                           |
|  HistoryCounter --> HistoryPageView --> PageEditorView <-- PageEditor      |
|       |                 |    |              |                  |           |
|       |           +-----+    +-----+   MarkdownEditor     (standalone     |
|       |           |                |    TextEditor          entry)         |
|       |     HistoryPageList        |    (drag-drop)                       |
|       |                      EditorSplitView                              |
|       |                            |                                      |
|       |   PageRevisionList    PageChatPanel                               |
|       |   PageRevisionView     |         |         |                      |
|       |                  ChatMessageCell  ProposalDiffView                 |
|       |                  ChatInput       SectionPatchView                  |
|       |                  PageChatHistoryList                               |
|       |                                                                   |
|  pageEditorStore (Pinia) <---> API Client (api/pages.ts)                  |
+---------------------------------+-----------------------------------------+
                                  | REST
+---------------------------------v-----------------------------------------+
|                       Backend (FastAPI)                                    |
|                                                                           |
|  /api/pages (history_id filter) --> PageManager                           |
|  /api/pages/{id}/revisions      --> PageManager (revisions)               |
|  /api/chat (page_id)            --> ChatManager + AgentService            |
|                                          |                                |
|                                  PageAssistantAgent                       |
|                                    +- list_history_datasets               |
|                                    +- get_dataset_info                    |
|                                    +- get_dataset_peek                    |
|                                    +- get_collection_structure            |
|                                    +- resolve_hid                         |
|                                                                           |
|  Models: Page (+ history_id), PageRevision (+ edit_source), ChatExchange  |
|  markdown_util.py: ready_galaxy_markdown_for_export()                     |
+---------------------------------------------------------------------------+
```

---

## 5. Data Model

### Page (extended)

| Column | Type | Notes |
|--------|------|-------|
| `id` | int PK | |
| `user_id` | int FK -> galaxy_user | Indexed |
| `history_id` | int FK -> history | **Nullable**, indexed. When set, page is history-attached |
| `title` | text | Not versioned |
| `slug` | text | Indexed. Standalone pages only |
| `latest_revision_id` | int FK -> page_revision | Eager-loaded; circular FK with `use_alter` |
| `source_invocation_id` | int FK -> workflow_invocation | Nullable. Tracks "generated from invocation" |
| `published` / `importable` | bool | Standalone sharing features |
| `deleted` | bool | Soft-delete pattern |
| `create_time` / `update_time` | datetime | |

Relationships: `user`, `history` (optional), `revisions` (cascade delete), `latest_revision` (eager), `source_invocation`, `tags`, `annotations`, `ratings`, `users_shared_with`

### PageRevision (extended)

| Column | Type | Notes |
|--------|------|-------|
| `id` | int PK | |
| `page_id` | int FK -> page | Indexed |
| `title` | text | Snapshot of title at revision time |
| `content` | text | Raw markdown with internal IDs |
| `content_format` | varchar(32) | `"markdown"` or `"html"` |
| `edit_source` | varchar(16) | **New.** `"user"`, `"agent"`, or `"restore"` |
| `create_time` / `update_time` | datetime | |

### ChatExchange (extended)

| Column | Type | Notes |
|--------|------|-------|
| `page_id` | int FK -> page | Nullable, indexed. Scopes chat to a page |

The original `notebook_id` FK was replaced with `page_id` when the HistoryNotebook model was merged into Page.

### Migration

| Migration | Purpose |
|-----------|---------|
| `b75f0f4dbcd4` | Create `history_notebook` + `history_notebook_revision` tables (later merged into `page` / `page_revision`) |

The separate `history_notebook` and `history_notebook_revision` tables were created in an early migration, then merged into the existing `page` and `page_revision` tables. The merge added `history_id` to `page`, `edit_source` to `page_revision`, and `page_id` to `chat_exchange`.

---

## 6. Content Pipeline

Page content flows through two representations:

```
User edits markdown in MarkdownEditor / TextEditor
        |
        v
  +-------------------+
  |  Raw content       |  Stored in DB as-is
  |  (internal IDs)    |  history_dataset_id=42
  +--------+----------+
           |  rewrite_content_for_export()
           v
  +-----------------------+     +----------------------------+
  |  content_editor        |     |  content                    |
  |  (raw, for editor)     |     |  (encoded IDs + expanded    |
  |  Same as DB content    |     |   directives, for render)   |
  +-----------------------+     +----------------------------+
```

The API returns **both** fields in `PageDetails`:
- `content_editor`: What the text editor displays and saves back
- `content`: What the Markdown renderer uses (with encoded IDs the existing Galaxy markdown components expect)

This dual-field pattern avoids the round-trip problems that would arise from encoding/decoding IDs on every save cycle.

---

## 7. Agent Architecture

### PageAssistantAgent

Registered as `AgentType.PAGE_ASSISTANT` in the Galaxy agent framework. Uses pydantic-ai with structured output.

**Tools (5):**

| Tool | Purpose | Returns |
|------|---------|---------|
| `list_history_datasets` | Paginated history item listing | HID, name, type, state, size, internal ID |
| `get_dataset_info` | Detailed metadata for one HID | Name, format, state, size, tool info, metadata |
| `get_dataset_peek` | Pre-computed content preview | First lines of dataset content |
| `get_collection_structure` | Collection element listing | Element names, types, states |
| `resolve_hid` | HID -> directive argument conversion | `history_dataset_id=N` or `history_dataset_collection_id=N` + `job_id` |

When editing a standalone page (no `history_id`), history tools are unavailable -- the agent can still do full-replacement and section-patch edits on the page content.

**Output types (3, discriminated by `mode` literal):**

| Type | When Used | Content |
|------|-----------|---------|
| `FullReplacementEdit` | Complete document rewrite | Full new markdown document |
| `SectionPatchEdit` | Targeted heading-level edit | Target heading + new section content |
| `str` (plain text) | Conversational response | No edit proposal |

**System prompt** is dynamically assembled:
1. Static instructions from `prompts/page_assistant.md`
2. Auto-generated directive reference table (reads `markdown_parse.VALID_ARGUMENTS` at runtime)
3. Current page content injected as context
4. History name and item count summary (when `history_id` is set)

The agent works in HID-space (matching what users see in the history panel) and uses `resolve_hid` to translate to the `history_dataset_id=N` directive arguments that Galaxy's markdown renderer expects.

### Chat Persistence

Conversations are scoped per-page via `ChatExchange.page_id`. The flow:

1. User sends message -> `POST /api/chat` with `page_id` and `agent_type="page_assistant"`
2. API looks up page, extracts `history_id` and current content from the page record
3. Agent processes with history tools (if history-attached) and current document context
4. Response stored as `ChatExchange` + `ChatExchangeMessage` with full `agent_response` JSON
5. Frontend persists `exchange_id` in `userLocalStorage` per-page for session continuity

### Chat History Browsing

Users can browse, resume, and delete past conversations for a page via `PageChatHistoryList`. The store tracks `pageChatHistory`, `isLoadingChatHistory`, `showChatHistory`, and `chatHistoryError` state. Chat history is fetched from `GET /api/chat/page/{page_id}/history` and displayed in a sidebar list with timestamps. Selecting a past exchange resumes it; deletion is also supported.

---

## 8. Frontend Components

### Component Tree

```
History-attached entry:
  HistoryCounter (button in history panel)
    +- HistoryPageView (list + display routing -- 178 lines)
         +- HistoryPageList (page picker -- 92 lines)
         +- Markdown (display-only render)
         +- PageEditorView (edit mode delegation)

Standalone entry:
  PageEditor (thin wrapper -- 13 lines)
    +- PageEditorView

PageEditorView (unified editor -- 373 lines)
  +- ClickToEdit (inline title editing)
  +- MarkdownEditor
  |    +- TextEditor (drag-and-drop for history items)
  +- PageRevisionList (sidebar panel -- 87 lines)
  +- PageRevisionView (revision preview + diff modes -- 195 lines)
  +- EditorSplitView (resizable 60/40 split -- 111 lines)
  |    +- PageChatPanel (agent chat -- 571 lines)
  |         +- ChatMessageCell (shared from ChatGXY)
  |         +- ChatInput (shared from ChatGXY)
  |         +- ProposalDiffView (full-doc diff -- 123 lines)
  |         +- SectionPatchView (per-section diff -- 207 lines)
  |         +- PageChatHistoryList (chat history browser -- 235 lines)
  +- ObjectPermissionsModal (standalone only -- 18 lines)
  |    +- ObjectPermissions (363 lines)
  |    +- PermissionObjectType (32 lines)
  |    +- SharingIndicator (73 lines)
```

### PageEditorView (unified editor)

The core editor component. Adapts based on context:

| Feature | `historyId` set | standalone |
|---------|----------------|------------|
| Back button target | `/histories/:hid/pages` | `/pages/list` |
| Title display | History name (read-only header) | Inline `ClickToEdit` |
| Revisions button | Always | Always |
| Chat button | When agents configured | When agents configured |
| Permissions button | Hidden | Shown |
| Save & View | Hidden | Shown |
| Preview | Navigates with `displayOnly=true` | Opens in Window Manager or navigates |

**View states** (template branching):
1. Loading spinner (no current page yet)
2. Error alert (dismissible)
3. Display-only mode (read-only Markdown render + toolbar with Edit button)
4. Revision view (revision preview/diff with Restore button — supports three view modes)
5. Edit mode (toolbar + editor + optional chat/revision sidepanels)

**Revision view modes** (`revisionViewMode`):
- `"preview"` — read-only render of revision content
- `"changes_current"` — diff against current page content
- `"changes_previous"` — diff against previous revision

### HistoryPageView (history context router)

Routes between three states for history-attached pages:
1. **List mode** (no `pageId`) -> `HistoryPageList`
2. **Display mode** (`displayOnly=true`) -> Markdown renderer with toolbar
3. **Edit mode** (`pageId` set, no `displayOnly`) -> delegates to `PageEditorView`

Handles Window Manager integration: when WM is active, clicking a page in the list opens it in a WinBox window via `displayOnly=true` with `router.push(url, { title, preventWindowManager: false })`.

### Pinia Store (`pageEditorStore`)

**Mode:** `mode: "history" | "standalone"` -- controls which features are available.

**State management:**
- Page list, current page, editor content (raw), title
- Dirty tracking: `isDirty = currentContent !== originalContent || currentTitle !== originalTitle`
- Revision list, selected revision, and `revisionViewMode: "preview" | "changes_current" | "changes_previous"`
- UI toggles: `showRevisions`, `showChatPanel` (mutually exclusive)
- Chat history: `pageChatHistory`, `isLoadingChatHistory`, `showChatHistory`, `chatHistoryError`
- Loading/saving flags

**Cross-session persistence (userLocalStorage):**
- `currentPageIds` -- remembers which page was open per-history
- `currentChatExchangeIds` -- remembers chat exchange per-page
- `dismissedChatProposals` -- remembers dismissed proposals per-page

**Smart defaults:**
- `resolveCurrentPage(historyId)` returns stored page, falls back to most recent by update_time, or auto-creates a new one

**Mode differentiation is minimal** -- mostly a UI/UX signal:
- History mode: guard checks require `historyId` for load operations
- Standalone mode: `savePage()` defaults `edit_source` to `"user"` if not specified
- API calls are identical -- unified `/api/pages` endpoints handle both via optional `history_id`

### Diff System (`sectionDiffUtils.ts` -- 218 lines)

Built on [jsdiff](https://github.com/kpdecker/jsdiff) (`diff@^8.0.3`).

| Function | Purpose |
|----------|---------|
| `markdownSections(content)` | Split document by `#{1,6}` headings |
| `computeLineDiff(old, new)` | Line-level unified diff |
| `sectionDiff(old, new)` | Per-section change detection |
| `applySectionPatches(old, new, accepted)` | Merge only accepted section changes |
| `applySectionEdit(content, heading, newContent)` | Replace single section |
| `diffStats(changes)` | Count additions/deletions |

**Stale proposal detection:** Uses DJB2 hash of original content. If page content changes after a proposal was generated, Accept buttons are disabled.

### Routes

| Path | Component | Notes |
|------|-----------|-------|
| `/histories/:historyId/pages` | HistoryPageView | List mode |
| `/histories/:historyId/pages/:pageId` | HistoryPageView | Edit mode |
| `/histories/:historyId/pages/:pageId?displayOnly=true` | HistoryPageView | Read-only rendered (WM) |
| `/pages/editor?id=X` | PageEditor | Standalone edit |
| `/pages/editor?id=X&displayOnly=true` | PageEditor | Standalone display |
| `/pages/list` | GridPage | Standalone page grid |
| `/published/page?id=X` | PageView | Published/embed view |

### Drag-and-Drop

TextEditor supports drag from the history panel when `mode="page"`:
- Uses Galaxy's `eventStore.getDragItems()` infrastructure
- Datasets -> `history_dataset_display(history_dataset_id=...)` directive
- Collections -> `history_dataset_collection_display(history_dataset_collection_id=...)` directive
- Visual feedback: green dashed border on valid dragover

### Window Manager Integration

When Galaxy's Window Manager (WinBox) is active:
- **History pages:** Clicking a page in `HistoryPageList` opens it in a WinBox window via `displayOnly=true`
- **Standalone pages:** "View in Window" grid action calls `Galaxy.frame.add()` with embed URL
- **HistoryCounter:** The page button respects WM state -- opens in frame when active
- `onUnmounted` skips `store.$reset()` in display mode (iframe independence)

---

## 9. API Surface

All page operations use the unified `/api/pages` endpoints. History-attached pages are just pages with `history_id` set.

### Page CRUD

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/pages` | List pages (supports `history_id` filter) |
| `POST` | `/api/pages` | Create page (with optional `history_id`) |
| `GET` | `/api/pages/{id}` | Get page (two content fields: `content` + `content_editor`) |
| `PUT` | `/api/pages/{id}` | Update (creates new revision with `edit_source`) |
| `DELETE` | `/api/pages/{id}` | Soft-delete |
| `PUT` | `/api/pages/{id}/undelete` | Restore |

### Revisions

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/pages/{id}/revisions` | List revisions |
| `GET` | `/api/pages/{id}/revisions/{rid}` | Get revision content |
| `POST` | `/api/pages/{id}/revisions/{rid}/revert` | Restore to revision (`edit_source="restore"`) |

### Sharing & Publishing (standalone pages)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/pages/{id}/sharing` | Current sharing status |
| `PUT` | `/api/pages/{id}/enable_link_access` | Enable link sharing |
| `PUT` | `/api/pages/{id}/publish` | Publish page |
| `PUT` | `/api/pages/{id}/share_with_users` | Share with specific users |
| `PUT` | `/api/pages/{id}/slug` | Set URL slug |

### Chat

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/chat` | Send message (with `page_id` + `agent_type`) |
| `GET` | `/api/chat/page/{page_id}/history` | Retrieve page chat history |

### Index Query Parameters

| Param | Default | Notes |
|-------|---------|-------|
| `history_id` | null | Filter pages by history (the key filter for history-attached pages) |
| `show_own` | true | Show user's own pages |
| `show_published` | true | Show published pages |
| `show_shared` | false | Show pages shared with user |
| `search` | null | Freetext search |
| `sort_by` | -- | `create_time`, `title`, `update_time`, `username` |
| `limit` / `offset` | 100 / 0 | Pagination |

---

## 10. Test Coverage

### Summary

| Layer | Tests | LOC | Coverage |
|-------|-------|-----|----------|
| Selenium E2E | 30 | 673 | Navigation, editing, drag-drop, WM, revisions, rename, chat, permissions |
| API integration | 29 | 323 | CRUD, revisions, permissions, chat persistence |
| Agent unit | 40 | 821 | Structured output, tools, prompt injection, history context, live LLM |
| History tools | 32 | 511 | All 5 tool functions |
| Chat manager | 8 | 149 | Page-scoped persistence, filtering |
| Vitest (components) | 9 test files | ~2,100 | All PageEditor components, store, diff utils |

### Frontend Test Files

| File | Lines | Focus |
|------|-------|-------|
| `pageEditorStore.test.ts` | 1,422 | Store: CRUD, revisions, persistence, standalone mode, chat history |
| `PageEditorView.test.ts` | 646 | Unified editor: standalone + history modes, revisions, WM |
| `HistoryPageView.test.ts` | 367 | List/display/edit routing, lifecycle, WM integration |
| `PageChatPanel.test.ts` | 379 | Chat loading, proposals, feedback, staleness |
| `sectionDiffUtils.test.ts` | 265 | Section parsing, diff computation, patch application |
| `PageRevisionList.test.ts` | 207 | Revision list rendering, source labels, restore |
| `HistoryPageList.test.ts` | 185 | Page list, create/select/view events |
| `SectionPatchView.test.ts` | 68 | Section-level patch UI |
| `ProposalDiffView.test.ts` | 66 | Full-replacement diff rendering |
| `EditorSplitView.test.ts` | 59 | Resizable split layout |

### Test Infrastructure

- **Selenium helpers:** 13 methods on `NavigatesGalaxy` (navigate, create, edit, save, rename, revisions, chat)
- **Navigation YAML:** 29+ selectors under `pages.history` section
- **Vitest:** Pinia testing utilities, MSW for HTTP mocking, Vue shallowMount
- **Agent tests:** Mocked pydantic-ai agent + optional live LLM tests (env-gated)

---

## 11. ChatGXY Extraction

The existing `ChatGXY.vue` (982 lines) was refactored into shared sub-components before building the page chat panel:

| Component | Lines | Purpose |
|-----------|-------|---------|
| `ChatMessageCell.vue` | 345 | Message rendering with role styling, feedback buttons, action suggestions |
| `ChatInput.vue` | 96 | Textarea + send button with busy state |
| `ActionCard.vue` | 97 | Action suggestion cards with priority-based styling |
| `agentTypes.ts` | 60 | Agent type registry with icons and labels |
| `chatTypes.ts` | 26 | Shared `ChatMessage` interface |
| `chatUtils.ts` | 13 | `generateId()` and `scrollToBottom()` helpers |

PageChatPanel reuses all extracted components with no duplication.

---

## 12. Design Decisions

### Model Merge: HistoryNotebook -> Page

The original implementation created separate `HistoryNotebook` and `HistoryNotebookRevision` tables. After removing HID syntax (which was the only structural difference between notebooks and pages), the models were identical. The merge:

- Added `page.history_id` (nullable FK to history) instead of a separate table
- Added `page_revision.edit_source` to track revision provenance
- Changed `chat_exchange.notebook_id` -> `chat_exchange.page_id`
- Eliminated separate API endpoints (`/api/histories/{id}/notebooks/*`), manager, and schema classes
- All page operations now go through the unified `/api/pages` endpoints with optional `history_id` filter

**Benefit:** One model, one API, one editor, one store. No duplication.

### HID Syntax (Decided: Removed from storage layer)

History pages originally introduced `hid=N` syntax in stored markdown -- ~630 lines across 16 files for backend resolution, dual content fields, client-side provide/inject, and store-based HID-to-ID mapping.

**Current approach:** Pages store `history_dataset_id=X` (matching existing Page syntax). The agent uses `resolve_hid` as a tool to bridge between user-visible HIDs and directive IDs. This eliminates the resolution machinery while preserving the agent's ability to work with HIDs naturally.

Trade-off: power users hand-editing markdown see opaque IDs, but the toolbox and drag-and-drop handle insertion -- most users never read raw markdown.

### UI Convergence

Two parallel editors existed: legacy `PageEditorMarkdown.vue` (Options API, local state, no revisions/chat) and `HistoryNotebookView.vue` (Composition API, Pinia store, full features). The convergence:

- Created `PageEditorView.vue` as a single editor that adapts via `mode: "history" | "standalone"`
- `HistoryPageView.vue` kept only list + display routing; edit mode delegates to `PageEditorView`
- Legacy `PageEditorMarkdown.vue` and `PageEditor/services.js` deleted
- Single `pageEditorStore` handles both modes with minimal branching

### Multiple Pages Per History

No unique constraint on `page.history_id`. A history can have multiple pages for different analysis perspectives, collaborators, or document types.

### Title Not Versioned

Title lives on `Page`, not on revisions. Renaming doesn't create a new revision -- it's page identity, not content. (PageRevision does have a `title` field for snapshot purposes.)

### Revision = Append-Only

Every edit (user save, agent apply, restore) creates a new `PageRevision`. No in-place updates. `edit_source` tracks provenance.

### Section-Level Patching

The agent can propose section-level edits (targeted by heading). The frontend shows per-section diffs with individual checkboxes. Users accept/reject sections independently. This is more practical than all-or-nothing for large documents.

### Panel Mutual Exclusion

The revision panel and chat panel are mutually exclusive -- toggling one closes the other. This avoids layout complexity and keeps the editor area usable.

---

## 13. File Inventory

### Backend (Python)

| File | Lines | Role |
|------|-------|------|
| `lib/galaxy/model/__init__.py` | +100 | Page model extensions (`history_id`, revision `edit_source`, ChatExchange `page_id`) |
| `lib/galaxy/managers/pages.py` | ~795 | PageManager: CRUD, revisions, content pipeline, history filtering |
| `lib/galaxy/webapps/galaxy/api/pages.py` | ~393 | REST endpoints including revision operations |
| `lib/galaxy/webapps/galaxy/services/pages.py` | ~200 | PagesService: endpoint logic |
| `lib/galaxy/schema/schema.py` | +120 | Pydantic schemas: `PageDetails`, `PageRevisionSummary/Details`, query payloads |
| `lib/galaxy/managers/markdown_util.py` | 1,434 | `ready_galaxy_markdown_for_export()` |
| `lib/galaxy/agents/page_assistant.py` | ~454 | PageAssistantAgent class + structured output types |
| `lib/galaxy/agents/history_tools.py` | ~288 | 5 async history data tools |
| `lib/galaxy/agents/prompts/page_assistant.md` | ~159 | System prompt template |
| `lib/galaxy/managers/chat.py` | +55 | Page-scoped chat methods |
| `lib/galaxy/webapps/galaxy/api/chat.py` | ~570 | Chat endpoints (including page chat history) |
| `lib/galaxy/agents/base.py` | +1 | `PAGE_ASSISTANT` enum value |

### Frontend (TypeScript/Vue)

| File | Lines | Role |
|------|-------|------|
| `client/src/api/pages.ts` | 166 | Unified API client (CRUD, revisions, revert) |
| `client/src/stores/pageEditorStore.ts` | — | Pinia store with mode, persistence, revisions, chat history |
| `client/src/components/PageEditor/PageEditorView.vue` | 373 | Unified editor (standalone + history) |
| `client/src/components/PageEditor/HistoryPageView.vue` | 178 | History context: list + display routing |
| `client/src/components/PageEditor/HistoryPageList.vue` | 92 | Page picker for history |
| `client/src/components/PageEditor/PageChatPanel.vue` | 571 | Agent chat panel + chat history integration |
| `client/src/components/PageEditor/PageChatHistoryList.vue` | 235 | Chat history browser with selection/deletion |
| `client/src/components/PageEditor/EditorSplitView.vue` | 111 | Resizable 60/40 split layout |
| `client/src/components/PageEditor/PageRevisionList.vue` | 87 | Revision sidebar |
| `client/src/components/PageEditor/PageRevisionView.vue` | 195 | Revision preview + diff view modes |
| `client/src/components/PageEditor/ProposalDiffView.vue` | 123 | Full-document diff |
| `client/src/components/PageEditor/SectionPatchView.vue` | 207 | Section-level diff with checkboxes |
| `client/src/components/PageEditor/sectionDiffUtils.ts` | 218 | Diff computation |
| `client/src/components/PageEditor/ObjectPermissions.vue` | 363 | Permission checking (standalone) |
| `client/src/components/PageEditor/ObjectPermissionsModal.vue` | 18 | Modal wrapper for permissions |
| `client/src/components/PageEditor/PermissionObjectType.vue` | 32 | Object type display in permissions |
| `client/src/components/PageEditor/SharingIndicator.vue` | 73 | Permission toggle indicator |
| `client/src/components/PageEditor/object-permission-composables.ts` | — | Composables for permission handling |
| `client/src/components/PageEditor/PageEditor.vue` | 13 | Standalone entry wrapper |
| `client/src/components/Markdown/Editor/TextEditor.vue` | +40 | Drag-and-drop additions |
| ChatGXY extractions (6 files) | ~637 | Shared chat components |

### Tests

| File | Lines | Tests |
|------|-------|-------|
| `lib/galaxy_test/selenium/test_history_pages.py` | 673 | 30 |
| `lib/galaxy_test/api/test_pages_history_attached.py` | 323 | 29 |
| `lib/galaxy/selenium/navigates_galaxy.py` | +100 | 13 helper methods |
| `test/unit/app/test_agents.py` | 821 | 40 (17 PageAssistantAgent) |
| `test/unit/app/test_history_tools.py` | 511 | 32 |
| `test/unit/app/test_chat_manager.py` | 149 | 8 |
| Client vitest (10 files) | ~2,100 | Store, components, diff utils |
| `client/src/stores/pageEditorStore.test.ts` | 1,422 | ~87 |

---

## 14. Remaining Work

### Not Yet Implemented

| Item | Scope | Notes |
|------|-------|-------|
| Window Manager chat | Frontend | Pop chat into WinBox, postMessage sync |
| CodeMirror 6 upgrade | Frontend | Replace textarea with CM6 for inline diff/suggestions |
| Streaming responses | Full-stack | SSE/WebSocket for agent output; requires CM6 |
| Orchestrator integration | Backend | Page agent as sub-agent in workflow orchestrator |

### Known Issues

- `APPLY_PAGE_EDIT` and `INSERT_PAGE_SECTION` action types defined in `agentActions.ts` but not fully wired to UI handlers
- `MarkdownHelp.vue` does not yet have page-specific help text for history context
- No concurrent edit protection (last-write-wins)
