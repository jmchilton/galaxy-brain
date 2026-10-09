# galaxy#23849 - [26.1] Fix export include options switches not updating the wizards

- PR: https://github.com/galaxyproject/galaxy/pull/23849 (davelopez, base `release_26.1`)
- Head: `6e59756af4a`
- Reviewed: 2026-10-01
- Worktree: `~/projects/worktrees/galaxy/pr/23849`

## Summary

`ExportIncludeOptions` (added in c3f5a46400a, "Refactor export wizards for more shared code", shipped in v26.0.0) emitted `update:includeFiles` etc., while all three consumers listen with `@update:include-files`. Vue 2.7 does not normalize custom event names, so the listeners never fired. The switches flipped because each `BFormCheckbox` keeps its own local state, but the parent's `exportData` kept its defaults. The PR switches the child to kebab-case emits and adds a unit test.

Verified:
- Consumers: `HistoryExportWizard.vue:343-349`, `InvocationExportWizard.vue:484-491`, `ExportOnCompleteWizard.vue:122-128`. All three use kebab listeners, so all now fire. No other users of `ExportIncludeOptions`.
- The test fails red with the release_26.1 component (`includeFiles: true` received) and passes green with the PR.
- `dev` has the same camelCase emits and is still on Vue 2.7.16, so the bug is there too and this should merge forward cleanly. After the Vue 3 migration (#20787), either spelling works: Vue 3 compiles `@update:include-files` to `onUpdate:includeFiles`, and `emit` also tries the camelized handler key. So the fix is neutral for the migration.
- Fixing the child is the right side. The emits now match the convention of the sibling `ExportFormatSelector` (`update:model-value`), and three parents would otherwise need changing.

Severity: real data and privacy impact since 26.0. Turning off "Include Active Files" was silently ignored, so history and invocation exports, including exports to remote file sources, RDM and Zenodo, and scheduled export-on-complete, still bundled the dataset files. The hidden and deleted switches were also ignored, but that direction only leaves out data the user asked for. It is worth a line in the 26.0.x / 26.1 release notes.

**Verdict: approve.** One sibling bug from the same refactor is worth folding in (finding 1).

## Findings

1. **Medium - same bug in the sibling `ExportRemoteSourceSelector`: export-on-complete ignores the user's file name.**
   `client/src/components/Common/ExportRemoteSourceSelector.vue:29,70` emits `update:fileName`, but `client/src/components/Workflow/Run/ExportOnCompleteWizard.vue:117` listens with `@update:file-name`. As a result `fileName` stays `"galaxy-workflow-export"` (`ExportOnCompleteWizard.vue:33`), and `target_uri` (`:73`) always uses the default name, whatever the user typed. Clearing the field also fails to invalidate the step (`:60`). It comes from the same commit (c3f5a46400a). Fix: change both occurrences to `update:file-name`, matching this PR. A one-line test in the same style would cover it.

2. **Low/optional - the test copies the parent's template instead of using a real parent.**
   `ExportIncludeOptions.test.ts:10-26` reproduces the wizards' bindings by hand, so it can drift from them. `HistoryExportWizard.test.ts` already mounts the real wizard and even defines an unused `includeFilesCheckbox` selector (`:78`). A test there could flip the switch, submit, and check `wrapper.emitted("onExport")[0][0].includeFiles === false`. That would exercise the listener that actually broke and the data the export request is built from. The current test is acceptable: it does fail red before the fix. This is a suggestion, not a blocker.

## Sweep: camelCase emit vs kebab listener elsewhere in `client/src`

I checked every `emit("update:<camel>")` against `@update:<kebab>` listeners and against `.sync`. In Vue 2.6+, `.sync` registers both spellings, so it is safe.
- **Mismatch:** `ExportRemoteSourceSelector` `update:fileName` vs `ExportOnCompleteWizard` `@update:file-name` (finding 1).
- No other mismatches. The other camel emits (`slotItem`, `viewMode`, `selectedItems`, `readmeCurrent`, `nameCurrent`, `logoUrlCurrent`, `helpCurrent`, `annotationCurrent`) have camel listeners. `orderedEdit`, `displayRuleType`, `changedValue` and `includeDeleted` (`FolderTopBar` via `LibraryFolder.vue:7` `:include-deleted.sync`) are bound with `.sync`. The kebab listeners (`selected-item`, `expand-dataset`, `model-value`, `show-selection`, `active-node-id`, `operation-running`) all have kebab emitters.

## Draft review

_This review was posted by Claude (AI assistant) on behalf of jmchilton._

Thanks, this looks right to me. Fixing the child is the right call: it matches `ExportFormatSelector`'s `update:model-value`, all three wizards already listen with kebab case, and it will keep working after the Vue 3 migration. I confirmed the new test fails against the old component and passes with the fix.

The same refactor left one more instance of this bug. `ExportRemoteSourceSelector.vue` emits `update:fileName` (both in `defineEmits` and the `BFormInput` `@input`), but `ExportOnCompleteWizard.vue` listens with `@update:file-name`. So the file name the user types is dropped and export-on-complete always writes `galaxy-workflow-export.<ext>`. Clearing the field also doesn't invalidate the step. Could you switch it to `update:file-name` here too? I checked the rest of the client for camelCase emits paired with kebab-case listeners and this was the only other one.

Optional: `HistoryExportWizard.test.ts` already mounts the real wizard and defines an unused `includeFilesCheckbox` selector. A test there that unchecks the switch and checks `includeFiles: false` in the emitted `onExport` payload would cover the real parent wiring rather than a copy of it.

Since this shipped in 26.0, unchecking "Include Active Files" was silently ignored, including for exports to Zenodo/RDM and export-on-complete. That probably deserves a mention in the release notes.
