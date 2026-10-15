# Galaxy #24095 — Declarative Admin panel links

**Latest status — 2026-10-15:** Review draft unposted; new head includes Marius’s follow-up; old relative-URL finding needs verification. Live head: `1274a56db026ec1e3fd1fff0976d7275f2b22987`. PR state, conversation comments, and reviews checked; no new code validation or CI refresh performed. Earlier review findings retain their reviewed commits.

[PR #24095](https://github.com/galaxyproject/galaxy/pull/24095) · Initial review complete; **request changes for one P2 (path-relative URL resolution)**. Delivery: **unposted**. Open, ready; final state checked 2026-10-14.

Reviewed head: `d86df284fbe61dfe3a0f3c837c37359865a43369`, base `dev`. Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24095/`; source unchanged, retained while open.

- [Review, validation and risk assessment](review-2026-10-14.md)
- [Unposted review draft](draft-review.md)
- [Focused validation evidence](validation-evidence.txt)
- [Regression probe](relative-url-probe.test.ts) and [in-memory control config](control-config.mts)

John selected this PR on 2026-10-14. Review performed directly, preserving his earlier no-subagent preference. The regression is independently reproduced and passes with an isolated in-memory control. Final CI: {'SKIPPED': 2, 'SUCCESS': 57}. No GitHub comments/reviews or persistent PR source edits.

## Vault sync

`make validate` passes: 122 files, zero errors, 15 advisory warnings. This review batch is checkpointed locally. Push remains pending because 92 preceding local commits include unrelated batches, which VAULT_SYNC.md forbids publishing. Other workspace changes were preserved.
