# galaxy #23975 — Add a NOMAD file source

[PR #23975](https://github.com/galaxyproject/galaxy/pull/23975) · Status: active; initial review complete. Open, out of draft; GitHub checked 2026-10-11. Delivery: John submitted a **COMMENTED review with one inline comment**; no formal approval.

Reviewed current HEAD: `fa120b50a74e945593ba7cd261fc79fbb3526b06` (base `dev`). Author: arash77. Ordinary recommendation: **approve**, no actionable ordinary findings confirmed. One unrelated API workflow test is red; attribution remains unproven.

- [Review and risk assessment](review-2026-10-11.md)
- [Unposted review draft](draft-review.md)
- [Validation evidence](validation-evidence.txt)
- [Deterministic contract probe](contract-probe.py) and [output](contract-output.txt)

Validation: 106 focused Galaxy unit tests, both added live integration tests, 35 adapter offline tests, and all contract probes passed. Live CI: 56 successful, 2 skipped, 1 API failure (`test_error_outputs_with_purged_inputs`). The artifact's nested JSON was inspected directly.

John requested this review on 2026-10-11. David already reviewed the same HEAD on October 9; known public-only, performance and recursive-403 limits were considered explicitly. The review agent posted no GitHub comment or review. Worktree `/Users/jxc755/projects/worktrees/galaxy/pr/23975/` is clean and retained while the PR remains open.

## Delivery — 2026-10-11

John submitted a [COMMENTED review](https://github.com/galaxyproject/galaxy/pull/23975#pullrequestreview-5484524053) with one inline comment at 2026-10-11T19:01:49Z. This records delivery, not approval. Open, out of draft, HEAD unchanged. Ball with author; resources retained.

## Morning check — 2026-10-12

Open, ready; live HEAD `9999511119a772be31d756aaf522a668348a02d4`. CI snapshot: 2 failure, 9 in progress, 5 skipped, 49 success. Author reports both reviews addressed, with nomad-fsspec 0.3.0 and new offline tests, at head `9999511119a7`. David also gave a further review on 2026-10-12. John’s original inline dependency question was delivered; verification of the new changes remains pending while CI runs. No unposted initial-review action is due.
