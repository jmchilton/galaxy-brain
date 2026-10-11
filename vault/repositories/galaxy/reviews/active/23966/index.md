# galaxy #23966 — Materialize deferred directory datasets (remote Zarr)

[PR #23966](https://github.com/galaxyproject/galaxy/pull/23966) · Status: active; initial review complete. **Recommendation: request changes**. Delivery: unposted.

[Review and risk assessment](review-2026-10-11.md) · [Draft review](draft-review.md) · [Full materializer reproduction](reproduce.py) · [Reproduction output](reproduction-output.txt) · [Reference format compatibility probe](compatibility-probe.py)

Reviewed HEAD: `0216fb3c845dfd90e754f3fb03345dcc1177fe5b` (base `dev`), 2026-10-11. Final GitHub check: same head, OPEN, out of draft, 60 successful checks / three skipped, no submitted reviews. Author: davelopez.

One reproduced P2: literal Zarr node names are appended to HTTP URLs without encoding; spaces, URL delimiters, and percent sequences fail materialization. Four full-materializer failures versus four successful encoding controls. 42 focused tests, one real remote-job integration test, and one local API failure regression pass. Nested v2/v3 and sharded v3 reference-generated stores preserve their values.

Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/23966/`.

John requested this review on 2026-10-11; #23991 launched first. No Galaxy source edits, GitHub comments/reviews, commits, or pushes were made by the review agent. Review/queue Git operations remain with the coordinator.
