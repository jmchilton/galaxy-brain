# Readability batch 65

Eight originators in separate disposable worktrees, selected with seed `2610965`; [manifest](readability_batch_65.yml). Recorded base/remote `98e8e8364559` and dev `9ac3cd2eb304` before fetch; rebase unchanged. The sampling pool included the known DataDialog bug, which was not drawn; all selected files pass the full eligibility audit. Valid eligible pool: 253.

Prepared changes retain 86 original cases and 275 intended checks, including repeated history layout/dataset/deletion checks and all nine color observations per loop. Escape reopening adds two meaningful checks and unaffected markdown adds four, for 281 final checks. No original assertion is removed, including the four inherited markdown self-comparisons; exact input comparisons provide their missing behavioral observations.

| Originator | Change | Cases / checks |
| --- | --- | ---: |
| [Markdown parser](reviews/batch65/parse.md) | Literal directive-fixture reuse and exact unchanged-input checks | 24 / 40 |
| [Tool utilities](reviews/batch65/utilities.md) | Scoped clipboard descriptor restoration and native mock typing | 3 / 7 |
| [Color selector](reviews/batch65/ColorSelector.md) | Awaited native updates, required buttons and owned wrappers | 3 / 21 |
| [History view](reviews/batch65/HistoryView.md) | Owned stores/router/wrappers and canonical deferred cleanup | 8 / 114 |
| [Escape stack](reviews/batch65/escapeStack.md) | Mutation-proven reopened-layer removal checks | 5 / 9 |
| [Chat mode selector](reviews/batch65/ChatModeSelector.md) | Native owned mounts and accurate button helper typing | 24 / 25 |
| [Sanitizer](reviews/batch65/sanitizeHtml.md) | Inferred narrow hook callback preserving Node-policy checks | 10 / 43 |
| [Dataset provider](reviews/batch65/datasets.md) | Canonical typed API fixtures and owned store scope | 9 / 22 |

Every actual covered source location remains. Default comparisons: parser four files/146 exact; utilities eight/24 exact; color 14/48 exact; history 340/2791→2797; escape four/20 exact; chat 36/252 exact; sanitizer four/45 exact; datasets 152/622→628. Actual external UI comparisons retain history 23/516 exactly, chat three/101→103 and datasets imported modules 43/37 exactly (the provider suite does not render that UI). Gains exercise real cleanup. No production, supporting, shared, dependency or guidance edits; existing guidance is sufficient.

Final combined shuffled run passes eight suites and 86 cases (seed 650101, one worker). Full client vue-tsc, all eight absolute-config hooks and diff checks pass. Independent normal, strict, challenge and scope reviews approve; screenshots and E2E are not relevant to these test-only changes.

Fast-forward published `a0dc0eccc9e8be67715f0390337c0e2f969cc022`; GitHub confirms exact head and draft status, ci_wait. Eight counters updated after publication; downstream unchanged, vault records local only. Shared vault preserves unrelated empty `reviews/Untitled.md`; isolated snapshot excluding only that note passes 122 files with zero errors and 15 existing warnings.
