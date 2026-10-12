# Readability batch 64

Eight originators selected with seed `2610964` from 261 eligible existing tests; [manifest](readability_batch_64.yml). Recorded remote/base `846fdc7466ed` and dev `9ac3cd2eb304` before fetch; rebase unchanged. Larger batch amortizes full-client gates; every originator has its own disposable worktree, commit and independent normal review. Eight tests only; no production, supporting, shared, dependency or guidance edits.

| Originator | Change | Cases |
| --- | --- | ---: |
| [Changes indicator](reviews/batch64/ChangesIndicator.md) | Inferred native mount, owned attachment targets and timer/wrapper cleanup | 4 |
| [Visualization header](reviews/batch64/VisualizationHeader.md) | Typed plugin fixture, required targets and wrapper cleanup | 5 |
| [Registration form](reviews/batch64/RegisterForm.md) | Owned native router/Pinia/wrapper setup and sanitizer history cleanup | 2 |
| [Fetch models](reviews/batch64/fetchModels.md) | Narrow cell/row boundaries, justified schema casts and reusable tag normalization | 7 |
| [Shared checkbox](reviews/batch64/GCheckbox.md) | Owned wrappers and native DOM type inference | 5 |
| [Style checker](reviews/batch64/check-style-imports.md) | Complete multi-violation capture with actual source line numbers | 21 |
| [Jobs table](reviews/batch64/JobsTable.md) | Required semantic sort header and native owned mount | 2 |
| [Toolbox search](reviews/batch64/ToolBoxSearch.md) | Native typed fixtures, owned state and explicit recent-tools defaults | 20 |

All 65 original cases and 179 intended checks remain; the style aggregate case adds one case/check, giving 66 final cases and 180 checks. Fetch-model checks include repeated row-helper calls and five round trips; search's 81 assertion lines are also 81 executed checks in its passing run. The pristine shuffled search run fails one case through inherited recent history; final fixtures explicitly initialize recent tools, and both seeds pass. An unknown recent ID preserves the exact original rendered list while making its filtering path intentional.

The style checker already had clear independent examples. A bounded first-result-only mutation passes all original20cases but fails the added complete-report case; source/test restored in finally and normal final rerun passes. Actual script is byte-identical. Raw V8 reports23locations per ref; five synthetic statements map entirely to comment line2 with changing generated columns. Independent review verifies this artifact: all18actual covered source locations match, with no actual loss. CLI directory scanning is not claimed as covered by this pure-function suite.

Other covered source locations: changes13files/68exact, header7/30exact, registration154/546→548 plus actualUI4/178→181, models13/399exact, checkbox4/23exact, jobs234/416 plus actualUI3/160exact, search364/2486→2490 plus actualUI43/469→480. Gains exercise real cleanup. Existing focused mock/parent API boundaries remain; no contract weakened and no fabricated coverage path added. Existing guidance suffices; no marginal advice added.

Final combined shuffled run passes eight suites and 66 cases (seed 640101, one worker). Full client vue-tsc, all eight absolute-config hooks, diff checks and independent normal, strict, challenge and scope reviews pass. Source-map qualifications above remain explicit. Screenshots and E2E are not relevant to these test-only changes.

Fast-forward published `98e8e836455918807d7c2c7c09a8ca64be807f02`; GitHub confirms the exact head and draft status, with checks recalculating. Eight counters updated after publication; downstream unchanged. Vault records stay local. Shared vault preserves unrelated empty `reviews/Untitled.md`; isolated snapshot excluding only that note passes 122 files with zero errors and 15 existing warnings.
