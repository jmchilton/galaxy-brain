# datasetCollectionStore: accepted

Originator: `client/src/stores/datasetCollectionStore.test.ts`. Cases: **6 → 6**, all passing, no skips.

The cached collections now have descriptive names. Existing `getFakeCollectionSummary()` and `setupTestPinia()` provide shared defaults and isolated Pinia. The mixed-history dataset is a correctly typed two-field `HistoryContentItemBase`, replacing `as never`; `mockDetailedCollection()` already satisfies `HDCADetailed` through the summary plus elements, so its cast and the handler's path-parameter cast were unnecessary.

Preserved contracts include an initially empty cache, both saved collection IDs and payloads, exclusion of datasets, cached summary returned without a request, initial missing-entry null followed by one request and detailed data, summary upgrade through one request, and no repeated fetch after detailed caching. Detailed payload assertions now compare the complete expected object instead of nullable/property-presence checks. The summary-upgrade test also observes the still-cached summary while detail loads.

The detail conversion is three lines and has one consumer. Other collection fixtures reviewed use summary pagination or intentional partial producing-job metadata, so introducing a new detailed factory would not improve those scenarios. No supporting edits or new shared helper. Existing guidance already covers inference and factories; no new advice proposed.

Validation: baseline JSON `/private/tmp/jest_readability_batch11_stores_baseline.json` (40 passing across these five suites); final shuffled JSON `/private/tmp/jest_readability_batch11_stores_final.json` (42 passing, seed 110019). Scoped ESLint and Prettier checks pass. Full client typecheck and independent batch review are owned by the driver. No production changes.
