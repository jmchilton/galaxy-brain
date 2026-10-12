# Readability batch 63

Four originators selected with seed `2610963` from 265 eligible existing tests; [manifest](readability_batch_63.yml). Recorded remote/base `463e67451e71` and dev `9ac3cd2eb304` before fetch; rebase unchanged. Four test files only; no production, helper, supporting, dependency or guidance edits.

| Originator | Change | Cases |
| --- | --- | ---: |
| [Extension stripping](reviews/batch63/stripExtension.md) | Report all 17 exact filename/output examples independently in six behavior groups | 17 |
| [New-user confirmation](reviews/batch63/NewUserConfirmation.md) | Owned native router/Pinia/wrapper setup and location descriptor restoration | 1 |
| [History storage indicator](reviews/batch63/HistoryStorageOperationsIndicator.md) | Typed required lookups, owned Pinia, failure-safe wrapper cleanup | 1 |
| [Persistent toggle](reviews/batch63/persistentToggle.md) | Owned effect scope/Pinia and exact salt-key restoration | 2 |

All 33 original checks remain. Ten grouped baseline cases become 21 final cases by splitting extension examples, without adding or dropping a filename/output pair. Combined shuffled seed 630101 passes all four suites; independent normal reviews use 630201.

Source coverage retains every original location: extensions 4 files/31 locations, confirmation 20/113 plus actual GAlert/GButton 2/135, storage indicator 17/78 plus actual GPopover/GButton/GButtonGroup 3/192, toggle 4/11. The synchronous storage-indicator case retains its original explicit successful unmount timing; auto-unmount additionally handles failures. A diagnostic found automatic-only cleanup changes deferred popover coverage, so no timing change or coverage exception was accepted. Persistent-toggle setup restores only the salt key it uses, after scoped effects and Pinia stop, preserving unrelated storage. Existing tests retain their actual contracts without claims of keyboard traversal or persistence round trips.

File lint, formatting and hooks pass. [Scope](reviews/batch63/scope.md) retains four origins; no rendered UI changes need screenshots/E2E. Existing guidance suffices; no marginal advice added.

Full integrated client vue-tsc and all hooks pass. Four independent normal reviews, [test challenges](reviews/batch63/test_challenges.md) and [strict maintainability](reviews/batch63/maintainability.md) approve without required corrections. Fast-forward published `846fdc7466ed145ef8bab8fdf76a10bdb2c0476e`; GitHub confirms exact head and draft status, mergeability initially recalculating. Four origin counters written after publication; downstream unchanged. Shared vault retains the unrelated empty `vault/reviews/Untitled.md`; isolated Markdown snapshot excluding only that scratch note passes 122 files with zero errors and 15 existing warnings. Vault records local only.
