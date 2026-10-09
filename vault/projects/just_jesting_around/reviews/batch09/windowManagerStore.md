# windowManagerStore

Selected originator: `client/src/stores/windowManagerStore.test.ts`.
Baseline: 11 cases. Final: 11 cases.

Reused `setupTestPinia()` at both fresh-store boundaries. Named the two participating windows `firstWindow` and `secondWindow`, grouped related window fields in object matchers, and kept the saved window's title, URL, position and dimensions in one visible value used for the round-trip assertion. Teardown clears this suite's pending save timers and localStorage as well as restoring real timers.

Retained contracts: initial inactive state and both toggle directions; added window count, title, URL, default 600x400 size, non-minimized/non-maximized state and focus; removal/refocus and empty-store focus; both zIndex ordering assertions; exact position 123/456 and size 800/500; minimize and restore focus transitions; maximizing clears minimization; beforeUnload with zero/one windows; delayed persistence and restoration into a genuinely fresh store, initially empty and then active with one matching saved window; existing tool_id plus hide_panels and hide_masthead URL parameters; visible masthead tab ID and its onclick action.

Reuse: existing Pinia helper is sufficient. These short arrangements do not justify a window fixture factory; the tests intentionally exercise the real store.add action.

Guidance: existing advice covers scenario-local setup and reuse. No evidence of missing general guidance emerged.

Validation: shuffled invocation/window/watcher run, seed 90113, passes all 33 cases, including this suite's 11. Current ESLint with zero warnings, Prettier and git diff --check pass. An initial edit left two renamed variable references; the first shuffled run exposed them and they were corrected before the final passing run. Full client typechecking and independent batch review are tracked by the driver. JSON evidence: `/private/tmp/jest_readability_batch09_stores_watch.json`.
