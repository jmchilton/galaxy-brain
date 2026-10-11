# galaxy #23954 — [26.1] Fix expression parameter connections in extracted workflows

[PR #23954](https://github.com/galaxyproject/galaxy/pull/23954) · [Initial review](review-2026-10-11.md) · [Unposted draft](draft-review.md) · [API reproduction](test_saved_conditional_selector.py) · [Sanitized output](reproduction-output.txt)

Status: active; initial review complete, **request changes** for one P2 extraction regression. Delivery: **unposted**. Open, out of draft; GitHub checked 2026-10-11.

Reviewed HEAD: `9008c8cb17c8fc4116e3afca7da707655349812d` (base `release_26.1`), unchanged at final check. Author: mvdbeek.

Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/23954/`. CI cache: `/Users/jxc755/projects/ci-artifacts/galaxy/pr/23954/`.

Validation: 131 workflow unit tests passed, 1 skipped; both submitted API regressions passed. A saved workflow with an expression-connected conditional select runs successfully, then both extraction endpoints return 500; disabling only the new reconnect pass returns 200 for both. This is separate from an existing workflow-import discriminator limitation. CI has 58 successful checks and 1 skipped CWL job; no discussion or reviews at final check.

John requested this review on 2026-10-11. No Galaxy source edits or GitHub delivery performed. See the full review for evidence, integration-test assessment and Galaxy risk assessment.
