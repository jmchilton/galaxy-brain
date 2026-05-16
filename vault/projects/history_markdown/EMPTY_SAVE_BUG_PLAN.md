# Empty-Content Save: Root Cause & Fix Plan

> **Branch:** `history_pages`
> **Status:** **landed 2026-05-13** — patches A + B applied, tests added, frontend + new API tests green. See "Implementation Notes" at bottom for what diverged from the plan.
> **Symptoms:**
> 1. Saving a notebook/report with 1 character works; saving with 0 characters fails.
> 2. The error alert flashes for milliseconds then vanishes — looks silent.
>
> These are independent bugs that compose. Fix both.

---

## 1. Root Causes

### Bug A — Backend rejects empty content

In `lib/galaxy/managers/pages.py`:

```python
# lib/galaxy/managers/pages.py:377-383
def save_new_revision(self, trans, page, payload):
    content = payload.get("content", None)
    content_format = payload.get("content_format", None)
    edit_source = payload.get("edit_source", None)
    if not content:
        raise exceptions.ObjectAttributeMissingException("content undefined or empty")
```

`if not content` is falsy for both `None` and `""`, so empty strings are rejected with HTTP 400 (`USER_OBJECT_ATTRIBUTE_MISSING`). Logic predates Notebooks (origin: 2019 commit `ead233c0c1`).

Inconsistent with create path: `create_page` accepts empty content (`pages.py:285,297` — `content = payload.content or ""`) and writes an empty first revision. The update path then refuses to write a second empty revision.

1-vs-0 character asymmetry is exactly the `not content` boundary.

### Bug B — Error alert self-destructs in Notebook view

`client/src/components/PageEditor/HistoryPageView.vue:117-167` renders its outer template as a v-if/v-else-if **chain**:

```
v-if="store.isLoadingList"            → loading alert
v-else-if="store.error"               → error alert         ← (1)
v-else-if="!pageId"                   → list
v-else-if="hasCurrentPage && displayOnly" → display
v-else-if="pageId && !displayOnly"    → <PageEditorView />  ← (2)
```

(1) and (2) are mutually exclusive. The race when save fails:

1. `savePage()` catches 400, sets `store.error = "..."` (`pageEditorStore.ts:195`).
2. Vue re-evaluates the chain: `store.error` truthy → alert renders; `<PageEditorView />` slot unmounts.
3. `PageEditorView`'s `onUnmounted` fires (`PageEditorView.vue:85-89`): `if (!props.displayOnly) store.$reset()`.
4. `$reset()` (`pageEditorStore.ts:480`) sets `error.value = null`, plus wipes `currentContent`, `originalContent`, `currentPage`, etc.
5. Vue re-evaluates: `store.error` now falsy → alert vanishes → `<PageEditorView />` remounts.
6. `PageEditorView.onMounted` calls `store.loadPage(pageId)`, refetching from server.

Net effect: error flashes for a tick, editor reloads, and the dirty content the user was trying to save is gone — silent on the surface, destructive underneath. This bug is independent of Bug A: any backend error during save (bad format, malformed markdown, permission, network) produces the same flash-and-reset.

The standalone Report path (`PageEditor.vue` → `PageEditorView` directly) doesn't hit this — `PageEditorView`'s own inner v-else-if at line 188 swaps inner templates but doesn't unmount the component, so `$reset` doesn't fire. But Bug A still applies there.

A prefix on the message wouldn't help — the alert is unmounted before a human can read it.

---

## 2. Patches

> **Landed:** A, B1, B2. Plus an added template guard on the outer alert (B1.5 below) to prevent double-rendering after the reviewer caught it.

### Patch A — Allow empty content

**File:** `lib/galaxy/managers/pages.py`

Change the guard so only undefined content is rejected; `""` is a legal state:

```python
def save_new_revision(self, trans, page, payload):
    content = payload.get("content", None)
    content_format = payload.get("content_format", None)
    edit_source = payload.get("edit_source", None)
    if content is None:
        raise exceptions.ObjectAttributeMissingException("content undefined")
    ...
```

Downstream calls are safe with `""`:
- `rewrite_content_for_import` → `ready_galaxy_markdown_for_import` → `_validate` → `validate_galaxy_markdown`: loops `_split_markdown_lines("")` which yields nothing, no errors. Regex remap functions also no-op on `""`.
- HTML path: `sanitize_html("")` and `PageContentProcessor.feed("")` both no-op.

No schema change needed (`UpdatePagePayload.content` is `Optional[str]` with no `min_length`).

### Patch B — Stop unmounting the editor on error

Two changes; both required.

**B1. Move the error alert out of the v-else-if chain in `HistoryPageView.vue`.** It should render *in addition to* the active branch, not instead of it.

```html
<template>
    <div class="history-page-view d-flex flex-column h-100" data-description="history page view">
        <BAlert v-if="store.error" variant="danger" show dismissible @dismissed="store.error = null">
            {{ store.error }}
        </BAlert>

        <BAlert v-if="store.isLoadingList" variant="info" show>...</BAlert>
        <template v-else-if="!pageId">...</template>
        <template v-else-if="store.hasCurrentPage && displayOnly">...</template>
        <template v-else-if="pageId && !displayOnly">
            <PageEditorView ... />
        </template>
        <BAlert v-else-if="store.isLoadingPage" variant="info" show>...</BAlert>
    </div>
</template>
```

Apply the same shape to `PageEditorView.vue` for consistency (its inner chain doesn't unmount itself, but leaving the error inside the chain means the user loses the toolbar + editor underneath the alert — bad UX too).

**B2. Stop `$reset()`ing on transient unmounts in `PageEditorView.vue`.** `$reset` is too blunt — it wipes editor state including `error`, defeating any "show the error" attempt. Replace with explicit cleanup:

```ts
onUnmounted(() => {
    if (!props.displayOnly) {
        store.clearCurrentPage();  // clears currentPage, content, dirty state
        // do NOT touch store.error — let HistoryPageView own its lifecycle
    }
});
```

Check `clearCurrentPage()` already covers the necessary fields; if not, add a dedicated `clearEditor()` action that resets editor-scoped state but leaves cross-route state (error, pages list) alone.

Even after B1, B2 is still worth doing — `$reset` on unmount is a latent bug magnet (any future error or notification would also get wiped on route change).

---

## 3. Tests (red → green)

> **Landed:**
> - 3a: `test_save_empty_content_clears_notebook` + `test_save_empty_content_on_regular_page` — both green via pytest auto-spawned test server.
> - 3b: `accepts empty content and clears dirty state` added to `pageEditorStore.test.ts`.
> - 3c: `keeps PageEditorView mounted when error appears in edit mode` + `shows error alert in display-only mode` (HistoryPageView); `does not clear store.error on unmount in edit mode` + `renders error alert alongside the editor` (PageEditorView). Existing `$reset` lifecycle assertion in PageEditorView retargeted to `clearCurrentPage`. DisplayOnly unmount tests in both files strengthened to also assert `clearCurrentPage` not called.
> - 3d: Selenium not added (low priority per plan).

### 3a. API integration test (red first)

**File:** `lib/galaxy_test/api/test_pages_history_attached.py` (existing file, 336 lines, already covers history-attached CRUD).

Add:

```python
def test_save_empty_content_clears_notebook(self):
    # Create notebook with some content
    page = self._create_history_notebook(content="# Hello\n\nsome prose")
    # Save empty content
    response = self._update_page(page["id"], {"content": "", "content_format": "markdown"})
    self._assert_status_code_is(response, 200)
    # New revision exists with empty content
    revisions = self._get_revisions(page["id"])
    assert revisions[-1]["content"] == ""
    # Reload returns empty content_editor
    reloaded = self._get_page(page["id"])
    assert reloaded["content_editor"] == ""
```

Also a non-notebook (report) variant in the equivalent report API test file — same constraint applies; same fix covers both.

Run red first against current main to confirm 400, then apply Patch A and re-run.

### 3b. Store unit test (Bug A)

**File:** `client/src/stores/pageEditorStore.test.ts`

Mock PUT `/api/pages/{id}` returning updated page with empty content, call `savePage()`, assert:
- `isDirty` becomes false
- `originalContent` becomes `""`
- No error is set

### 3c. View unit tests (Bug B)

**File:** `client/src/components/PageEditor/HistoryPageView.test.ts`

Add a test that:
1. Mounts HistoryPageView in edit mode (pageId set, !displayOnly).
2. Sets `store.error = "Save failed"`.
3. Asserts the BAlert is rendered AND PageEditorView is still mounted (use `findComponent` for the latter).

Without B1 this test should fail (PageEditorView would be unmounted).

Also add a test that:
1. Mounts PageEditorView (`displayOnly=false`).
2. Sets `store.currentContent = "x"`, `store.error = "Save failed"`.
3. Unmounts the wrapper.
4. Asserts `store.error` is still `"Save failed"` after unmount.

Without B2 this fails (`$reset` clears error).

### 3d. Selenium (optional, low priority)

Existing `test_history_pages.py` already covers edit + save flows. Add one test that opens a notebook, clears the editor, saves, reloads, and asserts the editor is empty. Mark as low priority — API + unit coverage is the meaningful safety net.

---

## 4. Verification on the test server

1. Apply Patches A and B (B1 + B2).
2. Run new API test red against pre-patch revision (sanity), green against post-patch.
3. Run existing page test suites — neither `test_pages_history_attached.py` nor `test_page_revision_json_encoding.py` asserts the empty-rejection behavior (grepped — no callers depend on it), so no expected breakage.
4. Manual A: notebook → type "x" → save → delete "x" → save. Reload. Editor empty. Revisions panel shows two revisions, latest empty.
5. Manual B (regression check for the flash): temporarily revert Patch A only, leave Patch B in. Try empty save on a notebook. Error alert should be persistent until dismissed; editor content should NOT be wiped; dirty state preserved. Then re-apply Patch A.
6. Manual: same as Manual A on a Report (standalone page) to confirm Patch A covers both. (Bug B doesn't manifest there but Patch B still applies cleanly.)

---

## 5. Out of Scope (do not bundle)

- Concurrent-edit protection (already in §14 Known Issues).
- Title-required validation — `UpdatePagePayload.title` has `min_length=1` but is optional; clearing title is a separate question.
- Soft-delete of "empty" notebooks — empty is a legitimate transient state, not a delete signal.

---

## 6. Unresolved Questions

- B2 scope: replace `$reset` with `clearCurrentPage` only, or introduce a new `clearEditor` action? Audit what `$reset` was protecting against on route change before changing. — **landed with `clearCurrentPage`**. Outer `HistoryPageView` still `$reset`s on real route-leave, so the wider state (mode/pages/historyId/loading flags) is still cleared in the history-attached path. Standalone path leaves them stale on the store but they get overwritten on next mount. Could revisit with a `clearEditor` action if symmetry matters.
- Report path: clearing a *published* report — allow without unpublishing? Renderer handles empty content fine, but worth flagging. — **still open**.
- Revision diff w/ empty revisions — does `sectionDiffUtils.markdownSections("")` produce sensible output? Sanity check during manual verification. — **still open**, defer until first user encounter.
- Other store actions that set `error.value` (loadPages, loadPage, createPage, deleteCurrentPage, restoreRevision, etc.) — all currently visible only as long as no remount happens. After B1+B2 the alerts stick, which is the right behavior; confirm no test asserted the disappear-on-route-change behavior. — **confirmed**: no existing test asserted the disappear-on-route-change behavior. Two displayOnly unmount tests strengthened to lock in non-clearing behavior.

---

## 7. Implementation Notes (2026-05-13)

Deviations and discoveries while landing:

- **Patch B1 introduced a duplicate error alert.** With both `HistoryPageView` and the embedded `PageEditorView` rendering `<BAlert v-if="store.error">` independently, a save failure in edit mode stacked the same error twice. Fix: guarded the outer alert with `v-if="store.error && (!pageId || displayOnly)"` so ownership belongs to `PageEditorView` while it is mounted. Caught by reviewer subagent, not by the original `shallowMount` test (which stubs the inner component).
- **`save_new_revision` is also called from `api/page_revisions.py:60`** (POST `/api/pages/{id}/revisions`). The new predicate applies there too — both callers now accept `""`. No additional test added but worth knowing.
- **Revision-list response omits `content`.** The summary endpoint returns metadata only — `revisions[-1]["content"]` raises `KeyError`. The API test fetches the latest revision via `GET /pages/{id}/revisions/{rid}` to read `content`. Existing tests in this file follow the same pattern.
- **Error-string change is observable.** `"content undefined or empty"` → `"content undefined"`. No internal assertions on the old text, but external integrations regex'ing it would break. Flag in PR description.
- **`test_save_empty_content_on_regular_page` uses `update_history_page_raw` on a regular (non-history) page.** Works because the helper hits the same PUT route, but the name is misleading. Low-priority follow-up: rename to drop "history" or split into `update_page_raw`.
- **`clearCurrentPage()` is narrower than `$reset()`** — it clears `currentPage/originalContent/currentContent/originalTitle/currentTitle/showChatPanel/chatError/pageChatHistory/showChatHistory/chatHistoryError + revision state`. It leaves `mode`, `pages`, `historyId`, and the loading flags. Acceptable because (a) `HistoryPageView` still `$reset`s on real route-leave and (b) standalone path overwrites these on next mount.
- **Frontend test env needed `NODE_OPTIONS=--no-experimental-webstorage` on Node 25.** happy-dom's `localStorage` collides with node 25's built-in experimental webstorage, breaking `persistentRef.ts:28`. Pre-existing env issue, not introduced by this patch. CI likely runs on an older Node.
- **Backend pytest had one flaky shutdown-timeout** on `test_page_source_fk_null_by_default` (`RuntimeError: Worker thread failed to exit within the allocated timeout`). Passes in isolation. Unrelated to this change.

### Files changed
- `lib/galaxy/managers/pages.py`
- `lib/galaxy_test/api/test_pages_history_attached.py`
- `client/src/components/PageEditor/HistoryPageView.vue`
- `client/src/components/PageEditor/PageEditorView.vue`
- `client/src/components/PageEditor/HistoryPageView.test.ts`
- `client/src/components/PageEditor/PageEditorView.test.ts`
- `client/src/stores/pageEditorStore.test.ts`
