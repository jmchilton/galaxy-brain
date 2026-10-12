# galaxy #23966 — Materialize deferred directory datasets (remote Zarr)

[PR #23966](https://github.com/galaxyproject/galaxy/pull/23966) · Status: active; initial review complete. **Recommendation: request changes**. Delivery: **finding commented and PR approved by John**.

[Review and risk assessment](review-2026-10-11.md) · [Draft review](draft-review.md) · [Full materializer reproduction](reproduce.py) · [Reproduction output](reproduction-output.txt) · [Reference format compatibility probe](compatibility-probe.py)

Reviewed HEAD: `0216fb3c845dfd90e754f3fb03345dcc1177fe5b` (base `dev`), 2026-10-11. Final GitHub check: same head, OPEN, out of draft, 60 successful checks / three skipped, no submitted reviews. Author: davelopez.

One reproduced P2: literal Zarr node names are appended to HTTP URLs without encoding; spaces, URL delimiters, and percent sequences fail materialization. Four full-materializer failures versus four successful encoding controls. 42 focused tests, one real remote-job integration test, and one local API failure regression pass. Nested v2/v3 and sharded v3 reference-generated stores preserve their values.

Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/23966/`.

John requested this review on 2026-10-11; #23991 launched first. No Galaxy source edits, GitHub comments/reviews, commits, or pushes were made by the review agent. Review/queue Git operations remain with the coordinator.

## Delivery — 2026-10-11

John [posted the P2 encoding finding](https://github.com/galaxyproject/galaxy/pull/23966#issuecomment-6112240326) at 2026-10-11T18:26:44Z and approved the reviewed HEAD at 2026-10-11T18:26:55Z. His approval is the current GitHub decision; the initial request-changes recommendation is preserved as review history. Open, out of draft, HEAD unchanged. Ball with the author; resources retained.

## Morning check — 2026-10-12

Open, ready; live HEAD `20f9b0cdcca4555325a08f2fe0c5d0232de8a100`. CI snapshot: 2 failure, 2 skipped, 53 success. [David reports the encoding fix](https://github.com/galaxyproject/galaxy/pull/23966#issuecomment-6123667399) at new head `20f9b0cdcca4`. John’s approval remains recorded; the old finding is evidence for `0216fb3c845d`, not a verified blocker on the new head. Verification pending; two CI checks fail.
