# Target object store selector review — iteration 07

Reviewed `client/src/components/History/TargetObjectStoreSelector.test.ts` against all client unit-testing guidance. Both privacy scenarios and their original warning assertions remain. The sharable case also verifies its selected store is rendered. Scenario calls now expose `{ private: true }` and `{ private: false }`, and each mount creates fresh store fixtures, Vue configuration, and testing Pinia. Wrappers unmount automatically.

Reuse follows iteration 06: `getFakeObjectStoreInstance` already returns exactly `UserConcreteObjectStoreModel`, so this selected consumer imports that factory without creating a second abstraction or altering its existing consumers. All original fixture values remain: private/public IDs and names, shared private-store description, disk type, empty template ID, zero template version, null variables, private UUID, visibility flags, empty badges/secrets, and disabled quota. The privacy difference remains explicit alongside the scenario IDs and names. Factory-created mutable defaults no longer persist across tests.

The unused `/api/configuration` handler was removed. Both the permissions response and `/api/object_stores` initialization response remain. A focused test confirmed store creation initiates `/api/object_stores?selectable=true` even when the test subsequently assigns its selectable state; removing that handler caused the expected strict console/request failure, so it was restored rather than suppressing errors or changing production behavior. History permissions still describe manage permissions with no access restrictions, preserving the public-history trigger.

A TypeScript-transpile/VM audit compares both migrated fixture objects with their original counterparts and confirms identical keys and values, including nulls and optional-field presence (`/private/tmp/jest_readability_batch07_object_store_payload_audit.json`).

Validation: initial four-suite run passed all 11 cases; the final selector-only run with the required two handlers passes both cases (`/private/tmp/jest_readability_batch07_selector_final.json`). Scoped ESLint 10 and Prettier pass. No supporting-file edits or counters are needed because the existing helper is unchanged.

Missing guidance: no README addition proposed. The existing advice to reuse test-data factories already describes this follow-through; the observed eager store initialization is useful local evidence rather than a general new rule.
