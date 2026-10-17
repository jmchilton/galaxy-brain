# Stories restack resolutions 2026-10-16

Base e06bbc4c70271aacfe27a88e315c882b5270ecaa; old stories b1ba6eac0fd36c58256f9e8cdda9061cb7713697; old actual cut 7f2db5e59415f07c09fec5be75ff4885fbad047e. Published final head 4e60254eded0e18ae7737161fec2ce42c16c770f. Backup backup/vitest_stories-before-clean-restack-20261016. Exact leases /private/tmp/story-restack-start.json.

159 original messages/trailers matched byte-for-byte after rebase and final ToolSuccess fixup/autosquash. No tests ran during rebase. Published to the fork after validation with the recorded old-head lease; remote verified.

Policy: keep migrated story content by default; estimated churn overlap is not removal mandate. Where a complete incoming migrated file was retained, inspected current base conflict and/or old-base-to-new-base delta to ensure current assertions survived. No assertion removed to make a test pass.

32 conflict paths:
- FilesDialog/FilesDialog.test.ts: story mount replaces original setup; retain new nonrecursive file-source selection test using new NonRecursiveFileSource story with overridden plugins handler and original listings. rootId pdb-gzip confirmed.
- History/Export/HistoryExportWizard.test.ts: moved inline file sources into story factories; current getFakeFileSource supplies recursive:true, preserving new capability.
- ObjectStore/ObjectStoreBadges.test.ts: retain new upstream interactive:false forwarding test via NonInteractive story.
- ObjectStore/DescribeObjectStore.test.js: retain new upstream default true and overridden false interactivity assertions through story mount.
- Form/Elements/FormOptionalText.test.js: retain new ui-switch/role=switch assertion using Unset story; model harness feeds back value so old explicit setProps not needed; retain text input disappearance assertion.
- History/Content/GenericItem.test.ts: retain story fixture migration; remove duplicated inline VisibleIntersectionObserver in favor of shared helper.
- Tool/ToolForm.test.ts: retain complete incoming story migration after comparing upstream/base delta; all existing form, validation, submission-error and recovery assertions retained, plus pending build and recent-tool ordering cases.
- HistoryExport/Index.test.js: retain incoming story mount, tab assertion preserved.
- ObjectStore/Instances/InstanceDropdown.test.ts: retain incoming story mount and shared fixture; remove unused old inline fixture type import.
- HistoryImport.test.js: retain story setup and debounce cleanup.
- Tool/ToolSuccess.test.ts: substantial dev UI rewrite required preserving complete current base direct mount and job polling/outputs/pagination tests. Registered recommendation cases use composed With/WithoutRecommendations stories; anonymous/unloaded retain full current direct mount. Story adds job-details and console_output handlers, replaces removed queued-message text with named submitted output visibility and disabled recommendation absence. Preserve exact one-poll and previous-page-stop regression. Changes folded into original story commit.
- DatasetInformation/DatasetAttributes.test.ts: retain complete incoming migration with synthetic unit-only edit fields/error seam and owned Pinia cleanup; base assertions all retained.
- PageEditor/HistoryPageList.test.ts: retain incoming story migration with history ownership, invocation qualifier and missing user_id contracts.
- Workflow/Invocation/Graph/WorkflowInvocationSteps.test.ts: retain incoming actual HTTP GraphRateLimited scenario and status-specific error assertion.
- History/CurrentHistory/HistoryOperations/SelectionOperations.test.js: retain incoming complete story migration after verifying base delta contains no extra test cases; all bulk event/count/error checks retained.
- Workflow/List/CuratedWorkflowCard.test.ts: retain approved current migration, named error scenarios and deferred import cleanup.
- HistoryExport/ToLink.test.js: retain migrated loading and pending polling assertions with deferred cleanup.
- Form/Elements/FormText.test.js: retain complete story migration and live same-instance prop transitions, including absent datalist link checks.
- Page/PageView.test.ts: retain real Markdown composition and own-heading filtering preserving displayOnly duplicate-heading check.
- Workflow/Editor/Comments/WorkflowComment.test.ts: retain migration and sanitizer profile checks, store forwarding and same-instance transitions.
- Panels/Upload/UploadMethodViewInline.test.ts: retain actual LocalFileUpload story and reactive component warning contract.
- Common/DelayedInput.test.ts: retain approved WithQuery scenario, initial fastp value and clear/refocus checks.
- WorkflowInvocationState/JobStep.test.ts: retain upstream reactive mockedJobsById useJobDetails composable and state change test. MappedJobs and SingleJob composed cases seed mockJobs appropriately. Keep metrics API mock.
- Tool/ToolSourceDisplay.test.ts: retain incoming source stories, Monaco mocks/config and lifecycle assertions/cleanup.
- ObjectStore/ShowSelectedObjectStore.test.js: keep both new upstream noninteractive nested-popover assertion and migrated storage ID assertion.
- Workflow/Run/WorkflowHelpDisplay.test.ts: retain story migration and original sanitizer links-profile assertion with restore cleanup.
- GalaxyAI.routesync.test.ts: retain composed scenarios and explicit pending history refresh handler preserving route race checks.
- ActivityBar/ActivityBar.test.js: retain approved real config/store stories and hidden interactive-tools reorder contract.
- packages/ui/src/components/GTable.test.ts: retain story mounts plus direct live slot keyboard contract and dedicated body targets.
- Workflow/Editor/Forms/FormInputCollection.test.ts: retain composed scenario and direct same-instance stale echo checks.
- History/HistoryOptions.test.ts: retain real menu stories and real checkbox; keep all purge/modal checks and direct live changed-history case.
- DatasetInformation/DatasetDetails.test.ts: retain parent-only provenance story migration preserving request counts and sanitizer cleanup.

Dependencies: from client/, VITE_CONFIG_NATIVE_IGNORE_WARNING=true npm_config_use_node_version=$(cat .node_version) pnpm install --frozen-lockfile --offline; exit0, 8.7s. Real isolated node_modules, no symlink. Log /private/tmp/stories-restack-install.log.

Review followups: restored complete original story HistoryImport body including deferred try/finally and fake timer210ms advance. Adapted2new upstream ToolBoxSearch older-version favorite regression setups to awaited named NoFavorites story plus setupStores overriding catalog/tools/preferences; all assertions retained. Fixups autosquashed;159messages/trailers still exact. Final updated head 5cabf3c27a173b3bfa0005f028b37c523bd39f8a.

Final focused-validation repairs: FilesDialog directory1Response fixture import restored for retained nonrecursive test. DatasetCopy2newupstreamcases adapted to await composedstory and use FORWARD_READS/VARIANT_CALLING fixtures, preserving exact input hook/checkstate and targetMultiSelections state assertions (read component rather than story root). JobStep mock nowpartialimportOriginal to retain actual useJobConsoleOutput export for mounted JobInformation. SharedCAT_SUBMISSIONoutput nowincludes stableid d8f6e2b17c4a9035 and history_content_type dataset preservinghid3/name. ToolSuccessstory seeds typedcat1tool; datasetdetails/objectstores/invocationshandlers complete actualdev UI. Checks namedheader/newjobstate/visibleoutput (scrollIntoView forlazyprovider), enabledCutrecommendation and disabledabsence. ToolSuccessunit uses realPinia toolStore fixture forupload1(TestTool) insteadplainobjectmock lacking$dispose; recommendation cleanup unmountsroot. All12unitassertioncases retained.
Focusedresults: FilesDialog16/16 andJobStep3/3 in focused-fixes.log; DatasetCopy14/14+ToolSuccess12/12 exit0 focused-fixes2.log; ToolSuccessChromium2/2 exit0 toolsuccess-browser-fixes2.log (strictMSW unmockedrequesthookclean); isolatedwatchHistory2/2 exit0 watch-isolated.log withouttimeoutchange. Watchprior10sechooktimeouts werehostcontention (load132 reported); isolatedhook4.3sec. No watchsourcechanges.
Final updated head dca46b4eb1cef6d2ae0471465ee772bfe22e8455;159originalmessages/trailers byte-identical. Allfixups autosquashed into their original shared/per-test commits. Worktreeclean. Main ownsfullvalidation/push.

Final narrow gate repairs after fullunit612suites5367pass1skip atdca46b4: datasetDetailsHandlers nowserves upload1tool endpoint (UploadFile1.1.7 workflow_compatiblefalse, confirmedtools/data_source/upload.xml line2) forrealJobInformationrerunindicator. RemoveobsoleteCAT_SUBMISSION.toolName ascurrentResponseVal onlyjobDef/jobResponse; namecomesfromseededtoolstore. JobStep partialmock typeargument usesJobDetailsModule namespace typeimport perconsistent-type-imports rule. Noassertions changed. Finalhead a30e1fa676ecfa19a9a192540c5afbb50b8e24cf;159messages/trailersstillbyte-identical.

Finalschemafix: generatedclient/packages/api-client/src/schema/schema.ts omitslegacyGET/api/tools/{tool_id}; toolStore.fetchToolForId usesaxioslegacyURL. Handlercorrectedtoestablishedhttp.untyped.get('/api/tools/:tool_id') +HttpResponse.json(getFakeTool(...)); strictpayloadfixtureunchanged,nocasts. Finalhead 4e60254eded0e18ae7737161fec2ce42c16c770f;159originalmessages/trailersbyte-identical.
