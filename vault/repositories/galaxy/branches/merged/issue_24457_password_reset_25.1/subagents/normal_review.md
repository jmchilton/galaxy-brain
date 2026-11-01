No review fixes were needed. Retained the forward-merge reconciliation note: 25.1 uses the inline reset request, while 26.2 has a separate reset page and its own helper extraction. The issue regression and expired-password path are both covered by passing browser tests.

# Normal implementation review

Reviewed the complete change against `origin/release_25.1` through `b88e76ad2ca`. No actionable correctness or scope findings; no implementation changes were made by this reviewer.

Items not acted on:

- Additional narrow unit tests: the existing Jest tests cover form payloads, and the new complete Selenium flows exercise the actual client/server session mismatch. Duplicating those checks with a mocked navigation assertion is unnecessary here.
- Forward-merge reconciliation: the separate 26.2 FAQ branch introduces a `request_password_reset` helper for its newer reset page. Preserve this branch's inline 25.1 reset interaction on 25.1, then reconcile the duplicate helper against the newer page when the branches meet. This is an integration note rather than a defect in this target.

<details>
<summary>Full review</summary>

## Scope and behavior

Read the issue #24457 record and proposal, optional brain research, shared review guidance, and complete source/test diff. The initial implementation debrief was not present during review. The two production changes are small and related: reload after a successful password save, and send an expired-password login directly to the supported `/login/start` route so `expired_user` reaches the password-change component.

The existing controller calls `trans.handle_user_login(user)` on successful password change. A full navigation to `withPrefix("/")` reloads both client identity and session state consistently with the sibling login implementation. Failure handling remains in the existing catch block. The application prefix is preserved. The router and login module support `/login/start` and consume `expired_user` there.

## Tests and abstractions

The new `change_password` selectors use stable data descriptions. Navigation helpers encapsulate the user interaction, have real callers, and use state-based waits rather than new sleeps. The reset test requests the email through the 25.1 login UI, checks its recipient and subject, follows its actual token link, verifies the token form omits the current-password field, saves a new password, checks UI login state plus API identity, and verifies logout/login with that new password. The expired-password test configures the real expiration policy, ages the fixture account, submits a real login, accepts the warning, checks the current-password form, and exercises the same post-save session assertions.

The baseline-first commit remains separate (`0e56f4e9a3a`), ahead of the fix. Assertions were strengthened for the final regression rather than weakened. Tests use the target release's Selenium/Jest infrastructure; no newer Playwright infrastructure is imported.

## Verification and limits

Independently ran `git diff --check origin/release_25.1`; it passed. Inspected the controller, router, login module, smart-component waits, login helpers, new test, and existing component tests. The final worktree was clean after the implementation commit appeared during review.

Execution evidence supplied by the implementation work: existing Jest component tests passed (7 tests); baseline form tests passed before the fix; the full reset regression failed against the old compiled client with server/UI identity disagreement; rebuilt fixed-client Selenium passed both complete reset and expired-password flows (2 tests, 65.83 seconds). This reviewer did not rerun the browser suite. Dedicated test-challenge and later hardening steps remain separate from this review.

</details>
