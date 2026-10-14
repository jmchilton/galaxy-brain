# GTable stories review — 95ba7467fff

Reviewed 2026-10-14. Independent read-only review approved against 094203299d3 without blockers or required recommendations.

## Assertion mapping

All ten cases and 23 original sites retain the same 27 executed assertions: accessible header/row checkbox names for both title variants (6); exact row-select item/index/selected payload and no row-click (2); exact select-all event (1); partial header/first/second checkbox properties (4); all-selected header properties (2); Name/Id/Note aria-sort and tabindex (6); Enter/Space event payloads, aria state and exact row ordering (4); Space defaultPrevented (1); nested Options control does not sort (1).

Original objects, selectors, payloads and ordering strings unchanged. Naming-case clickableRows:false preserves original default. Composed tests inspect the actual package GTable child; client re-export resolves the same component. The plain nested-slot case keeps its original slot, with mounted body target and automatic cleanup retained.

## Scenario and ownership design

Client Common/GTable stories use prop-derived generic Args and harness render, following ScrollList metadata typing. Excluded DatasetTableWithSelection harness uses MODE 3, forwards attrs and owns selection state without masking child emission checks. Four scenarios show readable control/treated datasets, checkbox partial/all states and sorting. Initial selection controls disabled. Owned attachment removal and composed/plain unmount cleanup remain sound.

## Validation

Reviewer read unit 10/10, Chromium probes 4/4 and clean final type-check logs; ran no extra gates or mutations. Probes covered persistent label selection/header select-all, initial partial/all and keyboard order, then were removed. Full gates passed unit 732 tests in all 93 selected files and Chromium 350 tests in 92 files. Formatting, lint and normal hooks passed; fast-forward push completed.
