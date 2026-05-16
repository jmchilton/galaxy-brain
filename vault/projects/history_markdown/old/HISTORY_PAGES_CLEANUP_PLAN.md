# Cleanup Plan: Rename Remaining "notebook" References to "page"

> **Context:** The notebooks-to-pages merge and UI convergence (HISTORY_PAGES_UI_CONVERGE_PLAN.md) are both complete. File renames, directory restructuring, store rename, API client consolidation, and router updates are done. But ~578 internal "notebook" references remain across 29 frontend files plus backend agent/test/selenium code. Since nothing is merged yet, clean this up now.

> **Scope:** Everything — including the agent type string value. Nothing is merged, no production data to preserve. `"notebook_assistant"` → `"page_assistant"` everywhere.

---

## Already Done (via UI convergence)

These items from the original plan are complete — **skip them**:

| Item | Status |
|------|--------|
| Component directory → `PageEditor/` | Done (not `HistoryPage/` — went with `PageEditor/`) |
| Component file renames (all 13 files) | Done — `PageChatPanel`, `PageRevisionList`, `HistoryPageView`, `EditorSplitView`, etc. |
| `HistoryNotebookEditor.vue` | Deleted (absorbed into `PageEditorView.vue`) |
| `HistoryNotebookSplit.vue` → `EditorSplitView.vue` | Done |
| Store file → `pageEditorStore.ts` | Done |
| Store export → `usePageEditorStore` | Done |
| Store ID → `"pageEditor"` | Done |
| API client → `api/pages.ts` (unified) | Done |
| API test → `api/pages.test.ts` | Done |
| `PageEditor/services.js` | Deleted |
| Router imports → `PageEditor/` paths | Done |

---

## Phase 1: Store Internal Variables & Functions

**File:** `client/src/stores/pageEditorStore.ts` — **80 "notebook" occurrences remaining**

The store export and file are renamed, but all internal identifiers still say "notebook".

| Old | New |
|-----|-----|
| `notebooks` | `pages` |
| `currentNotebook` | `currentPage` |
| `isLoadingNotebook` | `isLoadingPage` |
| `hasNotebooks` | `hasPages` |
| `hasCurrentNotebook` | `hasCurrentPage` |
| `currentNotebookIds` | `currentPageIds` |
| `loadNotebooks()` | `loadPages()` |
| `loadNotebook()` | `loadPage()` |
| `createNotebook()` | `createPage()` |
| `saveNotebook()` | `savePage()` |
| `deleteCurrentNotebook()` | `deleteCurrentPage()` |
| `clearCurrentNotebook()` | `clearCurrentPage()` |
| `resolveCurrentNotebook()` | `resolveCurrentPage()` |
| `getCurrentNotebookId()` | `getCurrentPageId()` |
| `setCurrentNotebookId()` | `setCurrentPageId()` |
| `clearCurrentNotebookId()` | `clearCurrentPageId()` |

Also remove the transition comment on line 39: `// Read old key as fallback for transition from notebook → page`.

### Cascading consumer updates

Every file that calls these store members needs updating (**9 files**, ~99 `usePageEditorStore` call sites total):

| File | Occurrences |
|------|-------------|
| `pageEditorStore.test.ts` | 132 |
| `PageEditorView.vue` | 26 |
| `PageEditorView.test.ts` | 13 |
| `PageChatPanel.vue` | 22 |
| `PageChatPanel.test.ts` | 15 |
| `HistoryPageView.vue` | 21 |
| `HistoryPageView.test.ts` | 32 |
| `HistoryPageList.vue` | 17 |
| `HistoryPageList.test.ts` | 21 |
| `HistoryCounter.vue` | 12 |

---

## Phase 2: CSS Classes & data-description Attributes

### 2A: CSS classes (in PageEditor components + HistoryPageView)

| Old | New |
|-----|-----|
| `.history-notebook-view` | `.history-page-view` |
| `.history-notebook-list` | `.history-page-list` |
| `.notebook-toolbar` | `.page-toolbar` |
| `.notebook-display-toolbar` | `.page-display-toolbar` |
| `.notebook-display-content` | `.page-display-content` |
| `.notebook-body` | `.page-body` |
| `.notebook-content` | `.page-content` |
| `.notebook-revision-panel` | `.page-revision-panel` |
| `.notebook-chat-panel` | `.page-chat-panel` |
| `.notebook-item` | `.page-item` |
| `.notebook-title` | `.page-title` |
| `.notebook-meta` | `.page-meta` |
| `.notebook-actions` | `.page-actions` |
| `.notebook-items` | `.page-items` |

### 2B: `data-description` attributes

These are used by Selenium selectors — must stay in sync with navigation.yml (Phase 4).

| Old | New |
|-----|-----|
| `"history notebook view"` | `"history page view"` |
| `"history notebook list"` | `"history page list"` |
| `"notebook toolbar"` | `"page toolbar"` |
| `"notebook toolbar title"` | `"page toolbar title"` |
| `"notebook manage button"` | `"page manage button"` |
| `"notebook save button"` | `"page save button"` |
| `"notebook unsaved indicator"` | `"page unsaved indicator"` |
| `"notebook edit button"` | `"page edit button"` |
| `"notebook preview button"` | `"page preview button"` |
| `"notebook revisions button"` | `"page revisions button"` |
| `"notebook chat button"` | `"page chat button"` |
| `"notebook view button"` | `"page view button"` |
| `"notebook display toolbar"` | `"page display toolbar"` |
| `"notebook rendered view"` | `"page rendered view"` |
| `"page chat panel"` | Already correct |
| `"notebook revision list"` | `"page revision list"` |
| `"notebook revision view"` | `"page revision view"` |
| `"notebook item"` | `"page item"` |
| `"notebook title"` | `"page title"` |
| `"history notebook button"` | `"history page button"` |

---

## Phase 3: Markdown Editor Mode String

**Files:** `directives.ts`, `MarkdownEditor.vue`, `MarkdownHelp.vue`, `TextEditor.vue`, `TextEditor.test.ts`, `PageEditorView.vue`, `PageEditorView.test.ts`

**Decision from UI convergence plan (Resolved Question 2):** Collapse `"history_notebook"` to `"page"` — directives and drag-and-drop are identical. Remove `"history_notebook"` from `DirectiveMode` union entirely.

### 3A: Type

```ts
// Old
export type DirectiveMode = "page" | "report" | "history_notebook";
// New — just remove the third member
export type DirectiveMode = "page" | "report";
```

### 3B: References to remove/simplify

| File | Change |
|------|--------|
| `directives.ts:51` | Remove `history_notebook` branch from mode check |
| `MarkdownEditor.vue:40` | Remove `v-else-if="mode === 'history_notebook'"` branch |
| `MarkdownHelp.vue:14` | Remove `notebook` computed; `pagelike` just checks `page` |
| `MarkdownHelp.vue:23` | Remove `v-if="notebook"` span about "History Notebook" |
| `TextEditor.vue:81,87` | Change `history_notebook` guard to `page` (or remove if drag-drop should work for all page-mode editors) |
| `TextEditor.test.ts:36` | Change `mode: "history_notebook"` → `mode: "page"` |
| `PageEditorView.vue:56` | Remove ternary: always pass `"page"` as mode |
| `PageEditorView.test.ts:168,170` | Update assertion to expect `"page"` mode |

### 3C: CSS class in TextEditor

```css
/* Old */
.notebook-dragover-success { ... }
/* New */
.page-dragover-success { ... }
```

Update template ref in `TextEditor.vue` and 4 test assertions in `TextEditor.test.ts`.

Also selenium test `test_history_pages.py:387`: `"notebook-dragover-success"` → `"page-dragover-success"`.

---

## Phase 4: Navigation YAML & Selenium

### 4A: `client/src/utils/navigation/navigation.yml` (~20 occurrences)

Rename all `data-description` selector values to match Phase 2B, plus YAML keys:

```yaml
# Old
notebook_button: '[data-description="history notebook button"]'
# New
page_button: '[data-description="history page button"]'
```

All sub-keys under the history_page section: `notebook_button` → `page_button`, and every selector string containing "notebook" → "page".

**Exception:** `body.notebook_app` (line 1441) is Jupyter-related — leave it.

### 4B: `lib/galaxy/selenium/navigates_galaxy.py`

```python
# Old (lines 2184, 2189)
self.components.history_panel.notebook_button.wait_for_and_click()
# New
self.components.history_panel.page_button.wait_for_and_click()
```

### 4C: Selenium test `lib/galaxy_test/selenium/test_history_pages.py`

- Line 26: comment `resolveCurrentNotebook` → `resolveCurrentPage`
- Line 216: `data-description='notebook toolbar'` → `'page toolbar'`
- Line 217: `data-description='history notebook editor'` → remove (this element no longer exists after editor merge) or update
- Line 387: `"notebook-dragover-success"` → `"page-dragover-success"`

---

## Phase 5: HistoryCounter.vue

**File:** `client/src/components/History/CurrentHistory/HistoryCounter.vue` — 12 occurrences

| Old | New |
|-----|-----|
| `isResolvingNotebook` | `isResolvingPage` |
| `navigateToCurrentNotebook()` | `navigateToCurrentPage()` |
| `notebookStore` (local var) | `pageStore` |
| `notebookStore.resolveCurrentNotebook(...)` | `pageStore.resolveCurrentPage(...)` |
| `notebookStore.notebooks.find(...)` | `pageStore.pages.find(...)` |
| `title="History Notebook"` | `title="History Pages"` (or just `"Pages"`) |
| `data-description="history notebook button"` | `data-description="history page button"` |

---

## Phase 6: ChatGXY & Agent Actions

### 6A: `agentTypes.ts` — value + labels

```ts
// Old
{ value: "notebook_assistant", label: "Notebook Assistant", icon: faBook, description: "Notebook editing assistant" }
// New
{ value: "page_assistant", label: "Page Assistant", icon: faBook, description: "Page editing assistant" }
```

### 6B: `PageChatPanel.vue` — agent type + comments + props + UI strings

| Old | New |
|-----|-----|
| `const AGENT_TYPE = "notebook_assistant"` | `const AGENT_TYPE = "page_assistant"` |
| `notebookContent` prop | `pageContent` |
| `"Notebook-specific chat panel"` comment | `"Page chat panel"` |
| `"Talks to the notebook_assistant agent"` | `"Talks to the page_assistant agent"` |
| `"applies accepted edits to the notebook via the store"` | `"applies accepted edits to the page via the store"` |
| `"Notebook Assistant"` in `assistantName` computed | `"Page Assistant"` (already partly done — uses ternary) |
| `"I'm the Notebook Assistant"` welcome msg | `"I'm the Page Assistant"` |
| `"How can I help with this notebook?"` | `"How can I help with this page?"` |
| `loadNotebookChat()` function name | `loadPageChat()` |
| `"no notebook chat history yet"` comment | `"no page chat history yet"` |
| `"Ask about your history or request notebook edits..."` placeholder | `"Ask about your history or request page edits..."` |
| `store.saveNotebook("agent")` calls | `store.savePage("agent")` (Phase 1 rename) |

### 6C: `agentActions.ts` — action types

```ts
// Old
APPLY_NOTEBOOK_EDIT = "apply_notebook_edit",
INSERT_NOTEBOOK_SECTION = "insert_notebook_section",
// New
APPLY_PAGE_EDIT = "apply_page_edit",
INSERT_PAGE_SECTION = "insert_page_section",
```

Also update the emoji map entries and `ActionCard.vue` icon map (2 entries).

### 6D: `ChatMessageCell.vue` + `ChatMessageCell.test.ts`

```css
/* Old */
.notebook-cell { ... }
/* New */
.chat-cell { ... }  /* or .message-cell — this is generic chat, not page-specific */
```

Update class references in template and 2 test assertions.

### 6E: `ChatGXY.vue`

2 notebook references — check if they're comments or functional code and update.

---

## Phase 7: Backend Agent & Prompt

### 7A: Enum value (`lib/galaxy/agents/base.py`)

```python
# Old
NOTEBOOK_ASSISTANT = "notebook_assistant"
# New
PAGE_ASSISTANT = "page_assistant"
```

### 7B: File renames

| Old | New |
|-----|-----|
| `lib/galaxy/agents/notebook_assistant.py` | `lib/galaxy/agents/page_assistant.py` |
| `lib/galaxy/agents/prompts/notebook_assistant.md` | `lib/galaxy/agents/prompts/page_assistant.md` |

### 7C: Class + all internal strings in `page_assistant.py`

| Old | New |
|-----|-----|
| `class NotebookAssistantAgent` | `class PageAssistantAgent` |
| `agent_type = AgentType.NOTEBOOK_ASSISTANT` | `agent_type = AgentType.PAGE_ASSISTANT` |
| `"Notebook assistant agent for Galaxy History Notebooks."` | `"Page assistant agent for Galaxy History Pages."` |
| `"Complete rewrite of the notebook document"` | `"Complete rewrite of the page document"` |
| `"Targeted edit to a specific section of the notebook"` | `"Targeted edit to a specific section of the page"` |
| `"Agent for editing Galaxy History Notebooks via chat"` | `"Agent for editing Galaxy History Pages via chat"` |
| `"Rewrite the entire notebook."` | `"Rewrite the entire page."` |
| `"Process a notebook editing or history question."` | `"Process a page editing or history question."` |
| `"Load system prompt and inject notebook content"` | `"Load system prompt and inject page content"` |
| `"prompts" / "notebook_assistant.md"` | `"prompts" / "page_assistant.md"` |
| Fallback: `"Galaxy History Notebook editing assistant"` | `"Galaxy History Page editing assistant"` |
| Fallback: `"markdown notebooks that document"` | `"markdown pages that document"` |
| Fallback: `"Current notebook content:"` | `"Current page content:"` |
| `f"Notebook assistant network error: {e}"` | `f"Page assistant network error: {e}"` |
| `f"Notebook assistant value error: {e}"` | `f"Page assistant value error: {e}"` |

### 7D: Prompt file content (`page_assistant.md`)

| Old | New |
|-----|-----|
| `# Galaxy Notebook Assistant` | `# Galaxy Page Assistant` |
| `"helps edit Galaxy History Notebooks"` | `"helps edit Galaxy History Pages"` |
| `"Galaxy notebooks embed live content"` | `"Galaxy pages embed live content"` |
| `## Current Notebook Content` | `## Current Page Content` |
| `{notebook_content}` | `{page_content}` |

`{notebook_content}` → `{page_content}` is a format string key — must match the `.replace()` call in Python (already uses `page_content`).

### 7E: `history_tools.py` docstrings (lines 2, 4)

`"notebook assistant agent"` → `"page assistant agent"`

### 7F: Agent registry (`lib/galaxy/agents/__init__.py`)

```python
# Old
from .notebook_assistant import NotebookAssistantAgent
"NotebookAssistantAgent",
agent_registry.register(AgentType.NOTEBOOK_ASSISTANT, NotebookAssistantAgent)
# New
from .page_assistant import PageAssistantAgent
"PageAssistantAgent",
agent_registry.register(AgentType.PAGE_ASSISTANT, PageAssistantAgent)
```

### 7G: Chat manager default arg (`lib/galaxy/managers/chat.py:69`)

```python
agent_type: str = "notebook_assistant",  →  agent_type: str = "page_assistant",
```

### 7H: Admin docs (`doc/source/admin/ai_agents.md:202`)

```
| `notebook_assistant`  | Enabled | Assists with Galaxy notebook interactions |
→
| `page_assistant`      | Enabled | Assists with Galaxy page editing           |
```

---

## Phase 8: Backend & Frontend Tests

### 8A: `test/unit/app/test_agents.py`

- Import: `from galaxy.agents.notebook_assistant import ...` → `from galaxy.agents.page_assistant import ...`
- `NotebookAssistantAgent` → `PageAssistantAgent`
- `TestNotebookAssistantAgent` → `TestPageAssistantAgent`
- All `notebook_content=` kwargs → `page_content=`
- All `"notebook_assistant"` string assertions → `"page_assistant"`
- `info["class_name"] == "NotebookAssistantAgent"` → `"PageAssistantAgent"`
- Config key: `"notebook_assistant": {...}` → `"page_assistant": {...}`

### 8B: `test/unit/app/test_chat_manager.py`

- Module docstring: `"notebook-scoped"` → `"page-scoped"`
- `_FakeChatExchange`: `notebook_id` → `page_id` (field + `__init__` param)
- Test classes: `TestCreateNotebookChat` → `TestCreatePageChat`, `TestGetNotebookChatHistory` → `TestGetPageChatHistory`, `TestGetUserChatHistoryExcludesNotebook` → `TestGetUserChatHistoryExcludesPage`
- Method calls: `create_notebook_chat(trans, notebook_id=...)` → `create_page_chat(trans, page_id=...)`
- Method calls: `get_notebook_chat_history(trans, notebook_id=...)` → `get_page_chat_history(trans, page_id=...)`
- Assertions: `exchange.notebook_id` → `exchange.page_id`
- Assertions: `msg_data["agent_type"] == "notebook_assistant"` → `"page_assistant"`
- Parameter: `include_notebook_chats=True` → `include_page_chats=True`

### 8C: `test/unit/app/test_history_tools.py`

- Line 4 docstring: `"notebook assistant agent"` → `"page assistant agent"`

### 8D: Frontend test files

All `"notebook_assistant"` string literals in:
- `PageChatPanel.test.ts` (4 occurrences) → `"page_assistant"`
- `pageEditorStore.test.ts` (check for any)

---

## Phase 9: Misc Frontend Cleanup

### 9A: `sectionDiffUtils.ts`

1 reference (likely a comment) — update.

### 9B: `EditorSplitView.vue` + `EditorSplitView.test.ts`

3+1 references — likely CSS classes or comments, update.

### 9C: `PageRevisionList.vue` + `PageRevisionView.vue`

2+1 references — likely CSS class or data-description, update.

### 9D: `schema.ts` (auto-generated)

126 occurrences of `history_notebook_id` / `source_history_notebook_id` — these come from the OpenAPI schema. If the backend schema fields are already renamed, regenerate. If not, this is a backend schema change.

---

## Execution Order

```
Phase 1 (store internals) + Phase 2 (CSS/data-desc) + Phase 5 (HistoryCounter)
         ↓
Phase 3 (DirectiveMode collapse)
         ↓
Phase 4 (navigation.yml + selenium)
         ↓
Phase 6 (ChatGXY + agent actions)
         ↓
Phase 7 (backend agent)  ←→  Phase 8 (tests)  [parallel]
         ↓
Phase 9 (misc cleanup)
```

---

## Verification

```bash
# Should return ZERO hits (excluding Jupyter notebook refs and plan .md files)
grep -ri "notebook_assistant\|NOTEBOOK_ASSISTANT" client/src/ lib/galaxy/ test/ doc/
grep -ri "notebook" client/src/components/PageEditor/ client/src/stores/pageEditorStore.ts \
  lib/galaxy/agents/page_assistant.py lib/galaxy/agents/prompts/page_assistant.md \
  test/unit/app/test_agents.py test/unit/app/test_chat_manager.py

# Check schema.ts separately — if backend schema renamed, regenerate
grep -c "history_notebook" client/src/api/schema/schema.ts
```

Expected survivors — only unrelated Jupyter notebook references (`body.notebook_app` in navigation.yml, `trust_jupyter_notebook_conversion` in config, `GeneNoteBook` datatype).

---

## Unresolved Questions

1. `DirectiveMode` collapse — does drag-and-drop need any guard at all, or should it work in all `"page"` mode editors? (UI convergence plan says collapse; verify TextEditor behavior)
2. `schema.ts` — are the `history_notebook_id` / `source_history_notebook_id` fields still in the backend Pydantic schemas? If so, rename there first, then regenerate.
3. Do we want to batch this as 1 commit or split frontend/backend?
