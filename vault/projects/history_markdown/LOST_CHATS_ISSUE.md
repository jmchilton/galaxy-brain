---
type: research
subtype: issue
tags:
  - galaxy/client
  - galaxy/api
status: draft
created: 2026-03-04
revised: 2026-03-04
revision: 1
ai_generated: true
---

# Lost Chats on Dev Server — Root Cause Analysis

> **Date:** 2026-03-04
> **Report:** mvdbeek loses chat history when leaving editor and returning; jxc755 cannot reproduce locally

---

## Two-Layer Chat Persistence

Chat recovery uses two layers:

1. **localStorage (fast path):** `currentChatExchangeIds` maps page ID → exchange ID, persisted via `useUserLocalStorage`
2. **API fallback:** `GET /api/chat/page/{page_id}/history?limit=1` retrieves the latest exchange from the database

Both must fail for a chat to appear "lost."

---

## Layer 1: localStorage Gets Actively Cleared

`clearCurrentPage()` (`pageEditorStore.ts:227-239`) **explicitly deletes** the exchange ID from localStorage:

```typescript
function clearCurrentPage() {
    const pageId = currentPage.value?.id;
    // ... clear state ...
    if (pageId) {
        clearCurrentChatExchangeId(pageId);  // ← nukes localStorage entry
    }
}
```

Called from:
- `PageEditorView.vue:101` — `handleBack()` (user clicks back arrow)
- `HistoryPageView.vue:112` — `handleBack()`
- `HistoryPageView.vue:70` — watcher when `pageId` becomes falsy

Any navigation through "back to list" wipes the localStorage cache. By design — the API fallback should recover it.

Note: `$reset()` (called on unmount) does NOT clear localStorage-backed refs. Only `clearCurrentPage()` does.

---

## Layer 2: API Fallback — The Likely Failure Point

When localStorage is empty, `PageChatPanel.vue:87-99` falls back to:

```typescript
const { data, error } = await GalaxyApi().GET("/api/chat/page/{page_id}/history" as any, {
    params: { path: { page_id: props.pageId }, query: { limit: 1 } },
});
```

**Important:** There are actually **two nested silent catches** in `loadPageChat()`. The first (lines 82-84) handles the localStorage fast path — when it fails, it clears the exchange ID *and* falls through to the API path. The second (lines 97-99) handles the API fallback itself. Both swallow errors silently, meaning the entire recovery chain can fail without any diagnostic output.

```typescript
async function loadPageChat() {
    const storedExchangeId = store.getCurrentChatExchangeId(props.pageId);
    if (storedExchangeId !== null) {
        try {
            await loadConversation(storedExchangeId);
            if (messages.value.length > 0) { return; }
        } catch {
            store.clearCurrentChatExchangeId(props.pageId);  // ← silent catch #1: clears ID too
        }
    }
    try {
        // ... API fallback ...
    } catch {
        // ← silent catch #2: swallows API failure
    }
}
```

**This is where the web server difference matters.** Local dev runs a single-process server (paste/waitress). The test server likely runs gunicorn + multiple workers (or uwsgi). Possible failure modes:

### 1. SQLAlchemy session isolation across workers

If a ChatExchange was written by worker A and the fallback query hits worker B, worker B's scoped session might not see the committed row immediately — especially if connection pooling holds long-lived connections with stale transaction snapshots. PostgreSQL's `READ COMMITTED` starts a new snapshot per statement, but if the session has an open transaction from middleware, it could read a stale snapshot.

### 2. The endpoint itself

The `as any` cast on the API call (`"/api/chat/page/{page_id}/history" as any`) suggests the endpoint may not be in the OpenAPI spec. It could be missing validation, not fully wired, or silently failing in ways that don't surface errors.

### 3. Database backend difference

Local dev likely uses SQLite; the test server likely uses PostgreSQL. The chat history query could have subtle behavior differences (type casting of `page_id`, null handling, etc.).

---

## The Scenario That Loses Chats

1. User has active chat on a page
2. User navigates away from editor ("leaves completely") — `$reset()` runs, localStorage exchange IDs survive
3. Something triggers `clearCurrentPage()` en route (back button, watcher on `pageId` going falsy) — **localStorage entry deleted**
4. User returns to the page, opens chat
5. localStorage has no exchange ID → falls through to API fallback
6. API fallback fails silently (`catch` on line 97 swallows the error) → empty messages array
7. Welcome message shown instead of conversation history

---

## Why It Doesn't Reproduce Locally

Single-process server = no worker isolation issues. SQLite = single-file database with no transaction visibility gaps. The API fallback works 100% of the time, so even though localStorage gets cleared the same way, the recovery path always succeeds.

---

## Recommendations

### 1. Stop clearing exchange IDs in `clearCurrentPage()` (quick fix)

Remove lines 235-237 from `pageEditorStore.ts`. The exchange ID is keyed by page ID — it's harmless stale data that enables reliable recovery. There's no reason to delete it when navigating away.

### 2. Log both silent catches

`PageChatPanel.vue` has two silent catches — the localStorage fast path (line 82-84) and the API fallback (line 97-99). Both should `console.warn` so the failure chain is debuggable on the dev server. Currently the first catch also clears the exchange ID, compounding the problem by destroying evidence.

### 3. Verify the backend endpoint

Check that `/api/chat/page/{page_id}/history` is registered, returns correct results with PostgreSQL, and works across gunicorn workers. The `as any` type cast is a red flag that it may not be fully integrated.

---

## Key Files

| File | Relevance |
|------|-----------|
| `client/src/stores/pageEditorStore.ts:227-239` | `clearCurrentPage()` clears exchange ID |
| `client/src/stores/pageEditorStore.ts:258-269` | Exchange ID get/set/clear helpers |
| `client/src/components/PageEditor/PageChatPanel.vue:73-100` | Two-layer chat loading with silent catch |
| `client/src/components/PageEditor/HistoryPageView.vue:48-52,64-72,111-114` | Navigation paths that trigger clearing |
| `client/src/components/PageEditor/PageEditorView.vue:85-88,100-107` | Unmount and back navigation |
| `client/src/composables/persistentRef.ts:27-57` | `syncRefToLocalStorage` — bidirectional sync |
| `client/src/composables/userLocalStorageFromHashedId.ts` | Async user ID resolution for localStorage keys |
