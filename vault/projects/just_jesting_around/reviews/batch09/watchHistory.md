# watchHistory

Selected originator: `client/src/watch/watchHistory.test.js`.
Baseline: 2 cases. Final: 2 cases.

Calls the actual Pinia stores directly rather than mounting an otherwise empty component to expose store methods. A short item helper makes the original IDs, HIDs, names and states visible; a local serveHistory helper removes duplicated handlers. The contents handler now uses the generated path, with a response.untyped escape for the intentionally sparse legacy item payload. The legacy current_history_json route remains untyped because it has no generated path.

Each scenario resets the module registry and imports the watcher, its participating stores and setupTestPinia from that same fresh registry. The watcher's module-level lastUpdateTime cursor is therefore fresh independently of Pinia, and the original timestamps 0, 0.1 and 1 no longer depend on the other test running first. No production reset hook or increasing cross-test timestamp was introduced.

Retained contracts: two loaded items; the second/name filter returning HID 2; the state:ok filter returning HID 1; current history selection and initial two-item load before failure; recovery updating the history to three items after receiving only the new third item. The former try/catch could pass when the request unexpectedly resolved. It now requires an actual rejection containing 500 and checks the existing two items still exist after failure. Handler resets remain at the failure and recovery boundaries, preserving the absence of an unrelated contents success handler during the failing request.

Reuse: setupTestPinia has concrete existing store consumers and is reused here. The sparse item helper is local: no existing typed full-dataset factory matches these eight-field legacy fixtures, and no second consumer justified a new shared abstraction.

Guidance: existing README advice to keep scenarios independent covers the principle. The same-registry imports are a local consequence of this watcher's circular store dependencies and module cursor. Record that reason in the suite, without expanding general advice.

Validation: shuffled invocation/window/watcher run, seed 90113, passes all 33 cases, including this suite's 2. Current ESLint with zero warnings, Prettier and git diff --check pass. Full client typechecking and independent batch review are tracked by the driver. JSON evidence: `/private/tmp/jest_readability_batch09_stores_watch.json`.
