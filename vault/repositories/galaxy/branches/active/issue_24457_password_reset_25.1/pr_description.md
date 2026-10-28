Fix 🎯 #24457 — reload Galaxy after a password reset so the browser recognizes the authenticated session created by the save.

Saving a password from an emailed reset link currently returns home with **Login / Register** still showing. Trying to log in then fails with “Wrong session token found, denying request.” The server has already logged the user in, but the browser is still using its anonymous state. A full page load after saving brings them back into agreement, matching ordinary login.

| Flow | Current behavior | With this change |
| --- | --- | --- |
| Emailed password reset | Home still looks logged out | Home shows the authenticated account |
| Expired-password login | Redirect loses the account query before reaching the change form | Current-password form opens, and saving returns to authenticated home |

***This fixes both successful save paths through the shared password-change form: emailed resets and expired-password changes.*** The expired-login redirect also needs the canonical `/login/start` route to preserve its account query.

![Authenticated home immediately after saving a password from the emailed reset link](screenshots/password_reset_saved.png)

<details><summary>Browser evidence</summary>

The two Selenium integration tests exercise reset mail/token generation through mock SMTP and actual expired-account login. Each saves a new password, checks both the authenticated masthead and API identity, then logs out and logs back in with that password.

The baseline commit passes two form-only tests before the fix. With the old compiled client, the reset regression fails at the authenticated-masthead assertion while the API already reports the user as logged in. With the fixed client, both complete flows pass; the final screenshot run passed both cases in 165 seconds. The existing ChangePassword/LoginForm Jest suites also pass all seven tests.

![Expired-password form reached through login](screenshots/password_expired_form.png)

</details>

## Risks

This is a two-way door: successful password changes now reload home, using the same session-refresh convention as ordinary login.

<details><summary>Risk Details</summary>

- Both consumers of the shared form now perform a full page load after a successful save.
- The expired-account login destination changes to the route that accepts its account query.
- No API contract, password policy, or database schema changes are introduced. Failed saves retain the form and its existing error alert.

</details>

<details><summary>Risk Review Advice</summary>

Review the two navigation changes together with the browser assertions for authenticated identity and subsequent login. `withPrefix` preserves deployment prefixes; local browser evidence covers the normal root deployment.

</details>

## Context

***This targets Galaxy 25.1's existing login/reset UI; it does not introduce the newer dedicated reset page.*** Forward merges should reconcile the reset-request helper with that newer UI, as recorded in the implementation notes. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Both password-save paths and the expired-login route belong in this fix.</summary>

Retained the shared session reload and the route correction needed to reach the expired form. Broader validation coverage and a new session synchronization abstraction would expand beyond the demonstrated defect.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No outstanding maintainability findings remain in the five-file diff.</summary>

The fix removes the unused router dependency and reuses full navigation. Browser selectors and operations stay in the existing navigation layer, and every new helper has a caller.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>The regressions check visible and server session state through real user flows.</summary>

Mock SMTP captures the actual generated reset link; expired-password setup ages a real account before UI login. Assertions check behavior rather than a particular navigation API. Baseline, failing-regression, and passing-fixed-client runs are recorded in the branch notes.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>The passing baseline stays in its own leading commit; no independent refactor was needed.</summary>

Commit <code>0e56f4e9a3a</code> adds form hooks and baseline coverage. Commit <code>b88e76ad2ca</code> fixes navigation and extends the tests through successful password saves and authenticated sessions.

</details>

## John's Checklist

- [x] Did a human read every test and every comment?
- [x] What does the user see when it fails? The form retains its existing error alert.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes; browser tests check session behavior.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc. — what purpose do they serve? N/A.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Test coverage</summary>

Run `test/integration_selenium/test_password_reset.py` with Galaxy's Selenium integration runner. The fixture configures mock SMTP and password expiration. Existing client coverage is in `ChangePassword.test.ts` and `LoginForm.test.ts`.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
