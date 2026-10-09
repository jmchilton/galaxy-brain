# DownloadItemCard readability review

Selected originator: `client/src/components/Downloads/DownloadItemCard.test.ts`.

Read `LOOP_ITERATION.md`, client testing best practices, the card, both monitor interfaces, the persistent-monitor composable suite, the persistent-progress alert suite, shared Vitest helpers, and clipboard tests elsewhere in the client.

All nine cases and 43 assertion statements remain. Running, ready, expired, and failed badges/actions still have all their original positive and negative assertions. Title, description, navigation, download, deletion payload, clipboard call count, and copied task ID checks are preserved. Navigation now verifies the exact history route instead of merely finding its object ID within the route. Assertions still use the rendered card and emitted events; no component internals are inspected.

Each mount builds fresh typed monitor refs, spies, monitoring data, and global configuration. Scenario state overrides appear in the mount call, replacing a separate mutable mock update followed by mounting. The old module-level persistent mock return could leak the failed state into the subsequent navigation scenario, because `clearAllMocks` clears calls but preserves return implementations. Fresh construction removes that dependency. The persistent result interface is sufficient; its previous inherited TaskMonitor-only methods were unused by this component and are omitted.

Mounts use the component's inferred type and native Vue Test Utils options, with automatic unmounting. Existing `emittedArg` replaces manual `nth(...)[0]` access. The fixture's creation and expiry dates are fixed one hour apart; the tested expiration state remains an explicit monitor ref. Clipboard uses a scoped spy on the existing happy-dom `writeText` method, restored after each case, instead of replacing the browser property without restoring it.

Implemented reuse: `client/tests/test-data/monitoring.ts` provides `getFakeMonitoringData(request, overrides)`, also consumed by `client/src/composables/persistentProgressMonitor.test.ts` and `client/src/components/Common/PersistentTaskProgressMonitorAlert.test.ts`. The required request remains visible, its task type determines the monitoring task type, and returned request/object structures are fresh. The default start date is current time because real expiration consumers need an unexpired task; the selected card overrides it with a fixed date. Supporting migrations replace only repeated data construction and imports, preserving IDs, final-state flags, the explicit expired timestamp, and all original assertions. No shared monitor mock is added: these supporting suites exercise the real persistent composable using a TaskMonitor input, whereas the card replaces the composable's result.

Baseline and final cases/assertion statements:

| Suite | Cases | Assertion statements |
| --- | ---: | ---: |
| DownloadItemCard | 9 → 9 | 43 → 43 |
| persistentProgressMonitor | 4 → 4 | 5 → 5 |
| PersistentTaskProgressMonitorAlert | 7 → 7 | 21 → 21 |

Guidance decision: no addition. Fresh fixtures and lifecycle cleanup follow existing principles. A generic warning that clearing mocks does not reset implementations would be basic framework guidance; there is no Galaxy-specific nugget missing here. Clipboard consumers in Tool utilities, AuthoringHelpPanel, and WorkflowInvocationShare share a standard Vitest spying operation, not a domain abstraction requiring a new helper.

Validation: supporting baseline passed all 11 cases across two suites. The final selected/supporting run passed all 24 cases across five suites. Formatting passes. Scoped ESLint has no errors; its one `any` warning in the persistent-monitor suite's existing serializer is unchanged. Full client type-check is delegated to the iteration driver.
