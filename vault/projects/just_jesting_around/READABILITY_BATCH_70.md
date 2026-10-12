# Readability batch 70

Eight origins selected with seed `2610970` from 213 eligible tests; [manifest](readability_batch_70.yml). Recorded base/remote `e18fb0be8360e47ed3e682eddf0192d3589f5bf5` and dev `9ac3cd2eb304f2860c0daf3afea0cc777f9e5cd6` before fetch; rebase unchanged. Separate disposable author worktrees and per-origin commits.

All 67 original cases and 153 executed checks remain. AWS's aggregate examples become named cases, yielding 69 final cases with the same 153 checks. Counts include expanded PageForm request-body and GTable title-variant observations. Existing canonical plugin, indexed-target, fixture and assertion helpers are reused; no production, shared helper, support, dependency or guidance edits.

| Originator | Change | Cases / checks |
| --- | --- | ---: |
| [Page form](reviews/batch70/PageForm.md) | Native options and owned mounts while preserving real localization | 10 / 30 |
| [AWS estimate](reviews/batch70/AwsEstimate.md) | Named resource examples and owned native wrappers | 4 / 12 |
| [Bar chart](reviews/batch70/BarChart.md) | Inferred props and owned embed/view teardown | 15 / 20 |
| [History options](reviews/batch70/HistoryOptions.md) | Explicit owned stores and required shallow targets | 13 / 26 |
| [Upload form](reviews/batch70/FormUpload.md) | Named content and owned synchronous mount checks | 2 / 5 |
| [Shared table](reviews/batch70/GTable.md) | Native generic props, typed controls and owned DOM targets | 10 / 27 |
| [Store-first search](reviews/batch70/storeFirst.md) | Real fixture contract and finally-settled pending answers | 12 / 25 |
| [Workflow collection input](reviews/batch70/FormInputCollection.md) | Native partial input boundary and owned debounce timers | 3 / 8 |

Every covered source location remains. Native maps: page 33 files/352 locations exact; AWS 16/81→17/89; chart 144/380→384; history 148/586→592; upload 13/32 exact; table 14/402→23/409; search 24/255 exact; collection input 358/674→682. Actual external shared UI: page 23/137 exact, AWS 43/158 exact, chart 26/13 import/setup only, history and collection input 43/37 import/setup only. Table's adjacent actual shared UI is instrumented directly: eight positively covered files/399 locations exact (three additional unexecuted map entries excluded from this positive count). All imported totals are qualified; no claim that every transitive UI renders. Gains reflect owned disposal and canonical helper setup.

PageForm's ignored legacy directive override is removed rather than activated during native-options migration, retaining the original real localization paths. Chart pending embed work settles before unmount/finalization. Collection input keeps its original shallow children and 500-millisecond event/timer sequence; clearing test-owned timers does not claim new production cancellation. Existing guidance suffices; no new abstraction or unresolved marginal advice.

The initial full type gate caught fixture excess state and an incomplete full-Step assertion. Corrections preserve the original runtime fields/checks: the list checks its production interface plus existing test state, and collection input verifies its supplied fields against Pick before an explicitly documented partial schema boundary. Corrections are folded into their originating unpublished commits using the recorded immutable base. Final gates and reviews use the corrected SHA.

Corrected final combined shuffled run passes eight suites/69 cases, seed 700101 with one worker. Full client types and absolute-config hooks pass on corrected head; all file lint/format, clean/diff/trailer checks and fresh later-ownership audit pass. Independent corrected two-suite run passes 15 cases at 700201. All eight normal reviews and strict/challenge/scope approve corrected final head. Screenshots/E2E not relevant. Completed vault snapshot excluding unrelated empty reviews/Untitled.md passes 122 files, zero errors and 15 existing warnings.

Fast-forward published `923ac5312656dc6aafbf8f78f2701945cc2aa4b4`; exact GitHub head and retained draft verified. Normal, strict, challenge and scope reviews approve. Eight originating counters updated only after publication; downstream unchanged. Vault records committed locally only; ci_wait.
