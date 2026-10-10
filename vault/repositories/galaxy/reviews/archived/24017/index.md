# galaxy #24017 — [26.1] Share dir_mtime cache directory listings per process

[PR #24017](https://github.com/galaxyproject/galaxy/pull/24017) · Status: archived; merged 2026-10-10T23:25:07Z. GitHub state checked 2026-10-10.

- [Initial review and validation](review.md)
- [Draft GitHub review](draft-review.md)
- [Independent cache verification probe](validation_probe.py)

Latest reviewed commit: `358de494610a2873cf134a697ba248824a7fa231` (base `release_26.1`), verified against local HEAD and current GitHub head before and after review on 2026-10-10.

Recommendation: **approve**; no correctness blockers found. One non-blocking suggestion adds concurrent-reader and explicit shared-invalidation regressions. Validation: 29 focused tests passed, one unchanged external-service test deselected after its downloads failed locally, and eight independent cache/ordering probes passed. See the review for risk assessment and limits.

Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24017/`.

Delivery: **review has not been posted**. John requested this review on 2026-10-10. No GitHub review/comment, code change, commit, or push was performed by the reviewer.

John merged the reviewed head; GitHub lists no submitted review. Our draft remains an unposted historical artifact.

Tracking ended because the PR merged. The clean matching worktree and terminal session were removed via ghwt; downloaded CI artifacts were deleted. Review evidence is retained here.
