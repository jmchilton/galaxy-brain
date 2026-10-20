# Independent review: dependent branch restack

Scope: read-only review of the incoming readability update and compatibility of the dependent story and play migrations. The initial audit found two browser expectations that will merge cleanly but describe superseded controls/layout: InstallationSettings' datalist and CuratedWorkflowCard's IWC overflow-menu link. These are blocking compatibility findings until adapted and executed. Details and preservation requirements are in `test_challenges_debrief.md`.

Incoming production changes affecting the other reviewed story companions are compatible with their authored public scenarios: collection creator focus-ring CSS, FormSelection's radio-group label propagation, DatasetCopy target clearing, InteractiveTools search, FilesDialog recursive-error handling, GroupForm checkbox replacement, FormInputCollection null serialization, Lint gates and tool-request dialog extraction. Each corresponding upstream new regression must remain represented after test migrations are replayed. This is not proof that final resolutions preserve them; final-tree review is pending.

The accepted migration approach reuses story fixtures, real component rendering, shared story mounting, MSW and Pinia rather than adding a new mocking abstraction. New upstream unit regressions should remain unit tests where migrating them would expand scope. Do not reintroduce old branch-local score-2 churn or remove accepted story changes based on an old churn estimate.

No tests or source files were edited by this reviewer. No tests were run by this reviewer. Root owns rebase, resolutions, final tree, runtime validation and publication.

## Partial resolved-story review

Read the rebasing `storybook_prototype` worktree after the requested conflict adaptations. The new invocation retry case keeps all three assertions and arranges null getters plus loading status explicitly. Lint gates reuse the story's owned scoped store and component effect scope; optional-text toggles retain rendered controlled feedback; quota loading uses the story's active Pinia with stubbed actions; CommandPalette uses fake timer advancement with cleanup; the recursive FilesDialog error case retains toast, rows, nonbusy and disabled-confirm assertions. These arrangements are structurally compatible.

One additional recommendation: InstallationSettings' new helper reads `wrapper.emitted("ok")` from the composed-story wrapper. Use `wrapper.getComponent(InstallationSettings).emitted("ok")` for a reliable component-event assertion, including the no-emission cases. Other migrated tests already read events from the actual nested component. Runtime confirmation remains required.

## Completed story replay audit (initial head `5a8f2314e2e0970a126d46df8df91b99e7cb444b`)

Three automatic-merge compatibility blockers require root repair before validation:

- FormInputCollection's newly added serialized-null case still references deleted shared `wrapper` and unimported `shallowMount`. Give the case its own mounted component, retaining the real FormCollectionType/FormElement input and JSON serialization assertion. Existing auto-unmount registration provides cleanup.
- DatasetCopy's new target-clearing case calls deleted `serveHistories`, `H1` and `dataset` fixtures and uses the obsolete helper return and checkbox signatures. Use CopyFromCurrentHistory, destructure the mounted wrapper, select FORWARD_READS and VARIANT_CALLING by their fixture identities, then keep the checked-before / unchecked-after and GFormInput assertions.
- FormData's new no-options and batch-hint sections reference deleted `createTarget`, `defaultOptions` and shared `eventStore`. Arrange each scenario with `mountFormData(stories.SingleDataset, args)` and retain the returned wrapper/store/setValue handle. The story's default options provide the old dataset fixture. Use the parent's setValue handle instead of setProps on a nested component for controlled transitions and drag feedback.

The other reviewed overlaps preserve their new upstream cases with no additional stale fixture references found. The CuratedWorkflowCard candidate retains real story handlers, all new upstream assertions and no global config mock; its tools-request helper waits for the real config request before setting configuration on the actual Pinia store. The store exposes `setConfiguration`, and no TypeScript issue is evident statically. Root is separately repairing InstallationSettings component event scope and GroupForm's plain-mount cleanup.

Prepared an immutable FormData candidate at `/private/tmp/dependents-20261020-FormData.test.ts` for root to inspect/apply. It preserves every new batch-hint/no-options assertion while reusing the existing story mount, story dataset options, per-mount event store and parent-controlled setValue helper. Prepared CuratedWorkflowCard candidate likewise under `/private/tmp/dependents-20261020-CuratedWorkflowCard.test.ts`; root applied that candidate. These are candidate files only, not shared source edits. No new skip/todo/only markers were introduced across the 14 exact overlapping test paths in the initial completed replay.

## Resolved story content review

Rechecked the working tree after root applied the candidates and repairs. The three automatic-merge stale-helper blockers are resolved. InstallationSettings now returns the actual component for event assertions. GroupForm's retained create-mode plain mount registers unmount cleanup. No new static blocker remains in the 15 overlapping paths. Root reports successful full Storybook browser coverage (100 files / 379 stories), static build, client types, and the repaired FilesDialog suite (17 tests); these are root-reported results rather than tests executed by this reviewer. Full unit validation and final folded-history/tree verification remain root's gates.

Investigated a full-suite watchHistory timeout read-only. Its tests, watcher source, history stores, store test helpers, global setup and generic helpers are unchanged from readability `1358d37887996e552e0fac6467c8738865618d9a`. The unit config adds project selection but no timeout change. Each test's beforeEach resets the full module registry and dynamically imports the watcher's large store/app/API dependency graph. A cold-transform/load timeout is plausible; no story adaptation or fixture mismatch was identified. A focused rerun distinguishes this from an actual assertion failure. Do not weaken its assertions or rewrite unrelated watcher code to accommodate an unconfirmed resource timeout.

## Runtime findings reviewed

Root's focused watchHistory rerun passed both tests using a temporary unit-project config with a 60-second hook timeout. The cold dynamic-import hook took about 15 seconds, exceeding Vitest's default 10 seconds. No repository timeout or watcher changes are needed for this machine-specific validation accommodation.

Root also isolated an InteractiveTools full-suite failure: its historical full replacement of `@/utils/simple-error` exports only `rethrowSimple` and `errorMessageAsString`. The story's real current-user decorator now constructs a user store whose retry gate needs the real `isRetryableApiError`, `ApiError`, retry constants and backoff helper. A partial module mock spreading `importOriginal()` while preserving those two existing overrides is the correct scoped repair. It restores the real retry contract and preserves all fixtures and assertions; do not stub the retry classifier or remove the current-user story decorator. Root will apply and run validation after the active source-reading test run ends.

## Play rebase preparation

Prepared two immutable play-story candidates beneath `/private/tmp/dependents-20261020-play-candidates/` at their original repository paths. InstallationSettings replaces obsolete datalist attributes with its current labeled input ID and combobox containment. CuratedWorkflowCard keeps the exact destination checks, moves the IWC destination to the visible secondary link and leaves DOI alone in the overflow menu, checks the missing-tools description on its owning footer list item, and checks steps/version in the footer. No existing play scenario was removed. Root must format and execute these candidates.

Of the newly added upstream regression test files, InstallationSettings is the one old-play modify/delete conflict: retain seven target-section unit cases, while the original two migrated display/dependency cases can remain represented by their browser plays. New cases in modified-but-retained files must survive: invocation retry loading, three conditional gates, two quota spinners, target clearing, recursive listing failure, interactive-tools search, null collection-type serialization, and all curated-workflow layout/import/version/request cases. FormData and GroupForm are untouched by the old play branch and should inherit their new cases. Keep CommandPalette's fake-clock changes and the InteractiveTools partial module mock through replay. Keep FormOptionalText's controlled-render assertions alongside its existing retained event/parent-feedback unit cases.

## Final stories history proof

Independently verified candidate `fd5fd27f67aaa9d974b2d3cbc693ef8fa0a31864`:

- Tree is exactly `55d5d198abed67b4a09c906ed66d5caaa0332a12`.
- Merge base with readability is exactly `1358d37887996e552e0fac6467c8738865618d9a`.
- Exactly 159 branch commits. Every complete commit-message body, including trailers, is byte-identical to the corresponding old story commit in order (compared with `git cat-file commit`). The manifest's original SHA sequence and normalized bodies also match.
- All 245 story-owned paths outside the incoming readability overlap retain their original blob content. Changes to overlapping test paths are the reviewed compatibility/regression adaptations.
- InteractiveTools now spreads the actual `simple-error` exports and retains the two deliberate historical overrides. Retry classifiers, error types, retry constants and backoff remain real.

Static review and history/tree preservation are approved. The sole outstanding approval condition is root's corrected full-unit runtime gate. Existing full browser/build/types evidence applies as reported: subsequent changes were unit-only mock/import edits, with no changed story or production content. Do not present the still-running full unit run as successful before it finishes.

## Final play static review before history folding

Reviewed local play `39fc28e8eef2f7d251212c744a20bc3b841240e5`, tree `b5d37f7a95868a6c20ef11bf24a2910273fc936b`, based on the published stories head. No additional static blocker found. All new upstream regression cases and the repaired fixtures remain. The accepted retained unit checks adjacent to new regressions duplicate some existing plays; retaining these assertions through this restack is appropriate and safer than broadening the cleanup.

Actual incoming overlap against the fully adapted stories branch is 11 test paths (the original 12-path upstream audit included PersistentTaskProgressMonitorAlert, whose story migration normalized its setup so its branch content did not change). Among 148 old-play-owned paths outside the incoming changes, only the two intentionally adapted story files differ; the other 146 retain their original blobs. Both adapted story export-name sequences exactly match the old published play: five InstallationSettings stories and twelve CuratedWorkflowCard stories. No original play scenario was removed.

The new InstallationSettings control checks preserve its visible label, ID association and combobox relationship. CuratedWorkflowCard preserves exact link destinations/new-tab behavior, moves IWC to the visible secondary action and DOI to the overflow menu, reads the missing-tools description from its owning footer list item, and verifies the steps/version footer. Runtime browser validation must confirm those actual accessible semantics. The unit leftovers preserve invocation retry/null state, seven section-installation cases, conditional gates, quota loading, recursive listing failure, imported-version/tool-request logic and the real partial error mock.

Static/scoped-test-challenge review is approved, conditional on root's runtime gates and independent final 99-message/trailer/tree proof after history folding.

## Play browser setup failure triage

The full browser run reported 23 suites failing before test collection with `SyntaxError: missing ) after argument list` while importing Storybook's project-annotation setup module. That dependency is a valid three-line import/setup wrapper; the shared preview, MSW and Vite adaptation source also contain no evident syntax defect. The zero-test failures are distributed throughout the run, while other suites successfully import the same setup. The log provides no offending module URL or parse stack beyond the wrapper. Therefore no repository syntax fix is justified from this evidence alone. Reproduce one affected suite in isolation with one worker after source edits finish; if it persists, capture the browser page-error stack/module URL. Root is separately fixing actual CuratedWorkflowCard and FormInputCollection play expectation mismatches. This setup triage does not waive the browser gate or claim a passing run.

## Frozen play runtime-repair review

Reviewed all four dirty files after focused runtime diagnosis, while final gates run against frozen source. FilesDialog adds the missing Vue/promise flush before checking its busy state, retaining toast, rows, idle and disabled-confirm assertions. WorkflowInvocationState's dirty change is trailing whitespace only. CuratedWorkflowCard now includes the actual actionable Single Cell collection badge in its exact ordered button set; the non-null assertion only addresses TypeScript's indexing analysis. FormInputCollection replaces obsolete text-entry/value expectations with existing shared option-picker helpers, scoped to the collection picker so the datatype combobox cannot be selected accidentally. It still checks the exact selected collection type for list and paired sample sheet and verifies both showing and removing sample-sheet columns on user selection. No behavioral assertion was dropped, and no new static blocker was found.

Root reports focused Chromium passes for the card/TextSummary group (15 stories) and collection picker (three stories). This also demonstrates one previously setup-failing suite can import and run successfully in isolation; the earlier 23-suite setup parse error still requires the fresh full browser gate. Full browser/unit/types/build results and folded-history tree identity remain root's outstanding gates.

Independently compared complete raw commit-message bodies via `git cat-file commit`: current play head `39fc28e8eef2f7d251212c744a20bc3b841240e5` has exactly 99 commits above published stories, and all 99 bodies/trailers are byte-identical to the original published play commits in order. Root's later folding must retain this sequence and the frozen tested tree.

## Final folded play verification and runtime qualification

Independently verified final play `735da91611e343c370e5150d619691ad4407b112`: its tree is exactly `b93bdc1f931297d484ef720963d20198be97a6ba`, its merge base with published stories is exactly `fd5fd27f67aaa9d974b2d3cbc693ef8fa0a31864`, and its checked-out worktree is clean. All 99 complete raw commit-message bodies, including trailers, remain byte-identical to the original published play sequence in order. Of 148 old-play-owned non-overlapping paths, 145 blobs are unchanged and only the three reviewed public-UI story adaptations differ (InstallationSettings, CuratedWorkflowCard, FormInputCollection).

Root reports these final-tree runtime results; this reviewer did not execute them:

- Client full unit run: 640 files passed and one failed; 5,480 tests passed, one failed and one skipped. The sole failure was an unchanged Citation timeout. Both Citation tests passed on the same tree when isolated.
- Full Chromium story run: 96 files passed and four failed; 578 stories passed and five failed. The affected four files (ListCollectionCreator, DatasetCopy, ToolSource and FormData) passed all 39 stories when rerun on the same tree. Failures concerned collection-creator timing, the dataset-copy loading status, ToolSource's five-second budget and a FormData worker failure.
- Client types and static Storybook build passed. The post-format FormInputCollection browser rerun passed all three stories. Normal commit hooks passed with source fingerprints unchanged.

The full runs were not all green; their timing/worker failures and successful same-tree isolated reruns must remain visible in the implementation debrief and publication summary. No persistent rebase regression or additional static defect was identified. Review is approved for the exact leased publication of this verified candidate, with the above runtime qualification retained. Do not claim that the full suites passed without that qualification.
