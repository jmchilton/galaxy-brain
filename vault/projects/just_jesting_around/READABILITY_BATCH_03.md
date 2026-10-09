# Readability batch 03

Five uniterated tests selected with seed `2991699491`, one per category. [Manifest](readability_batch_03.yml). Reuses branch/worktree `jest_readability_batch_01`; the first two iteration commits remain unchanged.

| Category | Selected test | Result |
| --- | --- | --- |
| Component | `Cleanup/CleanupResultDialog.test.ts` | Scenario-local results, shallow parent mount with real table rows, exact item/error and freed-space checks. Four cases retained. [Review](reviews/batch03/CleanupResultDialog.md). |
| Composable | `composables/urlTracker.test.ts` | Behavior/condition names and meaningful navigation/context names; all thirteen cases and 65 assertions retained. [Review](reviews/batch03/urlTracker.md). |
| Store | `stores/collectionAttributesStore.test.ts` | Existing Pinia setup reused, typed direct response, exact request ID/count, awaited cache-hit negative check. Two cases retained. [Review](reviews/batch03/collectionAttributesStore.md). |
| Utility | `utils/url.test.js` | Ten grouped cases become 37 independent named cases. All original inputs, whitespace, omitted arguments, matchers, and expected values preserved. [Review](reviews/batch03/url.md). |
| API | `api/datasets.test.ts` | Inferred request types and schema escape hatch replace six casts; handlers respond from their own requests. All three cases, batching and concurrency checks retained. [Review](reviews/batch03/datasets.md). |

## Reuse and follow-through

Added `Cleanup/test-utils.ts` with a complete typed `getFakeCleanableItem` factory. The selected result-dialog suite and two neighboring supporting suites now share item defaults; identifying IDs/names remain visible, 512-byte dataset inputs remain unchanged, and an unused wall-clock timestamp becomes fixed. The supporting `CleanupOperationSummary` and `ReviewCleanupDialog` changes only migrate imports and item declarations, preserving all nine cases and eighteen assertion statements. Their different operation/mount arrangements remain local.

Completed the notification-factory follow-up from iteration 02 in its existing helper and both consumers. Typed category-specific content and notification overrides replace mutations/spreading; defaults use meaningful fixed content, valid timestamps, and an unread state. List fixtures have unique IDs and mixed read states in both categories, with fresh fixtures per case. Card explicitly enumerates all four formerly randomized shared-item types. Its eleven cases become fourteen; List retains three cases and adds two fixed unread-count checks. [Follow-up review](reviews/batch03/notifications.md).

The sample is the starting point for this reuse, consistent with [LOOP_ITERATION.md](LOOP_ITERATION.md). Only the five selected originators receive `iterated: 1`. Supporting cleanup and List suites remain eligible for full review; NotificationCard retains its iteration-02 counter. No other inventory counters change.

No README addition is warranted. Existing guidance covers the changes; generic deterministic-fixture or timing advice would add little. The notification follow-up is implemented, leaving no unresolved [marginal advice](MARGINAL_ADVICE.md).

## Validation and review

The nine suites in this iteration have 55 baseline cases (32 selected, 23 supporting) and 85 final cases (59 selected, 26 supporting). All 21 affected suites across the three iterations pass 359 cases. Additional cases expose existing URL combinations and shared-item types individually. Independent audits confirm exact preservation of all 37 URL input/assertion combinations and all 65 tracker assertions; other original assertions remain or are strengthened.

Prettier and scoped ESLint pass, with two pre-existing `any` warnings in the supporting ReviewCleanupDialog suite. Full client type-check validation is being finalized after isolating template inference from a test mount; no production changes are planned. Local tests use `NODE_OPTIONS=--no-webstorage` for Node 25/happy-dom browser storage.

[Independent normal review and fresh test challenge](reviews/batch03/normal_review.md) found no blocking findings. [Scope review](reviews/batch03/scope_evaluation.md) retains all eleven source files: nine unit suites and two test helpers. [Screenshot review](reviews/batch03/screenshot_debrief.md) found screenshots irrelevant because production UI and E2E tests are unchanged. No PR is opened. The first two iteration commits remain unchanged; this iteration will be a third commit on the same branch/worktree.
