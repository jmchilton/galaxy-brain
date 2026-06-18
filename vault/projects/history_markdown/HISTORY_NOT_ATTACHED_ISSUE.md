# Galaxy Notebooks: history panel shows the session history, not the notebook's attached history

_Drafted by Claude (AI assistant) from a code-level root-cause pass against worktree `branch/history_pages` (Galaxy 26.2.dev0). Static analysis — data flow is unambiguous but not runtime-verified. Ready to adapt into a `galaxyproject/galaxy` issue._

## Summary

A Galaxy Notebook is a `Page` with `history_id` set — "a document attached to a history." But when a notebook is opened in the editor/display view, the right-hand history panel shows the user's **current session history**, not the notebook's **attached** history. Opening a notebook attached to history *X* while the session's current history is *Y* leaves the panel showing *Y*. For a feature whose entire premise is "notebook attached to a history," the panel showing an unrelated history is a real UX weakness (and it blocked capturing a notebook beside its real history for paper figures).

## Steps to reproduce

1. Have two histories, *X* and *Y*; make *Y* the current history.
2. Create a Galaxy Notebook attached to history *X* (a `Page` with `history_id = X`).
3. Open the notebook — either the history-scoped route `/histories/X/pages/<pageId>` or the standalone `/pages/editor?id=<pageId>`.
4. **Observed:** the right-hand history panel shows *Y* (current session history). **Expected:** it reflects the notebook's attached history *X* (or a panel clearly scoped to it).

Reproduces on **both** entry paths.

## Verdict

Real bug — a by-design omission. High confidence (~0.95). The right-hand history panel is never wired to the notebook's `page.history_id`; it is the persistent global current/session history panel, and nothing in the page-open flow links the two.

## Root cause

The right-hand panel is `<HistoryIndex>`, rendered once in the persistent `Analysis.vue` layout, bound unconditionally to `currentHistory` from `useHistoryStore`. The Galaxy Notebook routes (`PageEditorView` / `HistoryPageView`) render inside the center `<router-view>` and have no connection to that panel. The page-editor store tracks its own `historyId`, but only for API scoping (loading/creating pages); it never calls `setCurrentHistory` / `setCurrentHistoryId`. So opening a notebook attached to history *X* while the session current history is *Y* leaves the panel on *Y*.

## Evidence (data flow)

**1. The panel is global, bound to current history — not the page.**
`client/src/entry/analysis/modules/Analysis.vue:85-95` renders the panel; `<HistoryIndex>` receives **no** history prop:
```
85  <FlexPanel v-if="showPanels" ref="historyPanel" side="right" ...>
94      <HistoryIndex @show="onShow" />
```
`client/src/components/History/Index.vue:21,37-44` binds strictly to the store's current history:
```
21  const { currentHistory } = storeToRefs(historyStore);
37  <HistoryPanel ... :history="currentHistory" ...>
44      <HistoryNavigation :history="currentHistory" ... />
```

**2. Page routes are children of `Analysis` and render only in the center frame** — they never touch the panel.
`client/src/entry/analysis/router.js:233-234` (`Analysis` is the parent with `children:`), `:457-471` (the `histories/:historyId/pages[/:pageId]` routes → `HistoryPageView`), `:569-575` (`/pages/editor` → `PageEditor`). Page content renders in `Analysis.vue:80` `<router-view>`.

**3. No `page.history_id` → panel wiring anywhere in the page flow.**
- `client/src/components/PageEditor/PageEditorView.vue` — imports `useHistoryStore` but only reads `getHistoryById` for the title (`:56`); `onMounted` (`:80-86`) sets `store.mode` and `store.historyId` (API scoping) and loads the page. No `setCurrentHistory` call.
- `client/src/components/PageEditor/HistoryPageView.vue:41-46` — `onMounted` calls `loadPages` / `loadPageById`; never switches current history.
- `client/src/stores/pageEditorStore.ts` — its `historyId` ref (`:42`) is used only for `fetchHistoryPages`, `createHistoryPage` (`:142`), and `setCurrentPageId` (`:119`). No `setCurrentHistory` / `setCurrentHistoryId` / `currentHistoryId` references in the PageEditor components or store.
- `client/src/stores/historyStore.ts:124 setCurrentHistory(historyId)` and `:139 setCurrentHistoryId` exist and are simply never called from the page flow.

**4. The page object carries `history_id`, so a fix has the data.**
Backend `PageDetails` includes it — `lib/galaxy/schema/schema.py:4308-4312` (`history_id: Optional[EncodedDatabaseIdField]`, "The history this page is attached to, if any."), inherited by `PageDetails` (`:4339`). Frontend type `HistoryPageDetails = components["schemas"]["PageDetails"]` (`client/src/api/pages.ts:11`). So `store.currentPage.history_id` is available after load.

## Entry-path nuance

Both paths are broken; neither switches the panel:
- **History-scoped route** (`/histories/:historyId/pages/:pageId` → `HistoryPageView` → `PageEditorView` with `historyId` prop): the `historyId` is known from the URL but is only stored for API scoping. Worst case conceptually — the route *knows* the history yet the panel still shows the session current history if it differs.
- **Standalone editor URL** (`/pages/editor?id=<page>` → `PageEditor.vue:2` → `PageEditorView` with **no** `historyId`): the route doesn't pass a history; the view would have to read `store.currentPage.history_id` after load.

## Fix options

**Option A (minimal) — switch the session's current history on open.**
In `PageEditorView.vue` `onMounted` / the `pageId` watcher (and/or `HistoryPageView.vue`), after the page loads, if a history id is present, dispatch the existing store action:
```ts
const hid = props.historyId ?? store.currentPage?.history_id;
if (hid && historyStore.currentHistoryId !== hid) {
    await historyStore.setCurrentHistory(hid);
}
```
- Locations: `PageEditorView.vue:80-86` (onMounted) + the `pageId` watcher (`:97-104`); store action `useHistoryStore().setCurrentHistory` (`historyStore.ts:124`, already exists).
- **Risk:** mutates the user's session current history as a side effect of *viewing* a notebook — changes what tool runs/uploads/other tabs target, and does not revert on unmount. Acceptable only if "open notebook = work in its history" is the intended product model.

**Option B (recommended) — render a page-scoped history panel bound to `page.history_id`.**
Give the page view its own panel scoped to the page's history rather than reusing the global `HistoryIndex`. `HistoryPanel` already accepts a `:history` prop (`Index.vue:37`), so a notebook-scoped panel could render `<HistoryPanel :history="pageHistory" ... />` without touching `currentHistory`. Requires the page view to own its panel (center frame or a dedicated slot) instead of relying on `Analysis.vue`'s global panel; fetch the history by id (`historyStore.getHistoryById` / load if absent) and decide read-only vs. interactive.
- **Risk:** more code, but no global side effects; matches the "notebook beside its real history" mental model.

**Recommendation:** Option B — aligns with the feature premise without hijacking the session or the missing-revert problem of A. Option A is a few lines if the team accepts session-switch semantics.

## Open questions

1. Product intent: should opening a notebook **switch** the session current history (A), or show a **scoped, possibly read-only** panel beside it (B)?
2. If A: should `onUnmounted` restore the prior current history, or is the switch sticky?
3. Standalone `/pages/editor` deliberately drops `historyId` — should it also load/show the attached history when `page.history_id` is set, or is standalone meant to be history-agnostic (Report-style)?

## Affected files

`client/src/components/PageEditor/PageEditorView.vue`, `client/src/components/PageEditor/HistoryPageView.vue`, `client/src/components/PageEditor/PageEditor.vue`, `client/src/components/History/Index.vue`, `client/src/entry/analysis/modules/Analysis.vue`, `client/src/entry/analysis/router.js`, `client/src/stores/pageEditorStore.ts`, `client/src/stores/historyStore.ts`, `lib/galaxy/schema/schema.py`.
