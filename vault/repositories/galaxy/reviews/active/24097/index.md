# Galaxy #24097 — Don't inherit preferred visualizations from sibling datatypes

[PR #24097](https://github.com/galaxyproject/galaxy/pull/24097) · Status: active; initial review complete. Recommendation: approve implementation, with inheritance policy to settle and CI pending. Delivery: **approved by John on 2026-10-13; awaiting merge**. Open, ready; GitHub checked 2026-10-13.

Reviewed HEAD: `68e2b47adb929b77de3333f6d1bf4d5826d2123a`, base `release_26.1`.
Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24097/`; clean, retained while open.

- [Review, validation, and risks](review-2026-10-13.md)
- [Unposted review draft](draft-review.md)
- [Independent context probe](context-probe.py) and [output](context-evidence.txt)
- [Related #23869 review](../23869/index.md)

John requested a direct branch review without subagents. Seven tests pass; all 799 sample extensions compared. Confirms the sibling-inheritance fix for #23869, but compressed FASTA still selects alignment. Ayslam's explicit-only preference proposal differs from the retained parent-inheritance policy. No source changes or GitHub delivery performed.

## Vault sync

The validation blocker was resolved on 2026-10-13 after John requested removal of the empty `vault/reviews/Untitled.md`. Required `make validate` passes: 122 files, zero errors, 15 advisory warnings. This review and its queue update are included in the review checkpoint; unrelated workspace changes were preserved.

## Tick check — 2026-10-13

John approved the reviewed head at 2026-10-13T16:26:06Z. The PR is now ready, open, and awaiting merge; the approval supersedes the unposted status above. Head remains `68e2b47adb929b77de3333f6d1bf4d5826d2123a`. No new review is due.
