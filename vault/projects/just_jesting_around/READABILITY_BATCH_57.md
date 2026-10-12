# Readability batch 57

Four originators selected with seed `2610957`; [manifest](readability_batch_57.yml). Recorded base/remote `5eeeb57ef4d` and dev `9ac3cd2eb304` before fetch; rebase unchanged. Four tests only; no helper, supporting, production, dependency or documentation edits.

| Originator | Change | Cases |
| --- | --- | ---: |
| [History service](reviews/batch57/history.services.md) | Typed MSW handlers, scenario-local query captures and exact request counts | 2 |
| [Window manager](reviews/batch57/WindowManagerWindow.md) | Native mount options, owned Pinia and pointer/listener/timer cleanup | 6 |
| [Confirmation dialog](reviews/batch57/ConfirmDialog.md) | Typed service ref, local wrapper setup and owned DOM hosts | 6 |
| [Saved rules](reviews/batch57/SavedRulesSelector.md) | Deterministic fixtures, awaited interactions and exact selection events | 3 |

All 46 original checks remain or are strengthened, with two request-count checks added. Pointer capture, cancellation, second-pointer handling and controls/focus transitions remain intact. Dialog true/false/null outcomes, custom text, concurrent request and abort behavior remain intact. Saved-rule sorting retains distinct older/newer mapping payloads.

Final integrated gate passes 17 cases, shuffled seed570101 with one worker. Full client vue-tsc, lint, formatting and repository hooks pass. Independent normal reviews, [test challenges](reviews/batch57/test_challenges.md), [strict maintainability](reviews/batch57/maintainability.md) and [scope](reviews/batch57/scope.md) approve. Review identified the window store's save timer surviving Pinia disposal; scoped fake timers now discard pending saves after component unmount. Independent shuffled reruns and exact coverage comparisons approve this correction.

No covered source location lost: history services 16 files/49 locations; saved rules 16/105; window manager 19/237 retained plus three existing unmount locations; confirmation default 8/76 and explicitly included actual shared modal/alert/button sources 428 locations exact. Existing guidance suffices; no marginal advice added. Screenshots/E2E not relevant to test-only changes.

Fast-forward pushed `59f471a92924266a30e4aa849b7b15e9539c16e7`; GitHub confirms exact head and MERGEABLE, draft retained; 13 queued checks, 15 running, two completed at final snapshot. Origin counters follow publication; downstream unchanged. Vault records remain local. Full workspace validation encounters an unrelated empty `vault/reviews/Untitled.md`; an isolated snapshot excluding only that scratch note passes 122 files, zero errors and 15 existing warnings before the ledger commit.
