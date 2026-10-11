# galaxy #24018 — [WIP] Multiplatform compute support

[PR #24018](https://github.com/galaxyproject/galaxy/pull/24018) · Status: active; initial review complete, **request-changes draft unposted**. Open, GitHub draft flag false; title marks WIP. GitHub state and HEAD rechecked 2026-10-10.

- [Initial review, findings, validation, and risk assessment](review-2026-10-10.md)
- [Unposted review draft](draft-review.md)
- [Three correctness reproductions](reproduce.py) · [observed output](reproduction-output.txt)

Reviewed commit: `0adbdb6655216e7a04c3d9e47816d3f06747fc31` (base `dev`).

Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24018/`.

Five findings: one P1 for sequential activation of separately installed foreign requirements; P2 findings for lost native tool context, container-flag-only validation bypass, the metrics package test import, and fake executable portability. The lint check also reports 14 introduced mypy errors. The downloaded integration failures were Docker Hub pull-rate limits.

Validation: 109 focused tests passed, 3 failed because fixtures hardcode `/bin/true`, which is absent on this macOS host. Three targeted correctness probes reproduced the runtime/validation issues; actual foreign hardware, NFS concurrency, and signing were not retested. No source changes.

Delivery: nothing has been posted. John explicitly requested this review on 2026-10-10. No follow-up or author contact was promised.
