# Thermo review: #25081 Upgrade social-auth-core to 6.2.0

- Profile: thermo_review (`_shared/reviewers/thermo_review.md`)
- Model: Claude Opus 5.5, effort: medium
- Reviewed commit: `975fd1a7ad0551b4b1c7f79084499d97e75f7ca5` (base `dev`, merge-base `9632e69b9a7c`)

## Verdict

Structurally sound for a dependency upgrade forced by an upstream API break. The PR mostly fills in the social-auth-core 6 storage/strategy protocol where it has to, and the Custos data-fix decoupling from the live model table is the right call. No P1/P2. The findings are consistency and reuse issues: a session-guard helper applied to only some methods, confirmation validation split across two places, one storage method that skips the identifier helper the same PR imports, and an exception ladder that keeps growing branches. The reference `social-storage-sqlalchemy` package has not been updated for the 6.x storage API (no `id_key`, `migrate_social_auth`, `consume`), so Galaxy reimplementing these methods is justified. Galaxy can't reuse it here.

No file crosses 1k lines because of this PR. `psa_authnz.py` (1238) and `model/__init__.py` (14219) were already over that.

## Findings

### P3 1: `_psa_session()` guard applied to only the methods this PR touched

`_psa_session()` (`lib/galaxy/model/__init__.py:12133`) is a new module-level helper that narrows `sa_session: Session | None`. It is used only in the new or rewritten `PSANonce` methods and in four `UserAuthnzToken` methods. Every sibling still calls `cls.sa_session` directly: `PSAAssociation`, `PSACode`, `PSAPartial`, `PSANonce.save()`, and `UserAuthnzToken.save/create_user/user_exists/get_user/get_social_auth_for_user`. `PSANonce.sa_session` is now typed `ClassVar[Session | None]`, but `PSACode`/`PSAPartial`/`PSAAssociation` keep an untyped `sa_session = None`. The result is two styles of session access across five classes that implement the same social-core storage protocol, side by side in the same block.

Fix: make it a shared base, e.g. a small `_PSAStorage` mixin declaring `sa_session: ClassVar[Session | None] = None` plus a `_session()` classmethod (the same shape as `social_sqlalchemy`'s `SQLAlchemyMixin._session()`), and use it in all five PSA classes. Or, at minimum, use `_psa_session` in every PSA storage method so the guard is uniform. Keeping the guard only in some methods leaves the old pattern looking canonical.

### P3 2: `id_key` validation sits outside `_confirmation_identity()`

`_confirmation_identity()` (`psa_authnz.py:1174`) is the canonical validator for the confirmation payload. It runs both when the payload is saved (`check_user_creation_confirmation`) and when it is consumed (`create_user`). This PR adds `id_key` to the payload but validates it inline in `create_user` (`psa_authnz.py:593-595`, `data.get("id_key", "")` plus an `isinstance` check), and only on consume. Move the check into `_confirmation_identity()` and return `id_key` with the other fields, so the payload contract is defined once and checked symmetrically. That also removes the ad-hoc branch from `create_user`.

### P3 3: `get_social_auth_by_extra_data()` skips `identifier_matches` and scans all of a provider's rows

`UserAuthnzToken.get_social_auth_by_extra_data()` (`model/__init__.py:12401`) loads every association for `(provider, id_key)` and compares in Python with `str(social.extra_data[key]) == str(value)`. The same PR imports social-core's canonical comparison `social_core.identifiers.identifier_matches` (which rejects nulls, booleans and empty uids) and uses it in `migrate_social_auth()` a few lines below. The two methods now compare identifiers differently. As far as I can tell, social-core 6.2.0 never calls this method: it is required by the `UserMixin` protocol, and no pipeline or backend references it. So the full-provider scan is latent rather than hot.

Fix: use `identifier_matches(social.extra_data.get(key), str(value))` to match `migrate_social_auth`. Optionally add a one-line comment that it's protocol-only and does a full scan.

### P3 4: `AuthnzManager.callback()` exception ladder branches on `code`/`recovery` inside except clauses

`callback()` (`managers.py:412`) now has six except arms. Two of them branch further on social-core's metadata:

- `AuthAssociationError` branches on `e.code == "identifier_migration_conflict"`.
- `AuthException` branches on `e.recovery != "restart_login"` and falls back to the same generic message as `except Exception` (hence the new `_callback_error_message` helper).

`refresh_expiring_oidc_tokens` also adds its own `e.recovery == "retry_later"` branch. social-core 6 changed exceptions to carry stable `code`/`recovery` metadata precisely so that callers can dispatch on data rather than on class hierarchies.

A simpler structure is one `except AuthException as e:` arm that calls a small pure function, e.g. `_auth_failure_message(provider, e) -> str`, keyed on `e.code` / `e.recovery`, with `PKCECodeVerifierMissing` and `AuthCanceled` as entries in it. That collapses four arms into one and makes the user-facing message table easy to scan and extend. Optional; the current code works.

### P3 5: `get_psa_table(connection)` no longer uses `connection`

`custos_to_psa.get_psa_table()` (`data_fixes/custos_to_psa.py:61`) now builds a static `Table`, so its `connection` parameter is unused. Its sibling `get_custos_table()` still reflects with `autoload_with=connection`. The new table also uses `VARCHAR` where the sibling uses `String`. Drop the parameter (three call sites in the same file), or add `extend_existing=True, autoload_with=connection` if reflection was intended. Making the frozen schema explicit is the stated goal, so dropping the parameter fits better.

## Notes (not findings)

- `PSAAuthnz.callback()` keeps a `_transaction_state()` pre-check before `do_complete`, which then runs social-core's own `validate_state()` (constant-time compare, lifetime, nonce consume) against the same session key. The two checks overlap. The pre-check keeps the old `InvalidFlow` behavior, and in a security fix that defense-in-depth is reasonable, so this is not raised as a finding. `_transaction_state()` mirrors the inline check in social-core's `create_code_verifier()`; social-core has no public helper for it.
- `authenticate()` recovers the state by parsing `redirect.url`. social-core 6 exposes no public accessor for the state it just created; the transaction index key is private. Parsing the URL is acceptable.
- The PR adds about 150 lines of social-auth storage-protocol logic to `lib/galaxy/model/__init__.py`. Moving the PSA models' storage behavior out of the 14k-line model module would be a worthwhile follow-up, but it is pre-existing placement and out of scope for an upgrade PR.
- The frozen `OLD_ID_KEYS` in the migration duplicates backend knowledge on purpose, so that the migration stays independent of the installed social-core version. That is the correct choice for a migration.

## Security

No security findings from this code-quality pass. No private report written.
