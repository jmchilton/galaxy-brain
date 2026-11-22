# Initial review — galaxy#24965

- Profile: default (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5, effort: low
- Reviewed commit: `bd5821aac2059ce9c3757e8e6c7982c207684bb6` (vs `origin/release_26.0`)

## Verdict

Small, well-targeted fix; approve after P2 1. Inheriting folder selection from a selected ancestor (folders only, never files) is the right minimal model for listings that skip intermediate folders, and the three new specs pass along with the existing `FilesDialog*.test.ts` specs (28/28 locally). One regression: select-all can no longer clear a folder that holds only folders under a selected folder.

## Findings

### P2 1 — select-all can't unselect a folder of empty folders below a selected folder

`onSelectAll` decides whether to unselect (non-paginated) from `selectionModel.value.pathExists(current.url)` alone, i.e. from selected *files*. The select-all icon, however, now comes from `checkIfAllSelected` → `isDirectorySelected`, which counts a folder as selected through an ancestor. When the current folder's subtree has no selected files (e.g. a posix source whose recursive listing returns only empty subfolders), the box shows SELECTED but clicking it takes the *select* path. Each subfolder then toggles off through `selectDirectoryRecursive`, the current folder gets pushed into `selectedDirectories`, and its subfolders count as selected again through it. The click changes nothing on screen. On `release_26.0` the same click clears the rows. Reproduced with a scratch spec in the PR's own harness, where the recursive listing returns only the `Directory` entries of `directory1RecursiveResponse`: click directory1, open directory1, then subdirectory1, then select all. Base ends with `default`/`default` and the PR with `success`/`success`.

This is also a sibling-path inconsistency. `selectDirectoryRecursive` already decides with `isDirectorySelected(record) || pathExists(record.url)`, so the select-all toggle should use the same condition.

Fix (verified: scratch case then ends `default`, and all 28 FilesDialog specs still pass):

```diff
     const isUnselectAll = isPaginated.value
         ? items.value.some(isRowSelected)
-        : selectionModel.value.pathExists(urlTracker.current.value.url);
+        : isDirectorySelected(urlTracker.current.value) || selectionModel.value.pathExists(urlTracker.current.value.url);
```

A spec for this should go in `FilesDialogRecursiveSelection.test.ts`, with the listing returning only folders.

### P3 1 — loose assertions in the new spec

- `should show a selected folder as mixed…`: `expect(row(subDirectoryId)._rowVariant).not.toBe(SELECTED)` also passes on MIXED. After the unselect the subfolder has no selected files and no selected folder above it, so assert `SELECTION_STATES.UNSELECTED`.
- `should not count a file the listing did not return…`: `toBeGreaterThan(0)` only says that some file is unselected. The test drops exactly `filesOnly[0]`, so assert that this file's row is `UNSELECTED` and that the other files are `SELECTED`. Also use `SELECTION_STATES.SELECTED` instead of the bare `"success"`; the rest of the file uses the constant. This also removes one of the forward-merge edits the PR body lists for dev.

### P3 2 — comment style on `isDirectorySelected`

The surrounding helpers use `/** … **/` doc comments. The new `//` line packs two clauses into one dense sentence. Something like `/** folder, or a folder below a selected one; files never inherit selection **/` reads better and states the `isLeaf` guard, which is the non-obvious part.

## Notes (not findings)

- Abstraction: directory selection still lives in an ad hoc `selectedDirectories` array next to the `Model` class, which only tracks files. Ancestor-aware "is this folder selected" belongs in `Model` (e.g. `Model.directoryCovered(item)`), with `unselectPath` next to it. That's too big for a release-branch fix but worth a follow-up on dev, since three call sites now duplicate that logic.
- The PR's "Not verified" bullet (a fully selected sibling showing MIXED after one subfolder is unselected) follows from dropping ancestors in `unselectPath`. It is accepted and has no effect on what OK returns.
- Cost: `isDirectorySelected` is now O(rows × selectedDirectories) with string ops. On object stores, where the listing skips folders, `selectedDirectories` stays small. Not a concern.
