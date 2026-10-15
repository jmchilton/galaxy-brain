# Galaxy #24101 — Standalone widgets

**Latest status — 2026-10-15:** John responded; waiting on Sam (guerler) to address mvdbeek’s review; no response due from John. GitHub comments/reviews verified; no new code validation performed.

[PR #24101](https://github.com/galaxyproject/galaxy/pull/24101) · Initial review complete; **request changes for one P2 (silent graph truncation)**. Delivery: **unposted**. Open, draft; final state checked 2026-10-14.

Reviewed head: `5a5cc5bda5b203c2a21b7e1454b95ff844175065`, base `dev`. Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24101/`; source unchanged, retained while open.

- [Review, validation and risk assessment](review-2026-10-14.md)
- [Unposted review draft](draft-review.md)
- [Focused validation evidence](validation-evidence.txt)
- [Regression probe](truncation-probe.test.ts) and [in-memory control config](control-config.mts)

John selected this PR on 2026-10-14. Review performed directly, preserving his earlier no-subagent preference. The regression is independently reproduced and passes with an isolated in-memory control. Final CI: {'SKIPPED': 8, 'SUCCESS': 64}. No GitHub comments/reviews or persistent PR source edits.

## Vault sync

`make validate` passes: 122 files, zero errors, 15 advisory warnings. This review batch is checkpointed locally. Push remains pending because 92 preceding local commits include unrelated batches, which VAULT_SYNC.md forbids publishing. Other workspace changes were preserved.

## John’s response — 2026-10-15

John [accepted the discovery explanation](https://github.com/galaxyproject/galaxy/pull/24101#issuecomment-6203973688) at 22:54:57 UTC and explicitly identified Sam’s response to mvdbeek’s review as the remaining dependency. Ball with Sam; no follow-up from John is due.
