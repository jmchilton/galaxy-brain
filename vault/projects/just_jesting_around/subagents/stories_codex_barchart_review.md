# BarChart story conversion review

Date: 2026-10-14. Baseline: `28e7b8f77a5eb57132c599d1a910842b564e7d09`. Pushed candidate: `42588b9750f030911a6c065f141f313938ddd8e3`.

Independent read-only reviewer `barchart_review` compared the initial candidate `c8df5f2e3e0` against the immutable baseline. All 15 original cases and 20 assertion statements remain identical. Original fixture literals, buildMockView, Vega mocks and explicit new-view events remain unchanged. Empty and selectable cases select matching composed stories; real VueUse exports remain except the resize-observer stub. The story mount returns the actual BarChart child. Captured active Pinia is disposed through onTestFinished.

Four readable scenarios use real bundled Vega SVG rendering and meaningful history dataset counts, with no API handlers or plugin iframe dependencies. Temporary Chromium probes passed 4/4: exact two legend labels and heading, selectable legend dimming after click, and visible messages for no histories and zero counts. Probes were removed before committing.

The reviewer found one cleanup ordering issue: Vitest 4.1.11 uses stack hooks and reverses afterEach registration. Registering flush before useStoryMount unmounted first, contrary to the original lifecycle. The driver moved useStoryMount registration before the flush hook, preserving flush-before-unmount, reran focused unit 15/15, types and lint, and amended. Follow-up read-only review confirmed correct ordering and all 20 unchanged assertions; no remaining findings.

Final validation: full story-backed unit 750 tests/95 files (95 selected), whole browser 356 tests/94 files with two workers, type checking, formatting, lint and normal commit hooks passed. Fast-forward push succeeded. Evidence logs: `/tmp/stories-barchart-unit-reviewed.log`, `/tmp/stories-barchart-types-reviewed.log`, `/tmp/stories-barchart-probes.log`, `/tmp/stories-barchart-full-unit.log`, `/tmp/stories-barchart-full-browser.log`. Test lines: 271 to 292; stories: 38. No production changes or sensitive findings.
