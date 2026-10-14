# PR #24112 — [26.2] NOMAD file source fixes

- PR: https://github.com/galaxyproject/galaxy/pull/24112
- [Latest review](review-2026-10-14.md)
- [Unposted review draft](draft-review.md)
- Reviewed head: `1d31ecb856392cadb3457d5418139d6682bb424a`
- Target: `release_26.2`; base examined: `8b729ff0050c32573ad0fa999e5e1b4d015dca8c`
- Delivery: **unposted**. No GitHub comments or review submitted.
- Recommendation: approve on code review; resolve or account for the existing API CI failure before merge.
- Findings: no concrete correctness blockers found.
- Local validation: **64 passed, 15 skipped** across targeted NOMAD/fsspec sibling tests and offline S3 tests. Additional threshold, error-reason, and real-backend retry probes passed.
- Current-head CI: all workflows succeeded except API tests, with two workflows skipped. API failure is `TestWorkflowsApi::test_error_outputs_with_purged_inputs` (second cat output `error`, expected `paused`); it appears unrelated to the changed file-source paths, but was not reproduced on the base.
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24112` (clean, detached at reviewed head).

Initial review completed 2026-10-14. Risk is low and reversible; no schema or workflow/tool artifact changes. Live NOMAD/Oasis import and browsing were not exercised.
