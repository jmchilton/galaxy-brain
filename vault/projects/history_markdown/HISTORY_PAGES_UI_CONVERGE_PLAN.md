# Plan: Pages ↔ History Pages UI Convergence

## Current State

Two parallel UIs for editing Galaxy Pages exist:

| Aspect | Legacy Pages | History Pages |
|--------|-------------|---------------|
| Entry | `/pages/editor?id=X` | `/histories/:hid/pages/:pid` |
| Editor | `PageEditorMarkdown.vue` (Options API, 115 lines) | `HistoryNotebookView.vue` (Composition API, 344 lines) |
| Save | `POST /api/pages/{id}/revisions` (creates revision, no metadata) | `PUT /api/pages/{id}` with `edit_source` |
| Store | None — local component state only | `historyNotebookStore.ts` (455 lines, Pinia) |
| API client | `PageEditor/services.js` (15 lines, raw axios) | `api/historyPages.ts` (152 lines, typed) |
| Revisions | None in UI (API exists but unused) | Full UI: list, preview, restore |
| Chat | None | `NotebookChatPanel.vue` (467 lines) |
| Diff views | None | `ProposalDiffView`, `SectionPatchView`, `sectionDiffUtils` |
| Window Manager | None | Yes — `displayOnly` mode opens in WinBox |
| Permissions | `ObjectPermissionsModal` (complex sharing UI) | None — inherits from history |
| Dirty tracking | None — no unsaved indicator | Yes — `isDirty` computed, "Unsaved" badge |
| Title editing | Separate form (`PageForm`, edit mode) | Inline `ClickToEdit` in toolbar |

**Shared:** Both use `MarkdownEditor.vue` (via `mode` prop) and `Markdown.vue` for rendering.

---

## Goals

1. **Chat for all pages** — AI assistant available when editing any markdown page (not just history-attached)
2. **Revisions for all pages** — revision list, preview, restore available in legacy page editor
3. **Window Manager for all pages** — pages list (`/pages/list`) can open pages in WinBox
4. **Single editor component** — one page editor that adapts based on context (history-attached vs standalone)
5. **Single API client** — one typed API module for all page operations

---

## Phase 1: Unified API Client

**Goal**: Single `api/pages.ts` that both editors use.

### Changes

- Rename `api/historyPages.ts` → `api/pages.ts`
- Keep all existing types and functions
- Add `savePage(pageId, content, editSource?)` — replaces `PageEditor/services.js:save()`
- Consumers: update imports in `historyNotebookStore.ts`, `NotebookChatPanel.vue`, `PageEditorMarkdown.vue`
- Delete `PageEditor/services.js`

### Why first

Everything else depends on a single API client. No UI changes.

---

## Phase 2: Generalize the Pinia Store

**Goal**: `historyNotebookStore` becomes `usePageEditorStore` — works for both history-attached and standalone pages.

### Changes

Rename `stores/historyNotebookStore.ts` → `stores/pageEditorStore.ts`

Add:
- `mode: ref<"history" | "standalone">` — controls which features are available
- `pageId: ref<string | null>` — the page being edited (currently derived from `currentNotebook.id`)
- `loadPage(pageId)` — load any page by ID (same as current `loadNotebook`)
- `savePage(editSource?)` — uses `api/pages.ts` `updateHistoryPage` for history mode, `savePage` for standalone

Keep all existing state and actions — they're generic enough:
- `currentContent`, `originalContent`, `isDirty`, `canSave` — universal
- Revision state (`revisions`, `selectedRevision`, etc.) — now available to standalone pages
- Chat state (`showChatPanel`, `currentChatExchangeIds`) — now available to standalone pages

### Standalone mode behavior

When `mode === "standalone"`:
- `loadNotebooks()` / `notebooks` list not used (standalone pages use `/pages/list` grid)
- `historyId` is null
- `resolveCurrentNotebook()` not called
- Slug + permissions managed separately (existing `ObjectPermissionsModal`)

### Tests

- Existing `historyNotebookStore.test.ts` passes with rename
- New test: `loadPage` for standalone page (no `history_id`)
- New test: `savePage` standalone mode (no `edit_source` default)

---

## Phase 3: Unified Page Editor Component

**Goal**: Replace `PageEditorMarkdown.vue` + `HistoryNotebookView.vue` edit mode with a single editor.

### New component: `PageEditorView.vue`

Absorbs the **edit mode** from `HistoryNotebookView.vue` (toolbar + editor + chat + revisions), replacing `PageEditorMarkdown.vue`.

```
PageEditorView.vue
  props: pageId, historyId?, displayOnly?
  ├─ Toolbar
  │   ├─ Back (→ /pages/list or /histories/:hid/pages)
  │   ├─ ClickToEdit title
  │   ├─ Revisions button + badge         (always)
  │   ├─ Preview button                    (always)
  │   ├─ Chat button                       (when agents configured)
  │   ├─ Permissions button                (standalone only)
  │   ├─ Save button + Unsaved indicator   (always)
  │   └─ Save & View button                (standalone only)
  ├─ Body
  │   ├─ SplitView (when chat open)
  │   │   ├─ MarkdownEditor
  │   │   └─ PageChatPanel
  │   ├─ MarkdownEditor + RevisionPanel (when revisions open)
  │   └─ MarkdownEditor (default)
  └─ RevisionView (when viewing specific revision)
```

### What changes

- `HistoryNotebookView.vue` keeps **list mode** and **display mode** only. Edit mode delegates to `PageEditorView`.
- `PageEditorMarkdown.vue` deleted — replaced by `PageEditorView` with `mode="standalone"`.
- `PageEditor.vue` simplified — fetches page, passes to `PageEditorView`.

### What doesn't change

- `HistoryNotebookList.vue` — history page list stays (different from grid list)
- `HistoryNotebookSplit.vue` — reused as-is (slot-based, generic)
- `NotebookRevisionList.vue`, `NotebookRevisionView.vue` — reused as-is (already generic, typed on `PageRevision*`)

### Toolbar differences by mode

| Feature | `historyId` set | standalone |
|---------|----------------|------------|
| Back button target | `/histories/:hid/pages` | `/pages/list` |
| Permissions button | Hidden | Shown |
| Save & View | Hidden | Shown |
| Chat | Sends `page_id` + agent reads history | Sends `page_id` (no history context) |
| Window Manager | Supported (existing) | Add support |

### Tests

- Mount `PageEditorView` with `historyId` → chat, revisions, save visible
- Mount `PageEditorView` without `historyId` → permissions, save & view visible
- Mount `PageEditorView` in `displayOnly` → read-only render

---

## Phase 4: Chat for Standalone Pages

**Goal**: AI assistant available when editing any page, not just history-attached.

### Backend

The agent needs a page content context but no `history_id` when editing standalone pages.

Current flow: `POST /api/chat` with `page_id` → backend looks up page → extracts `history_id` → passes to agent.

Change: when `page.history_id` is null, skip history tools. The agent can still do full-replacement and section-patch edits on the page content — it just can't call `list_history_datasets` etc.

Options:
1. **Keep `notebook_assistant` agent** — it already handles "no history" gracefully (tools just return empty). Simplest.
2. **New `page_assistant` agent** — stripped version without history tools. Cleaner but more code.

**Recommendation**: Option 1. The agent's system prompt says "you're editing a notebook in history X" — when `history_id` is null, adjust the prompt to say "you're editing a standalone page" and disable history tools. One `if` branch in `notebook_assistant.py`.

### Frontend

- Rename `NotebookChatPanel.vue` → `PageChatPanel.vue`
- Make `historyId` prop optional (currently required)
- When no `historyId`, the welcome message says "Page Assistant" instead of "Notebook Assistant"
- `PageEditorView` shows Chat button for all pages when `agentsAvailable`

### Tests

- Chat submit for page without `history_id` — agent responds (no history tools used)
- Chat submit for page with `history_id` — agent responds with history context

---

## Phase 5: Revisions for Standalone Pages

**Goal**: Revision list, preview, and restore available in the standalone page editor.

### What exists

The backend already supports revisions for all pages:
- `GET /api/pages/{id}/revisions` works for any page
- `POST /api/pages/{id}/revisions/{rid}/revert` works for any page
- Legacy `PageEditorMarkdown` saves via `POST /api/pages/{id}/revisions` (creates revision but doesn't track `edit_source`)

### What's needed

- `PageEditorView` always shows Revisions button (Phase 3 already does this)
- `savePage` for standalone mode should send `edit_source: "user"` by default
- The legacy save endpoint (`POST /api/pages/{id}/revisions`) should also set `edit_source: "user"` on the backend — currently it's null. One-line fix in `pages.py`.

### No-ops

- `NotebookRevisionList.vue` and `NotebookRevisionView.vue` already use generic `PageRevision*` types
- Store revision actions (`loadRevisions`, `loadRevision`, `restoreRevision`) already work with any `pageId`
- Diff views (`ProposalDiffView`, `SectionPatchView`) are page-content-generic

### Tests

- Standalone page save → revision has `edit_source="user"`
- Standalone page revision list shows entries
- Standalone page restore creates new revision with `edit_source="restore"`

---

## Phase 6: Window Manager for Standalone Pages

**Goal**: Grid list page actions can open pages in WinBox.

### Changes

In `Grid/configs/pages.ts` — add a "View in Window" operation for each page row that calls:

```js
Galaxy.frame.add({ url: `/published/page?id=${pageId}&hide_panels=true&hide_masthead=true`, title: `Page: ${title}` });
```

In `PageEditor.vue` — when navigating to preview (`Save & View`), detect WM and optionally open in WinBox.

In `PageView.vue` — add `displayOnly` handling similar to `HistoryNotebookView`:
- Check `?displayOnly=true` query param
- Strip chrome (no `PublishedItem` wrapper, just render content)
- Show Edit button that returns to full editor

### Tests

- Grid "View in Window" operation creates WinBox frame
- `PageView` with `displayOnly=true` renders without chrome

---

## Phase 7: Rename & Cleanup

**Goal**: Remove "Notebook" naming, consolidate directory structure.

### Renames

| From | To |
|------|----|
| `components/HistoryNotebook/` | `components/PageEditor/` (merge with existing) |
| `HistoryNotebookView.vue` | `HistoryPageView.vue` (list + display modes only) |
| `HistoryNotebookEditor.vue` | Delete (absorbed into `PageEditorView`) |
| `HistoryNotebookList.vue` | `HistoryPageList.vue` |
| `HistoryNotebookSplit.vue` | `EditorSplitView.vue` |
| `NotebookChatPanel.vue` | `PageChatPanel.vue` |
| `NotebookRevisionList.vue` | `PageRevisionList.vue` |
| `NotebookRevisionView.vue` | `PageRevisionView.vue` |
| `stores/historyNotebookStore.ts` | `stores/pageEditorStore.ts` |
| `useHistoryNotebookStore` | `usePageEditorStore` |

### Deletes

- `PageEditorMarkdown.vue` — replaced by `PageEditorView`
- `PageEditor/services.js` — replaced by `api/pages.ts`

### Test updates

- All `*.test.ts` files: update imports
- Selenium tests: update `data-description` attributes if renamed
- Component tests: update store name

---

## Phase Dependency Graph

```
Phase 1 (API client)
  ↓
Phase 2 (store)
  ↓
Phase 3 (editor component)
  ↓
Phase 4 (chat) ←→ Phase 5 (revisions)  [parallel]
  ↓                ↓
Phase 6 (window manager)
  ↓
Phase 7 (rename + cleanup)
```

---

## What's Already Done (No-Ops)

1. **Markdown rendering** — `Markdown.vue` and `MarkdownEditor.vue` already shared
2. **Diff utilities** — `sectionDiffUtils.ts` is generic (operates on strings, not page types)
3. **Revision data types** — `PageRevisionSummary/Details` already match backend schema
4. **Chat sub-components** — `ChatMessageCell`, `ChatInput`, `chatUtils` already extracted and shared
5. **API endpoints** — backend already supports revisions and chat for all pages
6. **Content pipeline** — `content` vs `content_editor` dual-field pattern works for all markdown pages

---

## Effort Estimate

| Phase | Files changed | New files | Deleted files | Complexity |
|-------|--------------|-----------|---------------|------------|
| 1 | 4 | 0 | 1 | Low |
| 2 | 2 | 0 | 0 | Medium |
| 3 | 4 | 1 | 1 | High |
| 4 | 3 | 0 | 0 | Medium |
| 5 | 2 | 0 | 0 | Low |
| 6 | 3 | 0 | 0 | Medium |
| 7 | ~20 | 0 | 2 | Low (mechanical) |

---

## Resolved Questions

1. **Agent type**: Reuse `notebook_assistant`. One if-branch in prompt assembly — skip history tools & say "standalone page" when `history_id` is null. Less code, one agent to maintain.

2. **DirectiveMode**: Collapse to `"page"` everywhere. The directives and drag-and-drop behavior are identical — dragging a dataset from the history panel into any page editor inserts the same `history_dataset_display(history_dataset_id=...)` directive. No gating needed. Remove `"history_notebook"` from `DirectiveMode` union, use `"page"` for all page editors.

3. **Save endpoint**: All frontend saves through `PUT /api/pages/{id}`. Keep legacy `POST /api/pages/{id}/revisions` endpoint for API compat but mark deprecated. Frontend stops using it. `PageEditor/services.js` deleted.

4. **Route path**: `/pages/:id/edit` (path param). Grid config updated to link directly to new route. Old `/pages/editor?id=X` kept as a redirect for bookmarks.

5. **Grid navigation**: "Edit Content" links directly to `/pages/:id/edit`. No intermediate redirect.
