# Split into per-test commits

Ran [REBASE_READABILITY.md](../../../../../projects/just_jesting_around/REBASE_READABILITY.md) on 2026-10-09. `SOURCE_TIP` was `e82e4f7718ce86e06a5d174f16a4e5ec76f0bc34`, and backup branch `backup/jest_readability_batch_01-pre-split-e82e4f7` (local only) points at it. The split branch is `vitest_readability`, in worktree `~/projects/worktrees/galaxy/branch/vitest_readability`, pushed to the `jmchilton` fork at `150b60992437affed49dd1b55ba5bc18cea0a2a8`. The source branch, its worktree and PR #24015 are untouched.

186 commits sit on base `df3932ed4ba`. The split tip's tree (`fe8dd1a6270`) is byte-identical to `SOURCE_TIP`'s tree, and every iteration's tree matched its iteration commit. No plan was corrected, so `vue-tsc` was not re-run.

## Iterations

| Iter | Commits | Originator | Shared | Supporting-only | Docs | Last commit |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 01 | 6 | 5 | 0 | 0 | 1 | `ed22488a8da` |
| 02 | 7 | 5 | 2 | 0 | 0 | `e7b7269d82a` |
| 03 | 7 | 5 | 2 | 0 | 0 | `7ca124d9cf7` |
| 04 | 13 | 10 | 3 | 0 | 0 | `f1c6cbba1fe` |
| 05 | 23 | 20 | 3 | 0 | 0 | `752b8a37343` |
| 06 | 6 | 5 | 1 | 0 | 0 | `ad6d0a683ab` |
| 07 | 10 | 10 | 0 | 0 | 0 | `ba1efe5a024` |
| 08 | 12 | 10 | 2 | 0 | 0 | `4c09f7f55b7` |
| 09 | 11 | 10 | 1 | 0 | 0 | `5e6d54a0135` |
| 10 | 11 | 10 | 1 | 0 | 0 | `6fe1f24296b` |
| 11 | 16 | 15 | 0 | 0 | 1 | `8fd63fac7df` |
| 12 | 15 | 15 | 0 | 0 | 0 | `cd2c87543e3` |
| 13 | 16 | 15 | 0 | 1 | 0 | `61152ca732d` |
| 14 | 11 | 10 | 1 | 0 | 0 | `bb3eaf7fcdc` |
| 15 | 11 | 10 | 1 | 0 | 0 | `f50f337b306` |
| 16 | 11 | 10 | 1 | 0 | 0 | `150b6099243` |
| **Total** | **186** | **165** | **18** | **1** | **2** | |

The 165 originator commits match the ledger's 165 of 396 reviewed. A shared commit holds one helper together with the supporting tests that adopted it in that iteration.

## Files that needed judgment

- **`client/README.md`, iteration 01:** that manifest has no `documentation_files`. It went in the docs commit, last.
- **Helpers with one selected consumer plus supporting consumers** (most iterations from 03 on): these got shared commits instead of being folded into the originator. The "helper used by only one originator" rule never applied, because every changed helper had at least two consumers.
- **`HistoryArchiveExportSelector.test.ts`, iteration 13:** a supporting follow-through from the HistoryArchiveWizard review, with no helper change. It got its own commit, placed after HistoryArchiveWizard.
- **`PageEditor/testData.ts`, iteration 14:** the only changed consumer is PageCard, but the unchanged `HistoryPageList.test.ts` imports it too, and the manifest lists HistoryPageList as supporting. So it got its own shared commit, and HistoryPageList passes at that commit (11/11).
- **`tests/test-data/index.ts`, iteration 15:** consumers import the barrel as `@tests/test-data`. It went in a shared commit with `api/index.test.ts`, ahead of HistoryCounter and SwitchToHistoryLink.

## Tests with commits in more than one iteration

Each of these has two commits, which breaks the "one commit per test file per lane" invariant in [PIPELINE_BRANCHES.md](../../../../../projects/just_jesting_around/PIPELINE_BRANCHES.md#invariants):

| Test | Iterations |
| --- | --- |
| `api/index.test.ts` | 04, 15 |
| `History/model/queries.test.ts` | 04, 13 |
| `Notifications/NotificationCard.test.ts` | 02, 03 |
| `Panels/Common/ToolSection.test.ts` | 02, 05 |
| `Cleanup/CleanupOperationSummary.test.ts` | 03, 09 |
| `Cleanup/ReviewCleanupDialog.test.ts` | 03, 09 |
| `stores/datasetCollectionStore.test.ts` | 05, 11 |
| `stores/historyStore.test.ts` | 07, 08 |
| `stores/pageEditorStore.test.ts` | 01, 02 |
| Tool Shed `MetadataInspector/OverviewTab.test.ts` | 05, 10 |

`client/README.md` also spans iterations 01 and 11.

## Verification

For each iteration:
- the tree at the iteration's last commit equals the iteration commit's tree
- every changed file lands in exactly one commit
- every commit's `Test-File` trailers match its test files, and `Readability-Iteration` and `Co-Authored-By` are present
- each originator has exactly one commit, containing only that test file
- a static check confirms each helper commit comes before the tests in that iteration that import it

That static check was added after iteration 09 and re-run on 01–08; all clean.

At every commit with test files, each of those files was run alone with vitest (`NODE_OPTIONS=--no-webstorage`). Shared commits' supporting tests were included, not just originators. **191 runs, 2,289 cases, 0 failures.** Per-commit results are in the appendix.

## Haiku as the splitter

- **Plan corrections: 0 of 16.** Every grouping matched what I mapped from the imports before launch. No file was misattributed, hooks never rewrote content, and I never had to take over.
- **Process incidents (no effect on the result):**
  - Iteration 04: two commit-loop attempts failed before any commit was made (shell quoting, then `mapfile` under zsh). The second ran `git checkout <commit> --` with no paths and detached HEAD. Haiku recovered by itself.
  - Iteration 04: the report swapped two shared-commit SHAs.
  - Iteration 09: the report listed the log newest-first, so the order looked like helper-after-consumer. It wasn't.
- **Prompt changes:** a zsh/no-`mapfile` warning after iteration 04, and a required oldest-first `git log --reverse` after iteration 09.
- **Cost:** about 50–70k tokens and 1.3–3.5 minutes per iteration.
- **Verdict:** Haiku is reliable for mechanical file-level splitting, given a precise packet and an orchestrator that checks the git state rather than trusting the report. Its reports were wrong twice; its commits never were.

## Appendix: per-commit results

Cases are counted per test file in the commit; `—` means the commit has no test files.

| Iter | Commit | Subject | Cases |
| --- | --- | --- | ---: |
| 01 | `01b4d14ec38` | Improve readability of VisualizationExamples tests | 7 |
| 01 | `03f066fe6dd` | Improve readability of markdown tests | 3 |
| 01 | `d12dd1f2a7e` | Improve readability of pageEditorStore tests | 71 |
| 01 | `4524d8e7511` | Improve readability of parseBool tests | 13 |
| 01 | `b1e6485f46d` | Improve readability of serverMock tests | 4 |
| 01 | `ed22488a8da` | Document readability guidance in client testing README | — |
| 02 | `646247dc542` | Add tests/test-data/pages.ts for client unit tests | 71 |
| 02 | `73d5a5fd6d3` | Add tests/test-data/tools.ts for client unit tests | 6 + 1 + 12 |
| 02 | `3b8c34520c7` | Improve readability of pages tests | 26 |
| 02 | `722c3ecdbb0` | Improve readability of NotificationCard tests | 11 |
| 02 | `25c84398f83` | Improve readability of resourceWatcher tests | 21 |
| 02 | `d26e588db42` | Improve readability of toolStore tests | 3 |
| 02 | `e7b7269d82a` | Improve readability of filtering tests | 107 |
| 03 | `a6cad221288` | Extend src/components/Notifications/test-utils.ts for client unit tests | 14 + 3 |
| 03 | `7e41213121a` | Add src/components/User/DiskUsage/Management/Cleanup/test-utils.ts for client unit tests | 4 + 5 |
| 03 | `a96057f4eef` | Improve readability of CleanupResultDialog tests | 4 |
| 03 | `75b84d194fe` | Improve readability of urlTracker tests | 13 |
| 03 | `9dc6388136a` | Improve readability of collectionAttributesStore tests | 2 |
| 03 | `a2046c297b8` | Improve readability of url tests | 37 |
| 03 | `7ca124d9cf7` | Improve readability of datasets tests | 3 |
| 04 | `0a028b53870` | Add tests/test-data/monitoring.ts for client unit tests | 7 + 4 |
| 04 | `a5eab3ee864` | Add tests/test-data/storageOperations.ts for client unit tests | 9 |
| 04 | `94c19cbef85` | Add tests/test-data/userCredentials.ts for client unit tests | 1 |
| 04 | `ac0f58d9ada` | Improve readability of VaultSecret tests | 3 |
| 04 | `b935e79ea60` | Improve readability of DownloadItemCard tests | 9 |
| 04 | `cc2c4d8422d` | Improve readability of userToolCredentials tests | 19 |
| 04 | `f74fc4dec33` | Improve readability of zipExplorer tests | 9 |
| 04 | `a4749f63d56` | Improve readability of workflowEditorToolbarStore tests | 1 |
| 04 | `31b4f5dd2e1` | Improve readability of storageOperationsStore tests | 4 |
| 04 | `0cc41daedb5` | Improve readability of color tests | 1 |
| 04 | `40e4854ad99` | Improve readability of JsonDiffViewer tests | 13 |
| 04 | `abf04b6dce9` | Improve readability of api/index tests | 14 |
| 04 | `f1c6cbba1fe` | Improve readability of api-client/integration tests | 5 |
| 05 | `54149588e8e` | Add tests/test-data/collections.ts for client unit tests | 6 |
| 05 | `88120b90e6f` | Add tests/test-data/fileSources.ts for client unit tests | 6 + 14 |
| 05 | `94c78fb9146` | Add src/components/MetadataInspector/test-utils.ts for client unit tests | 7 |
| 05 | `84bf936a573` | Improve readability of MultipleView tests | 6 |
| 05 | `3968d7aa689` | Improve readability of ToolSection tests | 6 |
| 05 | `aefbc7b7b0f` | Improve readability of useFormState tests | 14 |
| 05 | `399397d431a` | Improve readability of HistoryNavigation tests | 2 |
| 05 | `46c9ef968e4` | Improve readability of Actions/actions tests | 24 |
| 05 | `7ec475945f3` | Improve readability of CopyModal tests | 8 |
| 05 | `eb3f53f4102` | Improve readability of useNotificationSSE tests | 14 |
| 05 | `3d33f8bd39c` | Improve readability of fileSources tests | 4 |
| 05 | `df178fb381d` | Improve readability of roundRobinSelector tests | 8 |
| 05 | `910f13851ce` | Improve readability of useCreatingJob tests | 10 |
| 05 | `c50e3bb00c9` | Improve readability of workflowStepStore tests | 9 |
| 05 | `ef58c485d34` | Improve readability of collectionElementsStore tests | 3 |
| 05 | `5629abea3ac` | Improve readability of jobMetricsStore tests | 4 |
| 05 | `e07cbab39bc` | Improve readability of workflowConnectionStore tests | 4 |
| 05 | `8f6446b80db` | Improve readability of ToolHistoryTab tests | 13 |
| 05 | `cdd3e46beb2` | Improve readability of RevisionsTab tests | 15 |
| 05 | `fd8406f1868` | Improve readability of app/utils tests | 2 |
| 05 | `0ac74e28577` | Improve readability of dates tests | 16 |
| 05 | `a54473e6e2f` | Improve readability of api-client/client tests | 4 |
| 05 | `752b8a37343` | Improve readability of rateLimiter tests | 4 |
| 06 | `d23f12cef44` | Add tests/test-data/objectStores.ts for client unit tests | 2 |
| 06 | `3ba90ed9fae` | Improve readability of DatasetStorage tests | 3 |
| 06 | `175eacf79a1` | Improve readability of selectedItems tests | 11 |
| 06 | `8ccc7351429` | Improve readability of objectStoreInstancesStore tests | 5 |
| 06 | `c0eec240e9f` | Improve readability of tusUpload tests | 12 |
| 06 | `ad6d0a683ab` | Improve readability of app tests | 5 |
| 07 | `e35b5bbe516` | Improve readability of FormDisplay tests | 7 |
| 07 | `518ab0d70ab` | Improve readability of TargetObjectStoreSelector tests | 2 |
| 07 | `0662b8f37f5` | Improve readability of confirmDialog tests | 1 |
| 07 | `949bd8bd992` | Improve readability of useEntityMentions tests | 27 |
| 07 | `b5dd1c5673d` | Improve readability of Register tests | 1 |
| 07 | `a7baf914e2d` | Improve readability of historyStore tests | 26 |
| 07 | `52a3bdcc5ac` | Improve readability of workflowEditorCommentStore tests | 18 |
| 07 | `965f97cee39` | Improve readability of lastQueue tests | 18 |
| 07 | `2f00e0c378f` | Improve readability of redirect tests | 26 |
| 07 | `ba1efe5a024` | Improve readability of MetadataJsonViewer tests | 12 |
| 08 | `317cfb8dafe` | Extend stores/_testing/sseStoreSupport.ts for client unit tests | 26 |
| 08 | `d06b1a79eb0` | Add tests/test-data/chat.ts for client unit tests | 24 |
| 08 | `f6db3127ead` | Improve readability of ToolPanel tests | 21 |
| 08 | `55266a238a1` | Improve readability of ToRemoteFile tests | 1 |
| 08 | `4469b4a0670` | Improve readability of useInvocationGraph tests | 17 |
| 08 | `9f8f0de293d` | Improve readability of accessibleHover tests | 3 |
| 08 | `0413267951e` | Improve readability of chatStore tests | 22 |
| 08 | `2e0b78487cf` | Improve readability of notificationsStore tests | 5 |
| 08 | `b6320bd5827` | Improve readability of utils/upload tests | 90 |
| 08 | `6375fbfa461` | Improve readability of utils/strings tests | 5 |
| 08 | `d0d62592cad` | Improve readability of ChangesetSummaryTable tests | 21 |
| 08 | `4c09f7f55b7` | Improve readability of vGTooltip tests | 13 |
| 09 | `f3533f0ad9f` | Extend src/components/User/DiskUsage/Management/Cleanup/test-utils.ts for client unit tests | 4 |
| 09 | `27a3bd930b7` | Improve readability of ReviewCleanupDialog tests | 5 |
| 09 | `267e1a7274a` | Improve readability of NotificationsManagement tests | 2 |
| 09 | `e7c8b063779` | Improve readability of useSidebarSelection tests | 18 |
| 09 | `5616872258a` | Improve readability of useUploadBatchOperations tests | 3 |
| 09 | `e6d3cc2ed5e` | Improve readability of invocationStore tests | 20 |
| 09 | `7b5e4c6886c` | Improve readability of windowManagerStore tests | 11 |
| 09 | `93c186728af` | Improve readability of filterConversion tests | 39 |
| 09 | `b4c08b52f8d` | Improve readability of utils/utils tests | 4 |
| 09 | `d3505db2c18` | Improve readability of Login tests | 2 |
| 09 | `5e6d54a0135` | Improve readability of watchHistory tests | 2 |
| 10 | `a16683243d9` | Add tests/test-data/workflows.ts for client unit tests | 14 + 22 + 2 |
| 10 | `2d2ba9bd7fc` | Improve readability of DatasetView tests | 24 |
| 10 | `de97cf78810` | Improve readability of object-permission-composables tests | 6 |
| 10 | `17e4ca795d5` | Improve readability of keyedObjects tests | 4 |
| 10 | `e9a6b9010e2` | Improve readability of keyedCache tests | 14 |
| 10 | `b22c0da1aad` | Improve readability of workflowStore tests | 20 |
| 10 | `f4d6fd081ae` | Improve readability of objectStoreTemplatesStore tests | 10 |
| 10 | `8e14003b023` | Improve readability of tool-version tests | 21 |
| 10 | `deb2117d983` | Improve readability of utils/utils tests | 24 |
| 10 | `73418354721` | Improve readability of OverviewTab tests | 7 |
| 10 | `6fe1f24296b` | Improve readability of ResetMetadataTab tests | 20 |
| 11 | `ade742de4a5` | Improve readability of FormElement tests | 10 |
| 11 | `0ba3bc9dbaf` | Improve readability of chatUtils tests | 3 |
| 11 | `cfe072c2e54` | Improve readability of utilities tests | 46 |
| 11 | `69b46037e10` | Improve readability of QuotaUsage tests | 5 |
| 11 | `785494c3441` | Improve readability of UserBeaconSettings tests | 8 |
| 11 | `1ca77711b29` | Improve readability of FormOutputLabel tests | 2 |
| 11 | `1f7b77b400e` | Improve readability of pollUntil tests | 6 |
| 11 | `605a2cb23b9` | Improve readability of taskMonitor tests | 8 |
| 11 | `940d7753da5` | Improve readability of workflowSearchStore tests | 7 |
| 11 | `43db96ae6b5` | Improve readability of activityStore tests | 14 |
| 11 | `a34c57cab11` | Improve readability of datasetCollectionStore tests | 6 |
| 11 | `a0f27b7b025` | Improve readability of historyUpload tests | 3 |
| 11 | `a7293a61d36` | Improve readability of upload-queue tests | 16 |
| 11 | `d656a2012b4` | Improve readability of login-routes tests | 8 |
| 11 | `0920026bd9b` | Improve readability of guards tests | 7 |
| 11 | `8fd63fac7df` | Document task monitoring example in client testing README | — |
| 12 | `758c69f9f0a` | Improve readability of DatasetDownload tests | 5 |
| 12 | `aaec196dee3` | Improve readability of WorkflowLicense tests | 1 |
| 12 | `415f98b9c34` | Improve readability of canvasDraw tests | 11 |
| 12 | `499d8ce123d` | Improve readability of AdminPanel tests | 4 |
| 12 | `8d995838080` | Improve readability of SelectorModal tests | 5 |
| 12 | `b5230751e5e` | Improve readability of FormDefault tests | 2 |
| 12 | `4810833d2e0` | Improve readability of RefactorConfirmationModal tests | 7 |
| 12 | `82d3800a8d5` | Improve readability of ToolEntryPoints tests | 3 |
| 12 | `2378d1486dd` | Improve readability of CellOption tests | 2 |
| 12 | `0f1fe7c049f` | Improve readability of useHistoryDatasets tests | 20 |
| 12 | `73a4ddca127` | Improve readability of pagination tests | 10 |
| 12 | `2bbd305f75b` | Improve readability of usePageProposals tests | 30 |
| 12 | `889802946d7` | Improve readability of userStore tests | 5 |
| 12 | `c77244a321a` | Improve readability of entryPointStore tests | 4 |
| 12 | `cd2c87543e3` | Improve readability of router-push tests | 9 |
| 13 | `2fa2c2b26fb` | Improve readability of Tags/model tests | 25 |
| 13 | `65647c813d9` | Improve readability of HistoryArchiveWizard tests | 3 |
| 13 | `3ec94fe12b3` | Improve readability of HistoryArchiveExportSelector tests | 8 |
| 13 | `187fcf32295` | Improve readability of DatasetError tests | 3 |
| 13 | `508e2a83e1a` | Improve readability of SelectionDialog tests | 8 |
| 13 | `0fe30eadcab` | Improve readability of ServerSelection tests | 2 |
| 13 | `13000dad802` | Improve readability of UtcDate tests | 2 |
| 13 | `e25bd4d06d9` | Improve readability of Lint tests | 3 |
| 13 | `6b48c3ce751` | Improve readability of WorkflowExport tests | 2 |
| 13 | `f7ee7547bff` | Improve readability of CollectionDescription tests | 13 |
| 13 | `27801b2168f` | Improve readability of model/queries tests | 9 |
| 13 | `2e60b594a28` | Improve readability of HistoryDatasetDisplay tests | 6 |
| 13 | `ae66c466a36` | Improve readability of WorkflowInvocationState/util tests | 15 |
| 13 | `279499fb26e` | Improve readability of uploadItemTypes tests | 12 |
| 13 | `af6cb847c5e` | Improve readability of useUploadSubmission tests | 15 |
| 13 | `61152ca732d` | Improve readability of useActiveContext tests | 35 |
| 14 | `e8a36ac451f` | Extend src/components/PageEditor/testData.ts for client unit tests | — |
| 14 | `91b4d128b23` | Improve readability of PageCard tests | 5 |
| 14 | `351be05ab4c` | Improve readability of SidebarList tests | 20 |
| 14 | `6677633c381` | Improve readability of MarkdownVitessce tests | 4 |
| 14 | `847e3fad64c` | Improve readability of HistoryPageView tests | 23 |
| 14 | `9a4ac5813eb` | Improve readability of useHistoryGraph tests | 12 |
| 14 | `29eb6e1970f` | Improve readability of CreateForm tests | 6 |
| 14 | `3c836895c7c` | Improve readability of InvocationsProvider tests | 1 |
| 14 | `3dc610cbfb1` | Improve readability of VisualizationCreate tests | 4 |
| 14 | `b1eb727fc0b` | Improve readability of FormPickValue tests | 11 |
| 14 | `bb3eaf7fcdc` | Improve readability of HeadlessMultiselect tests | 12 |
| 15 | `ffa021620e1` | Extend tests/test-data/index.ts for client unit tests | 14 |
| 15 | `7b7e57c44de` | Improve readability of Details tests | 1 |
| 15 | `c2963247946` | Improve readability of FormElementLabel tests | 6 |
| 15 | `f68352120f7` | Improve readability of FormCard tests | 1 |
| 15 | `0060917d15f` | Improve readability of SwitchToHistoryLink tests | 12 |
| 15 | `0aaa44b2557` | Improve readability of StateUpgradeModal tests | 5 |
| 15 | `5aa0bda496c` | Improve readability of MarkdownGalaxy tests | 13 |
| 15 | `8752a05e64a` | Improve readability of ContentItem tests | 5 |
| 15 | `da0ec9033f4` | Improve readability of Repositories tests | 2 |
| 15 | `0be0d99029f` | Improve readability of uploadState tests | 44 |
| 15 | `f50f337b306` | Improve readability of HistoryCounter tests | 7 |
| 16 | `f3b85393ff5` | Add tests/vitest/visibleIntersectionObserver.ts for client unit tests | 8 |
| 16 | `45a16ec920c` | Improve readability of FormSelectMany tests | 8 |
| 16 | `f03bd550d04` | Improve readability of WorkflowExtractionForm tests | 46 |
| 16 | `f213258d0b1` | Improve readability of FormNumber tests | 26 |
| 16 | `58c456ba241` | Improve readability of ChatMessageCell tests | 24 |
| 16 | `2923b3ae17a` | Improve readability of FormDataUri tests | 3 |
| 16 | `889f7d6b132` | Improve readability of UpgradeForm tests | 4 |
| 16 | `c4566dad713` | Improve readability of RuleDefinitions tests | 56 |
| 16 | `dacdf9540a5` | Improve readability of TabularChunkedView tests | 7 |
| 16 | `beee1666f91` | Improve readability of TargetHistorySelector tests | 3 |
| 16 | `150b6099243` | Improve readability of QuotaUsageSummary tests | 3 |
