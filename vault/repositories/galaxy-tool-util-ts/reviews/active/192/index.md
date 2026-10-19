# galaxy-tool-util-ts#192 — Lint duplicate step labels as errors (port gxformat2 StepLabelNotUnique)

PR: https://github.com/jmchilton/galaxy-tool-util-ts/pull/192 (mvdbeek, branch `lint-duplicate-step-labels`)
Worktree: `~/projects/worktrees/galaxy-tool-util-ts/pr/192/`
Reviewed commit: `fee94b34` (2026-10-19). Not delivered.

Python counterpart: [gxformat2#268](https://github.com/galaxyproject/gxformat2/pull/268), open, head `0922644`. Synced fixtures (6 workflows), `lint_native.yml`, `lint_format2.yml`, and `lint_profiles.yml` byte-match that head (checked 2026-10-19). `catalog.yml` from #268 not synced.

## Files

- [initial_review.md](initial_review.md)
- [test_challenges_review.md](test_challenges_review.md)
- [risks.md](risks.md)
- [verified_review.md](verified_review.md), [filtered_findings.md](filtered_findings.md), [initial_review_agents.md](initial_review_agents.md)
- [review_0_branch_details.md](review_0_branch_details.md) — `pr_192_review_0` (`2d2a07ff`, P3 2 lint-profiles test), local only, not pushed.
- [review_1_branch_details.md](review_1_branch_details.md) — P2 fixes.
- [risks.md](risks.md) — no P findings.

## Round 1 fixes (2026-10-19)

John asked to push the P2 fixes straight to mvdbeek's PR branches (maintainer edits on):
- gxformat2#268: `pr_268_review_0` (`5a453c6`, `9548c45`) pushed to `mvdbeek/gxformat2:lint-duplicate-step-labels` (`0922644..9548c45`). Worktree `~/projects/worktrees/gxformat2/branch/pr_268_review_0/`.
- #192: `pr_192_review_1` (`ffe56bba`, `96f3ec39`) pushed to `mvdbeek/galaxy-tool-util-ts:lint-duplicate-step-labels` (`fee94b34..96f3ec39`). Synced fixtures byte-match the gxformat2 branch.
- Side effect: native messages inside subworkflows now carry `/steps/<k>/subworkflow/...` pointers (previously top-level or `""`); `NativeStepKeyNotInteger` too.

No response posted yet; P3s (exact-message tightening folded into P2 commits; lint-profiles test on review_0; `Input <n>` dedup) remain.
