# activityStore: accepted

Originator: `client/src/stores/activityStore.test.ts`. Cases: **13 → 14**, all passing, no skips.

`createSyncedStore()` removes repeated initialization while leaving later sync actions visible in the scenarios that exercise them. A fresh typed `getUpdatedActivities()` derives the built-in override and mutable custom activity from the mocked default, replacing two repeated metadata blocks. Real FontAwesome definitions replace three string-to-icon casts; the default and customized icons remain distinct. Built-in restoration and custom deletion are independent cases rather than successive scenarios in one test.

Preserved contracts include initial empty state and one synced default, the two stored updates, restoration of built-in metadata while preserving its visibility, unchanged custom metadata, remove-and-resync behavior for both kinds, exact reorder, upper-bound clamping, absent-ID no-op, sidebar changes and absent-ID stability, registered special-panel preservation, unknown-panel reset, unregister-and-resync reset, and ensureVisible before/after. Full arrays and literal booleans strengthen several count/truthiness assertions; unknown visibility updates also preserve the original no-throw check and now assert unchanged activities.

Reuse uses existing `setupTestPinia()`. Activity fixture setup remains local: the scenarios depend on this mocked built-in/custom pair, and other activity tests use different application activity sets. There is no useful additional shared consumer. The existing guidance covers the work; no new advice proposed.

Validation: baseline JSON `/private/tmp/jest_readability_batch11_stores_baseline.json` (40 passing across these five suites); final shuffled JSON `/private/tmp/jest_readability_batch11_stores_final.json` (42 passing, seed 110019). Scoped ESLint and Prettier checks pass. Full client typecheck and independent batch review are owned by the driver. No production changes.
