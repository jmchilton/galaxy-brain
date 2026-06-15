# Fix Revision Diff Viewer: Two Diff Modes + Selenium Tests

## Context

The diff viewer added in 647669a only compares revision vs current editor content. This is confusing (latest revision shows "No changes"). We'll add **two diff modes**: compare to current editor and compare to previous revision, with conditional visibility.

## UX Design

Three view modes in the revision toolbar:
- **Preview** — rendered markdown (existing)
- **Compare to Current** — diff revision vs current editor content (existing logic, relocated)
- **Compare to Previous** — diff revision vs predecessor revision (new)

Conditional button visibility:
- **Newest revision** (index 0 in desc-sorted list): hide "Compare to Current" (it would be ~identical to saved content)
- **Oldest revision** (last in list): hide "Compare to Previous" (no predecessor exists)

`viewMode` type: `"preview" | "changes_current" | "changes_previous"`

## Step 1: Store — add `previousRevisionContent` + `isNewestRevision` + `isOldestRevision`

**File**: `client/src/stores/pageEditorStore.ts`

- Add `const previousRevisionContent = ref<string | null>(null)`
- Change `revisionViewMode` type to `"preview" | "changes_current" | "changes_previous"`
- In `loadRevision(revisionId)`:
  - After fetching selected revision, find its index in `revisions.value` (desc sorted)
  - If `index + 1 < revisions.length` → fetch predecessor via `fetchPageRevision` and store content in `previousRevisionContent`
  - Else → `previousRevisionContent.value = null`
- Add computed `isNewestRevision`: `selectedRevision?.id === revisions[0]?.id`
- Add computed `isOldestRevision`: `selectedRevision?.id === revisions[revisions.length - 1]?.id`
- Clear `previousRevisionContent` in `clearSelectedRevision()` and `clearRevisionState()`
- Export all new refs/computeds

## Step 2: PageEditorView — pass new props

**File**: `client/src/components/PageEditor/PageEditorView.vue`

- Add props: `:previous-content`, `:is-newest-revision`, `:is-oldest-revision`
- Keep `:current-content`

## Step 3: PageRevisionView — three view modes

**File**: `client/src/components/PageEditor/PageRevisionView.vue`

Props:
- `revision`, `currentContent`, `previousContent: string | null`, `isNewestRevision`, `isOldestRevision`, `viewMode`, `isReverting`

Computed diffs (both always computed, only one rendered):
- `currentChanges = computeLineDiff(revisionContent, currentContent)` — existing logic
- `previousChanges = computeLineDiff(previousContent ?? "", revisionContent)` — new

Template:
- **Preview button** — always visible
- **"Compare to Current" button** (`data-description="revision compare current button"`) — hidden when `isNewestRevision`
- **"Compare to Previous" button** (`data-description="revision compare previous button"`) — hidden when `isOldestRevision`
- `viewMode === "preview"` → Markdown component (existing)
- `viewMode === "changes_current"` → diff using `currentChanges`/`currentStats` (existing diff template)
- `viewMode === "changes_previous"` → diff using `previousChanges`/`previousStats` (same diff template)
- "No changes" message when appropriate diff has no changes

## Step 4: Update unit tests

**File**: `client/src/components/PageEditor/PageRevisionView.test.ts`

- Add `previousContent` prop to fixtures
- Add `isNewestRevision`/`isOldestRevision` props
- Test: "Compare to Current" button hidden when `isNewestRevision`
- Test: "Compare to Previous" button hidden when `isOldestRevision`
- Test: `viewMode="changes_current"` renders diff vs current content
- Test: `viewMode="changes_previous"` renders diff vs previous content
- Update existing tests for renamed viewMode values (`"changes"` → `"changes_current"`)

## Step 5: Update store unit tests

**File**: `client/src/stores/pageEditorStore.test.ts`

- Test `previousRevisionContent` is set after `loadRevision`
- Test `isNewestRevision`/`isOldestRevision` computeds

## Step 6: Navigation YAML selectors

**File**: `client/src/utils/navigation/navigation.yml`

Add under `pages > history`:
```yaml
revision_compare_current_button:
  type: data-description
  selector: 'revision compare current button'
revision_compare_previous_button:
  type: data-description
  selector: 'revision compare previous button'
revision_preview_button_mode:
  type: data-description
  selector: 'revision preview button'
revision_diff_view:
  type: data-description
  selector: 'revision diff view'
revision_no_changes:
  type: data-description
  selector: 'revision no changes'
```

## Step 7: Selenium test — history page revision diff

**File**: `lib/galaxy_test/selenium/test_history_pages.py`

Test `test_revision_diff_view`:
1. Create page via API: `"# V1\n\nOriginal content"`
2. Update via API: `"# V1\n\nModified content\n\nNew section"`
3. Navigate to history pages, open editor
4. Open revisions (2 items)
5. Click newest revision (index 0) → `revision_view.wait_for_visible()`
6. Assert "Compare to Current" button is NOT visible (newest)
7. Assert "Compare to Previous" button IS visible
8. Click `revision_compare_previous_button`
9. `revision_diff_view.wait_for_visible()`
10. Assert diff text contains "Modified content" (added) and "Original content" (removed)
11. Click back → click oldest revision (index -1)
12. Assert "Compare to Previous" button is NOT visible (oldest)
13. Assert "Compare to Current" button IS visible
14. Click `revision_compare_current_button`
15. `revision_diff_view.wait_for_visible()`
16. Assert diff shows changes from oldest revision to current editor content
17. Screenshot

## Step 8: Selenium test — standalone page revision diff

**File**: `lib/galaxy_test/selenium/test_pages.py`

Test `test_standalone_page_revision_diff`:
1. Create standalone page via API: `"# Start\n\nAlpha"`
2. Update via API: `"# Start\n\nBeta"`
3. `navigate_to_page_editor(page_id)`
4. Open revisions → click newest revision
5. Assert "Compare to Current" hidden, "Compare to Previous" visible
6. Click `revision_compare_previous_button`
7. `revision_diff_view.wait_for_visible()`
8. Assert diff contains "Beta" (added) and "Alpha" (removed)
9. Click back → click oldest revision
10. Assert "Compare to Previous" hidden, "Compare to Current" visible
11. Click `revision_compare_current_button`
12. Verify diff view renders
13. Screenshot

## Verification

1. `cd client && npx vitest run src/components/PageEditor/PageRevisionView.test.ts`
2. `cd client && npx vitest run src/stores/pageEditorStore.test.ts`
3. `./run_tests.sh -selenium lib/galaxy_test/selenium/test_history_pages.py::TestHistoryPages::test_revision_diff_view`
4. `./run_tests.sh -selenium lib/galaxy_test/selenium/test_pages.py::TestPages::test_standalone_page_revision_diff`

## Open Questions

None.
