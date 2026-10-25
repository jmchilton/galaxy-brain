# Debrief: interactive_tools_panel_drops_new_entry_point

## Research (2026-10-24)
- Bug confirmed in `entryPointStore.ts` `updateEntryPoints` on `origin/dev`, `release_25.0` and `release_26.2`. Once the store is non-empty, it drops ids it doesn't already have.
- `fetchEntryPoints` is the only caller, so polling and SSE are both affected.
- Regression from #17356 (742a46dbed3). The JS store before it pushed every entry point unconditionally. Affects the panel from #19996.
- Fix commit 5e84f0ebadb on `jmchilton/galaxy_ui_driver`: store fix, vitest, and a Selenium/Playwright integration test that depends on 4b54438b1c2's selectors and helpers.
- No duplicate Galaxy issues or PRs.

## Rewrite
- Front-loaded a step table showing server state vs panel. Cause and Context sections, one-line fix as the Proposed Approach, tests in details.
- Review round:
  - Fixed the alternative's reasoning. Entry points have no client-only fields, so the merge only keeps fields the server stopped sending.
  - Clarified that `/interactivetool_entry_points/list` is a client page, not an API endpoint.

## Leftover
- The history item IT indicator (`entryPointsForHda`) likely also misses the second tool. Not verified at runtime, so not in the issue.
