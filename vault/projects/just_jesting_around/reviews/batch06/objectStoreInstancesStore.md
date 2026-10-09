# Object-store instances store review — iteration 06

Reviewed `client/src/stores/objectStoreInstancesStore.test.ts` against the client testing guidance. All five scenarios and six assertions remain: initial fetched/error state, initialized instance count and fetched state, lookup by UUID/name, and error message extraction. Store actions now await their exposed promises; fresh Pinia setup continues through the existing `setupTestPinia` helper.

A typed `getFakeObjectStoreInstance` factory in `client/tests/test-data/objectStores.ts` replaces the long fixture and the asserted template-type cast. Tests retain the UUID and expected name at their point of use. Defaults create fresh badges, variables, secrets, and quota objects on every call.

The concrete supporting consumer is `client/src/components/ObjectStore/Instances/InstanceDropdown.test.ts`: its long fixture uses the same object-store model, so it now supplies only its differing fields to the factory. Its two success/failure scenarios and all five assertions remain untouched. Explicit nulls for description, object-store ID, device, expiration, and variables remain explicit. Only this originating store test receives an iteration counter; the dropdown remains eligible for a full review.

A TypeScript-transpile/VM audit compared the original store and dropdown payloads with the new factory-produced objects. Both retain identical keys and values, including `undefined`, nulls, and omitted optional properties. Existing `ConfigTemplates/test_fixtures.ts` contains upgrade-specific variables and secrets; those scenario defaults were not imposed on these tests.

Validation: five selected store cases and two supporting dropdown cases pass. Dropdown baseline passed two cases before the migration (`/private/tmp/jest_readability_batch06_dropdown_baseline.json`). Combined DatasetStorage/store/dropdown final run passes all 10 cases across three suites (`/private/tmp/jest_readability_batch06_storage_results.json`). Scoped ESLint and Prettier pass for both selected files, the helper, and the supporting consumer.

Missing guidance: no README addition proposed. Existing factory guidance already supports this two-consumer abstraction. No unresolved shared-abstraction proposal needs marginal advice.
