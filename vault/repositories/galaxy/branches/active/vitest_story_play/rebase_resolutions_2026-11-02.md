# Stories + play lane onto restack/readability — 2026-11-02

`git rebase -i --onto restack/readability vitest_readability restack/fold` ran in the scratch worktree `_restack_fold`, with hooks off and rerere on.

- **Dropped:** the 3 commits already in the base: `081038d58b9` infra, `fe89c8cf8f7` GDropdownItem and `24cfaa48e4a` HistoryExportWizard.
- **Monaco exec:** `monaco.sh` ran after ToolSourceDisplay.
- **Edit pass:** one later pass from `restack/combined` edited 3 commits and folded in the gate fixes listed below.
- **Result:** `restack/combined` = `f43eeb9477f`, 99 commits on `restack/readability` `a54dfb1b450`. Not pushed.
- **Metadata:** author, email, date and full message of all 99 commits are byte-identical to the lane minus the 3 drops (md5 of the formatted log matches).
- **Replays:** start from `restack/combined`. Rerere records only the conflicted files, so replaying from `restack/fold` would lose:
  - the stories edits in FilesDialog, InstallationSettings, Popper, DatasetDetails and WorkflowInvocationOverview;
  - the new `WorkflowInvocationStepsPolling.test.ts`;
  - the 4 gate-fix amends.

`client/package.json` and the lockfile differ at the new base (rxjs removed, happy-dom 21), so `node_modules` was reinstalled with `--frozen-lockfile` and `scripts/build.mjs` rerun before any test.

## Judgment calls

- **WorkflowInvocationSteps:** dev's new "step header follows the polled stepsJobsSummary prop" test depends on file-wide `vi.mock`s of workflowStore, invocationStore and friends. Those mocks would break the lane's MSW and story-based error test in the same file.
  - The test moved verbatim to a new `WorkflowInvocationStepsPolling.test.ts`, following dev's `FilesDialogPagination.test.ts` naming.
  - Dev's mocked copy of the graph-error test was dropped there, because the lane's story test covers the same error.
- **DatasetAttributes:** the base file contains "shows why saving failed" twice, byte-identical, which looks like a release-merge artifact. The lane file keeps one copy. No assertion is lost.
- **DatasetDetails:** dev's two new MSW tests moved into the existing plays instead of unit tests, because the lane's unit file mocks `fetchDatasetDetails`.
  - Dev's first test ("shows the dataset, its job and its peek") became an addition to `CompletedDataset`: the "Job Execution Details" heading shows and there is no "Job Not Found".
  - Dev's second test ("explains a dataset without a creating job") became an addition to `NoRecordedJob`: no "Job Execution Details" heading.
  - Dev's `.DatasetInformation` "size 100" stub check is covered by `readDataset`, which reads the dataset-name cell rendered by DatasetInformation.
- **FilesDialog:** the new RDM play opens the dataset record. The story mocks gained an empty listing for `rdmDatasetId`. Without it the request returns a 500 and the error alert shows. Dev's unit test ignored that error.
- **PermissionsInputField:** dev's stale-search test used a `Services` module mock, which would replace the story's MSW. The port lets the story answer the initial load and asserts the story's 3 roles. A deferred MSW handler then answers the "b" and "bob" searches out of order. The initial request is answered before `server.use` can take effect, so it can't be held.
  - Red-checked: with the component guard removed, the test fails as expected.
- **InstallationSettings:** dev seeded `install_resolver_dependencies=false` so that swapped checkbox bindings would fail (`ae0829dd8eb`). The lane's all-on and all-off stories can't catch a swap, so a new `ChecksEachConfiguredDependency` story was added (resolver off, the others on), with a per-option play. Dev's labelled-checkbox install test mounts it.
- **ChangePassword:** dev's behavior change, the same one the readability rebase handled. Success now calls `window.location.replace(withPrefix("/"))`.
  - The router assertions became a `stubPageReload()` spy with `toHaveBeenCalledExactlyOnceWith("/")`.
  - The refusal case asserts `reload` was not called.
  - No play submits successfully, so the browser page never navigates away.

## Conflicts (commit → resolution)

- `2eca466a382` FilesDialog: dev added RDM support: a "My Dataverse" source, `include_kind=rdm` plugin queries, a dataverse listing, a rate-limiter mock and 2 directory-mode tests.
  - Stories: `sourcesHandler()` filters `include_kind=rdm` (it is also used by `NonRecursiveFileSource`). The dataverse and record listings were added, and `SOURCES` gained "My Dataverse".
  - The new `SelectsRdmRecordNotRepositoryRoot` play checks Select disabled, then the `status` hint text, then the record is selectable with no hint and no alert.
  - Unit: kept the rate-limiter mock. The "RDM added after open" test is ported onto `stories.Directories`, registering an override after mount. It is strengthened to assert that the first root listing lacks the RDM source.
  - Results: unit 14 (3 files incl. Pagination) and stories 16 pass.
- `7aeb66e6cee` InstallationSettings: dev added the radio-group install test and the labelled-checkbox install test.
  - Both are ported onto `SeveralToolConfigs` and the new `ChecksEachConfiguredDependency` (see judgment calls). The radio values follow the story's configs.
  - Results: unit 9, stories 6 pass.
- `a83c6b954ee` GButton: dev added a "pressed" suite.
  - It is ported onto `stories.Default` and `stories.InternalLink` (with `createMemoryRouter()`).
  - The late `aria-expanded` case mounts a parent directly, because a composed story remounts on new args.
  - Results: unit 21, stories 10 pass.
- `cef352ede7c` WorkflowInvocationState: dev removed the overview's `invocationAndJobTerminal` prop. `overviewTerminalState()` became `isInvocationAndJobTerminal()`: the overview is rendered and has no `[data-description='cancel invocation button']`. The stories are full-page, so the navigation renders.
  - Results: unit 11, stories 7 pass. The `ResizeObserver loop` console noise comes from dev's tab-height observer and is benign.
- `68f9bdf499c` PermissionsInputField: dev added the stale-search test (see judgment calls).
  - Results: unit 2 (+3 in dev's `.test.ts`), stories 2 pass.
- `3a791be25e7` ChangePassword: reload behavior (see judgment calls).
  - Results: unit 5, stories 4 pass.
- `fc5a5e59229` WorkflowInvocationOverview: took the lane test. The removed `invocationAndJobTerminal` prop was dropped from the stories' meta `args`.
  - Results: unit 3, stories 2 pass.
- `67a784f3f28` FormTool, and later `bccb4133c57` FormInputCollection, conflicted on `Editor/test_fixtures.ts`: imports only. The fix keeps dev's `Step` type import alongside the lane's Decorator and `provideScopedWorkflowStores` imports.
  - Results: FormTool unit 4 and FormInputCollection unit 3 pass. Their stories fail a11y only, matching the baseline.
- `ea6fcda5db8` DatasetAttributes: took the lane file, which already has dev's "shows why saving failed" (see judgment calls).
  - Results: unit 2, stories 7 pass.
- `55d1e4f7bbc` WorkflowInvocationSteps: the lane file is kept and dev's polling test was split out (see judgment calls).
  - Results: unit 4 across 3 files, stories 3 pass.
- `a759fd433e4` SelectionOperations: dev added 3 "Collection Building" tests. They are ported onto `stories.DatasetSelected` with 2 `visibleDatasets`; the query-selection case mounts with `isQuerySelection`/`selectionSize` instead of `setProps`.
  - The creator modal lists history contents, so that request is answered (`/api/histories/{history_id}/contents`).
  - Results: unit 23, stories 11 pass.
- `ba79f14f70f` Popper: dev made close a native `<button aria-label="Close">` and added 8 focus and Escape tests.
  - The tests are ported onto the lane's story `mountPopper`/`mountPlainPopper`; external-reference cases mount `Popper.vue` directly.
  - The `ClosesDetails` play now clicks `getByRole("button", { name: "Close" })` instead of the title's sibling, and the stale "no accessible name" comment is gone.
  - Results: unit 15, stories 8 pass.
- `7ceb6253637` BroadcastsOverlay: dev added a `getAppRoot` mock and 3 action-link target tests. These are ported into the story-mounted file with `broadcastWithActionLink` and a `beforeEach` reset.
  - Results: unit 11, stories 4 pass.
- `2ef61625bae` DatasetDetails: dev rebuilt the unit file on MSW and added 2 tests. The lane unit file is kept, and dev's assertions moved into the plays (see judgment calls). The stories fail a11y only, matching the baseline.
  - Result: unit 12 across the directory.

## Gate fixes (no textual conflict; folded into the owning commit)

- `caa1b3ad798` broadcast form stories: dev made `ActionLink.target` required, which caused a type-check error. The lane's fixture link gained `target: "_self"`, dev's own default in `test.utils.ts`.
- `e7f4f8708e7` FormDrilldown: dev's 6 auto-merged tests called the removed `mountDrilldown({ multiple, value })`.
  - They are ported onto `stories.NothingSelected` and `stories.SingleChoice` through `mountDrilldown(story, props)`, using the stories' taxonomy tree. The tree has the same shape as dev's a/aa/ab/aba/b/ba.
  - Result: 10 pass.
- `2d50bbb6371` ChatInput: dev's 5 auto-merged tests called `unmount()` and `setProps()` on a story child wrapper.
  - The busy-resume test uses the lane's live mount (`mountInput(props, undefined, true)`).
  - Manual `unmount()` calls were dropped; auto-unmount covers them.
  - Result: 18 pass.
- `0eac5fee812` HistoryExport/Index stories: dev's directory-mode FilesDialog now also asks for `include_kind=rdm`. The story answered that query with the POSIX repository, which made its root unselectable, so `ChoosesRepositoryDestination` failed.
  - The handler now answers `[]` for `include_kind=rdm`. The browser run showed this as the only new failing story.
- Auto-merged context only, green as is: HistoryImport (dev's radio-group test is in the lane's shared-wrapper `describe`) and ToolSuccess (imports).

## Gates (tip `f43eeb9477f`)

1. **Ancestry:** 99 commits, based on `restack/readability`.
2. **`pnpm type-check`:** pass. The first run found the broadcast `target` error, fixed above.
3. **`pnpm test`:** 672 files, 5,802 passed, 1 skipped, 0 failed.
   - Fewer than the readability base's 676/5,995, because the lane moves cases into plays and deletes unit files.
   - The first run had 11 failures (6 FormDrilldown, 5 ChatInput), fixed above.
4. **`pnpm test:browser`:** 585 stories (+2 new: the FilesDialog RDM play and the InstallationSettings mixed-config play).
   - **Pre-fix run:** 127 failed. One new failure, HistoryExport `Chooses Repository Destination`, fixed above.
   - **Final tip, run 2:** 131 failed. Three new failures were not in the pre-fix run: ToolsList `Collection Tools From Legacy Link` and `Tool Catalog` (a11y on the same card header) and ListCollectionCreator `Drops Deleted Dataset` (play: the listing was empty).
   - **Final tip, run 3:** 128 failed, 0 new vs the baseline.
   - Those files pass in isolation (ListCollectionCreator 3/3; ToolsList a11y failures rotate between stories). They are flaky under suite load, are not touched by any resolution, and are in files already flaky in the baseline. No new failures.
   - **Failure reasons:** in each run, every failing story except the flakes above fails on `toHaveNoViolations` (a11y after the play passed). So no play failure hides behind a baseline name. The baseline list had no reasons to compare against.
   - **Fixed by rebase (failing in the baseline, passing in both final-tip runs; each confirmed ✓ by name in a verbose rerun):** 23 stories.
     - GDropdownItem ×3: Action, Disabled Download, External Download.
     - GalaxyAI ×7: Answers Question, Explains Gateway Timeout, Explains Session Expired, Gateway Timeout, New Conversation, Prefilled Compact Conversation, Session Expired.
     - ChatInput ×12, i.e. all of its stories.
     - HistoryPageList: Other Users History.
     - Flaky either way: UserRolesGroupsForm Edits Memberships, and ListCollectionCreator Drops Failed Dataset and Keeps List On Refresh.
5. **`git range-diff vitest_readability..restack/fold restack/readability..restack/combined`:**
   - 77 `=`, 22 `!`, 3 `<`. The 3 `<` are exactly the dropped infra, GDropdownItem and HistoryExportWizard.
   - The 22 `!` are 15 conflict resolutions, the ToolSourceDisplay Monaco re-add, 4 gate fixes (FormDrilldown, ChatInput, HistoryExport/Index, broadcast form) and 2 auto-merge context shifts (HistoryImport, ToolSuccess).
6. **Prettier:** `--check` passes on every hand-edited file.
