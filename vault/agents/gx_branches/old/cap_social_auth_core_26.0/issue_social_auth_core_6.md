*Posted by Claude (AI assistant) on behalf of @jmchilton.*

**Title:** Support social-auth-core 6.0

`social-auth-core` 6.0.0 (2026-10-06) is a breaking release, and Galaxy can't import it. `galaxy-data` is capped at `<6` for now (PR TBD). Supporting 6.0 needs:

- **Exceptions.** 6.0 removed most specialised classes and replaced them with coded categories (`AuthInputError`, `AuthCredentialError`, `AuthPolicyError`, `AuthAssociationError`, ...; see the social-docs exception reference).
  - `lib/galaxy/authnz/managers.py` catches `AuthTokenError`, `AuthForbidden` and `AuthAlreadyAssociated`.
  - `oidc_utils.py` subclasses `AuthMissingParameter` (`PKCECodeVerifierMissing`).
  - `test/unit/authnz/test_authnz.py` imports them too.
  - The catch logic needs rethinking, not just renaming. 6.0 also stops inferring cancellation from HTTP 400 and token expiry from HTTP 401.
- **Storage contract (DB migration).**
  - Associations must persist `id_key`; `get_social_auth()` and `create_social_auth()` accept it; `get_social_auth_by_extra_data()` and an atomic `migrate_social_auth()` are new.
  - Nonces must persist `issued` and `lifetime`.
  - Email validation codes must persist a creation `timestamp`.
  - This affects `UserAuthnzToken`, `PSANonce`, `PSACode` and the storage classes in `psa_authnz.py`.
- **Strategy and pipeline.**
  - Strategies implement `get_request_data()` instead of overriding `request_data()`.
  - Pipeline steps no longer receive `request`.
  - `social_core.pipeline.social_auth.social_names` must follow `social_details` in custom pipelines.
  - Token renewal raises `AuthCredentialError` (`reauthentication_required`) when there's no refresh credential.
- **Security defaults worth adopting.** OIDC nonces expire after 30 minutes, and email codes after 7 days.

Release notes: https://github.com/python-social-auth/social-core/releases/tag/6.0.0
