# galaxy #24042 — Batch S3 extra-file cleanup with a compatibility fallback

[PR #24042](https://github.com/galaxyproject/galaxy/pull/24042) · Status: active; initial review complete. Open, out of draft; GitHub checked 2026-10-11.

[Review and risk assessment](review-2026-10-11.md) · [Draft posted by John as a comment](draft-review.md) · [Independent HTTP reproduction](control_key_probe.py)

Reviewed HEAD: `8a45fc7103882a3aa04826c3c88706cd67a42351` (base `dev`). Author: mvdbeek.
Recommendation: **request changes** for one P2 regression involving XML-incompatible extra-file keys. Review delivery: John [posted the finding as a PR comment](https://github.com/galaxyproject/galaxy/pull/24042#issuecomment-6110012979) on 2026-10-11 at 14:23:54 UTC. Ball with author; no formal request-changes review.

Validation: full object-store suite **188 passed, 16 skipped**; all 21 new tests pass. Independent real-boto3 HTTP probe reproduces the batch failure and verifies pre-change individual deletion succeeds for the same keys. Final GitHub checks: 53 success, 2 skipped; John’s finding comment is posted; no formal reviews; reviewed SHA unchanged.

Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24042/`; tracked source untouched. John requested this review on 2026-10-11. Production performance and live AWS behavior were not tested. Integration-test building blocks and specific suggested coverage are recorded in the review.
