# galaxy #24018 — [WIP] Multiplatform compute support

**Latest status — 2026-10-16:** Draft; review delivered; ball with author. Live head: `711d2e4f1a701b4063ab5eaf991fe9b4ce7d2d56`. GitHub state, comments, reviews, latest commit and CI checked; no code revalidation performed.

[PR #24018](https://github.com/galaxyproject/galaxy/pull/24018) · Status: active; initial review delivered by John as a PR comment. Open and draft; ball with author. GitHub state and unchanged HEAD rechecked 2026-10-11.

- [Initial review, findings, validation, and risk assessment](review-2026-10-10.md)
- [Review draft posted by John as a comment](draft-review.md)
- [Three correctness reproductions](reproduce.py) · [observed output](reproduction-output.txt)

Reviewed commit: `0adbdb6655216e7a04c3d9e47816d3f06747fc31` (base `dev`).

Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24018/`.

Five findings: one P1 for sequential activation of separately installed foreign requirements; P2 findings for lost native tool context, container-flag-only validation bypass, the metrics package test import, and fake executable portability. The lint check also reports 14 introduced mypy errors. The downloaded integration failures were Docker Hub pull-rate limits.

Validation: 109 focused tests passed, 3 failed because fixtures hardcode `/bin/true`, which is absent on this macOS host. Three targeted correctness probes reproduced the runtime/validation issues; actual foreign hardware, NFS concurrency, and signing were not retested. No source changes.

Delivery: John [posted our review as a PR comment](https://github.com/galaxyproject/galaxy/pull/24018#issuecomment-6109129388) on 2026-10-11 at 12:41:38 UTC and converted the PR to draft. This was a comment, not a formal request-changes review. Author may mark ready after green tests and removal of WIP. Keep record and worktree while open; no follow-up or author contact was promised.

## Morning check — 2026-10-12

Open, draft; live HEAD `711d2e4f1a701b4063ab5eaf991fe9b4ce7d2d56`. CI snapshot: 2 failure, 2 skipped, 51 success. New head `711d2e4f1a70`, still draft; two checks fail. Review was delivered and no follow-up was promised. Ball with author until ready; older findings are not revalidated by this status refresh.

## Morning check — 2026-10-14

Open, draft; live head `711d2e4f1a701b4063ab5eaf991fe9b4ce7d2d56`. CI: 2 failure, 2 skipped, 51 success. Still draft; review delivered, no newer discussion. Ball with author until ready.

## Morning check — 2026-10-16

Draft; review delivered; ball with author.

CI snapshot: 2 failure, 2 skipped, 51 success. Earlier findings retain their reviewed commits.
