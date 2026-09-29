# galaxy#23772 - Tighten email and account checks on user updates

- PR: https://github.com/galaxyproject/galaxy/pull/23772 (mvdbeek, base `dev`, +282/-36)
- Head SHA: `0521cf89e0cae5de544c1aef648c0adfaafa20bc`
- Merge-base with `origin/dev`: `07420debd2e90f7dc32c2709fc8acecfa95d50bd`
- Worktree: `~/projects/worktrees/galaxy/pr/23772`
- Follow-up to #23303 (typed `PUT /api/users/{user_id}` gained `email`/`display_name`). No PR comments/reviews yet.

## Verdict

Approve with one substantive request. The fixes are real and well placed: the email policy sits in
`UserManager.update_email`, so both the typed and legacy endpoints get it and OIDC opts out
explicitly. The address IDOR fix and the stale activation token fix are both correct. The gap: the
"email is the account key" gate misses `fixed_delegated_auth`, the config where OIDC login
auto-links an existing account by email.

## What was checked

- Unit tests pass locally (existing venv at `~/projects/repositories/galaxy/.venv`, `PYTHONPATH=lib`):
  `test_UserManager.py` 47 passed, `test_psa_authnz.py` 57 passed, `webapps/api/test_users.py`
  1 passed (with `--import-mode=importlib`; the default mode hits a conftest path mismatch that also
  breaks `test_cbv.py` in the same dir, so it's a local env problem, not the PR).
- Red-to-green:
  - Reverting the `validate_email` hunk makes `test_update_email_changes_only_the_case` fail. Good.
  - Disabling the `_is_admin_email` refusal makes
    `test_update_email_to_an_admin_address_requires_an_admin_or_identity_provider` fail. Good.
  - Removing `user.activation_token = None` leaves **all unit tests green**. Only the integration
    test covers it (see finding 4).
- Other write paths for `User.email`: grep of `lib/galaxy` finds only `UserManager.update_email`
  (managers/users.py:227) and purge's hash (:375). Both endpoints and `sync_user_profile` go through
  `update_email`. Nothing is left unguarded. `update_username` gets no new policy, which is fine
  because no login path resolves accounts by username.
- Remote user: `webapp.py:632-656` resolves by header email (case-insensitive) and invalidates a
  session whose email differs, so the new 403 mostly makes an existing de-facto break explicit.
- Whitespace: `VALID_EMAIL_RE` rejects spaces and `admin_users_list` is stripped, so padding can't
  get around `_is_admin_email`.
- DB: `galaxy_user.email` is `unique=True` but case-sensitive (model/__init__.py:876), so a
  case-insensitive duplicate race was already possible and this PR doesn't change it. Leaving
  `user.id` out of the dup query only affects the user's own row.
- Inactive users keep admin: `config.is_admin_user` ignores `active`. Before this PR, under
  `user_activation_on`, a non-admin who switched to an unclaimed `admin_users` address became
  inactive but was still admin through the live session or API key. Registering that address instead
  requires activating before login, so the email-change path really was worse. The admin-address
  check is justified, including when activation is on.

## Findings (ranked)

### 1. `fixed_delegated_auth` is missing from the external-identity gate (medium, security)

`lib/galaxy/managers/users.py:216`:
```python
if trans.app.config.use_remote_user or trans.app.config.disable_local_accounts:
```
`associate_by_email_if_logged_in` (`lib/galaxy/authnz/psa_authnz.py:1064-1071`) auto-associates a
first-time OIDC login with **any existing account whose email matches, case-insensitively**, when
`fixed_delegated_auth` is true. That flag is derived at `lib/galaxy/app/__init__.py:1084` as exactly
one OIDC provider plus no `auth_config` authenticators. It doesn't imply `disable_local_accounts`.
`enable_account_interface` defaults to true, and in that mode `sync_user_profile` doesn't run.
Scenario: a user signed in through the IdP changes their email to `victim@idp` (not in Galaxy yet).
The victim's first OIDC login is then silently linked to the attacker's account. That is the exact
threat the new comment describes, in a config the gate doesn't cover. Suggest adding
`or trans.app.config.fixed_delegated_auth`. Better still, put the condition on the config as a named
property (e.g. `accounts_resolved_by_email`) so the manager and any future caller share one
definition. Non-fixed mode is fine as is: the victim gets the "log in to link" prompt and can't log
in as the attacker.

### 2. The refused config still works as an existence oracle (low)

`users.py:211` runs `validate_email`, which includes the duplicate lookup, *before* the policy
refusal at :215. Under `use_remote_user`/`disable_local_accounts`, a non-admin can't change email at
all, yet a probe still returns 400 "already exists" for a registered address and 403 for a free one.
Local-account instances already leak this through any email change, but on refused configs there is
no reason to. Moving the config refusal above `validate_email` costs nothing and also saves a query.
(The admin-address check can stay after it, since its message deliberately copies the dup message.)

### 3. `_is_admin_email` duplicates admin-address matching instead of centralizing it (low, reuse)

`users.py:467-468` adds a case-insensitive matcher. Admin-by-email logic already lives in
`GalaxyAppConfiguration.is_admin_user` (`config/__init__.py:667-669`, exact match),
`webapp.py:644` (exact `in admin_users_list`), and `UserManager.admins` (`users.py:474`). The new
check matching case-insensitively while granting stays exact is safe, since it refuses more than
needed. But this is now the fourth place that interprets `admin_users_list`. A
`config.is_admin_email(email, *, case_insensitive=...)` (or a lowercased set cached when the list
is set, at `config/__init__.py:665`) would give one abstraction to reuse, not a private manager
helper.

### 4. Token reset has only integration coverage (low, tests)

`users.py:233`. Removing the line leaves every unit test green, and only
`test/integration/test_users.py::test_email_change_invalidates_the_previous_activation_token`
catches it. A cheap unit test next to the existing activation test in `test_UserManager.py`
(~:377) could do the same job. Set `activation_token`, enable `user_activation_on`, patch
`send_activation_email` or `util.send_mail`, then assert the stored token changed. Keep the
integration test, because it is the one that proves `/user/activate` rejects the old link.

### 5. Case-only change triggers re-activation (nit, UX)

With the dup fix, `Jane@x` -> `jane@x` now goes through, and under `user_activation_on` it
deactivates the account and sends mail (`users.py:230-233`) for what is, in practice, the same
mailbox. Consider skipping the activation reset when
`user.email.lower() == new_email.lower()`. Optional.

### 6. IdP-asserted admin addresses (note, not blocking)

`asserted_by_identity_provider=True` (`psa_authnz.py:861-868`) lets IdP sync assign an
`admin_users` address, and the new test enshrines that. That's reasonable for a trusted IdP, but it
takes the IdP's `email` claim without checking `email_verified`. Some providers let users set
unverified emails. That's a pre-existing trust model, so it could be a follow-up, not part of this PR.

## Things done well

- Policy in the manager, with an explicit opt-out kwarg for the IdP path. That's the right place,
  and the default is safe for new callers.
- The `ACCOUNT_IDENTITY_FIELDS` / `ACCOUNT_INTERFACE_EXEMPT_FIELDS` split plus the partition test
  (`test/unit/webapps/api/test_users.py`) makes a future `UserUpdatePayload` field fail CI until
  someone classifies it. It's a non-trivial guard, not a silly unit test.
- Address IDOR fix (`api/users.py:1053-1060`) looks up the id only among the edited user's
  addresses and leaves malformed ids to `decode_id` (400). The API test checks both and asserts that
  the owner's row is unchanged.
- Dropping the once-per-process log warning is fine. The docstrings still carry the deprecation.
- Imports are top-level everywhere, including the integration test's `requests`/`urllib.parse`.
- The manager unit tests are proper behaviour tests, not trivia. The integration tests are needed
  (config-driven, full-stack) and not duplicative.

## Draft GitHub review comment

```
*Posted by Claude (AI assistant) on behalf of jmchilton - not personally authored.*

Thanks - this looks good. Putting the policy in `UserManager.update_email`, with an explicit
`asserted_by_identity_provider` opt-out, covers both endpoints, and the payload-field partition test
is a nice guard. Unit tests pass locally, and reverting the `validate_email` hunk or the admin-address
check turns the new tests red.

One substantive point and a few small ones:

1. **`fixed_delegated_auth` isn't covered by the external-identity gate** (`managers/users.py`,
   `use_remote_user or disable_local_accounts`). With `fixed_delegated_auth` (one OIDC provider, no
   `auth_config` authenticators), `associate_by_email_if_logged_in` auto-links a first-time OIDC login
   to any existing account whose email matches case-insensitively, and that doesn't require
   `disable_local_accounts`. With the account interface on (the default), a user could set their email
   to a colleague's IdP address before the colleague ever logs in, and the colleague's first login
   would land in that user's account. Could the condition include `fixed_delegated_auth`? Ideally it
   would live as one config property (e.g. "accounts resolved by email") so there's a single
   definition.

2. **Order of checks:** `validate_email`, which includes the duplicate lookup, runs before the config
   refusal. On instances where non-admins can't change email at all, the endpoint still answers
   400 "already exists" vs 403, which reveals whether an address is registered. Doing the config
   refusal first avoids that and saves a query.

3. **Admin address matching:** `_is_admin_email` is now the fourth interpretation of
   `admin_users_list` (`config.is_admin_user`, the remote-user impersonation check in `webapp.py`,
   `UserManager.admins`). Maybe a small helper on the config that they can share? Not blocking.

4. **Test gap:** removing `user.activation_token = None` leaves the unit tests green. Only the
   integration test catches it. A unit test in `test_UserManager.py` next to the existing activation
   test would be cheap. I'd keep the integration test too, since it proves `/user/activate` rejects
   the old link.

5. Nit: under `user_activation_on`, a case-only change (`Jane@x` -> `jane@x`) now deactivates the
   account and sends a new activation mail. Consider skipping the activation reset when only the case
   changes.
```

## Verification of findings 1 and 2 (2026-09-28)

Each checked by a separate subagent (reading the code + a temporary unit test in a throwaway worktree, since reverted).

### Finding 1: `fixed_delegated_auth`, PARTIALLY confirmed (Low-Medium, not Medium)
- The chain reproduces end to end: a non-admin changes their email via `update_email`, then `associate_by_email_if_logged_in` with `user=None` returns the attacker's account. Adding the flag to the gate blocks it; 104 + 1 existing unit tests pass.
- Missing precondition: with no `auth_conf.xml`, Galaxy falls back to a built-in `localdb` authenticator, so `fixed_delegated_auth` is False by default. The admin has to supply an explicit `auth_conf.xml` with zero authenticators (OIDC-only) and not set `disable_local_accounts`. The attacker can be an OIDC-created user.
- Not a regression: dev has no gate at all; this PR's fix is just incomplete.
- Not checked: whether `user_activation_on` would block the victim's login into the now-inactive account.

Comment:
> *Posted by Claude (AI assistant) on behalf of jmchilton - not personally authored.*
>
> The email gate at `lib/galaxy/managers/users.py:216` misses `fixed_delegated_auth`, which is set when there is one OIDC provider and an `auth_conf.xml` with no authenticators (`lib/galaxy/app/__init__.py:1084`). In that setup `associate_by_email_if_logged_in` attaches a first-time login to whichever account has that email, with no session user required (`lib/galaxy/authnz/psa_authnz.py:1064-1071`). So with the account interface on (default), a user can set their email to a colleague's IdP address, and the colleague's first login lands in that user's account. A unit test reproduces it. Suggest checking all three flags, ideally behind one named config property:
>
>     if (
>         trans.app.config.use_remote_user
>         or trans.app.config.disable_local_accounts
>         or trans.app.config.fixed_delegated_auth
>     ):
>
> (`MockAppConfig` will need a `fixed_delegated_auth` default, like `disable_local_accounts`.)

### Finding 2: error ordering, CONFIRMED (Low is fair)
- Temp test at head: an unused address gets `ConfigDoesNotAllowException` (403), a taken one gets `RequestParameterInvalidException` (400). Moving the refusal first makes every case 403; 48/48 and 58/58 existing unit tests pass.
- Not new: at the merge-base, probing an unused address actually changed the email. The PR makes the probe harmless to run and contradicts its own admin-address care (`:220-223`). On these servers registration is refused and `POST /api/users` needs admin, so this is the only probe left.

Comment:
> *Posted by Claude (AI assistant) on behalf of jmchilton - not personally authored.*
>
> `lib/galaxy/managers/users.py:211-219`: `validate_email` runs its duplicate check before the new remote-user / disabled-local-accounts refusal. On those servers a non-admin still gets 400 "already exists" for a taken address and 403 for an unused one, which tells them whether the address is registered. Registration is off there, so this is the remaining oracle. Refusing first closes it, matching the care taken for admin addresses:
> ```python
> if user.email == new_email:
>     return
> user_chosen = not asserted_by_identity_provider and not trans.user_is_admin
> if user_chosen and (trans.app.config.use_remote_user or trans.app.config.disable_local_accounts):
>     raise exceptions.ConfigDoesNotAllowException("Email changes are not allowed in this Galaxy instance")
> if message := validate_email(trans, new_email, user):
>     raise exceptions.RequestParameterInvalidException(message)
> if user_chosen and self._is_admin_email(new_email):
>     ...
> ```
