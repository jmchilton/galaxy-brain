# PR #25081 initial review (default profile)

- Profile: default (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5, effort: medium
- Reviewed commit: `975fd1a7ad0551b4b1c7f79084499d97e75f7ca5` (2 commits on merge-base `9632e69b9a7c`)
- Library inspected: social-auth-core 6.2.0 and 5.2.0, installed in scratch venvs

## Verdict

Approve after small fixes. The adaptation to social-auth-core 6 is careful. The `PSANonce` and `UserAuthnzToken` storage methods match the 6.2.0 mixin contracts. Exception handling maps onto the new `code`/`recovery` metadata, and the `<name>_state` to per-state transaction change is followed through `authenticate()` and `callback()`.

I checked `OLD_ID_KEYS` in the migration against social-auth-core 5.2.0 for every `BACKENDS_NAME` entry, including Galaxy's `oidc`, `keycloak`, `cilogon`, `auth0` and `tapis` subclasses, and it is correct. Okta, Azure v2 tenant and Google are the only backends whose key changed (all to `sub`). All three are in 6.2.0's `UNVERIFIED_LEGACY_TRANSITIONS` with matching class paths, so they migrate on next login as the PR says.

I found no real bugs. The main gap is that the backfill migration, the piece most likely to lock users out if it's wrong, has no test, even though Galaxy has an established pattern for one.

Tests were not run. The worktree has no `.venv` and the review was read-only.

## Findings

### P2 1 — No migration test for the `id_key` backfill

`ddd0f036e070` decides, row by row, whether existing users can still log in. A wrong key ends in `identifier_migration_conflict` (lockout). The unit tests in `test_deferred_user_creation.py` build rows that already have `id_key` set, so they never run the backfill. Nothing checks the per-provider mapping, the Google `uid LIKE '%@%'` split, that unrelated providers keep `""`, or that downgrade works.

`test/unit/data/model/migration_fixes/test_migrations.py` already has this pattern for data-fix migrations (e.g. `test_d619fdfa6168`): downgrade to the parent revision, insert rows, upgrade, assert. Add a `test_ddd0f036e070` that:

- downgrades to `b9467a8c12de`
- inserts rows with Core, because the ORM model now has `id_key`: a `keycloak` row, an `okta-openidconnect` row, a Google row with an email uid, a Google row with a numeric sub, and a row with an unknown provider
- upgrades and asserts `sub`, `preferred_username`, `email`, `sub` and `""` respectively

That also covers the `custos_to_psa.get_psa_table()` change: the downgrade/upgrade path through `724237cc4cf0` is what the PR says broke.

### P2 2 — OAuth2 state nonces are never pruned

In social-auth-core 6, `get_or_create_state()` writes a `psa_nonce` row (`PSANonce.use`) on every login start. Only a completed callback deletes it (`PSANonce.consume`). A row is left behind for good by:

- every abandoned login
- every retry: `FlowState.save` deletes the previous attempt's `PSAPartial` but not its nonce
- every state that expires past `STATE_LIFETIME` (1800 s)

Nothing in Galaxy cleans up `psa_nonce`. The sibling store already handles this: `FlowState.save()` calls `self._cleanup(now)` to drop expired `PSAPartial` rows on each new attempt. Do the same for nonces. For example, in `PSANonce.use()` (or next to `FlowState._cleanup`), delete rows with `server_url LIKE 'social_core.oauth2.%'` and `timestamp < now - STATE_LIFETIME` before inserting. The scope prefix comes from `BaseOAuth2._nonce_scope()`.

### P3 1 — `get_social_auth_by_extra_data()` is unused and scans every association for the provider

No code in social-auth-core 6.2.0 calls `get_social_auth_by_extra_data` (only the abstract stub in `storage.py` defines it), and none of Galaxy's backends do either. The implementation loads every `oidc_user_authnz_tokens` row for the provider into Python. On a large server that would be slow if a future backend did call it, and it has no test. Either drop it and inherit the mixin's `NotImplementedError` (fails loudly if a backend ever needs it), or keep it and add a one-line note that it's a full scan. Optional.

### P3 2 — Missing `id_key` in a confirmation flow is silently stored as `""`

`check_user_creation_confirmation(..., id_key: str = "")` and `create_user()`'s `data.get("id_key", "")` both default to an empty key. The pipeline always supplies `id_key` (`social_uid`), so an empty value only means a broken or out-of-pipeline caller. Storing it creates exactly the unkeyed row this PR's migration exists to remove. The other identity fields are checked in `_confirmation_identity()`. Validate `id_key` there as well, as a non-empty `str`, and raise `InvalidFlow` instead of defaulting. Then `create_user()` doesn't need its own `isinstance` check.

### P3 3 — Admin note on overridden `ID_KEY` exists only in the PR body

Deployments that set `<BACKEND>_ID_KEY` through `oidc_config.xml` properties get the default key backfilled, so their users can no longer log in. That setting is passed through by `PSAAuthnz.__init__`'s `for key, value in oidc_config.items()`. The only warning is in the PR description. Put the note, with the remediation (`UPDATE oidc_user_authnz_tokens SET id_key = '<configured key>' WHERE provider = '<backend name>'`), where admins will see it: the migration docstring, a `log.warning` when a backend has `ID_KEY` set, or the release-notes label/section. A related question for the author: should `GOOGLE_OPENIDCONNECT_USE_UNIQUE_USER_ID` now be flagged as obsolete in docs or the sample config, since the new test says it no longer changes the uid?

### P3 4 — Stale comment naming a removed exception

`lib/galaxy/config/__init__.py` (the `"social"` logger comment) still says social-core "re-raises AuthCanceled/AuthForbidden/etc." `AuthForbidden` no longer exists in 6.x. Change it to e.g. "`AuthException` subclasses".

## Notes (not findings)

- `callback()` maps every non-`restart_login` `AuthException` to "contact an administrator", including `retry_later` (provider unavailable or rate-limited) and `check_provider_profile` (no email). social-auth-core 6 messages are documented as safe to show users (`REASONS`: "Safe defaults only"). Showing `str(e)` for those recoveries would reuse that instead of adding more hand-written strings. This is UX polish, not required.
- `_transaction_state()` in `callback()` overlaps with social-core's own `validate_state()`, and `FlowState.consume(authentication_id(state))` already keys the loaded session by state. It's a reasonable early `InvalidFlow`, and it keeps the check the old `<name>_state` comparison used to do.
- Imports are at module top level. `PSANonce.consume`'s `assert isinstance(result, CursorResult)` matches how `FlowState.consume` handles the same typing issue (that one uses `cast`), which is fine either way.
- The changed tests are strengthened, not weakened. The Google test now asserts `uid == "verified-subject"` and `id_key == "sub"` in both modes, with a comment explaining the upstream behavior change. The new nonce-from-another-session test reproduces the advisory.
