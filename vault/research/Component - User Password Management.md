---
type: research
subtype: component
tags: [research/component, galaxy/security, galaxy/api, galaxy/models, galaxy/client]
component: "User Password Management"
galaxy_areas: [security, api, models, client]
status: draft
created: 2026-09-10
revised: 2026-09-10
revision: 1
ai_generated: true
summary: "PBKDF2 storage, 24-hour reset tokens, five password entry flows, and the legacy controllers behind them"
sources: ["/Users/jxc755/projects/repositories/galaxy-brain/.ingest-dossiers/Component-User-Password-Management.md"]
related_notes:
  - "[[Component - CORS Handling]]"
  - "[[Component - UI Error Handling]]"
  - "[[Component - E2E Tests - Writing]]"
  - "[[Component - Tool Shed Data Model]]"
  - "[[Component - API Tests]]"
---

# User Password Management

Verified against `origin/dev` @ SHA `118e885c52cdf2c213f1277ffdfc0f6c7b408090`.

**Scope:** all local password handling — logged-out reset by email token, logged-in change, forced change on expiry, admin reset, registration validation, policy config, and storage/hashing. Out of scope: OIDC/OAuth, LDAP/PAM/remote-user (named only where they bypass or gate local passwords), API key lifecycle, session cookie internals, general authorization.

## Overview

Passwords have **one shared write path** (`UserManager.__set_password`) but **five very different entry paths**, and one of the five bypasses the shared path entirely. That asymmetry is the organizing fact of this component.

Three things are worth knowing before reading anything else:

1. **Nothing here has been migrated to the modern stack.** Every password endpoint except admin user *creation* runs on the legacy Routes-mapper + `@expose_api` / `@web.legacy_expose_api` machinery. `lib/galaxy/webapps/galaxy/services/users.py` exists and contains **no** password logic at all. There is no Pydantic payload model for changing a password.
2. **The policy is one constant.** `PASSWORD_MIN_LEN = 6`. No complexity rules, no denylist, no max length, no reuse or history check — and none of it is configurable.
3. **There is no rehash-on-login.** The stored format carries its own parameters, so old hashes verify forever under their old cost factor. Users hashed under the pre-2020 `COST_FACTOR=10000`, or under the even older unsalted SHA-1, keep those hashes indefinitely while authenticating successfully every day.

## Layer map

| Layer | File | Owns |
|---|---|---|
| Crypto primitive | `lib/galaxy/security/passwords.py` | PBKDF2-HMAC hash/verify, legacy sha1 verify |
| Legacy digest | `lib/galaxy/util/hash_util.py` | `new_insecure_hash` (sha1) |
| Token entropy | `lib/galaxy/util/__init__.py:358` | `unique_id()` |
| Policy | `lib/galaxy/security/validate_user_input.py` | `PASSWORD_MIN_LEN`, `validate_password_str`, `validate_password` |
| Model | `lib/galaxy/model/__init__.py` | `User.password`, `last_password_change`, `set_password_cleartext`, `set_random_password`, `check_password`, `PasswordResetToken` |
| Model wiring | `lib/galaxy/model/mapping.py` | injects `config.use_pbkdf2` into `User.use_pbkdf2` |
| Auth indirection | `lib/galaxy/auth/__init__.py`, `auth/providers/localdb.py`, `auth/util.py` | `check_password`, `check_change_password`, `allow-password-change` |
| Orchestration | `lib/galaxy/managers/users.py` | `register`, `create`, `change_password`, `__set_password`, `send_reset_email`, `get_reset_token` |
| Legacy controllers | `webapps/galaxy/controllers/user.py`, `controllers/admin.py` | `login`, `create`, `change_password`, `reset_password`, `reset_user_password` |
| Legacy API | `webapps/galaxy/api/users.py` | `get_password` / `set_password` on `…/password/inputs` |
| Basic auth | `webapps/galaxy/services/authenticate.py` | verify password → API key |
| Client | `client/src/components/Login/`, `User/UserPreferencesModel.ts`, `Register/RegisterForm.vue`, `Grid/configs/adminUsers.ts` | all four UI entry points |

## Storage and hashing

`lib/galaxy/security/passwords.py` is 70 lines and frozen since 2022-02-02 (a formatting commit; last substantive change 2020).

```
SALT_LENGTH   = 12        # os.urandom bytes, b64-encoded to 16 chars
KEY_LENGTH    = 24
HASH_FUNCTION = "sha256"
COST_FACTOR   = 100000
```

Stored form is `PBKDF2${fn}${cost}${salt}${b64(key)}` (`passwords.py:49`) — **parameters live in the hash**, so `check_password_PBKDF2` (L52) re-derives using the stored `fn`/`cost`, and old hashes verify under their own weaker settings. `check_password` (L26) dispatches on the `PBKDF2` prefix; the `else` branch is an unsalted `sha1(guess).hexdigest()` comparison against the raw column — the pre-PBKDF2 format. Both use `safe_str_cmp`.

Model side (`lib/galaxy/model/__init__.py`): `set_password_cleartext` (L998) validates via `validate_password_str`, branches on `User.use_pbkdf2` between `hash_password` (L1005) and `new_insecure_hash` (L1007), and stamps `last_password_change = now()`. `use_pbkdf2` is a class attribute overwritten at startup by `mapping._configure_model` from config. `set_random_password` (L1010) correctly uses `random.SystemRandom()`.

`use_pbkdf2: false` exists for ProFTPD, which reads `galaxy_user.password` directly (`doc/source/admin/special_topics/ftp.md:41`).

Legacy compatibility is **deliberate and permanent**: `test/unit/data/security/test_passwords.py:31-40` pins both Py2/Py3 10000-iteration PBKDF2 hashes and raw sha1 hashes as must-keep-verifying fixtures.

## Policy

`lib/galaxy/security/validate_user_input.py`:

- `PASSWORD_MIN_LEN = 6` (L67).
- `validate_password_str` (L86) — length only.
- `validate_password(trans, password, confirm)` (L195) — confirm-match, then delegates.

The layering matters: `model.User.set_password_cleartext` calls `validate_password_str` itself, so the length rule cannot be routed around by any write path. The confirm-match check exists only at manager/controller level. This makes `validate_password_str` **the single choke point** for any future policy work.

## The reset token

`lib/galaxy/model/__init__.py:1411-1425`. The token *is* the primary key (`String(32)`). TTL is a hard-coded 24 hours, not configurable. Entropy comes from `galaxy.util.unique_id()` — `md5(str(random.getrandbits(128)))` over the **stdlib module-level Mersenne Twister**, not `SystemRandom`/`secrets` (see Known issues).

Single-use is implemented by **back-dating `expiration_time = now()`** against a strict `>` check, not by deleting the row — and only on the success path, so a failed submit leaves the token live (desirable UX). No cleanup job exists anywhere in `lib/` or `scripts/`; the table grows monotonically. It appears in no alembic revision — it predates the baseline and is created from model metadata.

## The five flows

### A — logged-out reset by email

`LoginForm.vue:141-153` POSTs `/user/reset_password`; the link is gated on `enable_account_interface`. That resolves through buildapp's catch-all `/{controller}/{action}` to `UserController.reset_password` (`controllers/user.py:355`), which always returns the enumeration-safe *"If an account exists for this email address…"* unless the manager handed back an error.

`UserManager.send_reset_email` (`managers/users.py:623`) refuses without `smtp_server`, validates the email, then `get_reset_token` looks the user up by email and **retries case-insensitively** (the legacy of `8dec13c376f`), skipping deleted users. The mail body is a module-level `%`-formatted constant `PASSWORD_RESET_TEMPLATE` (L71-80) — notably *not* a file under `templates/mail/`, unlike `send_activation_email`.

The link points at `/login/start?token=…`. Resolution is worth tracing because it explains a bug later: the server mapper is consulted first and matches `controller="login"`, but **there is no `controllers/login.py`** — `_resolve_map_match` raises `HTTPNotFound` and `handle_request` (`web/framework/base.py:248-259`) falls back to the clientside mapper, which serves the SPA. `Login.vue:14-16` then renders `ChangePassword.vue` when `query.token || query.expired_user` is set.

Submit POSTs `/user/change_password`; the token branch of `UserManager.change_password` (`managers/users.py:504-514`) validates expiry, sets the password, back-dates the token, and the controller calls `trans.handle_user_login(user)` — a successful token reset logs you straight in.

### B — logged-in change via preferences

A `FormGeneric` card (`UserPreferencesModel.ts:47-60`) GETs and PUTs `/api/users/{id}/password/inputs`, routed by explicit `mapper.connect` calls at `buildapp.py:727-741` to `get_password` / `set_password` (`api/users.py:1046`, `:1060`). The GET returns a static three-field spec; the PUT delegates straight to `change_password`'s id branch, which runs `auth_manager.check_change_password(user, current, request)` before `__set_password`.

**`__set_password`** (`managers/users.py:531-557`) is the shared write path and the only place that:
- runs `validate_password`,
- calls `set_password_cleartext`,
- **invalidates the user's other `GalaxySession` rows** (all `is_valid` sessions except `trans.galaxy_session.id`),
- writes `trans.log_event("User change password")`.

There is no "must differ from current" rule — `test_new_password_same_password` asserts re-setting the same password succeeds.

### C — forced change on expiry

`password_expiration_period` (config schema L1556, default `0` days) is converted to a `timedelta` at `config/__init__.py:897`. The check lives in `controllers/user.py:197-211`, inside the **`else:` branch** of `__validate_login`. On expiry the controller returns `expired_user: <encoded id>`; the "expiring soon" warning fires in the last 10% of the period, hard-coded.

`LoginForm.vue:112-113` reacts by navigating to `/root/login?expired_user=…`. `ChangePassword.vue:52` renders the extra "Current Password" field only when `expiredUser` is set — which is why `current` is required here but not in the token flow. See Known issues #1 and #2; both live in this flow.

### D — admin reset

A per-row "Reset Password" action in `adminUsers.ts:88-95` → `FormGeneric` on `/admin/reset_user_password` → `controllers/admin.py:772-796` (`@web.legacy_expose_api` + `@web.require_admin`). It accepts `util.listify(kwd.get("id"))`, so it is a **bulk** operation setting the *same* password on N users.

It calls `set_password_cleartext` directly and therefore **bypasses `__set_password`** — no session invalidation, no `log_event`, no `allow-password-change` consultation. Given that admin reset is the standard response to a compromised account, the missing session invalidation is the sharpest edge in this component.

### E — registration

`RegisterForm.vue` POSTs `/user/create` (CSRF-checked). `UserManager.register` (`managers/users.py:100-136`) gates on `allow_local_account_creation`, then joins the messages from `validate_email` + `validate_password` + `validate_publicname` — all three always run. `UserManager.create` (L138-174) falls back to `set_random_password()` when no password is supplied; that is the "account with no usable local password" case used by autoregistration, `get_or_create_remote_user`, and PSA/OIDC account creation.

## Auth-provider indirection

No controller calls `User.check_password` directly. Everything goes through `AuthManager` (`lib/galaxy/auth/__init__.py`), which iterates configured authenticators — `check_password` (L78) for login and Basic-auth, `check_change_password` (L91) for the preferences flow, `check_registration_allowed` (L26) for signup. `LocalDB.authenticate_user` (`auth/providers/localdb.py:25`) is a three-line wrapper; `LocalDB.authenticate()` always returns failure, since localdb can never auto-create.

**Operator footgun:** `allow-password-change` defaults to `False` in `AuthManager` code (L101), but `auth/util.py:25-34` synthesizes `true` when no `auth_config_file` exists. An admin who hand-writes a minimal `auth_conf.xml` silently disables change-password with the message *"Password change not supported."*

`user.external == True` blocks login outright regardless of stored password. `use_remote_user` / `disable_local_accounts` / `enable_account_interface` gate only the *client* — see Known issues #7.

## Endpoints

| Method + path | Handler | Auth | Notes |
|---|---|---|---|
| `POST /user/login` | `controllers/user.py:143` | anon+sessionless, **CSRF** | returns `expired_user` on expiry |
| `POST /user/create` | `controllers/user.py:267` | anon+sessionless, **CSRF** | registration |
| `POST /user/reset_password` | `controllers/user.py:355` | anon+sessionless, no CSRF | request reset email |
| `POST /user/change_password` | `controllers/user.py:335` | anon+sessionless, no CSRF | token *or* id+current |
| `GET /api/users/{id}/password/inputs` | `api/users.py:1046` | `@expose_api` | static field spec |
| `PUT /api/users/{id}/password/inputs` | `api/users.py:1060` | `@expose_api`, **no ownership check** | delegates to manager |
| `GET\|PUT /admin/reset_user_password` | `controllers/admin.py:773` | `@web.require_admin` | bulk; bypasses `__set_password` |
| `POST /api/users` | `api/users.py:587` (FastAPI) | `require_admin=True` | only Pydantic-typed password endpoint |
| `GET /api/authenticate/baseauth` | `services/authenticate.py:33` | Basic auth | verify password → API key |

**Routing mechanics** (`web/framework/base.py:219-259`): two Routes mappers exist and `map_match = self.mapper.match(...) or client_match` — the **server mapper wins**, with the clientside match used only as a fallback when controller resolution raises `HTTPNotFound`. Because `buildapp.py:109` connects the catch-all `/{controller}/{action}` *before* the clientside routes at L191+, every `/<x>/<y>` URL is offered to a server controller first. This is the same dual-mapper stack described in [[Component - CORS Handling]], and it is the direct cause of Known issue #1.

Also live: `webapps/base/webapp.py:705-724` keeps an `allowed_paths` allowlist so `reset_password` and `change_password` still work when `require_login` is on. It carries a TODO to eliminate itself and still lists four `UserController` actions that no longer exist.

## Config

| Option | Default | Effect |
|---|---|---|
| `use_pbkdf2` | `true` | `false` → new passwords stored as unsalted hex sha1 |
| `password_expiration_period` | `0` days | forced change on login; 10%-of-period warning |
| `enable_account_interface` | `true` | hides preferences card + reset link — **client-side only** |
| `disable_local_accounts` | `false` | forces `allow_local_account_creation=false`; hides card client-side |
| `allow_local_account_creation` | `true` | gates `register` and `POST /api/users` |
| `use_remote_user` | `false` | hides card client-side; remote users get a random password |
| `smtp_server` | unset | `send_reset_email` refuses without it |
| `auth_config_file` | `auth_conf.xml` | `<allow-password-change>` per authenticator |

No config option exists for minimum length, token TTL, complexity, history, or rate limiting.

## Tests and gaps

| File | Covers |
|---|---|
| `test/unit/data/security/test_passwords.py` | round-trip, unicode, **pinned legacy hash fixtures** |
| `test/unit/app/managers/test_UserManager.py:157-191` | `change_password` — missing args, wrong current, mismatch, success, token, expired token |
| `test/unit/webapps/test_login.py:35-99` | login controller incl. all three expiry outcomes; case-insensitive `get_reset_token` |
| `test/unit/auth/test_auth.py` | `LocalDB.authenticate_user`; policy rejection |
| `lib/galaxy_test/selenium/test_change_password.py` | 6 browser tests over the preferences flow; still `@selenium_only` |

**Gaps** — no API-level test of either password endpoint (`lib/galaxy_test/api/test_users.py` never mentions passwords beyond the `last_password_change` key); no test of admin reset; no end-to-end reset-email test; no test of the expiry *redirect* (only the controller's JSON); no test that session invalidation happens; no integration test with `password_expiration_period` set. Closing the API gap would use the plumbing in [[Component - API Tests]]; the Selenium test's `@selenium_only` status is a live instance of the migration gap tracked in [[Component - E2E Tests - Writing]], with its selectors in `navigation.yml:69, 130-132`.

## Tool Shed's parallel implementation

`lib/tool_shed/webapp/model/__init__.py` defines its own `User` and `PasswordResetToken` and does **not** use `galaxy.security.passwords`. Shed passwords are unsalted hex SHA-1 for all users unconditionally — no PBKDF2 branch, no `use_pbkdf2` knob — and `check_password` (L171) uses a plain `==` rather than `safe_str_cmp`. It does share `validate_password_str` and `galaxy.auth.AuthManager`. Its `password_expiration_period` is typed plain `int` with no timedelta conversion. Schema context in [[Component - Tool Shed Data Model]].

## Known issues

1. **The expired-password forced-change redirect appears broken.** `LoginForm.vue:113` navigates to `/root/login?expired_user=…`, but `/root/login` is not a registered clientside route (`buildapp.py:194` registers only `/root`) and the server catch-all is consulted first, so it resolves to `RootController.login`. That method ends (`controllers/root.py:79`) with `send_redirect(url_for(controller="login", action="start", redirect=redirect))` — `expired_user` lands in `**kwd` and is dropped. The user should arrive at `/login/start` with no query params and see the ordinary login form, never the change-password form. **Needs empirical confirmation before filing**; the unit test only asserts the controller's JSON, so it would not catch this.
2. **The expiry check sits in the wrong branch.** `controllers/user.py:184-211` — when `user_activation_on` is true and the user is inactive but within the grace period, login proceeds at L192 *inside the activation branch*, which never evaluates `password_expiration_period`. Unactivated-but-in-grace users bypass expiry entirely.
3. **Reset-token entropy uses a non-cryptographic PRNG.** `unique_id()` is md5 over the stdlib Mersenne Twister. Galaxy already uses `SystemRandom` for `set_random_password` and `os.urandom` for salts, so the habit exists — this call site predates it. `secrets.token_hex(16)` is a drop-in for the `String(32)` column.
4. **No rate limiting on the auth surface.** Login, change-password and reset-password are all `@expose_api_anonymous_and_sessionless` with no throttle. A `Limiter` exists (`fast_app.py:341-350`) but is applied at exactly one unrelated call site, and these are legacy WSGI routes FastAPI middleware does not cover. `check_change_password` returns a distinguishable *"Invalid current password."*
5. **`change_password` and `reset_password` skip the CSRF check** their siblings `login` and `create` perform. Deliberate for the token flow (no session), but the authenticated id+current path is unprotected too. `ChangePassword.vue` correspondingly sends no `session_csrf_token`, unlike `LoginForm.vue` and `RegisterForm.vue`.
6. **`set_password` skips the ownership guard its siblings use** — `api/users.py:1060` omits the `_get_user` check at L1219-1224. Mitigated in practice by the `current`-password requirement, but it invites a regression if `current` ever becomes optional.
7. **`disable_local_accounts` / `enable_account_interface` / `use_remote_user` are client-side only.** The server endpoints stay live; on an OIDC-only instance local password endpoints remain reachable.
8. **No rehash-on-successful-login.** Cost went 10000 → 100000 in 2020 (`eeaf748c8c4`), but users who never change their password keep the old parameters forever. The verify path already knows the stored parameters, so this is a contained change.
9. **`password_reset_token` rows are never deleted** — single-use is back-dating, and no cleanup script exists.
10. **Admin bulk reset diverges from the shared write path** — no session invalidation, no audit event, no `allow-password-change` check. See flow D.
11. **`set_password_cleartext` raises a bare `Exception`** (`model/__init__.py:1003`) rather than a `galaxy.exceptions` type, so callers reaching the model backstop directly cannot turn it into a clean 400. Error surfacing otherwise follows the pattern in [[Component - UI Error Handling]].
12. **`active_authenticators` `eval`s a config-supplied `<filter>`** (`auth/__init__.py:118`) with `{"__builtins__": None}` — admin-controlled, so not user-facing, but it is an `eval` in the login hot path.
13. **`allow-password-change` default mismatch** between code (`False`) and synthesized config (`true`).

## Extension points

- **Policy** — `validate_password_str` in `validate_user_input.py` is the single choke point (the model calls it too, so nothing can route around it). Making it config-driven means threading config in; `validate_password` already takes `trans`, `validate_password_str` does not.
- **KDF** — the stored `PBKDF2$fn$cost$salt$key` format already carries its parameters, so a new prefix (`ARGON2$…`) can coexist. `check_password`'s `else` branch is the sha1 catch-all and would need reordering into a prefix dispatch.
- **Rehash-on-login** — `LocalDB.authenticate_user` has the user, the cleartext and the result, making it the natural site; it currently has no session to commit with. `AuthManager.check_password` is the alternative and has the same problem.
- **Any new write path** must go through `UserManager.__set_password` — it is the only place that invalidates sibling sessions and logs the event.
- **Modernization** — the highest-value refactor is moving `get_password` / `set_password` / `change_password` / `reset_password` onto FastAPI with Pydantic payloads in `services/users.py` (today empty of password code), which would also bring them under the existing `limiter`. [[Component - Workflow API]] documents the target shape.

## Recent activity

`passwords.py` is frozen since 2022-02-02 (formatting); last substantive change 2020-04-22 (`eeaf748c8c4`, cost factor bump). Recent churn in `managers/users.py` is all adjacent — OIDC token purge (2026-09-02), activation transaction handling (2026-07-16), configurable OIDC activation (2026-07-13), `utcnow()` → `now()` (2026-05-03, which *does* touch `PasswordResetToken` expiry semantics). The `Login/` client cluster is 2026-01/02 test-infrastructure work plus a session-cookie fix (2026-04-25).

Read: the crypto and flow logic are stable and untouched; all motion is OIDC, activation, and client test plumbing. Nothing in flight would conflict with a hardening pass.
