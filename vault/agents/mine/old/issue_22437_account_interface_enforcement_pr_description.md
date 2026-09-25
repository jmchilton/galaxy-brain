Fixes #22437.

## What

`enable_account_interface` was a UI-only flag. The read side of the account API respected it — `get_information` hides the email and username fields — but nothing on the write side did, so any authenticated user could change their email, username or password, or delete their account, by calling the API directly.

The practical impact is on deployments that pair `enable_account_interface: false` with SSO/OIDC/LDAP to keep Galaxy accounts synchronized with an external directory: a user could silently desynchronize their Galaxy profile from the upstream identity provider.

Four endpoints now reject non-admin writes when the option is off:

| Endpoint | Handler |
|---|---|
| `PUT /api/users/{id}/information/inputs` | `set_information` |
| `PUT /api/users/{id}/password/inputs` | `set_password` |
| `PUT /api/users/{user_id}` | `update` |
| `DELETE /api/users/{user_id}` | `delete` |

All four raise `ConfigDoesNotAllowException` (403), following the existing `allow_local_account_creation` guard in `create` on the same controller.

## Why the guards are in the controller

Enforcing this in `UserManager` would look tidier and would be wrong. `psa_authnz.sync_user_profile` calls `manager.update_email` and friends *precisely when* `enable_account_interface` is false — that is its guard condition. Manager-level enforcement would break OIDC profile sync, which is the main reason deployments set the option in the first place.

## Scope decisions

**`update` is guarded per-field, not wholesale.** `PUT /api/users/{user_id}` writes `username`, `active` and `preferred_object_store_id`. The first two are account identity; `preferred_object_store_id` is an operational preference, so it stays writable with the option off. Blocking it would take away a normal setting from exactly the OIDC users this option targets, which is the same reasoning that kept theme, favorites, toolbox filters and notification preferences out of scope.

**Token-based password resets are untouched.** The forgot-password flow reaches `UserManager.change_password` through `controllers/user.py`, a different route from the API `set_password`, so a user locked out of the account interface can still recover an account.

**Admins bypass all four checks**, consistent with `create`.

## Testing

`test/integration/test_config_options_users.py` gains `TestAccountInterfaceDisabledIntegration`, running with `enable_account_interface: false`.

Each rejection test was verified red first, and the pre-fix failures are the vulnerability itself rather than a generic error:

- `set_information` → `200 {"message": "User information has been saved."}`
- `set_password` → `200 {"message": "Password has been changed."}`
- `update` → `200`, with `username` actually changed
- `delete` → `200`, with `deleted: true`

The rejection assertions pin `err_code` to `CONFIG_DOES_NOT_ALLOW` (403004) rather than just the status, because `AuthenticationRequired` is also a 403 — asserting only the status code gave a false green on the password test until the test supplied the correct current password.

Two tests guard against over-blocking and passed both before and after: a non-admin can still set `preferred_object_store_id`, and an admin can still edit another user's account data.

- `test/integration/test_config_options_users.py` — 9 passed
- `lib/galaxy_test/api/test_users.py` — 25 passed
- `test/integration/test_users.py`, `test_user_preferences.py`, `test_vault_extra_prefs.py` — 13 passed
- ruff / black / isort / flake8 clean; `mypy` reports only two pre-existing `AnyUserModel` errors present on unmodified `dev`

## Documentation

The `enable_account_interface` description now states that the API enforces the flag too, and records that per `SECURITY.md`'s issue classification policy this is a non-default option subject to best-effort fixes rather than the formal security release process. `galaxy.yml.sample` and `galaxy_options.rst` carry the regenerated text for that one option only — `make config-rebuild` also reflows two unrelated options (`expression_evaluation_isolation_command`, `retry_job_output_collection`) and adds a missing attribute, which suggests `dev` has drifted from its own generator; that drift is left out of this PR.

## Noticed, not fixed here

- `set_password` declared `trans: ProvidesAppContext`, which does not carry `user_is_admin`; widened to `ProvidesUserContext` to match what the handler actually receives.
- A non-admin can pass `active` to `PUT /api/users/{user_id}`. It is covered by this guard when the account interface is off, but appears unrestricted when it is on.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
