# Test challenges debrief — PR #24965

Reviewed commit: bd5821aac2059ce9c3757e8e6c7982c207684bb6 (base release_26.0)

## Tests in the PR
New `client/src/components/FilesDialog/FilesDialogRecursiveSelection.test.ts`, 3 Vitest tests mounting real `FilesDialog` against MSW (`useServerMock`) with a files-only recursive listing (object-store shape).

- "every level of a selected folder as selected": behavioral, drives real events, asserts row variants. Keep.
- "mixed after unselecting a folder below it": behavioral regression for the unselect-below path. Keep.
- "file the listing did not return": guards against the new subpath rule over-selecting leaves (`!directory.isLeaf`). Keep; uses `"success"` literal instead of `SELECTION_STATES.SELECTED` and a loose `> 0` count — tighten to the one omitted file (`filesOnly[0].uri`-derived id) being not SELECTED.

Mocks: MSW + `vi.mock("app")` / config — same pattern as `FilesDialog.test.ts`; no layout faking. No restructure needed.

## Challenges
- Separate file vs. existing `FilesDialog.test.ts`: the existing suite's static `paramsToKey` table can't express a files-only recursive listing without changing shared fixtures, so a new file is defensible. Option: add `filesOnly` recursive variant to `testingData.ts` and a describe block in `FilesDialog.test.ts`; minor.
- Red check not run: worktree has no `client/node_modules`. By reading, test 1 should fail on base (subdirectory row's id not in `selectedDirectories` when the recursive listing omits folders), test 2 likewise; test 3 likely passes on base (guard test). Coordinator/verifier should confirm.
- E2E: object-store-style listings (no intermediate folders) aren't available from the default posix test file sources, so a Selenium test would need a custom file source; Vitest with MSW is the right layer here. No E2E recommended.
