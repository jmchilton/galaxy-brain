# Debrief: user_deletion_config_message_unreachable

## Research

- Source: BUGS_FOUND.md row "Self-deletion refusal shows the generic …" (story lane, UserDeletion).
- dev sha: `20f365a2654751ba0f390733f261199ceb3f272d` (fresh origin/dev, 2026-10-10).
- Scratch worktree: `/private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-brain-vault-agents-gx-issues/8085a6b3-fc13-41f7-b964-fa636a69fe53/scratchpad/A/wt` (left in place; repro test untracked there).
- Repro: `client/src/components/User/UserDeletionRefusal.test.ts` -> red on dev (alert = generic text). Temporary `403` -> `403004` edit -> it plus existing `UserDeletion.test.ts` green (6/6); edit reverted.
- Server paths (code-cited):
  - default config (`enable_account_interface: true`, `allow_user_deletion: false`) -> `UserManager.delete` -> `ConfigDoesNotAllowException` 403004, msg "...does not allow admins to delete users." No existing test asserts this self-delete response; cited from code only.
  - `enable_account_interface: false` -> `ensure_account_modification_allowed` -> 403004 "Account deletion is not allowed in this Galaxy instance"; asserted by `test/integration/test_config_options_users.py::test_delete_rejected_for_non_admin`. UI hides card in that config, so effectively unreachable from modal.
  - `InsufficientPermissionsException` (403005) unreachable from modal: userId always current user. Coordinator's status-vs-err_code worry thus moot for this component, but err_code still more precise (proxy 403s).
- `errorResponseMiddleware` (attached in `client/src/api/client/index.ts`) rewrites non-Galaxy errors (no `X-Request-ID`) to `err_code = status`; so dev's `=== 403` only matches proxy 403s. Server mock stamps `X-Request-ID`, so repro body passes through un-normalized (like real Galaxy).
- Selenium `test_delete_account` misses it: `driver_util.py` sets `allow_user_deletion=True`.
- Origin: commit `2113d36cca7` (Composition API migration) in #19658 "User preferences redesign", merged 2025-08-05, milestone 25.1. Pre-#19658 code checked axios `e.response.status === 403` (correct then; from `c5306847a93`, 2022). #19658 also fixed old fall-through where failed delete still called logout.
- Reuse precedent: `USER_SLUG_DUPLICATE = 400006` in `client/src/api/pages.ts`; `JobProvider.js` hardcodes `403004` -> candidate shared constant. No client error-code module exists.
- `allow_user_deletion` serialized only by `AdminConfigSerializer` -> hiding card needs exposing it.
- Duplicates searched (issues+PRs): "user deletion error message", "delete account configured", "User deletion must be configured", "UserDeletion", "delete account", "self delete account error", "self-deletion", "allow_user_deletion", "err_code 403". None relevant (closest: #21976 BModal->GModal, #13418 enable_account_interface; unrelated).
- Unverified: not run in a real browser/server by me; row says seen in Chromium story `SelfDeletionNotAllowed`.

## Review round (subagent)

- Repro is byte-identical to the issue snippet and red on dev 20f365a2654. The fix check (`403004`) is green and was reverted.
- Server path verified: with config defaults, a self-delete reaches `UserManager.delete` and gets 403004. The client middleware sets `err_code` to the HTTP status only when the response isn't a Galaxy error.
- Origin refined: #19658 (25.1) introduced the wrong check, and its 403 branch didn't even set the message. #22114 (26.1) made the branch set the message but kept `err_code === 403`. Added to Context.
- The opener now accounts for `single_user` hiding the card. Noted that the client has no shared error-code module.

## Leftover

- Not run against a live server; the server side is cited from code.
