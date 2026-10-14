# BarChart play conversion review — 2026-10-14

PASS. All 20 original assertion sites across 15 cases survive: seven sites in five moved cases and 13 sites in ten retained unit cases. No fixes requested. Reviewed read-only; wrote only this debrief, made no Galaxy edits, ran no broad gates, and killed no processes.

No findings were left unaddressed. Exact inline colors strengthen the retained mock contract without introducing browser layout measurements. The real selection play checks BarChart's own selected-history state.

## Details

Reviewed candidate `4b44e54b3b3fe4235f31303f554e5fc246b512d3` against parent `56e2d8278f707afba114647180cc766f572c6502`, on `vitest_story_play` in `storybook_interactions`. Candidate changes exactly `BarChart.stories.ts` and `BarChart.test.ts`, with the correct Test-File trailer. Pinned lower lane: `42588b9750f030911a6c065f141f313938ddd8e3`; supplied remote lease: `1e12f2a42901352b3c6cdd38935dc0c324ce0f84`. No push or remote verification was part of this review.

Read project instructions, TO_PLAY_ITERATION.md, STORY_CONVENTIONS.md, PIPELINE_BRANCHES.md, PIPELINE_WORKERS.md, shared REVIEW_FOCUS.md and SECURITY_REPORTS.md, and referenced agent notes. No applicable AGENTS.md was found in the Galaxy worktree or its ancestors. The saved original test SHA-256 matches the parent's test exactly. The current component matches its original byte-for-byte; the worktree was clean.

### Original assertion map

Each numbered row represents one original written assertion site, including separately written checks within a case.

| Site | Original case/check | Final home |
| --- | --- | --- |
| 1 | VegaWrapper exists for positive data | Retained Chart Rendering unit case |
| 2 | VegaWrapper absent for empty data | Retained Chart Rendering unit case, with positive full empty-message partner |
| 3 | h4 exact Test Bar Chart | OriginalDatasetCounts play: visible heading, exact name, level 4 |
| 4 | Description exact Test description | OriginalDatasetCounts play: exact visible text |
| 5 | Empty array contains No data to display | NoHistories play: exact full visible empty sentence |
| 6 | Two zero-value records contain No data to display | EmptyHistories play: exact full visible empty sentence; still two zero records |
| 7 | Legend item count equals two | OriginalDatasetCounts/readLegend: all shared-container children count equals two |
| 8 | First legend item exact foo: 1 | OriginalDatasetCounts/readLegend: first child's trimmed text equals foo: 1, visible |
| 9 | Second legend item exact bar: 2 | OriginalDatasetCounts/readLegend: second child's trimmed text equals bar: 2, visible |
| 10 | Legend symbols count equals two | Retained legend-colors unit case |
| 11 | First symbol style contains background-color | Retained legend-colors unit case |
| 12 | Second symbol style contains background-color | Retained legend-colors unit case |
| 13 | Empty-data legend container absent | Retained no-legend unit case, with positive full empty-message partner |
| 14 | Disabled legend cursor default | Retained default-cursor unit case |
| 15 | Enabled legend cursor pointer | Retained pointer-cursor unit case |
| 16 | Clicked first item lacks dimmed variant | Retained dimming unit case |
| 17 | Other item has dimmed variant after click | Retained dimming unit case |
| 18 | Disabled click does not call runAsync | Retained guard unit case, with exact clicked-label partner |
| 19 | Selection-info initially absent with selection enabled | Retained initial-selection unit case, with positive exact heading partner |
| 20 | Selection-info absent with selection disabled | Retained disabled-selection unit case, with positive exact heading partner |

The final unit file has 22 written assertion sites: the 13 retained original sites plus nine added sites (two exact native inline colors, two initial nondim variants, two empty-message partners, one clicked-label partner, two heading partners). Child/Vega presence, mocked engine behavior, cursor and dim variants, guard timing, and initial absence contracts remain unit checks. Navigation YAML contains no consumers of the chart selectors.

OriginalDatasetCounts preserves both original records `{id: "id1", label: "foo", value: 1}` and `{id: "id2", label: "bar", value: 2}`, original title, and original description. DatasetCounts additionally exercises realistic RNA-seq 24 / Quality control 8 values. readLegend waits up to five seconds for a known exact real label, walks from that label to its entry's shared container, counts every child, and reads visible ordered labels. It cannot pass merely by selecting the two expected matches while ignoring an extra entry. Plays use no CSS class selectors or computed layout checks. Unit color checks read the native inline style property, retaining happy-dom's hex representation.

### Selection ownership and synchronization

SelectsHistoryFromLegend waits for both loaded visible legend entries before its initial Selected-prefix absence check. It clicks the exact RNA-seq label, waits up to five seconds for the exact visible Selected: RNA-seq analysis card, clicks again, and waits for any Selected-prefix card to disappear. The prior positive card supplies synchronization for the clearing check.

Source inspection confirms that the card's v-if reads selectedDataPoint, which is assigned by BarChart's Vega barSelection signal listener. onLegendItemClick updates the Vega selection store, changes selectedLegendLabel, and runs the view; selectedLegendLabel alone drives only dimming. Therefore the card is evidence of the owner's real signal/state path, beyond the local legend toggle.

The independent owner mutation evidence supports this: setting the signal callback's selectedDataPoint assignment to undefined while preserving the local toggle leaves all 15 original units green (`play-barchart-selected-data-old.log`) and makes the new selection play fail specifically because Selected: RNA-seq analysis is missing (`play-barchart-selected-data-new.log`). A no-op legend handler also fails the new selection play (`play-barchart-selection-noop.log`).

### Validation and mutation evidence inspected

Reviewed supplied logs, without rerunning suites. Gate 17 reports 504 unit tests across 84 files and 544 browser tests across 94 files passing. Final focused runs twice report 10/10 units and 6/6 stories; best warm Tests times are 62 ms and 234 ms. The parent reports actual exit codes zero for gates/final runs and successful lint, type-check, formatting and commit hook; logs do not independently encode process exit codes, so that part relies on the parent tool results.

Combined own-component mutation (blank formatted values, all gray legend colors, hidden empty-state div) leaves the original 15 units green (`play-barchart-mutation-old-verified.log`). The final units fail precisely at exact #4c78a8 versus #777777, with nine other cases passing (`play-barchart-mutation-unit-new-verified.log`). All five active plays fail (`play-barchart-mutation-story-new.log`): the data/selection reads cannot find real legend labels, and both empty plays fail visibility. The untouched implicit base story passes. This distinguishes the stronger assertions from the old checks and tests the real data path the unit mock cannot observe.

No production component changes remain. Review finds no assertion loss, selector-contract loss, inappropriate layout measurement, or concrete remaining fix.
