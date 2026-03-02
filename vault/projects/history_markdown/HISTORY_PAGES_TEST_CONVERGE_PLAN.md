# History Pages: Test Convergence Plan

> **Date:** 2026-02-28 (updated)
> **Context:** Notebooks→Pages merge complete. UI convergence complete. Cleanup rename (notebook→page everywhere) complete. Two page types: regular (slug-based, publishable) and history-attached (history_id, revisions with edit_source, agent chat).

---

## Current State

### Naming Cleanup: Done

All code uses "page" terminology. Specifically:
- Backend: `PageAssistantAgent`, `AgentType.PAGE_ASSISTANT`, `create_page_chat()`, `page_id` FK
- Frontend: `PageEditor/` directory, `usePageEditorStore`, `pages.ts` API client, `PageChatPanel.vue`
- Selenium: `navigates_galaxy.py` helpers all say "page", `navigation.yml` selectors renamed
- Unit tests: `test_chat_manager.py` uses `page_id`, `test_agents.py` uses `PageAssistantAgent`
- No stale "notebook" references remain (except unrelated Jupyter `body.notebook_app`)

### API Tests

| File | Tests | Page Type | Notes |
|------|-------|-----------|-------|
| `test_pages.py` | 37 | Regular only | Comprehensive CRUD, permissions, search, validation, PDF, invocation FK |
| `test_page_revisions.py` | 4 | Regular only | Create revision, list revisions, permissions, error handling |
| History-attached API tests | **0** | — | **Critical gap.** Populators exist but no tests use them |

### Selenium Tests

| File | Tests | Page Type | Notes |
|------|-------|-----------|-------|
| `test_history_pages.py` | 24 | History-attached | Navigation, editing, revisions, drag-drop, WM, display mode, rename |
| `test_pages.py` | 3 | Regular | Basic create/edit/view with embeds |
| `test_pages_index.py` | 1 | Regular | Grid deletion |
| `test_published_pages.py` | 1 | Regular (published) | Multi-user published grid |

### Frontend Vitest

| File | Lines | Coverage |
|------|-------|---------|
| `pageEditorStore.test.ts` | 837 | Store: all methods, computed props, panel toggles, chat persistence |
| `HistoryPageView.test.ts` | 741 | Orchestrator: loading, list, navigation, display mode, WM, revisions, chat |
| `PageEditorView.test.ts` | ~400 | Unified editor: toolbar, save, revisions, chat, standalone vs history mode |
| `PageChatPanel.test.ts` | 327 | Chat: message flow, persistence, error handling, new conversation |
| `pages.test.ts` | 211 | API client: all CRUD + revisions + error handling |
| `PageRevisionList.test.ts` | 207 | Revision list: rendering, edit_source labels, restore events |
| `HistoryPageList.test.ts` | 185 | Page list: rendering, selection, view events |
| `EditorSplitView.test.ts` | 59 | Split pane: resize, slots |
| `ProposalDiffView.test.ts` | — | Full-doc diff rendering |
| `SectionPatchView.test.ts` | — | Section-level diff with accept/reject |
| `sectionDiffUtils.test.ts` | — | Diff computation utilities |

Comprehensive (~2,650+ lines, 150+ tests). All use page terminology.

### Backend Unit Tests

| File | Tests | Status |
|------|-------|--------|
| `test_agents.py` | 25+ | OK — uses `PageAssistantAgent`, `page_content` |
| `test_history_tools.py` | 12+ | OK — data access layer, no model dependency |
| `test_chat_manager.py` | 8 | OK — uses `page_id`, `create_page_chat()`, `"page_assistant"` |

---

## Gaps: API Tests

### Gap A1: History-Attached Page CRUD (HIGH)

Zero API integration tests for history-page workflow. Populators ready, just need tests.

| Test | What to assert |
|------|---------------|
| `test_create_page_with_history_id` | Returns page with `history_id` set, `content_format="markdown"`, title auto-generated from history name |
| `test_create_history_page_no_slug_required` | No 400 when slug omitted with `history_id` |
| `test_list_pages_by_history_id` | `GET /api/pages?history_id=X` returns only pages for that history |
| `test_list_pages_excludes_other_histories` | `history_id` filter doesn't leak pages from other histories |
| `test_get_history_page_details` | Response includes `content_editor`, `content`, `history_id`, `edit_source` |
| `test_update_history_page` | Content updates, new revision created |
| `test_delete_history_page` | Soft delete, excluded from list |
| `test_multiple_pages_per_history` | No unique constraint on history_id — can create multiple |

### Gap A2: edit_source Tracking (HIGH)

No API tests verify `edit_source` is recorded on revisions.

| Test | What to assert |
|------|---------------|
| `test_update_with_edit_source_user` | Revision gets `edit_source="user"` |
| `test_update_with_edit_source_agent` | Revision gets `edit_source="agent"` |
| `test_edit_source_in_revision_list` | Listed revisions include `edit_source` field |
| `test_edit_source_null_default` | Regular page update without `edit_source` → revision has `edit_source=None` |

### Gap A3: Revision Endpoints (MEDIUM)

`test_page_revisions.py` tests create + list + permissions. Missing:

| Test | What to assert |
|------|---------------|
| `test_get_single_revision` | `GET /api/pages/{id}/revisions/{rid}` returns content, edit_source, content_format |
| `test_revert_revision` | `POST .../revert` creates new revision with old content, `edit_source="restore"` |
| `test_revert_updates_latest_revision` | Page details reflect reverted content |
| `test_revert_preserves_original` | Original revision still exists unchanged after revert |

### Gap A4: History-Page Permissions (MEDIUM)

Regular page permission tests exist (403 on unowned). History pages need:

| Test | What to assert |
|------|---------------|
| `test_history_page_403_on_unowned_history` | Can't create/read pages on someone else's private history |
| `test_history_page_shared_history_read` | Shared history grants read access to pages |
| `test_history_page_shared_history_no_write` | Shared history doesn't grant write access |

### Gap A5: Cross-Type Validation (LOW)

| Test | What to assert |
|------|---------------|
| `test_history_page_ignores_slug` | Slug field optional/ignored when history_id present |
| `test_regular_page_no_history_id` | Regular page response has `history_id=null` |
| `test_content_format_markdown_on_history_page` | History pages always get `content_format="markdown"` (not the `"html"` default) |

---

## Gaps: Selenium Tests

### Gap S1: Regular Pages Are Undertested (MEDIUM)

Only 3 selenium tests for regular pages vs 24 for history-attached. Missing:

- Page editing (update existing content, re-save)
- Page deletion via grid UI confirmation flow
- Published page viewing by another user

Not critical — API tests cover the backend well. But post-convergence, the unified `PageEditorView` is used for both types, so regular-page editing through the new editor is untested at the E2E level.

### Gap S2: Standalone Page Uses Unified Editor (MEDIUM — new gap from UI convergence)

The UI convergence replaced `PageEditorMarkdown.vue` with `PageEditorView`. No selenium test verifies that editing a regular page through the new unified editor works. This is a new code path — the old `PageEditorMarkdown` had its own save logic (`POST /api/pages/{id}/revisions`), the new one uses the store's `savePage()`.

Suggested test: `test_edit_standalone_page_via_unified_editor` — create page, navigate to `/pages/:id/edit`, modify content, save, verify persistence.

### Gap S3: Chat Panel E2E (LOW)

No selenium tests for the chat panel. Vitest suite (`PageChatPanel.test.ts`, 327 lines) covers message flow, persistence, and error handling well. Selenium would require a running LLM backend — impractical for CI. **Defer to env-gated integration tests.**

### Gap S4: Cross-Type UI Behavior (LOW)

No selenium tests verify:
- Regular pages show Permissions button but not history-specific controls
- History pages show chat/revisions but not slug/publish controls

Mostly a UI convergence correctness concern. Vitest (`PageEditorView.test.ts`) covers toolbar differences by mode.

---

## Recommendations

### Priority 1: API Tests for History Pages

Add `TestHistoryPagesApi` class — either in `test_pages.py` or new `test_history_pages_api.py`. Cover gaps A1 + A2. This is the single biggest hole: the entire history-page API path has zero integration test coverage.

~15 new test methods, ~250 lines. Populators ready — no infrastructure work needed.

### Priority 2: Revision API Completion

Extend `test_page_revisions.py` with gap A3 (get single revision, revert, revert behavior). These endpoints are exercised by the frontend but have no direct API test coverage.

~4 new test methods, ~80 lines.

### Priority 3: History-Page Permissions

Add gap A4 tests. Shared-history read access is the most important — it's how collaborators see each other's pages.

~3 new test methods, ~60 lines.

### Priority 4: Standalone Page Selenium Test

One selenium test verifying the unified editor works for regular pages (gap S2). This catches regressions from the `PageEditorMarkdown` → `PageEditorView` replacement.

~1 test method, ~30 lines.

### Priority 5: Cross-Type Validation

Gap A5 tests. Low-risk but good for documenting the contract between the two page types.

~3 test methods, ~40 lines.

---

## Test Infrastructure

Populators support all needed operations — no new infrastructure required:

```python
# History page CRUD
new_history_page(history_id, title, content, content_format)
get_history_page(page_id)
list_history_pages(history_id)
update_history_page(page_id, content, title, edit_source)
delete_history_page(page_id)

# Revisions
list_page_revisions(page_id)
revert_page_revision(page_id, revision_id)

# Sharing
make_page_public(page_id)
```

Selenium navigation helpers:
```python
navigate_to_history_pages()
history_page_create()
history_page_editor_set_content(content)
history_page_save()
history_page_manage()
history_page_open_revisions()
history_page_assert_revision_count(n)
history_page_rename(new_name)
# ... 11 total
```

---

## Unresolved Questions

1. History-page API tests — `test_pages.py` (add class) or separate `test_history_pages_api.py`?
2. Standalone page selenium — add to existing `test_pages.py` or new file?
3. Export-to-Page flow (history-page → published page with slug) — test now or defer as unimplemented feature?
