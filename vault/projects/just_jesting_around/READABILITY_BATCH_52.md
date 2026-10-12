# Readability batch 52

Four originators selected with seed `2610952`; [manifest](readability_batch_52.yml). Recorded remote/base `2da8d6a3251` and dev `9ac3cd2eb30`; rebase unchanged. No supporting, helper, documentation, production or downstream-owned files changed.

| Originator | Change | Cases |
| --- | --- | ---: |
| [Dropdown navigation](reviews/batch52/GDropdownItem.md) | Component-derived props, native mount options, nextTick and auto-unmount; real cancelable mouse events retained | 4 → 4 |
| [Scroll edges](reviews/batch52/useScrollEdges.md) | Named start/middle/end positions and edge flags, with explicit initial faded state before each transition | 1 → 3 |
| [Section patch view](reviews/batch52/SectionPatchView.md) | Typed overrides, native mount, required action queries, clear scenario names and auto-unmount | 8 → 8 |
| [Section diff utilities](reviews/batch52/sectionDiffUtils.md) | Existing guarded indexing, named section values and original/proposed markdown; nullable sections asserted without casts | 29 → 29 |

All 98 original executed checks retained or strengthened; three added starting-state checks give 101 final checks. Reviewer found that independently initialized scroll cases could miss a sticky end fade. Each revised case now primes the start and asserts the original fade flags before scrolling. A temporary `fadeEnd.value = fadeEnd.value || Boolean(...)` mutation fails the end case exactly; production restored in finally, normal shuffled cases pass, and no production change committed.

Final canonical four-suite gate passes 44 cases, shuffled `520101`, pinned Node `22.20.0`, one worker, no skips or unhandled errors. Full integrated vue-tsc, lint/format/hooks and whitespace checks pass. Final corrected scroll coverage retains all 20 covered locations across four files. Other paired source comparisons retain dropdown's default 13 files / 21 locations and actual external UI's two files / 32 locations; patch view's 15 files / 166 locations; and diff utility's original four files / 123 locations, expanding to 13 files / 130 locations through the existing nth helper import. No source-location loss.

[Normal review](reviews/batch52/review.md), [scroll/patch independent review](reviews/batch52/scroll-and-patch-independent-review.md), [test challenge](reviews/batch52/test_challenges.md), [maintainability](reviews/batch52/maintainability.md) and [scope](reviews/batch52/scope.md) approve the final changes. Existing helpers and README guidance suffice; no new marginal advice. No E2E/screenshots relevant to unchanged product behavior.

Pushed fast-forward to `jmchilton/vitest_readability` at `f3ffc6aaa4572195229049ce2b3e7ac7a203c191`. GitHub confirms exact head, draft and MERGEABLE, with 39 queued checks, one running and two skipped. Four originating ledger counters written after successful push; downstream lanes unchanged. Vault records committed locally only under PIPELINE_WORKERS.md.
