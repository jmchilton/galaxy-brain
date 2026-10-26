# #24457 — password reset leaves stale session; login fails "Wrong session token"

https://github.com/galaxyproject/galaxy/issues/24457 (assigned jmchilton, filed 2026-10-25)

- [issue_draft.md](issue_draft.md) — source note
- [proposal.md](proposal.md) — posted text
- [debrief.md](debrief.md) — research + review

Original FAQ fix: commit 76c58d2fb7f on `jmchilton/galaxy_ui_driver`; the owning Playwright session retains that standing branch until upstream reconciliation.

Hardened implementation: [`issue_24457_password_reset_25.1`](../../../branches/active/issue_24457_password_reset_25.1/index.md), base `release_25.1`, head `b88e76ad2ca`. READY and pushed; fork CI queued, handed off for human/PR review.

[Implementation update posted](https://github.com/galaxyproject/galaxy/issues/24457#issuecomment-6405387043).
