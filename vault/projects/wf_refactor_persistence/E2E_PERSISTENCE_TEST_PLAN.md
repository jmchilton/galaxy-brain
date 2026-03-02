# E2E Persistence Test Plan

Extend `lib/galaxy_test/selenium/test_workflow_editor_undo_redo.py` with tests for the workflow action persistence and changelog features.

## 1. How to Enable the Feature Flag

Galaxy selenium tests create a session-scoped server. Configuration respects `GALAXY_CONFIG_OVERRIDE_*` environment variables via `load_app_properties`.

**Approach:** Set the env var before running these tests:

```bash
GALAXY_CONFIG_OVERRIDE_ENABLE_WORKFLOW_ACTION_PERSISTENCE=true \
  pytest lib/galaxy_test/selenium/test_workflow_editor_undo_redo.py -k "Persistence" -v
```

This enables `enable_workflow_action_persistence` for the Galaxy instance. Existing undo/redo tests are compatible with persistence enabled — the refactor-as-save path falls back to raw PUT when needed.

**Naming convention:** New test class `TestWorkflowEditorPersistence` with methods prefixed `test_persistence_*` for easy `-k` filtering.

---

## 2. New Helper Methods Needed

### In `lib/galaxy/selenium/navigates_galaxy.py`

```python
def workflow_editor_open_changelog_panel(self):
    """Click the Changelog activity bar button to open the changelog side panel."""
    self.wait_for_and_click_selector("#activity-workflow-editor-changelog")
    self.sleep_for(self.wait_types.UX_RENDER)

def workflow_editor_changelog_entries(self):
    """Return all changelog entry elements currently visible."""
    return self.driver.find_elements_by_css_selector(".changelog-entry")

def workflow_editor_changelog_entry_titles(self):
    """Return text of all visible changelog entry titles."""
    entries = self.driver.find_elements_by_css_selector(".changelog-entry .entry-title")
    return [e.text for e in entries]

def workflow_editor_revert_changelog_entry(self, index=0):
    """Click 'Revert to before this' on the nth changelog entry."""
    buttons = self.driver.find_elements_by_css_selector(".changelog-entry .entry-revert-btn")
    buttons[index].click()
    self.sleep_for(self.wait_types.UX_RENDER)

def workflow_editor_changelog_load_more(self):
    """Click 'Load more...' in changelog panel."""
    self.wait_for_and_click_selector(".load-more-btn")
    self.sleep_for(self.wait_types.UX_RENDER)

def workflow_editor_changelog_refresh(self):
    """Click the Refresh button in the changelog panel header."""
    self.wait_for_and_click_selector(".activity-panel button[title='Refresh']")
    self.sleep_for(self.wait_types.UX_RENDER)
```

### In `lib/galaxy/navigation/navigation.yml`

Add under `workflow_editor`:

```yaml
changelog:
  selectors:
    _: ".changelog-list"
    entry: ".changelog-entry"
    entry_title: ".changelog-entry .entry-title"
    entry_time: ".changelog-entry .entry-time"
    entry_revert_btn: ".changelog-entry .entry-revert-btn"
    entry_badge_revert: ".changelog-entry .badge-warning"
    load_more: ".load-more-btn"
    refresh: ".activity-panel button[title='Refresh']"
    empty_message: ".text-muted"
tool_bar:
  selectors:
    changelog: "#activity-workflow-editor-changelog"
```

---

## 3. Test Cases

### 3.1 Undo/Redo Surviving Saves

**NOTE:** These tests depend on the refactor-as-save path preserving the undo/redo stack across saves. Currently `saveViaRefactor()` calls `_loadCurrent()` → `resetStores()` which clears the undo stack. These tests are written red-to-green: they will initially fail and drive the implementation to skip `resetStores()` on the refactor-as-save path.

#### `test_persistence_undo_survives_save`
After saving, undo stack is preserved and undo works.

```
1. Create new workflow
2. Add data_input step -> node 0
3. Set label "A" on node 0 (blur + wait)
4. Save workflow
5. Undo label -> label "A" gone, node 0 still present
6. Assert: node 0 present, label "A" absent
7. Redo label -> label "A" back
```

#### `test_persistence_undo_redo_across_multiple_saves`
Multiple saves don't break undo/redo.

```
1. Create new workflow
2. Add data_input -> node 0
3. Save
4. Set label "B" on node 0 (blur + wait)
5. Save
6. Add data_collection_input -> node 1
7. Save
8. Undo (removes node 1)
9. Assert: node 1 absent, node 0 present with label "B"
10. Undo (removes label "B")
11. Assert: node 0 present, label "B" absent
12. Redo (label "B" back)
13. Redo (node 1 back)
14. Assert: node 0 label "B", node 1 present
```

#### `test_persistence_undo_redo_full_cycle_across_save_boundary`
Undo before save, redo after save.

```
1. Create new workflow
2. Add data_input -> node 0
3. Set label "X" (blur + wait)
4. Undo label
5. Save (saves state without label)
6. Redo label -> label "X" appears
7. Assert: label "X" present
```

---

### 3.2 Changelog Panel

#### `test_persistence_changelog_entry_after_save`
Save creates a changelog entry visible in the panel.

```
1. Create new workflow, save (initial save)
2. Add data_input step
3. Save
4. Open changelog panel (#activity-workflow-editor-changelog)
5. Wait for .changelog-entry to be present
6. Assert: at least 1 entry visible
7. Assert: entry title text is non-empty
```

#### `test_persistence_changelog_multiple_entries`
Multiple saves produce multiple entries, newest first.

```
1. Create new workflow
2. Add data_input, save
3. Set label "A" (blur + wait), save
4. Set license "MIT", save
5. Open changelog panel
6. Assert: at least 3 entries visible
7. Assert: first entry title relates to most recent change (newest first)
```

#### `test_persistence_changelog_empty_on_fresh_workflow`
New workflow with no refactor saves shows empty changelog.

```
1. Create new workflow (initial save is raw PUT, no refactor)
2. Open changelog panel
3. Assert: "No changelog entries yet" message visible
```

#### `test_persistence_changelog_revert`
Revert via changelog creates new version and updates state.

```
1. Create new workflow
2. Add data_input -> node 0, save
3. Set label "Original" (blur + wait), save
4. Set label "Modified" (blur + wait), save
5. Open changelog panel
6. Find the entry for "Modified" label change
7. Click "Revert to before this" on that entry
8. Handle confirmation dialogs (unsaved changes + revert confirm)
9. Wait for editor to reload
10. Assert: label shows "Original" (reverted to before "Modified" was set)
11. Open changelog panel again
12. Assert: new entry with revert badge (.badge-warning) present
```

#### `test_persistence_changelog_revert_badge`
Revert entries show the "revert" badge.

```
1. Create workflow, add step, save, modify label, save
2. Open changelog, revert to first save
3. Confirm revert dialogs
4. Open changelog
5. Assert: newest entry has .badge-warning with text "revert"
```

---

### 3.3 Persisted Action Types (Round-trip Verification)

Verify changes saved via refactor-as-save persist through reload.

#### `test_persistence_step_label_roundtrip`
Label change persists on reload.

```
1. Create new workflow
2. Add data_input -> node 0
3. Set label "MyLabel" (blur + wait)
4. Save
5. Navigate to workflow index, reopen workflow
6. Assert: node with label "MyLabel" present
```

#### `test_persistence_add_step_roundtrip`
Added step persists through save/reload.

```
1. Create new workflow
2. Add data_input -> node 0
3. Add data_collection_input -> node 1
4. Save
5. Navigate to workflow index, reopen
6. Assert: 2 nodes present
```

#### `test_persistence_remove_step_roundtrip`
Removed step stays removed on reload.

```
1. Upload yaml workflow with cat step connected to input
2. Open in editor, auto-layout
3. Delete the cat step
4. Save
5. Reopen workflow
6. Assert: cat step absent, input still present
```

#### `test_persistence_workflow_name_annotation_roundtrip`
Name and annotation changes persist.

```
1. Create new workflow with annotation "orig"
2. Set name "NewName" (blur + wait)
3. Set annotation "new_ann" (blur + wait)
4. Save
5. Navigate to workflow index, reopen
6. Assert: name is "NewName", annotation is "new_ann"
```

#### `test_persistence_connection_roundtrip`
Connection changes persist.

```
1. Upload connected cat workflow
2. Open in editor, auto-layout
3. Disconnect cat input
4. Save
5. Reopen
6. Assert: connection absent
```

#### `test_persistence_comment_roundtrip`
Added comment persists.

```
1. Create new workflow
2. Place text comment
3. Save
4. Reopen
5. Assert: text comment present
```

#### `test_persistence_license_roundtrip`
License change persists.

```
1. Create new workflow
2. Set license "MIT"
3. Save
4. Reopen
5. Assert: license shows "MIT"
```

#### `test_persistence_auto_layout_roundtrip`
Auto-layout position changes persist.

```
1. Upload multi-step workflow, open in editor
2. Get node positions before
3. Click auto-layout
4. Save
5. Reopen
6. Assert: workflow loads without error, positions match auto-layout
```

---

### 3.4 Refactor-as-Save Specific

#### `test_persistence_single_version_per_save`
One save = one new version (not two).

```
1. Create new workflow
2. Get version count via API
3. Add data_input, save
4. Get version count via API
5. Assert: version count increased by exactly 1
```

#### `test_persistence_changelog_title_reflects_batch`
Batch title describes the actions.

```
1. Create new workflow
2. Add data_input
3. Set label "BatchTest" (blur + wait)
4. Save (one save batches both actions)
5. Open changelog panel
6. Assert: entry title contains relevant description (mentions both actions)
```

#### `test_persistence_fallback_when_disabled`
Without the flag, no changelog entries created.

**Note:** This test can't run in the same session if the flag is enabled. Either skip with `@pytest.mark.skip` and run separately, or verify via API only.

---

## 4. Test Count Summary

| Category | Count |
|----------|-------|
| Undo/redo across saves | 3 |
| Changelog panel | 5 |
| Action roundtrips | 8 |
| Refactor-as-save specific | 3 |
| **Total** | **19** |

**Recommended implementation order** (highest value first):
1. `test_persistence_changelog_entry_after_save` — verifies whole pipeline
2. `test_persistence_step_label_roundtrip` — verifies refactor-as-save persists data
3. `test_persistence_changelog_revert` — verifies revert flow
4. `test_persistence_undo_survives_save` — verifies key UX improvement
5. Fill in remaining tests incrementally

---

## 5. Unresolved Questions

1. **`resetStores()` in refactor path** — current `saveViaRefactor()` calls `_loadCurrent()` → `resetStores()` which clears undo stack. The "undo survives save" tests assume this changes. Prerequisite or red-to-green?
2. **Confirmation dialog selectors** — revert flow has up to 2 modals (unsaved changes + revert confirm). Are these standard `b-modal` instances? Need exact selectors.
3. **Changelog panel visibility assertion** — should we add a test that confirms the activity bar button IS visible when persistence enabled (and invisible when not)?
4. **External Galaxy instances** — `GALAXY_CONFIG_OVERRIDE_*` has no effect on pre-configured servers. Skip condition needed?
5. **Comment roundtrip reliability** — existing undo/redo comment tests have `HACK` sleep for slow CI. Same workaround needed here?
6. **Batch title format** — what exactly does `buildBatchTitle` produce? Need to check implementation for assertion format.
7. **Fallback test isolation** — `test_persistence_fallback_when_disabled` can't run with flag enabled. Separate file or skip?
