# Readability batch 61

Four originators selected with seed `2610961` from 273 eligible existing tests; [manifest](readability_batch_61.yml). Recorded remote/base `9b952a0b874d` and dev `9ac3cd2eb304` before fetch; rebase unchanged. Four test files only; no supporting, shared, dependency, production or guidance edits.

| Originator | Change | Cases |
| --- | --- | ---: |
| [Schema Markdown](reviews/batch61/schemaMarkdown.md) | Retain readable scenarios; add nested input non-mutation check | 5 |
| [Curated workflows](reviews/batch61/CuratedWorkflowList.md) | Owned Pinia/router/wrapper cleanup, native typed mounts, accurate partial response boundary and required action targets | 23 |
| [Form messages](reviews/batch61/FormMessage.md) | Scenario-local wrappers, owned fake timers and cleanup | 2 |
| [Notification form](reviews/batch61/NotificationForm.md) | Native plugin/stub setup and owned wrapper/Pinia teardown | 1 |

All 94 original checks remain; nested non-mutation brings the total to 95. Combined shuffled seed 610101 passes 31 cases in four suites; all independent normal reviews use 610201. The bounded nested mutation passes all original schema cases but fails the added check; source/test restored in finally, normal final rerun passes, and no production mutation committed.

No source-location loss: schema 5 files/36 locations exact; curated 177/1692→1694 plus actual shared UI 4/164 exact; form messages with actual GAlert 2/105 exact; notifications 345/1447→1450 plus actual UI 2/119 exact. Gains exercise component unmount cleanup. Original curated cache, query exclusion, deferred response, pagination fallback, sorting and collection/filter transitions remain; notification assertions retain their limited submit-button smoke contract. File lint, formatting and repository hooks pass. [Test challenges](reviews/batch61/test_challenges.md) and [scope](reviews/batch61/scope.md) approve; no rendered UI changes require screenshots/E2E. Existing guidance suffices; no marginal advice added.

Full integrated client vue-tsc passes; [strict maintainability](reviews/batch61/maintainability.md) approves. Fast-forward published `4451d737bde7225529f3c476ef48299c6e921b27`; GitHub confirms exact head/draft, mergeability initially recalculating. Four origin counters written after publication; downstream unchanged. Shared vault retains unrelated empty `vault/reviews/Untitled.md`; fresh isolated Markdown snapshot excluding only that scratch note passes 122 files/zero errors/15 existing warnings. Vault records local only.
