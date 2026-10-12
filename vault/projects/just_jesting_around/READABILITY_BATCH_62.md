# Readability batch 62

Four originators selected with seed `2610962` from 269 eligible existing tests; [manifest](readability_batch_62.yml). Recorded remote/base `4451d737bde7` and dev `9ac3cd2eb304` before fetch; rebase unchanged. Four test files only; no production, helper, supporting, dependency or guidance changes.

| Originator | Change | Cases |
| --- | --- | ---: |
| [Library routes](reviews/batch62/library-routes.md) | Narrow the actual route-props callback instead of casting it | 2 |
| [Visualization unsaved changes](reviews/batch62/VisualizationUnsavedChanges.md) | Owned iframe attachment target, wrapper/Pinia/timer cleanup and native plugins | 2 |
| [Storage download](reviews/batch62/StsDownloadButton.md) | Owned polling/deferred cleanup and explicit public poll-error behavior | 7 |
| [Dataset index](reviews/batch62/DatasetIndex.md) | Typed setup-owned computed mock, stable table lookup and exact child props | 7 |

All 40 original checks and 17 cases remain; one polling-error case and six new checks bring the final total to 18 cases/46 checks. The original waiting-poll case leaked its mounted component into later handlers; changing only its successful-path unmount reproduced exactly 63 incidental error-flow locations lost under proper cleanup. The new real pending-poll→500 case asserts toast, spinner reset and no navigation, retaining all original covered locations without the leak. Original in-flight ready/not-ready and delayed-prepare cancellation assertions remain.

DatasetIndex now targets GTable rather than generated ID zero or an assumed stub tag. A pristine independent shuffled run exposed the ID's order dependence. Original table/error HTML checks remain; exact field and stripped-subdirectory item props strengthen their public child contract. An identity-prefix mutation passes the original suite but fails only the new item assertion; source/test restored in finally and normal final rerun passes.

Source-location coverage: routes 4files/12locations exact; unsaved 142/437→442 through real LoadingSpan; downloads 30/353 plus actualGButton1/57 exact; dataset index31/91exact. Existing iframe module-loading warnings occur at both refs; successful Vitest exits have no unhandled test errors. Independent normal reviews use seed620201. [Scope](reviews/batch62/scope.md) retains four origins, no screenshots/E2E relevant. Existing guidance suffices; no marginal advice added.

Final combined shuffled seed620101 passes18cases; full integratedclient vue-tsc and allhooks pass. Four independentnormal reviews, [test challenges](reviews/batch62/test_challenges.md) and [strict maintainability](reviews/batch62/maintainability.md) approve. Fast-forward published `463e67451e71ef0e753cdd28a73c20279d294723`; exactGitHubhead/draft verified, mergeability initiallyrecalculating. Four origin counters afterpush; downstream unchanged. Sharedvault preserves unrelated empty `vault/reviews/Untitled.md`; isolated Markdownsnapshot excludingonlythatscratchnote passes122files/zeroerrors/15existingwarnings. Vaultrecords localonly.
