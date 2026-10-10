# Debrief: files_dialog_directory_ok_label

## Research

- Source: BUGS_FOUND row (play lane, FilesDialog): `okButtonText` default `"Select"` makes the `fileMode ? "Select" : "Select this folder"` fallback dead.
- dev sha: `20f365a2654` (fresh `origin/dev`).
- Scratch worktree: `/private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-brain-vault-agents-gx-issues/8085a6b3-fc13-41f7-b964-fa636a69fe53/scratchpad/E/wt` (red test left applied in `client/src/components/FilesDialog/FilesDialog.test.ts`, uncommitted).
- Repro: new test in the existing `FilesDialog, directory mode` describe block, using the real `FilesDialog` + `SelectionDialog` and the existing msw harness. Red on dev: `expected 'Select' to be 'Select this folder'`. 15 other tests in the file pass.
- Fix check: temporarily set `okButtonText: undefined` -> the red test goes green; `src/components/{FilesDialog,SelectionDialog,DataDialog,Markdown}` = 23 files / 153 tests pass. Fix reverted.
- Callers audited (OK button renders only when `multiple || !fileMode`):
  - `FilesDialog` directory mode: "Select" -> "Select this folder" (the intended change).
  - `FilesDialog` multiple file mode, `DataDialog` (multiple, default fileMode): "Select" before and after.
  - `HistoryDatasetPicker`: passes its own `actionButtonText` (default "Select"). Unchanged.
  - `BasicSelectionDialog`, `DatasetCollectionDialog` (used by `MarkdownDialog`) and single-select `FilesDialog`: no OK button.
  - `WorkflowList`/`HistoryList` match only `TagsSelectionDialog`, a different component.
  - No Selenium/Playwright selector or test asserts on the label text. `navigation.yml` uses `data-description="selection dialog ok"`.
- Directory-mode entry points: `FormDirectory.vue` (tool `directory_uri` input) and `FilesInput mode="directory"` in `ExportForm` (history export to remote file, archive export), `ExportRemoteSourceSelector` (history/invocation export wizards, ExportOnComplete), `RDMDestinationSelector`, and collection wizard `SelectFolder`.
- Origin: `git log -S` -> commit `5101d0fffa3` (2024-07-09), merged via #18518 "Replace History Dataset Picker in Library Folder" (milestone 24.2). It added the `okButtonText` prop with default `"Select"` and the computed in the same commit, so the fallback has been dead since it was written. Before that, the template had `{{ fileMode ? "Ok" : "Select this folder" }}` (from #17802, 24.1). The label itself dates to #12641 (21.09, "Fix ambiguity in remote file upload", for #12635).
- Side note: #18518 also changed the multiple-file-mode label from "Ok" to "Select". That looks intentional and the proposal keeps it.
- Duplicates: `gh search issues|prs` for "Select this folder", "SelectionDialog okButtonText", "directory picker select folder button", "FilesDialog select folder". Only historic hits: #15057 (Safari URI, unrelated) and #12641 (the origin of the label). No open duplicate.
- Not verified: browser rendering. The vitest asserts button text only, which is the button's whole accessible name here, since the icon is decorative.
- Size: a one-line fix. It could ship as a fix-only PR (default removed plus the one vitest) without an issue. Drafted anyway as asked.

## Review round (subagent)

- Repro rerun, still red on dev 20f365a2654. The fix check passes 23 files / 153 tests and was reverted.
- Fixed a wrong claim: the fix also changes `FilesDialog` `mode="source"` (the RDM repository picker, `RDMDestinationSelector.vue`), because `fileMode` is true only for `mode="file"`. Source mode goes back to its pre-24.2 label, "Select this folder". Added a table row, an approach note and the trade-off to the alternatives.
- Checked that the file-mode "Ok" → "Select" change in #18518 looks deliberate: it matches `HistoryDatasetPicker`'s "Select" default.

## Leftover

- Decide whether "Select this folder" is acceptable wording in source mode, where the user picks a repository. If it isn't, the alternative (`FilesDialog` passes a label for each mode) should become the proposed approach.
- One-line fix; could ship fix-only without an issue.
