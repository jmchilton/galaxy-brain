# Codex review: issue_23977_client_api_fanout_26.1

An independent Codex review (`codex exec -s read-only`) ran on `origin/release_26.1...4d184c6672e`, with a brief that contained only the issue goals. It reported 2 findings. I confirmed both in the code, wrote a test that failed for each, fixed both, and folded the fixes into commits 3 and 5. The branch is now `f8d58ca20a1`, 7 commits. Afterwards: 20 branch test files (138 tests) and 223 files (1616 tests) across the touched areas pass, `vue-tsc` is clean and pre-commit passes.

Acted on:
- **P2 `rateLimiter.ts`: retries ran out → it returned the *original* 429.** It now returns the last retry's response. Before, the final response's `Retry-After` was lost, so `useRetryGate` retried after about 1–2 s even when the server had asked for 60 s. Test: "returns the last 429 when retries run out" (red: `Retry-After` was `null`).
- **P2 `HistoryDatasetDetails.vue`: a cached history summary (no `peek`) during a pending retry showed "Dataset attribute 'peek' unavailable."** It now shows loading while the requested attribute is missing and a load is pending. Test: "shows loading, not a missing attribute, while details for a cached summary wait to retry" (red: rendered "unavailable").

Not acted on: none. No security findings.

<details>
<summary>Full Codex output</summary>

```json
{
  "coverage": {
    "files_reviewed": [
      "client/src/api/client/rateLimiter.test.ts",
      "client/src/api/client/rateLimiter.ts",
      "client/src/api/client/index.ts",
      "client/src/api/datasetCollections.ts",
      "client/src/api/datasets.ts",
      "client/src/api/dbKeys.ts",
      "client/src/components/Common/DatasetPopoverLink.test.ts",
      "client/src/components/Common/DatasetPopoverLink.vue",
      "client/src/components/DatasetInformation/DatasetInformation.vue",
      "client/src/components/Grid/configs/invocations.test.ts",
      "client/src/components/Grid/configs/invocations.ts",
      "client/src/components/Grid/configs/invocationsHistory.ts",
      "client/src/components/Grid/configs/invocationsWorkflow.ts",
      "client/src/components/Help/HelpText.vue",
      "client/src/components/Help/HelpPopover.vue",
      "client/src/components/History/Export/HistoryExport.test.ts",
      "client/src/components/History/Export/HistoryExport.vue",
      "client/src/components/History/SwitchToHistoryLink.vue",
      "client/src/components/History/CurrentCollection/CollectionPanel.vue",
      "client/src/components/Markdown/Sections/Elements/HistoryDatasetDetails.test.js",
      "client/src/components/Markdown/Sections/Elements/HistoryDatasetDetails.vue",
      "client/src/components/Markdown/Sections/MarkdownGalaxy.vue",
      "client/src/components/PageEditor/ObjectPermissions.vue",
      "client/src/components/RuleCollectionBuilder.vue",
      "client/src/components/Upload/UploadContainer.vue",
      "client/src/components/Upload/utils.js",
      "client/src/components/Upload/utils.test.ts",
      "client/src/components/Workflow/List/useWorkflowCardBadges.test.ts",
      "client/src/components/Workflow/List/useWorkflowCardBadges.ts",
      "client/src/components/Workflow/Run/WorkflowRerun.test.ts",
      "client/src/components/Workflow/Run/WorkflowRerun.vue",
      "client/src/components/WorkflowInvocationState/WorkflowInvocationState.test.ts",
      "client/src/components/WorkflowInvocationState/WorkflowInvocationState.vue",
      "client/src/components/WorkflowInvocationState/WorkflowStepTitle.vue",
      "client/src/components/providers/storeProviders.js",
      "client/src/components/providers/storeProviders.test.js",
      "client/src/composables/datasetCollections.ts",
      "client/src/composables/keyedCache.test.ts",
      "client/src/composables/keyedCache.ts",
      "client/src/composables/retryGate.test.ts",
      "client/src/composables/retryGate.ts",
      "client/src/composables/uploadConfigurations.ts",
      "client/src/composables/useInvocationMessageStepData.ts",
      "client/src/composables/useWorkflowInstance.ts",
      "client/src/stores/collectionElementsStore.test.ts",
      "client/src/stores/collectionElementsStore.ts",
      "client/src/stores/datasetStore.ts",
      "client/src/stores/datatypeStore.js",
      "client/src/stores/datatypeStore.test.ts",
      "client/src/stores/dbKeyStore.js",
      "client/src/stores/helpTermsStore.test.ts",
      "client/src/stores/helpTermsStore.ts",
      "client/src/stores/historyItemsStore.ts",
      "client/src/stores/historyStore.test.ts",
      "client/src/stores/historyStore.ts",
      "client/src/stores/invocationStore.ts",
      "client/src/stores/services/history.services.ts",
      "client/src/stores/workflowStore.test.ts",
      "client/src/stores/workflowStore.ts",
      "client/src/utils/lastQueue.ts",
      "client/src/utils/sharedPromise.test.ts",
      "client/src/utils/sharedPromise.ts",
      "client/src/utils/simple-error.test.ts",
      "client/src/utils/simple-error.ts",
      "client/src/watch/watchHistory.js",
      "client/package.json",
      "client/vitest.config.mts"
    ],
    "notes": ""
  },
  "findings": [
    {
      "severity": "P2",
      "category": "correctness",
      "file": "client/src/api/client/rateLimiter.ts",
      "line": 110,
      "title": "Preserve the final 429 response when middleware retries are exhausted",
      "detail": "The final retry only logs its failure, then falls through to `return res`, returning the original response. This discards the final response's Retry-After header before apiErrorFromResponse and useRetryGate can honor it. Return the final retryResponse when the retry budget is exhausted.",
      "failure_scenario": "The initial GET and first two retries return 429 without Retry-After; the third retry returns 429 with Retry-After: 60. The middleware returns the initial response without that header, so a reactive history or dataset consumer schedules another request after 1–2 seconds instead of treating the 60-second delay as exceeding the retry gate's cap. Confirmed by executing the middleware source.",
      "confidence": "certain"
    },
    {
      "severity": "P2",
      "category": "correctness",
      "file": "client/src/components/Markdown/Sections/Elements/HistoryDatasetDetails.vue",
      "line": 44,
      "title": "Show loading when cached dataset summaries lack the requested details",
      "detail": "useDatasetStore can contain a summary saved by the history watcher, and its getter fetches details when `peek` is absent. The new loading expression requires the dataset object to be absent, so it suppresses the spinner for these summaries while getDatasetError hides the retryable error. The template consequently reports a missing attribute during a pending retry.",
      "failure_scenario": "The history watcher caches dataset-1 with its name and state but no peek. A history_dataset_peek directive requests details and receives 503. During backoff, isLoadingDataset is true and getDatasetError is null, but this component renders \"Dataset attribute 'peek' unavailable.\" instead of loading. Confirmed by executing the store and component script sources with that cached summary.",
      "confidence": "certain"
    }
  ]
}```

</details>
