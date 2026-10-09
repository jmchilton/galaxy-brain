# Sidebar selection review — iteration 09

Selected originator: `client/src/composables/useSidebarSelection.test.ts`. Baseline and final: **18→18** cases.

Read the problem/goal, loop instructions, marginal advice and client unit-testing guidance. Replace repeated ref/composable arrangement with a local `createSelection(...ids)` that returns the real reactive items and composable API. IDs and each scenario's actions remain visible; tests changing the item list retain its ref. Use existing `setupTestPinia()` instead of a testing Pinia whose actions were already unstubbed. Real `MouseEvent` values replace sparse event casts.

Coverage audit preserves initial empty selection/mode, mode-on/off clearing, toggled membership, multiple membership, select/deselect-all, empty and changing lists, ignored clicks outside selection mode, consumed toggle clicks, forward/backward shift ranges, shift-click without an anchor, anchor reset after toggling mode, pruning stale selections, empty-list mode exit and remaining-list mode retention. Every original action and assertion remains; no cases are merged or removed.

Reuse: the existing Pinia helper has established consumers. The ID-based arrangement serves this file's eighteen scenarios; no second consumer needing this exact arrangement was identified, so it stays local. No new shared helper or supporting migration is needed.

Guidance: existing advice on direct composable calls and readable domain setup applies. No gap warrants a README or marginal-advice addition.

Validation: scoped shuffled Vitest seed **90123** passes **64/64** cases across all four assigned suites. JSON: `/private/tmp/jest_readability_batch09_composables_utils.json`. Current-config scoped ESLint reports zero warnings/errors, and Prettier checks pass. The driver performs combined-suite validation and full client typechecking. No production, configuration, dependency or supporting-suite changes.
