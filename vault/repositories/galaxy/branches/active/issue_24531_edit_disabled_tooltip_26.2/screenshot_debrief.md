Run via claude-opus-5-5 at default effort.

# Screenshot debrief

Screenshots successfully obtained.

Captured by hand with Playwright MCP against a fresh Galaxy (port 8123, scratch sqlite DB) on HEAD `e816c0542f0`. The client was built from that HEAD. No tracked source was edited and no E2E test was changed. The branch's Selenium coverage already asserts these tooltips, but it doesn't save screenshots.

| File | Shows |
|---|---|
| `screenshots/01_history_edit_disabled_tooltip.png` | Full viewport: history item with its pencil button disabled, hovered, showing "This dataset is not yet editable." |
| `screenshots/01b_history_edit_disabled_tooltip_crop.png` | Same, cropped to the history panel |
| `screenshots/02_workflow_card_run_disabled_tooltip.png` | Full viewport: workflow list with deleted workflows shown; the deleted workflow's Run button is hovered and shows "You cannot run a deleted workflow. Restore it first." |
| `screenshots/02b_workflow_card_run_disabled_tooltip_crop.png` | Same, cropped to the card |

## Notes / caveats
- Shot 1: no tool on a plain dev server could hold a dataset in the queued state. So a pasted upload (state `ok`) was used, and `page.route` rewrote `"state":"ok"` to `"queued"` in the history contents and dataset API responses. The component rendering is real: the button is disabled and the tooltip comes from GButton's `disabled-title`. Only the dataset state is mocked.
- Shot 2 is fully real: the workflow was created through the API, deleted, and shown with the "show deleted" filter. With the same hover, the Edit button's tooltip reads "You cannot edit a deleted workflow. Restore it first."
- The optional rule builder Finish shot was skipped.
