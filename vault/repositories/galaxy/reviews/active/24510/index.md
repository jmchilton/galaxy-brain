# Review: galaxyproject/galaxy#24510

[PR](https://github.com/galaxyproject/galaxy/pull/24510) — "Bump happy-dom from 20.14.5 to 21.0.4 in /client" by dependabot, base `dev`.

Worktree: `~/projects/worktrees/galaxy/pr/24510/`

## Status

No agent review run (dependabot bump; John asked only for a CI fix). Fix `b4129a30ef2` pushed directly to the dependabot branch on 2026-11-01; awaiting CI + merge.

## CI fix

`client-unit-test` failed: 13 tests in `VisualizationFrame.test.js` / `VisualizationUnsavedChanges.test.js`. happy-dom 21 disables iframe page loading by default (SSRF hardening), so `iframe.contentDocument` never loads. Fix: `settings: { enableIframePageLoading: true }` under `environmentOptions.happyDOM` in `client/vitest.config.mts`. Also silences the `about:blank` NotSupportedError stderr noise (GPopover etc). CSS file loading left disabled; nothing needs it.

Verified: 13 failures reproduced locally on `724f53821a8`; after fix full client vitest suite 663 files / 5376 passed, 1 skipped.

Note: dependabot stops rebasing a branch once someone else pushes to it.
