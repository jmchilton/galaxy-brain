# Test challenges review: PR #25081

- Profile: gx_test_challenger (`_shared/reviewers/gx_test_challenger.md`)
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `975fd1a7ad0551b4b1c7f79084499d97e75f7ca5`
- Debrief and test plan: [test_challenges_debrief.md](test_challenges_debrief.md)

**Verdict:** the tests are solid. No test was weakened; the rewritten assertions follow real social-auth-core 6 behaviour changes. The new authnz tests run the real PSA backend against a fake IdP, the right layer, and include a GHSA regression test. All touched tests pass (40 + 111). The gaps are in the database migration side and in the user-facing error mapping.

## P2 1: Migration `ddd0f036e070` id_key backfill is untested

The backfill (`OLD_ID_KEYS` plus the Google `uid LIKE '%@%'` email/sub split) decides whether existing OIDC users can still log in. A wrong or misspelled provider key leaves rows with `id_key=""`, which social-auth-core 6 refuses with `identifier_migration_conflict`, and nothing would catch it.

**Fix:** follow the existing `custos_to_psa` pattern. Move the backfill into a `galaxy.model.migrations.data_fixes` helper (e.g. `backfill_id_keys(connection, table=None)`) that the revision's `upgrade()` calls, and test it in the style of `test/unit/data/model/test_migrate_custos_to_psa.py` (in-memory sqlite, hand-built pre-revision table). Cover these cases:

- a few `OLD_ID_KEYS` providers, including the two `preferred_username` ones;
- a Google row with an email uid and one with a `sub` uid;
- an already-set `id_key`;
- an unknown provider, which stays `""`.

No new alembic test scaffolding is needed.

## P2 2: New `AuthnzManager.callback()` error mapping has no coverage

The PR splits `AuthAssociationError` on `code == "identifier_migration_conflict"`. It also changes the `AuthException` handling: when `recovery != "restart_login"`, users now get a generic "contact an administrator" message and the error is logged with `log.exception`, where before it was "session expired". No test reaches any of these branches. The existing tests assert raw exceptions from `PSAAuthnz.callback` instead.

**Fix:** reuse the real-backend harness instead of adding mock tests:

- In `test_association_from_before_social_auth_core_6_needs_id_key` (the `""` case), call `trans.app.authnz_manager.callback("keycloak", state, "local-code", trans, "/")`. Assert `success is False` and that the message says the account "could not be safely matched".
- In `test_nonce_from_another_session_is_rejected`, assert the message the user gets for `nonce_mismatch` the same way.

## P2 3: Custos data fix's default `get_psa_table()` path is untested

The PR's downgrade fix is in `get_psa_table()`, but every test in `test_migrate_custos_to_psa.py` passes `psa_table=UserAuthnzTokenTest.__table__` explicitly. The default path that revision `724237cc4cf0` uses is never run.

**Fix:** add one test that calls `migrate_custos_tokens_to_psa(connection)` (and optionally `restore_custos_tokens_from_psa`) with no explicit tables on the file's existing pre-`id_key` schema.

**Red check:** this passes at the PR head. With `get_psa_table` monkeypatched back to `UserAuthnzToken.table` it fails with `no such column: oidc_user_authnz_tokens.id_key`, which is exactly the regression the PR description cites.

## P3 1: Keycloak confirmation doesn't assert the stored `id_key`

`create_user()` now copies `id_key` from the confirmation data, but only the Google confirmation test checks it. Also, the `pending()` fixture omits `id_key`, so `test_create_user_preserves_identity_tokens_and_activation` creates the `id_key=""` rows that social-auth-core 6 refuses on the next login.

A scratch check showed the implementation is correct: an end-to-end Keycloak confirmation stores `"sub"` and a second login matches the created user.

**Fix:** in an existing end-to-end Keycloak confirmation test, assert `association.id_key == "sub"`, or better, add a second `start`/`callback` and assert it logs in the created user. Add `"id_key": "sub"` to `pending()`.

## P3 2: Split the conditional in `test_association_from_before_social_auth_core_6_needs_id_key`

The test mixes two behaviours behind `if id_key:`: matching the stored association, and refusing it with `identifier_migration_conflict`. Two tests, or `pytest.param`s with explicit expected outcomes, would read better. This is optional, and could be done together with P2 2.

## Not raised

- The `use_unique_user_id` parametrization of `test_google_confirmation_preserves_backend_identity` now has no effect on the outcome. Keep it as documentation or drop it.
- The extra `_transaction_state` patch in the `test_psa_authnz.py` scope tests is acceptable.
- The OR-check in `test_oidc_backends.py` (~line 437) is pre-existing.
- `migrate_social_auth()` race branches and `get_social_auth_by_extra_data()` ambiguity would only be implementation tests.
- No E2E test is warranted: `test/integration/oidc/test_auth_oidc.py` already runs the real-Keycloak flows in CI.
