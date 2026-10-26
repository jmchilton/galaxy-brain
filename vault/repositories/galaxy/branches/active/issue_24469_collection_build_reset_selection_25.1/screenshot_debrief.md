# Screenshot debrief

Screenshots successfully obtained.

Captured with a temporary (uncommitted, deleted) Selenium test against a framework-started Galaxy: upload 2 fasta, select both, Auto Build List, create. "Before" used `SelectionOperations.vue` from `206d8cb3a59` with a rebuilt client; file restored and client rebuilt afterward (static/dist verified to contain the fix; worktree clean).

Existing `test_collection_builders.py` screenshots capture only the builder modal, not the post-build history panel, so no change to committed tests was needed for this.

| File | Shows |
|---|---|
| `screenshots/01_selected_before_build.png` | Two datasets selected in history panel before building |
| `screenshots/02_before_fix_after_build.png` | Before fix: after build, panel still in selection mode, header "2 of 1 selected", checkbox on new list |
| `screenshots/03_after_fix_after_build.png` | After fix: selection mode exited, no checkboxes or selection counter |

No problems recording.
