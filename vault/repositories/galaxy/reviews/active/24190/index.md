# PR #24190 — Nest collection list:paired fix

- PR: https://github.com/galaxyproject/galaxy/pull/24190
- Latest review: [Initial review](review.md)
- Evidence: [Reproduction script](reproduce.py), [output](reproduction-output.txt)
- Status: Initial review complete — request changes recommended
- Delivery: **UNPOSTED**
- Reviewed commit: `a6d7e445d63003258183c3eae36bdb5430dc8d97`
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24190`
- Reviewed: 2026-10-16

Three P2 findings: runtime/declaration output type mismatch, removal of bare paired input, and loss of paired suffix on empty lists. Collection matching suite: 16 passed. Focused production-code reproductions confirm the behaviors; full server/browser workflow execution was not run locally.

No review or comments posted. Worktree retained while PR is open. No author follow-up initiated.
