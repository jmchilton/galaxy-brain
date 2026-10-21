# Stories and play infrastructure consumer-colocation audit

Read-only audit of stories infrastructure `c6d6582233d063b7713a0e3b2fb1b3ed731f7f54` against lane head `1a4eb0e275cfaa60b1112c554232d1c4e369dc8c`, and play infrastructure `89f73896cedbb7072b0cfa4aa741e3633e7b5cf9` against lane head `23418c7619409a91dccb5f01ac65433840d26f2e`. No source, branch, remote, or PR changes performed.

## Finding

Both opening commits bundled conversion support with framework infrastructure. Stories has **41 fixture/helper paths among 59 paths** (33 component-scoped, eight shared test-data paths). Play has **three helper paths among nine**. Path counts describe touched paths, not wholly new files; existing modules need export-level splitting.

Keep all three lane branches complete. Move support into existing conversion commits, without creating domain branches or PRs. Preserve final tree identity.

## Genuine framework setup

Stories retains the following 18 paths. The generic composed-story mounting API can remain intact: it is one framework integration surface, already consumed by the opening GDropdownItem example. Incrementally introducing every optional mount property would complicate the implementation without moving domain behavior out of infrastructure. This is distinct from unused component data and assertion helpers.

- `.gitignore`
- `.pre-commit-config.yaml.sample`
- `client/.prettierignore`
- `client/.storybook/main.ts`
- `client/.storybook/msw.ts`
- `client/.storybook/preview.ts`
- `client/.storybook/public/mockServiceWorker.js`
- `client/.storybook/viteConfig.ts`
- `client/package.json`
- `client/pnpm-lock.yaml`
- `client/src/api/client/__mocks__/http.ts`
- `client/src/api/client/__mocks__/index.ts`
- `client/tests/vitest/stories.ts`
- `client/tsconfig.json`
- `client/types/msw-storybook-addon.d.ts`
- `client/types/vite.d.ts`
- `client/vitest.config.mts`
- `client/vitest.storybook.config.mts`

`tests/vitest/stories.ts` integrates story parameters/MSW handlers, real Pinia actions, Vue test mounting, app plugins, lifecycle cleanup and story-specific overrides. `StoryOf`, `StoryMountOptions`, and `useStoryMount` are imported by the opening example; 101 final story-lane test files import this module. If the requirement extends to exercising every option, specific `instrumentLocalization`, router, global and attachTo usage could be introduced alongside their consumers, but this is not needed to remove the domain support bundled here.

The browser-safe MSW split belongs in setup. `http`, request-ID stamping, `GALAXY_RESPONSE_HEADERS`, and `missingHandlerResponse` are shared by the node server and service worker. `configurationHandler` is used immediately by `appHandlers.configuration`; `appHandlers` is consumed by the preview and mount helper. They are not unused up-front API. The index refactor also adds listening-scope reference counting and moves creation of the typed HTTP registry to module initialization: these are real lifecycle changes, not merely file relocation, and need validation through the example and existing mock tests.

The play commit keeps addon registration, strict body-context WCAG 2.2 checks, viewport presets, package/lock changes, and general reviewing/accessibility README. The sixth remaining path, `A11Y_AUDIT.md`, is historical catalog evidence rather than framework implementation: keep its generic policy in README, and move the unchanged historical audit document to an existing later conversion commit after the relevant exception annotations exist (or add its sections alongside their owning conversions). Do not lose the historical results or change strictness.

## Conversion-owned stories support

The inventory JSON records added exports and direct importing consumers. Assign every added export to its first actual consuming conversion, pull internal dependencies to that same commit, and add later exports only when first used. Existing unchanged exports remain in the base. Follow fixture-to-fixture import chains transitively; raw first-direct-import candidates alone are not sufficient.

| Path | Direct importing paths | Example consumer |
| --- | ---: | --- |
| `client/src/components/ActivityBar/test_fixtures.ts` | 3 | `client/src/components/ActivityBar/ActivityBar.stories.ts` |
| `client/src/components/Collections/test-utils.ts` | 3 | `client/src/components/Collections/ListCollectionCreator.test.ts` |
| `client/src/components/Collections/test_fixtures.ts` | 3 | `client/src/components/Collections/ListCollectionCreator.stories.ts` |
| `client/src/components/Dataset/test_fixtures.ts` | 2 | `client/src/components/Dataset/DatasetCopy.stories.ts` |
| `client/src/components/DatasetInformation/test_fixtures.ts` | 1 | `client/src/components/DatasetInformation/DatasetDetails.stories.ts` |
| `client/src/components/Datatypes/test_fixtures.ts` | 18 | `client/src/components/Form/Elements/FormData/FormData.stories.ts` |
| `client/src/components/GalaxyAI/test_fixtures.ts` | 4 | `client/src/components/GalaxyAI.stories.ts` |
| `client/src/components/History/Content/Collection/test_fixtures.ts` | 2 | `client/src/components/History/Content/Collection/CollectionProgress.stories.ts` |
| `client/src/components/History/CurrentHistory/HistoryOperations/test_fixtures.ts` | 2 | `client/src/components/History/CurrentHistory/HistoryOperations/SelectionOperations.stories.ts` |
| `client/src/components/History/test_fixtures.ts` | 1 | `client/src/components/History/HistoryOptions.stories.ts` |
| `client/src/components/HistoryExport/test_fixtures.ts` | 2 | `client/src/components/HistoryExport/ToLink.stories.ts` |
| `client/src/components/InteractiveTools/test_fixtures.ts` | 2 | `client/src/components/InteractiveTools/InteractiveTools.stories.ts` |
| `client/src/components/Markdown/test_fixtures.ts` | 1 | `client/src/components/Markdown/Editor/TextEditor.stories.ts` |
| `client/src/components/Notifications/Broadcasts/test_fixtures.ts` | 4 | `client/src/components/Notifications/Broadcasts/BroadcastsOverlay.stories.ts` |
| `client/src/components/ObjectStore/Instances/test_fixtures.ts` | 1 | `client/src/components/ObjectStore/Instances/InstanceDropdown.stories.ts` |
| `client/src/components/ObjectStore/mockServices.ts` | 6 | `client/src/components/Common/FilterMenu.test.ts` |
| `client/src/components/ObjectStore/test_fixtures.ts` | 5 | `client/src/components/DatasetInformation/DatasetDetails.stories.ts` |
| `client/src/components/Page/test_fixtures.ts` | 2 | `client/src/components/Page/PageView.stories.ts` |
| `client/src/components/PageEditor/testData.ts` | 5 | `client/src/components/PageEditor/HistoryPageList.stories.ts` |
| `client/src/components/Panels/Upload/test_fixtures.ts` | 2 | `client/src/components/Panels/Upload/UploadMethodViewInline.stories.ts` |
| `client/src/components/Panels/test_fixtures.ts` | 12 | `client/src/components/ActivityBar/ActivityBar.stories.ts` |
| `client/src/components/SelectionField/test_fixtures.ts` | 8 | `client/src/components/DatasetInformation/DatasetAttributes.stories.ts` |
| `client/src/components/Tool/test_fixtures.ts` | 1 | `client/src/components/Tool/ToolSuccess.stories.ts` |
| `client/src/components/ToolRecommendation/test_fixtures.ts` | 2 | `client/src/components/Tool/ToolSuccess.stories.ts` |
| `client/src/components/ToolsList/test_fixtures.ts` | 1 | `client/src/components/ToolsList/ToolsList.stories.ts` |
| `client/src/components/Toolshed/test_fixtures.ts` | 3 | `client/src/components/Toolshed/InstalledList/Index.stories.ts` |
| `client/src/components/Tour/test_fixtures.ts` | 2 | `client/src/components/Tour/TourList.stories.ts` |
| `client/src/components/Workflow/Editor/Comments/test_fixtures.ts` | 2 | `client/src/components/Workflow/Editor/Comments/WorkflowComment.stories.ts` |
| `client/src/components/Workflow/Editor/node_test_fixtures.ts` | 2 | `client/src/components/Workflow/Editor/Node.stories.ts` |
| `client/src/components/Workflow/Editor/test_fixtures.ts` | 13 | `client/src/components/Workflow/Editor/Comments/WorkflowComment.stories.ts` |
| `client/src/components/Workflow/test_fixtures.ts` | 6 | `client/src/components/Workflow/List/CuratedWorkflowCard.stories.ts` |
| `client/src/components/WorkflowInvocationState/test_fixtures.ts` | 7 | `client/src/components/Workflow/Invocation/Graph/WorkflowInvocationSteps.stories.ts` |
| `client/src/components/admin/test_fixtures.ts` | 8 | `client/src/components/admin/GroupForm.stories.ts` |
| `client/tests/test-data/config.ts` | 5 | `client/src/components/Panels/ToolBox.stories.ts` |
| `client/tests/test-data/currentHistory.ts` | 8 | `client/src/components/Dataset/DatasetCopy.stories.ts` |
| `client/tests/test-data/currentUser.ts` | 28 | `client/src/components/CommandPalette/CommandPalette.stories.ts` |
| `client/tests/test-data/datasets.ts` | 17 | `client/src/components/Collections/ListCollectionCreator.stories.ts` |
| `client/tests/test-data/galaxyInstance.ts` | 2 | `client/src/components/Toolshed/InstalledList/Index.stories.ts` |
| `client/tests/test-data/toasts.ts` | 7 | `client/src/components/Common/SaveChangesModal.stories.ts` |
| `client/tests/test-data/tools.ts` | 12 | `client/src/components/Tool/ToolForm.stories.ts` |
| `client/tests/test-data/withModel.ts` | 7 | `client/src/components/Common/DelayedInput.stories.ts` |

Examples of paths needing partial, rather than whole-file, movement:

- `PageEditor/testData.ts` already has page summary fixtures. Its added notebook history, revisions and section content belong with their distinct first users; preserve original summary exports in the base.
- `Workflow/Editor/test_fixtures.ts` already has step utilities. Only the new `withWorkflowStores` decorator moves to its first consuming conversion.
- `ObjectStore/mockServices.ts` extracts its store list into `ObjectStore/test_fixtures.ts`; move that extraction with the first conversion using the shared list. Existing mock consumers should continue working before then.
- `tests/test-data/datasets.ts` adds `getFakeDatasetDetails`; existing `getFakeDatasetSummary` stays put.
- `Collections/test-utils.ts/changeHistory` is a specific polling harness interaction, not framework setup. Its first owning collection conversion brings it in.

## Play support ownership

| Support | Existing first consumer commit | Note |
| --- | --- | --- |
| `multiselect.ts`: `expectOptions`, `pickOption`, `openOptions` | `f8424a9117238412c16bb44d3ab3324c9a7f44de` / `FormSelect.test.js` | FormSelection imports the first two. They internally call `openOptions`, so bring all three here even though the first direct `openOptions` import is FormData later. |
| `text.ts`: `exactly` | `efa1c4d5ebec007536a6e122d11b780f6bc562bc` / `WorkflowAnnotation.test.ts` | Assertion matcher, not framework integration. |
| `toasts.ts`: `seeToasts` | `335a97db4301b2c5f539006abb0f17f25b27be2c` / `PairCollectionCreator.test.ts` | Existing `NOTIFICATIONS` and `withToasts` belong to stories conversions. Add only new play import/assertion function here. |

These helpers contain actual assertion behavior: exact text checks, ordered options/selection, toast count/text, and a known-bug selection alternative. Keep those bodies unchanged and validate their consuming plays; moving them must not weaken assertions.

## Limits and checks for implementation

The JSON uses final-tree import identifier matching to identify candidates. It does not establish that an import was introduced in the first commit touching that consumer or resolve barrel exports automatically. Use actual commit patches for ownership and resolve dependency cycles before constructing replacement commits. All inventoried support modules have direct consumers; “shared” does not imply “belongs in the opening commit.”

Require an import/dependency check at each rewritten intermediate commit, preserve opening infrastructure then one example then remaining conversions, compare each final lane tree with its frozen original, run the opening examples plus the first helper-consuming suites/plays, and run appropriate type/style checks. A final-tree match does not prove intermediate commits build. Preserve known accessibility failures and exceptions rather than editing application behavior for this reorganization.
