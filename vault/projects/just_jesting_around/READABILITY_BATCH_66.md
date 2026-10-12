# Readability batch 66

Eight origins selected with seed `2610966` from 245 eligible existing tests; [manifest](readability_batch_66.yml). Recorded base/remote `a0dc0eccc9e8` and dev `9ac3cd2eb304` before fetch; rebase unchanged. Every origin has a separate disposable author worktree and commit.

All 101 original cases and 275 intended successful checks remain; waitFor retries can execute additional checks. The activity missing-flag scenario adds one case/two checks and full citation-warning preservation adds one check, giving 102 cases/278 checks. Both additions detect bounded mutations that the original suites miss; production and test files restore in finally.

| Originator | Change | Cases / checks |
| --- | --- | ---: |
| [Workflow linting](reviews/batch66/useLinting.md) | Typed metadata arrangement and owned effects/stores | 18 / 50 |
| [Collection progress](reviews/batch66/CollectionProgress.md) | Required progress targets and owned native wrappers | 4 / 8 |
| [Activity availability](reviews/batch66/activitySetup.md) | Named typed fixture and missing loaded flags | 6 / 11 |
| [Storage preferences](reviews/batch66/SelectPreferredStore.md) | Native owned mount and typed request capture | 4 / 16 |
| [Dropdown](reviews/batch66/GDropdown.md) | Native templates, owned DOM/FloatingUI/deferred cleanup | 41 / 129 |
| [Storage monitor](reviews/batch66/shortTermStorageMonitor.md) | Owned scoped/unscoped polling and pending-response cleanup | 9 / 32 |
| [Upload monitor](reviews/batch66/uploadDatasetMonitorStore.md) | Owned stores/shared state and timer cleanup ordering | 18 / 26 |
| [Citation services](reviews/batch66/Citation-services.md) | Exact BibTeX bytes in readable fields and complete warnings | 2 / 6 |

Every actual covered source location is retained. Default maps: lint55 files/504→506, activity5/23 exact, preferred150/982→1002, dropdown17/25 exact, storage25/250→253, upload22/441 exact, citation9/38 exact; collection29/106 exact. Actual external UI retains preferred43/315→326 and dropdown7/319 exactly. Gains exercise real fixture initialization and cleanup. Partial fixtures preserve omissions rather than adopting factory defaults that change inputs. No production/support/helper/dependency/guidance changes; existing guidance suffices.

Final combined shuffled run passes eight suites and 102 cases (seed 660101, one worker). All eight absolute-config repository hooks and diff checks pass. Final independent normal, strict, challenge and scope reviews approve. The initial full type gate caught required-lookups with exists, a non-void cleanup return and unsupported narrow partial-schema assertions. Corrections preserve the original presence checks/fields, explicitly return void and retain documented original schema boundaries; folded into the corresponding originator commits. The corrected combined suite/hooks and independent three-file shuffled run pass. Corrected full client types pass. Screenshots and E2E are not relevant to the eight test-only changes.

Fast-forward published `1aefd1948d079abfc2d179f62c4d07a323b8daa0`; exact GitHub head and draft verified, ci_wait. Eight counters updated after publication; downstream unchanged, vault records local only. Shared vault preserves unrelated empty `reviews/Untitled.md`; isolated snapshot excluding only that note passes 122 files with zero errors and 15 existing warnings.
