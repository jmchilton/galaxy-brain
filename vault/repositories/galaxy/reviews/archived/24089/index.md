# Galaxy #24089 — Curated workflows: run-here awareness, quieter cards, and catalog fixes

**Latest status — 2026-10-16:** Merged at 2026-10-16T06:09:33Z; tracking ended and record archived. Worktree retained: clean, no upstream, and local HEAD is not an ancestor of the merged PR head. Per WORKTREES.md, removal needs John’s confirmation. Live head: `38bb39c095fd6c7b292010807772057c7781a041`. GitHub state, comments, reviews, latest commit and CI checked; no code revalidation performed.

[PR #24089](https://github.com/galaxyproject/galaxy/pull/24089) by dannon · Status: active; initial review complete. Recommendation: approve with small follow-ups (no blockers). Delivery: **posted by John as a PR comment on 2026-10-13; ball with author**. Open, not draft; GitHub state checked 2026-10-13.

Reviewed HEAD: `0cbea855736f52a43d9db630a4d4a5ee1b92d030`, base `dev` (merge-base `91d93c238c0c`).
Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24089/`; clean, read-only, retained while open.

- [Review, validation, and risks](review-2026-10-13.md)
- [Unposted review draft](draft-review.md)
- Prior context: [#23669 review](../../archived/23669/index.md) (curated tab origin; accepted the regex filter-toggle workaround)

Follow-up to #23669/#23755: adds `is:runnable` + "Ready to run here" toggle, orders Recommended by missing-tool count, lets cards request tool installs (dialog extracted from the run page), marks catalog workflows the user already imported (new additive `imported_workflow_id`/`imported_version` on `GET /api/workflows/curated`), quiets the card layout, and fixes the CDN Last-Modified watermark, exact quoted `name:` in IWC mode, keyboard-activatable GCard badges, and post-import redirect after navigation. Well tested (red-to-green commits). No blockers found; main points are reuse/divergence: "already imported" counts edited copies, unlike Galaxy's source_metadata convention and the existing `get_workflow_by_trs_id_and_version`; TRS id parsing and release comparison are re-implemented (Python + TS comparators already disagree); `ToolBox.vue` still inlines the gate the new composable extracts. One small real bug: local-feed descriptions show HTML entities (`&amp;`) literally after the new tag-strip. 129 curated unit tests pass locally; CI green apart from unrelated package-test reds (pulsar `build_client_manager` ImportError) and 3 pending jobs.

## Tick check — 2026-10-13

John delivered the review findings in a PR comment at 2026-10-13T16:40:05Z. He treats the duplicated logic as a probable blocker and asks about the smaller follow-ups. This supersedes the unposted delivery status above; ball with author. The head is unchanged. No new code verification was performed.

## Morning check — 2026-10-14

Open, ready; live head `0cbea855736f52a43d9db630a4d4a5ee1b92d030`. CI: 2 failure, 4 skipped, 57 success. John’s review findings were delivered; no later author reply or head change. Ball with author.

## Morning check — 2026-10-16

Merged at 2026-10-16T06:09:33Z; tracking ended and record archived. Worktree retained: clean, no upstream, and local HEAD is not an ancestor of the merged PR head. Per WORKTREES.md, removal needs John’s confirmation.

CI snapshot: 2 skipped, 56 success. Earlier findings retain their reviewed commits.
