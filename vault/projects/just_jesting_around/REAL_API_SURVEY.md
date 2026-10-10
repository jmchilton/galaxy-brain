# Real API fixture survey

This is an agent-generated survey of the `vitest_readability` client tests, run read-only at `16298061`. That commit is 2 ahead of `jmchilton/vitest_readability` `af169c23`, and every finding holds at both. It ranks the API responses that would most strengthen the tests if captured verbatim. It feeds Phase 5 of [plan_real_api_fixtures.md](plan_real_api_fixtures.md).

**Method:**
- Grouped the 415 `http.<verb>("/api/...")` lines into 124 endpoint+method groups.
- Traced who imports the old JSON fixtures and the `@tests/test-data` factories.
- Compared payloads against `client/packages/api-client/src/schema/schema.ts`.
- Joined each consumer test's status from `jest_tests.yml`.

There are no `*.stories.*` files on this branch.

## Ranked endpoints

Config is the default API-test config unless an integration config is named. "Iterated" and "storified" are ledger status.

**1. POST `/api/tools/fetch`**
- **Scenarios:** `paste_single`; `paste_list` (fills `output_collections`).
- **Consumers:** `useUploadSubmission.test.ts` (iterated), `useUploadBatchOperations.test.ts`, `utils/upload.test.ts`, `UploadMethodView.test.ts`.
- **Why:** `useUploadSubmission.test.ts:60-72` serves `outputs` as a nested dict that includes an `hdca`. The server builds a flat list, with collections in `output_collections` (`services/tools.py:417`; unverified). The response type is `unknown`.
- **Config:** default. **Difficulty:** low.

**2. GET `/api/jobs/{job_id}`**
- **Scenarios:** `full` (ok); `full` (error, structured `job_messages`); `default`.
- **Consumers:** `JobInformation.test.js`, `ToolSuccessMessage.test.ts`, `DatasetError.test.ts` (iterated), `DatasetDetails.test.ts`, `JobStepJobs.test.ts`.
- **Why:**
  - `jobInformationResponse.json` (2020) has string `job_messages` and lacks required fields.
  - The `rows.length == 10` assertion depends on that invented key set.
  - `DatasetDetails.test.ts` uses `{id,state} as never`.
- **Config:** default. **Difficulty:** low for ok; medium for error.

**3. GET `/api/histories/{history_id}`**
- **Scenarios:** `view_summary` + keys `size,contents_active,user_id`; `view_detailed`; `view_dev-detailed`; `deleted`, `purged`, `archived`.
- **Consumers:**
  - 9 files have handlers, among them `SwitchToHistoryLink.test.ts` (iterated) and `DatasetCopy.test.js`.
  - `getFakeHistorySummary*` is used in 21 files.
- **Why:**
  - `DatasetCopy` serves `{id,name}`.
  - The client's patched `view=detailed` type is unproven (TODO at `api/index.ts:55-61`).
  - Factory ids aren't encoded.
- **Config:** default. **Difficulty:** low.

**4. GET `/api/histories/{history_id}/contents`**
- **Scenarios:** `v_dev`; `stats` (accept header); `mixed_states`.
- **Consumers:** `HistoryView.test.js`, `DatasetCopy.test.js`, `MultipleView.test.js`, `useHistoryDatasets.test.ts` (iterated), `watchHistory.test.js` (iterated).
- **Why:** items lack `state`, `purged`, `url` and `dataset_id`, and some are served untyped.
- **Config:** default. **Difficulty:** low to medium.

**5. GET `/api/datasets/{dataset_id}`**
- **Scenarios:** `hda_detailed_tabular`; `hda_error`.
- **Consumers (7 files):** `HistoryDatasetDetails.test.js`, `ContentItem.test.js` (iterated), `HistoryDatasetDisplay.test.js` (iterated), …
- **Why:** the response is `unknown`, and payloads are `{id}` stubs.
- **Config:** default. **Difficulty:** low.

**6. GET `/api/invocations/{invocation_id}`**
- **Scenarios:** `scheduled_with_io`; `failed`.
- **Consumers:** `invocation.json` (2021) feeds 5 files, including `WorkflowInvocationState.test.ts` (storified + play); plus `MarkdownVitessce.test.js`.
- **Why:** `MarkdownVitessce.test.js:82` serves `inputs` as an array (the server sends a dict). It works only because of `Object.values` in `parseInvocation.ts:22`.
- **Config:** default. **Difficulty:** medium.

**7. GET `/api/workflows`**
- **Scenarios:** `owned`, `show_published`, `deleted`, `shared_with_me`.
- **Consumers:** `getFakeWorkflowSummary` (6 files) and `vi.mock("@/api/workflows")` (7 files). Start with `api/workflows.test.ts`.
- **Why:** the response is `{[key]:unknown}[]`, and the client's `WorkflowSummary` type is hand-written (TODO at `api/workflows.ts:13`).
- **Config:** default. **Difficulty:** low.

**8. GET `/api/users/{user_id}`**
- **Scenarios:** `registered`; `registered_quota`; `admin`.
- **Consumers:** `DiskUsageSummary.test.ts`, `ResetUserPasswordForm.test.ts`, `ToolPanel.test.ts`; `getFakeRegisteredUser` in 38 files.
- **Why:** the factory has `quota:"default"`, but the real value is a size string or `"unlimited"`.
- **Config:** default, plus integration with `enable_quotas`. **Difficulty:** low.

**9. GET `/api/users/{user_id}/usage`**
- **Scenarios:** `default_source`; `multi_source`.
- **Consumers:** `DiskUsageSummary.test.ts`, `FilterMenu.test.ts`; `QuotaUsageSummary.test.ts` and `QuotaUsageBar.test.ts` through `toQuotaUsage`.
- **Why:** the source labels are invented. Labeled sources exist only when the object store declares quota sources.
- **Config:** integration with `enable_quotas`. For `multi_source`, add the DISTRIBUTED config from `test/integration/objectstore/test_selection_with_user_preferred_object_store.py`.
- **Difficulty:** medium.

**10. GET `/api/object_stores?selectable=true`**
- **Scenarios:** `selectable_distributed`.
- **Consumers:** `TargetObjectStoreSelector.test.ts` (iterated), `SelectPreferredStore.test.ts`, `UserPreferredObjectStore.test.ts`, `ShowSelectedObjectStore.test.js`, `WorkflowStorageConfiguration.test.ts`.
- **Why:** the tests use a user-instance factory for admin-configured stores and ignore `selectable`.
- **Config:** integration with the same DISTRIBUTED config. **Difficulty:** medium.

**11. GET `/api/remote_files/plugins`**
- **Scenarios:** `posix_writable`; `browsable_only`.
- **Consumers:** `FilesDialog.test.ts` (storified + play), `HistoryExportWizard.test.ts` (storified + play), `HistoryArchiveWizard.test.ts`, …
- **Why:** `getFakeFileSource` hard-codes `supports` and `uri_root`.
- **Config:** integration via `PosixFileSourceSetup` (`integration_setup.py:85-107`). **Difficulty:** medium.

**12. GET `/api/histories`**
- **Scenarios:** `view_summary` plus the key sets in `api/histories.ts:175-340`.
- **Consumers:** `historyStore.test.ts` (iterated), `SelectorModal.test.js` (iterated), `DatasetCopy.test.js`, `UserBeaconSettings.test.ts`.
- **Why:** the tests never look at `view` or `keys`.
- **Config:** default. **Difficulty:** low.

**13. GET `/api/dataset_collections/{hdca_id}`**
- **Scenarios:** `list`, `list_paired`.
- **Consumers:** `datasetCollectionStore.test.ts`, `WorkflowInvocationInputOutputTabs.test.ts`.
- **Why:** payloads are `{id}` stubs, and `getFakeCollectionSummary` is hand-written.
- **Config:** default. **Difficulty:** low.

**14. GET `/api/invocations/{id}/step_jobs_summary` and GET `/api/jobs?invocation_id=`**
- **Scenarios:** `mixed_states`.
- **Consumers:** `invocationStore.test.ts` (iterated), `JobStep.test.ts`.
- **Why:** `jobs.json` has `exit_code` set on `new` and `running` jobs and unencoded ids, cast `as JobBaseModel`.
- **Config:** default. **Difficulty:** medium.

**15. GET `/api/histories/{history_id}/exports`**
- **Scenarios:** `sts_ready`, `file_source_ok`, `failed`.
- **Consumers:** `exportRecordModel.test.ts`, `HistoryExport.test.ts`, `HistoryArchiveExportSelector.test.ts`.
- **Why:** `exportData.ts` is invented, and its expiry logic is driven by `new Date()`, so a verbatim fixture needs a date-shifting factory.
- **Config:** default, or the posix integration config for the file-source variant. **Difficulty:** medium.

**16. GET `/api/datatypes/types_and_mapping`**
- **Scenarios:** `default`.
- **Consumers:** `testDatatypesMapper` in 8 files (editor `Node`, `NodeOutput`, `Lint`, `FormData` (storified), …).
- **Why:** the 5-type map is hand-trimmed.
- **Config:** default. **Difficulty:** capture is low, but churn is high (needs the override or subset rule).

**17. Pages endpoints**
- **Endpoints:** `/api/pages`, `/api/pages/{id}`, `/revisions`.
- **Scenarios:** `markdown_page`, `revisions`.
- **Consumers:** `pages.test.ts` (iterated), `pageEditorStore.test.ts` (iterated), `PageForm.test.js`.
- **Why:** the `getFakePage*` factories are synthetic.
- **Config:** default. **Difficulty:** low.

**18. Admin endpoints**
- **Endpoints:** `/api/roles`, `/api/groups`, admin `/api/users`, `/users/{id}/roles|groups`.
- **Scenarios:** `default`, `private_role`.
- **Consumers:** `UserRolesGroupsForm.test.ts`, `RoleForm.test.ts`, `GroupForm.test.ts`, `QuotaForm.test.ts` (iterated).
- **Why:** they serve `{id,name,model_class}` literals.
- **Config:** default; quotas need `enable_quotas`. **Difficulty:** low.

**19. Notifications endpoints**
- **Endpoints:** `/api/notifications`, `/status`, `/broadcast`.
- **Scenarios:** `unread_message`, `active_broadcast`.
- **Consumers:** `notificationsStore.test.ts` (iterated), `BroadcastsList.test.ts`, `BroadcastForm.test.ts`.
- **Why:** synthetic objects feed the time-window logic.
- **Config:** integration with `enable_notification_system`. **Difficulty:** medium.

**20. GET `/api/configuration`**
- **Scenarios:** `anon`, `registered`, `admin`.
- **Consumers:** 26 files have handlers; `setupMockConfig` adds 12 more.
- **Why:** most stubs are `{}`, so every flag reads as `undefined`. The gain is low and churn is high, so use it only as a base under a factory.
- **Config:** default. **Difficulty:** low.

## Quick wins

These are default config, low difficulty and high reach:
1. `/api/tools/fetch` `paste_single` → `useUploadSubmission.test.ts`.
2. `/api/histories/{id}` `view_detailed` and `view_summary_extended`, rebuilding `getFakeHistorySummary*` on top.
3. `/api/histories/{id}/contents` `v_dev` and `stats`.
4. `/api/datasets/{id}` `hda_detailed_tabular`.
5. `/api/jobs/{id}` `full`, replacing `jobInformationResponse.json`.
6. `/api/workflows` `owned`.

## Findings outside fixtures

- **An assert that can't fail:** `JobInformation.test.js:95` reads `expect(jobResponse.job_messages.includes(msg));` with no matcher. Verified.
- **Code tested only against made-up shapes:**
  - The recursive `outputs` parsing in `composables/upload/uploadResponse.ts:24-42`.
  - The invocation `inputs` array in `MarkdownVitessce.test.js:82`.
- **Dead fixtures:** `components/providers/test/json/{Dataset,DatasetCollection*}.json` have no importer.
- **Drift in old fixtures:**
  - `jobInformationResponse.json`: string `job_messages`, missing required fields.
  - `jobs.json`: unencoded ids, `exit_code` on `new`/`running` jobs.
  - `jobDestinationResponse.json`: unchanged since 2020.
  - `invocation.json`: close to the schema.
- **Request variants the tests ignore:** history `view`/`keys`, contents `v=dev` plus the stats accept header, jobs `full=true`, object stores `selectable=true`.
- **Mocking that bypasses the server mock:**
  - Direct module mocks: `vi.mock("@/api/workflows")` in 7 files, `@/api` in 6, `datasets` in 5, `pages` in 4, `histories` in 3.
  - Pinia seeding, e.g. `setHistories([...])`.

## Endpoints missing from the OpenAPI schema

These would fail the stale-fixture check:
- `/api/tools` and `/api/tool_panels/*`: `toolsList.json`, `toolsListInPanel.json` (about 12 consumers, cast `as unknown as Tool[]`) and `viewsList.json`.
- `/api/entry_points`: `testInteractiveToolsResponse.json`.
- `/api/libraries/datasets/{id}`: the `LibraryFolderDataset/testData/*.json` files.
- `/api/workflows/{id}/download?style=run|editor`: `run1.json` (26 KB) and the editor `*_steps.json` files.
- `/api/tools/{id}/build`: `Form/test-data/tool.json`.
- `/api/webhooks`.

## Don't capture

- **Middleware stubs:** rate limiter, stale-cache retry, error-response middleware and `serverMock.test.ts`. They use 429, HTML and 5xx stubs on purpose.
- **Scalar or trivial responses:** task state and result, history count, workflow counts, short-term-storage ready, `configuration/decode`, console output. `genomes` and `unprivileged_tools` return `[]`, which is also the real default.
- **Error stubs:** `{err_code, err_msg}` is fine. At most, capture one real 404 to pin `MessageExceptionModel`.
- **Handlers where the test checks the request body:** `copy_contents`, `contents/bulk`, `bulk/storage/*`, role and group PUTs, password reset.
- **Can't run in CI:** AI and chat endpoints need an LLM backend; the Tool Shed is out of scope.
