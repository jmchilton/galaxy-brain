# Readability support colocation plan

The old opening commit classified every non-test/non-story path as architecture. That is too broad: the entire readability opening commit can become README guidance, with all 32 other paths moving into the existing ordered test commits. Keep `parseBool.test.ts` second; no new branches or smaller PRs are necessary. Keep every final tree byte-identical, including stories/play/real-API/churn.

`readability_inventory.json` lists exported declarations, candidate consumers in the current commit order, and base-presence. This is a scheduling inventory, not a type-aware resolved dependency graph. In particular, an existing export listed there is not automatically a new helper, and common symbol names require checking import origins. GalaxyAI mock spy candidates were restricted to GalaxyAI test files to avoid unrelated local mock names.

## Builder change

Replace the current once-per-path partition with a sequence of intermediate blob versions per path. Continue using the temporary Git index and dangling `commit-tree` preparation, before moving refs. Each test group retains its original test-file delta, plus the support fragments it first requires; support files may occur in several test groups. Preserve the current original provenance and trailer ownership, augmenting the manifest with fragment id, first consuming test, prerequisite fragments, and old/new blob ids. Current `paths_partitioned_exactly_once` must become `all_deltas_accounted_for` plus exact final-tree verification.

Use TypeScript's parser to split each support module into top-level declarations, imports, comments and export assignments. A named export's owner is the earliest current-order test whose FINAL import resolves to that module/export. Also follow helper-to-helper dependencies: getFakePageDetails needs getFakePageSummary, getFakePageRevisionDetails needs getFakePageRevisionSummary, getFakeUserServiceCredentials needs getFakeServiceCredentialGroup. Such prerequisite exports may be introduced indirectly in the same commit, because they are exercised by the newly consuming test. This is actual use, not speculative helper inventory. Do not introduce another independent exported helper merely because it lives in the same file.

For each new helper, schedule its declaration at minimum demand index across direct and transitive consumers. Schedule private constants/types/functions and import bindings at the minimum index of declarations using them. Imports should include only bindings needed in that intermediate module, preserving `type` markers; use compiler factory/printer or a narrowly scoped renderer and then Prettier for intermediate snapshots. When every fragment for a path has landed, restore the pinned final blob verbatim, preserving exact final formatting/comments. JSDoc belongs to the declaration immediately following it.

For existing modules, retain unchanged base declarations. Changed existing functions can be introduced independently, but move their required private defaults/types/imports together. Keep removed legacy exports until their last currently present caller migrates. In particular, do not delete Workflow/testUtils.ts until WorkflowList.test.ts changes. Do not delete random notification helpers until neither existing declarations nor remaining test files reference them. Keep base exports as compatibility implementations when a final API makes unmigrated callers fail; eliminate them when the final consumer moves. This requires resolving imports against intermediate snapshots, rather than assuming all final tests already exist.

For `PageEditor/testData.ts`, moving the complete small wrapper rewrite with PageCard.test.ts is reasonable; include `getFakePageSummary` if not already present. It introduces no unused public API. `mockConfig.js` changes a pre-existing helper; put it with the earliest migrated test using setupMockConfig, then run all still-existing users as well. `types/vitest-setup.d.ts` and deletion of `tests/vitest/matchers.d.ts` are one augmentation-cleanup unit, colocated with ResetPassword's localization assertions if provenance confirms that motivation; check all custom matcher users. Neither belongs in a README-only foundation.

## Concrete first-use schedule examples

- BaseComponents/test-utils.ts: createMemoryRouter with GLink.test.ts; clickModalButton later with ReviewCleanupDialog.test.ts. Keep each helper's imports/comments with its own introduction.
- tests/test-data/index.ts: getFakeAnonymousUser with composables/userToolCredentials.test.ts; getFakeHistorySummaryExtended with History/SwitchToHistoryLink.test.ts; preserve the existing factories throughout.
- tests/test-data/pages.ts: summary/details with api/pages.test.ts; revision summary/details with PageEditorView.test.ts. Do not frontload all four exports with the first API test.
- stores/testUtils.ts: seedCurrentHistory with Panels/Upload/UploadFileRow.test.ts, retaining setupTestPinia.
- uploadFixtures.ts: withUploadState with UploadFileRow.test.ts, retaining all existing item factories.
- CommandPalette/test-utils.ts: signIn with providers/workflows.test.ts; existing makeCtx/renderedSections remain in base.
- GalaxyAI/test-utils.ts: determine each exported spy/stub/helper's resolved first import across GalaxyAI.routesync.test.ts and GalaxyAI.test.ts; the fixture has hoisted mocks and private declarations that must follow runtime dependency closure, not lexical-name-only matches.
- Tool Shed MetadataJsonViewerStub with MetadataInspector/OverviewTab.test.ts; Tool Shed createMemoryRouter with ShedToolbar.test.ts.

## README fragments

Keep the general Readable Test Scenarios section, corrected Vue mounting syntax/imports for already-existing withPlugins, corrected MSW example, general async guidance, and general teardown principles in the opening README commit. Verify withPlugins/config mock exports exist in the pinned base before retaining their examples. Factory guidance already exists in base and does not require introducing factories early.

Delay the mounted GModal paragraph until clickModalButton's consuming test. Delay the seedCurrentHistory paragraph until its first consuming test (split its general Pinia warning from helper-specific advice only if needed). Delay composable `runInTestScope` wording until that helper appears; general direct-composable advice can remain first. README references to newly rewritten example-file names/patterns should travel with the referenced test; in particular defer ToolForm.test.js -> .ts until that rename, task-monitor description until taskMonitor.test.ts, and changed Workflow Editor reference prose until its conversion. Teardown paragraph's TrsTool/WorkflowHelpDisplay examples should be appended with those conversions while keeping general teardown guidance first. Apply exact string fragments or a reviewed patch per owner; do not repeatedly copy the whole final README.

Every intermediate README should resolve its local documented helper/module paths and named exported API. At the final readability commit, assert the README's blob equals the pinned final blob, not merely semantically equivalent prose.

## Validation before refs/push

- Resolve every changed/new import at every commit introducing support, and assert new public helper export has a direct or transitive test consumer by that commit.
- Assert every support deletion has no remaining importers and every changed signature has compatible current callers.
- Validate README helper references at introduction. Validate trailers/provenance and no lost path/mode/deletion.
- Run focused unit suites at helper introduction snapshots, including unmigrated callers of changed helpers, rather than rerunning only final tests. Include ResetPassword/type checking for matcher consolidation; notifications, GalaxyAI, PageEditor, upload, history/SSE, and both Tool Shed helper families.
- Final tree ids of all five branches must exactly match their pinned previous tips. Restack stories and play on the new readability tip by preserving/rebuilding their own delta scheduling; real-API and churn can preserve their existing trees/messages and rewrite parents only.
- Independent normal review, then lease-protected pushes to jmchilton only, and update branch records/links. Preserve RFC draft/video, no branch split, no new PR, no Galaxy Brain push. Leave recording server running.

## Prepared implementation artifacts

- `typescript_units.cjs`: TypeScript compiler AST decomposition plus import-pruned rendering; operates only on JSON text.
- `schedule_support.py`: resolves named imports and dependency closure across support declarations for all three lanes. Emits `support_schedule.json` with owner-indexed full intermediate text/deletion events and declaration provenance; does not write Git objects, refs or worktree files.
- `validate_support_schedule.py`: parses every planned intermediate snapshot, then simulates the current test/story population after each test group (including unchanged base tests), checking all direct imports into support modules and all named support exports. Results in `support_schedule_validation.json`.
- Current preparation: readability 37 support events, stories 53, play 3; zero unresolved declarations. All support final text equals pinned final text; all intermediate snapshots parse; zero missing support modules/exports across all groups. A readability upload-fixture intermediate event is import-only formatting and should disappear after Prettier normalization against its existing blob.

The static checks verify syntactic and import coherence. They do not establish runtime behavior, full type checking, or test assertions at intermediate snapshots. Focused runtime checks and independent review remain required before publication. References within functions are conservatively matched by identifier; imports are resolved by module and imported export, avoiding coincidental same-name local mocks in tests.

### Atomic notification API correction

Do not stage notification factories independently from the existing list generator. The new deterministic factory defaults reuse fixed IDs; the old list generator called those factories without ID overrides, so a partial snapshot would create duplicate IDs. Move the complete notification helper update into NotificationCard's conversion (index 9), where the factories are demonstrated, while the unchanged NotificationsList tests already exercise the list API. This introduces no unused new public helper. The support schedule now has 36 readability events; syntax/import checks still pass. This example is why runtime checks of unmigrated consumers are necessary in addition to import validation.
