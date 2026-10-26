# Password-reset implementation handoff

STATUS: READY — hardened and pushed; substantive fork CI is green, with remaining checks and human review pending.

Branch: `jmchilton/issue_24457_password_reset_25.1`, head `b88e76ad2ca`. Base: `release_25.1` at `bd2cb474a8d`, the oldest affected supported release (25.1.0 released 2025-12-17). Issue: [#24457](https://github.com/galaxyproject/galaxy/issues/24457).

A successful password save now reloads home through `withPrefix`, so the browser bootstraps the session the server just created. The expired-password login redirect now uses `/login/start` rather than the legacy redirect that discarded `expired_user`. Both are the same password-change flow; scope review recommends retaining both corrections.

The passing baseline stays first (`0e56f4e9a3a`): it covers the emailed-token and expired-password forms with stable DOM/navigation hooks. The second commit adds the two small client corrections and extends both browser cases through saving, authenticated masthead/API identity, logout and login with the new password. No newer framework or Playwright backport was introduced into 25.1.

Validation and hardening:

- Baseline Selenium: 2 passed before the fix. The reset regression then failed against the freshly built old client at the stale-masthead assertion while the server reported an authenticated user.
- Fixed client: 2 complete Selenium flows passed. Final screenshot rerun: 2 passed in 165.24s; all four fresh images inspected (see `screenshot_debrief.md`).
- Existing ChangePassword/LoginForm Jest suites: 7 passed under pinned Node 22.13.0. Both webpack builds succeeded; lockfile unchanged.
- Normal review, test challenge, E2E polish, strict code-quality review, baseline evaluation and scope evaluation completed without outstanding findings. Their reports are alongside this file.
- Required `make format` passed with 2,290 files unchanged; worktree and diff checks are clean. Matching-entry mypy baseline/final diagnostics are identical after sorting: 54 pre-existing transitive/stub errors in 44 files, no new branch diagnostics.
- Fork CI for `b88e76ad2ca` has passed client unit/lint, Python unit (including PostgreSQL), tool/workflow framework, main tool, package and other checks without an observed failure; remaining workflows are queued/running. Handoff is under `branches_implemented`. No upstream PR has been opened by this implementation workflow.

Forward-merge note: 25.1 requests resets inline on LoginForm; 26.2 has a separate reset page. The separate FAQ branch supplies the 26.2 `request_password_reset` body. Reconcile those helpers and retain the appropriate reset-page targets when forwarding the older fix. This is not a dependency between the two review branches.

The first-handoff [implementation update](https://github.com/galaxyproject/galaxy/issues/24457#issuecomment-6405387043) was posted on #24457. The standing driver branch was not restacked.
