# Implementation debrief

**STATUS: READY.** Head `2c983d1b49a`, stacked on #24380 (`d83f7eaa13c`). 14 commits. Push to `release_26.2` once #24380 merges.

## What landed

`galaxy_ui_driver`'s FAQ-loop batch 7, extracted along with its prerequisites, then re-scoped once:
- Two 26.2 client fixes:
  - the Choose Remote Files FTP notice
  - long-name wrapping in the remote files and data library browsers
- History-panel and remote-files test helpers
- Baseline E2E coverage for undelete/hide/unhide under typed filters and for subfolder upload

## Key choices

- **Stacked on #24380, not `release_26.2`.** The undelete/hide tests extend #24380's test and helpers, and John asked for one branch.
- **Source commits re-authored, not cherry-picked.** Duplicate helpers already on #24380 were dropped. `32e12d33af7`'s `history_panel_filter_text` was left behind. The tests were rewritten in #24380's style and made stricter: an item that stops matching the filter must leave the list.
- **Every fix went red first**, including the FTP test the QA session never ran red, and both long-name layout tests. The red output is in `initial_implementation_debrief.md` and `implementation_rescope_debrief.md`.
- **Re-scope** (round-1 scope evaluation): `FtpUploadHelp` owns its `gxftp://` rule and skips the log-in sentence when no site is configured. The wrap fix also covers the data library browser, via a shared mixin. The library list itself had the same bug, which the re-scope review found.
- **Remote-files search timing.** Codex round 1 found that Invenio ignores the query, so the all-labels-match wait now gives up quietly. Round 2 found a debounce race, so a `UX_RENDER` sleep runs first. The clean fix is a client "search applied" signal, deferred to a dev follow-up.
- **History order.** Baseline tests come first in each area. Refactors are split ahead of the fixes that use them: the `FtpUploadHelp` move, the wrap mixin and column check, and the folder-save wait.

## Hardening

Round 1 lives in `earlier_drafts/1/`. Round 2 ran after the re-scope:
- test challenges
- E2E polish
- Codex
- thermo-nuclear review
- baseline refactor
- scope evaluation: keep
- screenshots: three before/after pairs

Every changed E2E passes on Playwright and Selenium, run one at a time. The `FilesDialog/` vitest passes. Removed: the `FtpUploadHelp` vitest "names the FTP server", which other tests already cover. The vitest "hidden outside FTP" moved into the E2E.

## Left for later

- A client hook telling tests when the remote-files search has applied, so the sleep can go.
- Moving `FtpUploadHelp.vue` out of `FilesDialog/`.
- Merging `_remote_labels_match` with `_workflow_card_named`.
- Hoisting the `.browser-table-container` block that both browsers repeat.
- The scope evaluation's Possible Decompositions (A–D) if John wants smaller PRs.
