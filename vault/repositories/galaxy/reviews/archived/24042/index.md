# galaxy #24042 — Batch S3 extra-file cleanup with a compatibility fallback

[PR #24042](https://github.com/galaxyproject/galaxy/pull/24042) · Status: archived; merged 2026-10-12T14:13:00Z. Tracking ended after merge.

[Review and risk assessment](review-2026-10-11.md) · [Draft posted by John as a comment](draft-review.md) · [Independent HTTP reproduction](control_key_probe.py)

Reviewed HEAD: `8a45fc7103882a3aa04826c3c88706cd67a42351` (base `dev`). Author: mvdbeek.
Recommendation: **request changes** for one P2 regression involving XML-incompatible extra-file keys. Review delivery: John [posted the finding as a PR comment](https://github.com/galaxyproject/galaxy/pull/24042#issuecomment-6110012979) on 2026-10-11 at 14:23:54 UTC. Ball with author; no formal request-changes review.

Validation: full object-store suite **188 passed, 16 skipped**; all 21 new tests pass. Independent real-boto3 HTTP probe reproduces the batch failure and verifies pre-change individual deletion succeeds for the same keys. Final GitHub checks: 53 success, 2 skipped; John’s finding comment is posted; no formal reviews; reviewed SHA unchanged.

Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24042/`; tracked source untouched. John requested this review on 2026-10-11. Production performance and live AWS behavior were not tested. Integration-test building blocks and specific suggested coverage are recorded in the review.

Delivery check 2026-10-11: new live HEAD `0310835ec8b7084a0368c55f032a6099dc13df53`, while the finding above remains evidence for reviewed `8a45fc7103882a3aa04826c3c88706cd67a42351`. CI is running; current changes have not been verified. Follow-up verification remains ours; do not treat the older finding as a confirmed blocker on the new head.

## Morning check — 2026-10-12

Open, ready; live HEAD `0310835ec8b7084a0368c55f032a6099dc13df53`. CI snapshot: 2 skipped, 52 success. [Marius reports the fix and asks for another look](https://github.com/galaxyproject/galaxy/pull/24042#issuecomment-6120725753): individual deletion for XML-invalid keys and carriage returns, plus real-client and pagination regressions. Live head `0310835ec8b7`, 52 successful checks and two skipped. Independent verification remains pending; do not reuse the old-head finding as a current blocker.


## Archived — 2026-10-12

GitHub reports MERGED at 2026-10-12T14:13:00Z; merge commit `2671a6d5d63ca13ad554ac68cfd6739d4a881780`. Removed from the review queue. Clean worktree retained: no upstream is configured and its older review HEAD diverges from the merged PR head (1 commit on the old side). Per WORKTREES.md, removal requires John’s confirmation. This is a cleanup hold, not an outstanding code review.
