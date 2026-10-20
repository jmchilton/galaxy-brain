# Accessibility followups on release_26.2

Status: READY; release-based branch published and remote verified on 2026-10-20. John requested retargeting the existing branch to `release_26.2` on 2026-10-20. Release base: `1ff2ce4cc513c9923a839fcbaa522e756bd9ab22`. New head: `94a34cd0b2330730145764d74728f07870699e40`; separate baseline commit: `bb7bfb7703ded7c1ac724a04bb330045e5fc4ea8`.

## Target suitability

Both defects exist on release: GalaxyAI's icon-only send control is unnamed, and classic titled Popper's close control is a mouse-only span. Both patched components, their existing tests, Popper controller, shared GButton implementation and relevant Bootstrap styles match the old dev base. Release forwards GButton attributes to the native root and supports the same Vue focus/event APIs. These local accessibility fixes need no newer API, schema or database changes. `release_26.2` is an appropriate target.

## Rebase

Preserved the complete dev-based head at `backup/fix_story_a11y_followups-before-release-26.2-20261020`. Replayed exactly the two commits above original dev base `0de6cc2d7fef75633ea30717162bad53d583d80e`; the rebase was conflict-free and `git range-diff` marks both patches identical. The named chat send action, native non-submit Popper Close button, visible focus outline, preserved active styling and focus restoration on close/Escape remain unchanged. No tests were added, removed or weakened during retargeting.

The separately published `fix_story_a11y_followups_alt_original_scope` intentionally remains a dev-based historical alternative at `d318dfd5ee3655f7d292896b6ec50dd077d9ff6c`; it is not part of the proposed release branch. The four-file release delta contains no unrelated dev changes.

## Validation and review

- Offline frozen-lockfile dependency refresh and generated API-client build pass on release.
- Five affected/adjacent suites: 74 tests pass (`/private/tmp/a11y-26.2-units.log`).
- Full client type check passes (`/private/tmp/a11y-26.2-types.log`); ESLint has zero errors and the same two existing warnings (`/private/tmp/a11y-26.2-eslint.log`); Prettier passes (`/private/tmp/a11y-26.2-format.log`). Diff whitespace check passes.
- [Independent release-target review](subagents/release_26.2_rebase_review_2026-10-20.md) approves the target and unchanged patches.
- The earlier test challenge, scope review and Chromium screenshots describe the identical implementation on dev. No new UI changes were made in this rebase; Chromium was not rerun on release. [Prior handoff](earlier_drafts/2/implementation_debrief.md).

No PR exists for this branch (live GitHub check 2026-10-20), and none was opened. Published `94a34cd0b2330730145764d74728f07870699e40` to `jmchilton/fix_story_a11y_followups` using the exact old-head lease `d843b804a20582bddcf90c2d2277c753a431ad47`; verified with `git ls-remote`. The historical original-scope alternative remains unchanged remotely. Galaxy worktree is clean. Fork CI has not yet been assessed.
