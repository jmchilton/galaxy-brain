---
type: research
subtype: component
tags:
  - research/component
  - galaxy/client
  - galaxy/api
  - galaxy/lib
component: ChatGXY Persistence
status: draft
created: 2026-03-05
revised: 2026-04-22
revision: 2
ai_generated: true
summary: "ChatGXY persistence model, API flow, and frontend state management for chat conversations"
related_notes:
  - "[[Component - Agents Backend]]"
  - "[[Component - Agents UX]]"
  - "[[PR 21434 - AI Agent Framework and ChatGXY]]"
  - "[[PR 21692 - Standardize Agent API Schemas]]"
---

# ChatGXY Persistence: How Chats Are Stored, Loaded, and Managed

## 1. Overview / Architecture Summary

Galaxy has **two distinct chat UX surfaces** that persist conversations:

1. **ChatGXY** (`/chatgxy`) -- full-page standalone chat with any agent type. General-purpose Q&A, tool recommendations, error analysis, etc.
2. **PageChatPanel** -- embedded split-pane chat in the page editor. Scoped to a specific page, talks to the `page_assistant` agent, and can propose structured edits (diffs).

Both surfaces share the same backend persistence model (`ChatExchange` + `ChatExchangeMessage`), the same API endpoint (`POST /api/chat`), and reuse frontend components (`ChatInput`, `ChatMessageCell`, `ActionCard`).

### Data Flow Summary

```
User types query
    |
    v
Frontend: POST /api/chat  (body: {query, exchange_id?, page_id?})
    |
    v
Backend: ChatAPI.query()
    |--- loads conversation_history from DB if exchange_id present
    |--- calls AgentService.route_and_execute()
    |--- saves exchange: create new or add_message to existing
    |
    v
Response: ChatResponse {response, agent_response, exchange_id}
    |
    v
Frontend: stores exchange_id in ref (+ localStorage for pages)
    |--- pushes ChatMessage into messages array
    |--- renders via ChatMessageCell
```

### Key Architectural Decisions

- **JSON-in-Text storage**: Conversation data stored as JSON string in a `TEXT` column. No separate columns for query/response/agent_type.
- **One exchange = one conversation thread**: An exchange has many messages (turns). Each message stores one query+response pair as JSON.
- **No streaming**: Request-response only; no WebSocket or SSE for chat (unlike the unmerged PR #21706).
- **No polling**: UI does not poll for updates. Messages only appear after explicit user interaction.
- **Soft delete for pages**: `Page.deleted = True` does not cascade to chat exchanges. Frontend cleans up localStorage on page delete; DB rows for the exchange persist (orphaned but harmless).

---

## 2. Database Models

### Tables

#### `chat_exchange`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `INTEGER` | PK | Auto-incrementing primary key |
| `user_id` | `INTEGER` | FK -> `galaxy_user.id`, indexed, NOT NULL | Owner of this exchange |
| `job_id` | `INTEGER` | FK -> `job.id`, indexed, nullable | For job-based (GalaxyWizard) exchanges |
| `page_id` | `INTEGER` | FK -> `page.id`, indexed, nullable | For page-scoped (PageChatPanel) exchanges |

**Source**: `lib/galaxy/model/__init__.py` lines 3251-3274

**Relationships**:
- `user` -> `User` (back_populates `chat_exchanges`)
- `messages` -> `list[ChatExchangeMessage]` (back_populates `chat_exchange`)
- `page` -> `Page` (no back-population on Page side)

**Exchange scoping**: Exactly one of `job_id`, `page_id`, or neither is set:
- `job_id` set: GalaxyWizard error analysis exchange
- `page_id` set: PageChatPanel conversation
- Neither set: General ChatGXY conversation

#### `chat_exchange_message`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `INTEGER` | PK | Auto-incrementing primary key |
| `chat_exchange_id` | `INTEGER` | FK -> `chat_exchange.id`, indexed | Parent exchange |
| `create_time` | `DATETIME` | default=now | Timestamp of message creation |
| `message` | `TEXT` | | JSON-encoded conversation data (see below) |
| `feedback` | `INTEGER` | nullable | 0=negative, 1=positive, NULL=no feedback |

**Source**: `lib/galaxy/model/__init__.py` lines 3276-3288

### Message JSON Structure

Each `ChatExchangeMessage.message` contains a JSON string with this shape:

```json
{
    "query": "User's question text",
    "response": "Agent's response text",
    "agent_type": "router",
    "agent_response": {
        "content": "...",
        "agent_type": "router",
        "confidence": "high",
        "suggestions": [...],
        "metadata": { "model": "...", "total_tokens": 123, ... },
        "reasoning": "..."
    }
}
```

The `agent_response` field is the full serialized `AgentResponse` Pydantic model (may be null for legacy/error messages). One message = one complete turn (query + response).

### Migrations

1. **`cbc46035eba0`** (2023-06-05): Original migration creating `chat_exchange` and `chat_exchange_message` tables. Pre-dates the agent framework.
   - **File**: `lib/galaxy/model/migrations/alembic/versions_gxy/cbc46035eba0_chat_exchange_storage.py`

2. **`b75f0f4dbcd4`** (2025-01-06): Adds `page_id` column to `chat_exchange` (plus page model additions: `history_id`, `source_invocation_id`, `edit_source` on `page_revision`).
   - **File**: `lib/galaxy/model/migrations/alembic/versions_gxy/b75f0f4dbcd4_add_page_history_columns.py`
   - Adds FK, index, and constraint for `chat_exchange.page_id -> page.id`

---

## 3. API Layer

All chat endpoints are in `lib/galaxy/webapps/galaxy/api/chat.py`, class `ChatAPI`. All marked `unstable=True`.

### Endpoints

| Method | Path | Purpose | Used By |
|--------|------|---------|---------|
| `POST` | `/api/chat` | Main chat endpoint (send query, get response) | ChatGXY, PageChatPanel |
| `GET` | `/api/chat/history` | List user's general (non-job, non-page) chat exchanges | ChatGXY history sidebar |
| `GET` | `/api/chat/page/{page_id}/history` | List page-scoped chat exchanges | PageChatPanel on open |
| `DELETE` | `/api/chat/history` | Clear all non-job chat exchanges | ChatGXY "Clear History" button |
| `PUT` | `/api/chat/{job_id}/feedback` | Job-based feedback (GalaxyWizard) | GalaxyWizard |
| `PUT` | `/api/chat/exchange/{exchange_id}/feedback` | Exchange-based feedback | ChatGXY, PageChatPanel |
| `GET` | `/api/chat/exchange/{exchange_id}/messages` | Get all messages for an exchange | Loading full conversation on history select |

### `POST /api/chat` -- Request

**Query params**: `agent_type` (default `"auto"`), optional `job_id` (legacy)

**Body** (`ChatPayload`):
```python
class ChatPayload(Model):
    query: str
    context: Optional[str] = ""
    exchange_id: Optional[int] = None      # Continue existing conversation
    page_id: Optional[DecodedDatabaseIdField] = None  # Scope to page
    regenerate: Optional[bool] = None      # Force fresh (job-based only)
```

**Source**: `lib/galaxy/schema/schema.py` lines 3878-3903

### `POST /api/chat` -- Response

```python
class ChatResponse(BaseModel):
    response: str
    error_code: Optional[int]
    error_message: Optional[str]
    agent_response: Optional[AgentResponse] = None
    exchange_id: Optional[int] = None
    processing_time: Optional[float] = None
```

**Source**: `lib/galaxy/schema/schema.py` lines 3906-3935

### `POST /api/chat` -- Backend Flow (lines 96-282)

1. Extract query from body payload or query param
2. If `job_id`: check for cached response (skip if `regenerate`)
3. Extract `exchange_id` and `page_id` from payload
4. If `page_id`: load page object, attach `history_id` and exported `page_content` to context
5. If `exchange_id`: load conversation history from DB as `conversation_history` in context dict
6. Call `AgentService.route_and_execute()` (or legacy fallback)
7. **Save to DB**:
   - `job_id` set -> `ChatManager.create(trans, job_id, response)`
   - `exchange_id` set -> `ChatManager.add_message(trans, exchange_id, json_data)` (append to existing)
   - `page_id` set (no exchange_id) -> `ChatManager.create_page_chat(trans, page_id, ...)`
   - Neither -> `ChatManager.create_general_chat(trans, query, ...)`
8. Return `ChatResponse` with `exchange_id` for conversation continuity

### `GET /api/chat/history` -- Response Shape

Returns `list[dict]` where each dict:
```json
{
    "id": 42,
    "query": "first message query",
    "response": "first message response",
    "agent_type": "router",
    "agent_response": { ... },
    "timestamp": "2026-03-05T10:00:00",
    "feedback": null,
    "message_count": 3
}
```

Note: only returns data from the **first message** of each exchange (for history list display). `message_count` indicates total turns.

### `GET /api/chat/exchange/{exchange_id}/messages` -- Response Shape

Returns `list[dict]` -- flattened list of all messages across all turns:
```json
[
    { "role": "user", "content": "...", "timestamp": "..." },
    { "role": "assistant", "content": "...", "agent_type": "router", "agent_response": {...}, "timestamp": "...", "feedback": null },
    { "role": "user", "content": "...", "timestamp": "..." },
    { "role": "assistant", "content": "...", "agent_type": "router", "agent_response": {...}, "timestamp": "...", "feedback": null }
]
```

Each stored `ChatExchangeMessage` (one per turn) is split into two entries (user + assistant).

---

## 4. Business Logic (ChatManager)

**File**: `lib/galaxy/managers/chat.py`

### Key Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `create` | `(trans, job_id, message) -> ChatExchange` | Create job-based exchange with raw message string |
| `create_general_chat` | `(trans, query, response_data, agent_type) -> ChatExchange` | Create general ChatGXY exchange (no job, no page) |
| `create_page_chat` | `(trans, page_id, query, response_data, agent_type) -> ChatExchange` | Create page-scoped exchange |
| `add_message` | `(trans, exchange_id, message) -> ChatExchangeMessage` | Append a turn to existing exchange (validates ownership) |
| `get` | `(trans, job_id) -> ChatExchange?` | Lookup by job_id |
| `get_exchange_by_id` | `(trans, exchange_id) -> ChatExchange?` | Lookup by exchange_id |
| `get_chat_history` | `(trans, exchange_id, format_for_pydantic_ai) -> list` | Get messages for an exchange. Can return raw dicts or pydantic-ai `ModelMessage` objects |
| `get_user_chat_history` | `(trans, limit, include_job_chats, include_page_chats) -> list[ChatExchange]` | List user's exchanges with filtering |
| `get_page_chat_history` | `(trans, page_id, limit) -> list[ChatExchange]` | List exchanges for a specific page |
| `set_feedback_for_exchange` | `(trans, exchange_id, feedback) -> ChatExchange` | Set feedback (0/1) on first message |
| `set_feedback_for_job` | `(trans, job_id, feedback) -> ChatExchange` | Set feedback by job lookup |

### Important Implementation Details

- **All queries scoped by `user_id`** -- users can only see their own exchanges
- `get_user_chat_history` defaults to excluding both job chats and page chats (`include_job_chats=False, include_page_chats=False`)
- `get_chat_history` with `format_for_pydantic_ai=True` converts stored messages into `ModelRequest`/`ModelResponse` objects for agent continuation
- Feedback is stored on `ChatExchangeMessage.feedback` (the first message's feedback field). Comment in code: "There is only one message in an exchange currently" -- this is outdated since multi-turn was added, but feedback still targets message[0].

---

## 5. Frontend State Management

### ChatGXY (Standalone Page)

**File**: `client/src/components/ChatGXY.vue`

All state is **component-local refs** -- no Pinia store:

| Ref | Type | Purpose |
|-----|------|---------|
| `messages` | `ref<ChatMessage[]>` | All displayed messages |
| `currentChatId` | `ref<number \| null>` | Current exchange ID (sent as `exchange_id` in POST) |
| `chatHistory` | `ref<ChatHistoryItem[]>` | History sidebar items |
| `busy` | `ref<boolean>` | Loading spinner state |
| `selectedAgentType` | `ref<string>` | Dropdown selection (default `"auto"`) |
| `showHistory` | `ref<boolean>` | History sidebar visibility |
| `loadingHistory` | `ref<boolean>` | History list loading state |
| `hasLoadedInitialChat` | `ref<boolean>` | Prevents welcome message if latest chat loaded |

**No localStorage usage** in ChatGXY standalone. The `currentChatId` is ephemeral -- lost on page refresh (but the latest chat is reloaded from API on mount).

### PageChatPanel (Page Editor)

**File**: `client/src/components/PageEditor/PageChatPanel.vue`

Component-local refs plus store-backed persistence:

| Ref | Type | Persistence | Purpose |
|-----|------|-------------|---------|
| `messages` | `ref<ChatMessage[]>` | Ephemeral | Displayed messages |
| `currentChatId` | `ref<number \| null>` | Via store -> localStorage | Current exchange ID |
| `dismissedProposals` | `ref<Set<string>>` | Via store -> localStorage | IDs of proposals user dismissed |
| `busy` | `ref<boolean>` | Ephemeral | Loading state |

### pageEditorStore (Pinia)

**File**: `client/src/stores/pageEditorStore.ts`

Three `useUserLocalStorage` entries persist chat state across sessions:

```typescript
// Per-page chat exchange ID -- survives panel close/reopen
const currentChatExchangeIds = useUserLocalStorage<Record<string, number | null>>(
    "history-page-chat-exchange", {}
);

// Per-page dismissed proposal message IDs
const dismissedChatProposals = useUserLocalStorage<Record<string, string[]>>(
    "history-page-dismissed-proposals", {}
);

// Also: per-history "current page" ID (not chat-specific but relevant)
const currentPageIds = useUserLocalStorage<Record<string, string>>(
    "history-page-current", {}
);
```

**localStorage keys** (all user-scoped via hashed user ID prefix):
- `history-page-chat-exchange` -- Maps `pageId -> exchangeId | null`
- `history-page-dismissed-proposals` -- Maps `pageId -> messageId[]`
- `history-page-current` -- Maps `historyId -> pageId`

### Store Methods for Chat

| Method | Signature | Purpose |
|--------|-----------|---------|
| `getCurrentChatExchangeId` | `(pageId) -> number \| null` | Read cached exchange ID |
| `setCurrentChatExchangeId` | `(pageId, exchangeId)` | Write exchange ID to localStorage |
| `clearCurrentChatExchangeId` | `(pageId)` | Remove exchange ID entry |
| `getDismissedProposals` | `(pageId) -> string[]` | Read dismissed message IDs |
| `addDismissedProposal` | `(pageId, messageId)` | Add to dismissed set |
| `clearDismissedProposals` | `(pageId)` | Remove all dismissed for page |
| `toggleChatPanel` | `()` | Toggle `showChatPanel` (mutually exclusive with revisions) |

### ChatMessage Type

**File**: `client/src/components/ChatGXY/chatTypes.ts`

```typescript
interface ChatMessage {
    id: string;                    // Client-generated (generateId() or hist-* prefix)
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    agentType?: string;            // e.g. "router", "page_assistant"
    confidence?: string;
    feedback?: "up" | "down" | null;
    agentResponse?: AgentResponse;
    suggestions?: ActionSuggestion[];
    isSystemMessage?: boolean;     // Welcome/system messages don't show feedback
}
```

### useUserLocalStorage

**File**: `client/src/composables/userLocalStorage.ts`

Wrapper around browser localStorage that:
1. Hashes the current user ID
2. Prefixes all keys with the hash
3. Returns a reactive `Ref<T>` that syncs to localStorage

This ensures per-user isolation of stored chat exchange IDs and dismissed proposals.

---

## 6. Chat Panel UI Flow

### ChatGXY Standalone: Open -> Load -> Display -> Interact

1. **Mount** (`onMounted`):
   - Calls `loadLatestChat()`:
     - `GET /api/chat/history?limit=1`
     - If data exists, calls `loadPreviousChat(latestChat)` (which fetches full conversation)
     - Sets `hasLoadedInitialChat = true`
   - If no chat loaded, pushes a welcome system message

2. **User sends query**:
   - Push user `ChatMessage` to `messages` array
   - `POST /api/chat` with `{query, exchange_id: currentChatId}`
   - On success: store `data.exchange_id` as `currentChatId`
   - Push assistant `ChatMessage` with agentResponse/suggestions
   - Scroll to bottom

3. **Multi-turn**: subsequent queries include `exchange_id`, so backend appends via `add_message()` and loads conversation history for agent context.

4. **History sidebar**:
   - Toggle shows 280px sidebar
   - Lazy-loads via `GET /api/chat/history?limit=50`
   - Click item -> `loadPreviousChat(item)`:
     - `GET /api/chat/exchange/{id}/messages`
     - Rebuilds full `messages` array from all turns
     - Falls back to single-message if full conversation fetch fails

5. **New Chat**: Clears messages, resets `currentChatId = null`, shows new welcome message.

6. **Clear History**: `DELETE /api/chat/history` -> clears sidebar, starts new chat if active.

### PageChatPanel: Open -> Load -> Display -> Interact

1. **Mount** (`onMounted`):
   - Calls `loadPageChat()`:
     a. Check `store.getCurrentChatExchangeId(pageId)` (localStorage cache)
     b. If found, `loadConversation(storedExchangeId)`:
        - `GET /api/chat/exchange/{id}/messages`
        - Populate `messages`, set `currentChatId`, restore dismissed proposals
     c. If no localStorage hit, fall back to `GET /api/chat/page/{page_id}/history?limit=1`
        - If data exists, `loadConversation(latest.id)`
   - If still no messages, show welcome message

2. **User sends query**:
   - `POST /api/chat` with `{query, exchange_id: currentChatId, page_id: pageId}`
   - On success: store `exchange_id` in both local ref AND store (`setCurrentChatExchangeId`)
   - Push assistant message (may contain edit proposals in `agentResponse.metadata`)

3. **Edit proposals** (unique to PageChatPanel):
   - Each assistant message is checked for `agentResponse.metadata.edit_mode`
   - If `full_replacement`: shows `ProposalDiffView` with unified diff
   - If `section_patch`: shows `SectionPatchView` with per-section checkboxes
   - Staleness detection: `isProposalStale(msg)` compares `metadata.original_content_hash` (DJB2 hash of page content at proposal time) to current content hash
   - **Accept**: applies content to store (`store.updateContent()`), saves page with `edit_source="agent"`, adds to dismissed set
   - **Reject**: adds message ID to dismissed set (localStorage-persisted)
   - Already-applied proposals auto-hide (content equality check)

4. **New Conversation**: Clears messages, resets `currentChatId`, clears dismissed proposals, persists all to localStorage via store.

---

## 7. Exchange Lifecycle

### Create

**First message in a new conversation**:
1. Frontend sends `POST /api/chat` with `exchange_id: null`
2. Backend creates new `ChatExchange` (via `create_general_chat` or `create_page_chat`)
3. First `ChatExchangeMessage` attached with JSON payload
4. `exchange.id` returned in response
5. Frontend stores `exchange_id` in `currentChatId` ref (+ localStorage for pages)

### Continue

**Subsequent messages**:
1. Frontend sends `POST /api/chat` with `exchange_id: <existing_id>`
2. Backend loads conversation history from DB for agent context (`get_chat_history`)
3. Agent processes query with full conversation history
4. Backend appends new `ChatExchangeMessage` via `add_message()`
5. Same `exchange_id` returned

### Load (History)

**ChatGXY history sidebar**:
1. `GET /api/chat/history` returns first-message summaries of all general exchanges
2. User clicks item -> `GET /api/chat/exchange/{id}/messages` loads all turns
3. Messages reconstructed into `ChatMessage[]` with proper roles, types, feedback states

**PageChatPanel on open**:
1. Check localStorage for cached `exchange_id` for this page
2. If found, load directly via `GET /api/chat/exchange/{id}/messages`
3. If not, fall back to `GET /api/chat/page/{page_id}/history?limit=1` for most recent

### Cleanup

**Page deletion** (`deleteCurrentPage()` in pageEditorStore):
1. Calls `DELETE /api/pages/{id}` (soft delete: sets `page.deleted = True`)
2. Frontend: `clearCurrentPageId(historyId)`, `clearCurrentChatExchangeId(pageId)`, `clearDismissedProposals(pageId)`
3. **Backend**: No cascade to `ChatExchange`. DB rows persist with `page_id` pointing to a soft-deleted page.

**Chat history clear** (`DELETE /api/chat/history`):
1. Loads all non-job exchanges for user (up to 1000)
2. Deletes all `ChatExchangeMessage` rows, then `ChatExchange` rows
3. Hard delete (not soft)
4. Note: only clears general (non-page, non-job) exchanges

**No automatic cleanup for**:
- Orphaned page chat exchanges (page soft-deleted, exchanges remain)
- Old exchanges with no recent activity
- There is no TTL, no cron job, no garbage collection

### Feedback

Feedback targets the **exchange** (not individual messages):
1. Frontend: `PUT /api/chat/exchange/{exchange_id}/feedback` with body `0` or `1`
2. Backend: sets `chat_exchange.messages[0].feedback` (first message only)
3. This is a design limitation -- multi-turn exchanges only record feedback on the first message

---

## 8. Multi-Exchange Support (History Selection, Switching)

### ChatGXY

- **History sidebar** (280px, toggled by History button):
  - Lists all general (non-job, non-page) exchanges, most recent first
  - Each item shows: truncated query, agent icon, elapsed time
  - Click loads full conversation and sets `currentChatId`
  - "Clear History" deletes all general exchanges after confirmation
  - "New" button resets to fresh conversation

- **State on switch**:
  - `messages` array completely replaced
  - `currentChatId` updated to selected exchange
  - Previous unsent query text lost (no save)

- **No multi-exchange view**: Only one conversation visible at a time

### PageChatPanel

- **No history sidebar**: Only shows the current conversation for the page
- **"New Chat" button**: Starts fresh conversation, clears localStorage exchange ID
- **Automatic resume**: On panel open, loads the most recent exchange for this page (from localStorage or API)
- **One active exchange per page**: The `currentChatExchangeIds` map stores one exchange ID per page ID

### Cross-Page Navigation

When switching between pages in the editor:
1. Store's `clearCurrentPage()` sets `showChatPanel = false` and clears the exchange ID for that page
2. Loading a new page does NOT automatically open the chat panel
3. When user toggles chat for the new page, `onMounted` in PageChatPanel triggers fresh load
4. The per-page localStorage mapping ensures each page remembers its own conversation

---

## 9. Edit Proposal Persistence

### How Proposals Are Created

The `page_assistant` agent returns structured output via pydantic-ai output types:

```python
# Full replacement
class FullReplacementEdit(BaseModel):
    mode: Literal["full_replacement"]
    reasoning: str
    content: str  # Complete new document

# Section patch
class SectionPatchEdit(BaseModel):
    mode: Literal["section_patch"]
    reasoning: str
    target_section_heading: str
    new_section_content: str
```

These are serialized into `agentResponse.metadata` in the DB:
```json
{
    "edit_mode": "full_replacement",
    "content": "...",
    "original_content_hash": "a1b2c3d4"
}
```

### Staleness Detection

Both frontend and backend compute a DJB2 hash of the page content:

```python
# Backend (page_assistant.py)
def _djb2_hash(s: str) -> str:
    h = 5381
    for c in s:
        h = ((h * 33) + ord(c)) & 0xFFFFFFFF
    return format(h, "08x")
```

```typescript
// Frontend (PageChatPanel.vue)
function djb2Hash(s: string): string {
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
        h = (h * 33 + s.charCodeAt(i)) >>> 0;
    }
    return h.toString(16).padStart(8, "0");
}
```

If `original_content_hash` does not match `djb2Hash(currentPageContent)`, the proposal is marked stale and Accept is disabled.

### Dismissed Proposals Persistence

Dismissed proposals are tracked by message ID in localStorage:
- Key: `history-page-dismissed-proposals` (user-scoped)
- Value: `{ [pageId]: ["msg-123-abc", "hist-assistant-42-1", ...] }`
- Cleared on: page delete, new conversation start
- Persists across: panel close/reopen, page navigation, browser refresh

---

## 10. Key File Paths

### Backend

| File | Purpose |
|------|---------|
| `lib/galaxy/model/__init__.py:3251-3288` | `ChatExchange` and `ChatExchangeMessage` ORM models |
| `lib/galaxy/model/migrations/alembic/versions_gxy/cbc46035eba0_chat_exchange_storage.py` | Original table migration |
| `lib/galaxy/model/migrations/alembic/versions_gxy/b75f0f4dbcd4_add_page_history_columns.py` | `page_id` column migration |
| `lib/galaxy/managers/chat.py` | `ChatManager` -- all CRUD operations |
| `lib/galaxy/webapps/galaxy/api/chat.py` | `ChatAPI` -- all HTTP endpoints |
| `lib/galaxy/schema/schema.py:3878-3935` | `ChatPayload` and `ChatResponse` Pydantic models |
| `lib/galaxy/schema/agents.py` | `AgentResponse`, `ActionSuggestion`, `ActionType` |
| `lib/galaxy/agents/page_assistant.py` | `PageAssistantAgent` with structured edit output |
| `lib/galaxy/agents/base.py:186-190` | `AgentType` enum including `PAGE_ASSISTANT` |
| `lib/galaxy/agents/__init__.py` | Agent registry with all registered agents |
| `lib/galaxy/webapps/galaxy/services/pages.py:100-109` | Page soft-delete (no chat cascade) |

### Frontend

| File | Purpose |
|------|---------|
| `client/src/components/ChatGXY.vue` | Full-page chat component (standalone ChatGXY) |
| `client/src/components/ChatGXY/chatTypes.ts` | `ChatMessage` interface |
| `client/src/components/ChatGXY/chatUtils.ts` | `generateId()`, `scrollToBottom()` |
| `client/src/components/ChatGXY/agentTypes.ts` | Agent type registry, icon/label lookup |
| `client/src/components/ChatGXY/ChatInput.vue` | Shared text input with send button |
| `client/src/components/ChatGXY/ChatMessageCell.vue` | Shared message cell (query/response rendering) |
| `client/src/components/ChatGXY/ActionCard.vue` | Action suggestion buttons |
| `client/src/components/PageEditor/PageChatPanel.vue` | Page-scoped chat panel |
| `client/src/components/PageEditor/PageEditorView.vue` | Page editor (hosts chat panel via EditorSplitView) |
| `client/src/components/PageEditor/EditorSplitView.vue` | Draggable split pane layout |
| `client/src/components/PageEditor/ProposalDiffView.vue` | Full-replacement diff UI |
| `client/src/components/PageEditor/SectionPatchView.vue` | Section-level patch UI |
| `client/src/stores/pageEditorStore.ts` | Pinia store with chat exchange ID and dismissed proposal localStorage |
| `client/src/composables/agentActions.ts` | `AgentResponse` type, `ActionType` enum, action dispatch logic |
| `client/src/composables/userLocalStorage.ts` | User-scoped localStorage composable |
| `client/src/components/Page/constants.ts` | UI strings for chat panel (labels, welcome messages) |

---

## 11. Gaps and Design Notes

### Known Limitations

1. **Feedback granularity**: Feedback is per-exchange (stored on message[0]), not per-turn. Multi-turn conversations have one feedback slot for the entire thread.

2. **No cascade on page delete**: Page soft-delete does not touch `chat_exchange` rows. Frontend cleans localStorage but DB rows with `page_id` pointing to deleted pages persist indefinitely.

3. **History list shows first message only**: `GET /api/chat/history` returns the first query/response pair. The `message_count` field hints at conversation depth but the sidebar only renders the first query text.

4. **No real-time updates**: If the same user opens ChatGXY in two tabs, they see independent local state. No synchronization mechanism exists.

5. **No exchange-level delete**: Individual exchanges cannot be deleted through the API. Only "clear all" (`DELETE /api/chat/history`) is supported, and it only affects general (non-job, non-page) exchanges.

6. **Page chat history not clearable**: There is no endpoint to clear page-scoped chat history. The `DELETE /api/chat/history` endpoint explicitly excludes page chats.

### Architecture Observations

- The JSON-in-Text storage pattern is pragmatic but makes querying individual messages impossible at the SQL level. Searching chat content requires loading and parsing JSON.
- The `ChatManager` has three create methods (`create`, `create_general_chat`, `create_page_chat`) that are structurally similar but differ in which FK is set and how the message JSON is constructed. Potential for consolidation.
- The frontend manages message IDs as client-generated strings (`msg-{timestamp}-{random}` or `hist-{role}-{exchangeId}-{index}`). These are purely for Vue's `:key` binding and diff rendering -- they have no backend counterpart.
