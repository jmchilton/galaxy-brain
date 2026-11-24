# Test challenges debrief: PR #25081

Profile gx_test_challenger, Claude Opus 5.5, effort medium. Reviewed commit `975fd1a7ad0551b4b1c7f79084499d97e75f7ca5` (two commits over merge-base `9632e69b9a7c`). REVIEW_DIRECTORY mode: nothing was edited in the PR; all drops, rewrites and new tests are recommendations.

## Tests touched by the PR

### test/unit/authnz/test_deferred_user_creation.py

These run the real PSA backend against a fake IdP (signed JWTs, monkeypatched `request`) with a real sqlite model. That is the right layer for these flows: they exercise social-auth-core 6 itself, not mocks of it.

- `configure_google` / `google_login` extraction: good reuse. Keep.
- `test_google_confirmation_preserves_backend_identity`: assertion rewritten from the email-or-sub uid to always `sub` with `id_key == "sub"`. It follows a real upstream behaviour change, not a weakening. The `use_unique_user_id` parameter no longer changes the outcome. Keep it as a check that the setting is ignored, or drop the parametrization. Optional.
- `test_google_association_from_before_social_auth_core_6_is_migrated`: good behavioural coverage of `migrate_social_auth`. Keep.
- `test_association_from_before_social_auth_core_6_needs_id_key`: the `""` branch asserts the raw `AuthAssociationError` from `PSAAuthnz.callback`. It never reaches the new user-facing message in `AuthnzManager.callback()` (see P2 2). The `if id_key:` branch inside one test merges two behaviours. Two tests, or two `pytest.param` with explicit expectations, would read better. Nit.
- `test_nonce_from_another_session_is_rejected`: the GHSA regression test, run end to end through the real backend. Good. Optional: also assert what the user sees through `AuthnzManager.callback()`.
- `test_failed_association_creation_leaves_session_usable`: red without the new `rollback()`, and it tests storage behaviour that social-auth-core relies on. Keep.
- `test_nonce_is_used_and_consumed_once`: a direct storage-API test, but `PSANonce.use()` was previously broken (`where(**kwargs)`), so this is a legitimate red-to-green test of a `NonceMixin` contract. Keep.
- `test_authentication_state_omits_social_core_next`: updated to the new per-state transaction key. Keep.

### test/unit/authnz/test_authnz.py

- The refresh-failure parametrization now covers `AuthCredentialError`, `AuthPolicyError` and `AuthResponseError` (invalid signature or claim) as terminal, and `AuthProviderError(code="unavailable")` as transient. This maps directly to the new `recovery == "retry_later"` branch. Good and not weakened. The old `AuthTokenError`/`AuthForbidden` cases were replaced by their 6.x equivalents.
- The transient case relies on social-auth-core assigning `recovery="retry_later"` to `AuthProviderError(code="unavailable")`. That is the library's contract, so it's fine.

### test/unit/authnz/test_oidc_backends.py

- Mechanical: `auth_params(state=backend.get_or_create_state())` and `cast(Strategy, ...)`. Fine.
- Pre-existing at line ~437: `assert "state" in params or "scope" in params` is an OR-check under a patched base class. The PR touched the line but didn't introduce the check. Pre-existing, so not posted.

### test/unit/authnz/test_psa_authnz.py

- The scope tests now return a real `Redirect` and add `patch("galaxy.authnz.psa_authnz._transaction_state")`. That stacks another mock on a test that already patches `on_the_fly_config`, `do_auth`, `FlowState` and `authentication_id`. Acceptable, because these tests only care about scopes. Nit: since `FlowState` is already mocked, `_transaction_state` could run for real against the fake redirect state instead of being patched. Not worth a finding.

## Gaps

### Migration backfill `ddd0f036e070` has no test (P2 1)

The backfill decides whether every existing OIDC user can still log in after upgrade. The PR's own description says that without the right `id_key`, users get `identifier_migration_conflict`. The `OLD_ID_KEYS` table and the Google `uid LIKE '%@%'` split are data logic, and nothing exercises them. A typo in a provider key such as `"okta-openidconnect"`, or a wrong value, would lock users out silently.

Existing infrastructure to reuse: `test/unit/data/model/test_migrate_custos_to_psa.py` already tests a migration's data logic by pulling it into `galaxy.model.migrations.data_fixes.custos_to_psa`, then running it against in-memory sqlite tables built in the test. Recommendation:

- Move the backfill into a `data_fixes` helper, e.g. `data_fixes/psa_id_key.py::backfill_id_keys(connection, table=None)`, holding the frozen `OLD_ID_KEYS`. The alembic `upgrade()` then just calls it.
- Test it in the custos style. Seed rows for a few `OLD_ID_KEYS` providers, Google rows with an email uid and a non-email uid, a row that already has an `id_key`, and an unknown provider. Assert each row's resulting `id_key` and that the unknown provider stays `""`.
- Optional, for closing the loop: an authnz test seeds a keycloak row with `id_key=""`, runs the helper, then logs in through the existing `start`/`callback` harness. That turns the current "needs id_key" expectation into "after migration, login works".

No new alembic scaffolding is needed. `test_migrations.py` only covers the migration machinery, not per-revision data, and the data_fixes pattern is the precedent.

### Custos data fix's default `get_psa_table()` path is untested (P2 3)

The PR changes `get_psa_table()` to a frozen `Table` definition, so downgrading or upgrading past `724237cc4cf0` no longer fails on the new `id_key` column. Every test in `test_migrate_custos_to_psa.py` passes `psa_table=UserAuthnzTokenTest.__table__` explicitly. The default path the alembic revision actually uses (`migrate_custos_tokens_to_psa(connection)` with no tables) is never exercised.

A test with no explicit tables on the test file's existing pre-`id_key` schema would catch any regression to the model table (see the red check below). The test file's `UserAuthnzTokenTest` also duplicates the new frozen definition. Optionally build the test table from `get_psa_table()`, or keep the duplicate as the independent "schema at that revision" oracle (that is what it now is).

### `AuthnzManager.callback()` error mapping is untested (P2 2)

The PR rewrites how social-auth-core exceptions become user messages:

- `AuthAssociationError` is split by `code == "identifier_migration_conflict"`.
- `AuthException` is split by `recovery == "restart_login"`. Anything else now gets the generic "contact an administrator" message plus `log.exception`, where it used to get "session expired".
- The `AuthCanceled` text changed.

No test covers any of these branches, before or after the PR. Rather than new mock-heavy unit tests, route the existing real-backend tests through the manager:

- In `test_association_from_before_social_auth_core_6_needs_id_key` (`""` case), call `trans.app.authnz_manager.callback("keycloak", state, "local-code", trans, "/")` and assert `success is False` and that the message contains "could not be safely matched".
- In `test_nonce_from_another_session_is_rejected`, do the same and assert the message the user gets for `nonce_mismatch`. That pins down whether this is treated as `restart_login`.
- Optional, one case for the non-`restart_login` `AuthException` branch.

### Keycloak confirmation path and `id_key` (P3 1)

`create_user()` now copies `id_key` from the confirmation data. Only the Google confirmation test asserts the stored `id_key`. The `pending()` helper doesn't include `id_key`, so `test_create_user_preserves_identity_tokens_and_activation` stores `""`, a row that social-auth-core 6 will then refuse on the next login. A scratch check shows the real end-to-end path stores `"sub"` correctly, so only the assertion is missing. The behavioural check is a login after confirmation. In the end-to-end Keycloak confirmation tests (e.g. `test_new_identity_goes_to_destination`), assert `association.id_key == "sub"`, or better, run a second `start`/`callback` and assert it logs into the created user. Also consider adding `"id_key": "sub"` to `pending()` so fixtures match real confirmation data.

### E2E / integration

`test/integration/oidc/test_auth_oidc.py` runs against a real Keycloak and already covers login, repeat login, linking, confirmation and callback replay. That suite will exercise social-auth-core 6 for the Keycloak path in CI, so no new Selenium test is warranted. Adding a cross-session nonce test there isn't needed, because the unit-level test already runs the real backend.

## Not raised

- `migrate_social_auth()` concurrency branches ("changed during migration", conflict) and `get_social_auth_by_extra_data()` ambiguity raise. These are hard to trigger and would only be implementation tests. Not requested.
- The `isinstance(id_key, str)` guard in `create_user()` is trivial.

## Test runs

The venv was bootstrapped in the worktree from pinned and dev requirements (`.venv`, which git ignores; the worktree is otherwise clean).

- `test/unit/authnz/test_deferred_user_creation.py`: 40 passed.
- `test_authnz.py`, `test_oidc_backends.py`, `test_psa_authnz.py`: 111 passed.

Scratch red checks, kept outside the repo in the session scratchpad:

- P2 3: `migrate_custos_tokens_to_psa(connection)` with default tables on the test file's pre-`id_key` schema passes at the PR head. With `get_psa_table` monkeypatched back to `UserAuthnzToken.table`, the old behaviour, it fails with `sqlite3.OperationalError: no such column: oidc_user_authnz_tokens.id_key`. So the recommended test is red-to-green for the exact regression in the PR description.
- P3 1: an end-to-end Keycloak confirmation (`callback` → `create_user`) stores `id_key == "sub"`, and a second login matches the created user. The implementation is correct; only the assertion is missing. The P3 stays a cheap guard plus fixture realism (`pending()`).
