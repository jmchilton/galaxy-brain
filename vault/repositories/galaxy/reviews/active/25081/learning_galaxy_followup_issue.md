# Follow-up: docs after #25081 (social-auth-core 6)

Reviewed commit `975fd1a7ad0551b4b1c7f79084499d97e75f7ca5`.

## Stale galaxy-brain research

None. No `vault/research/` note covers OIDC/PSA authnz. A request is queued at `vault/agents/gx_research/todo/oidc_authentication.md`.

## In-repo Galaxy docs the PR leaves stale

1. `doc/source/admin/authentication.md` (PKCE section, around line 50) quotes the user message "Authentication with `<provider>` was canceled or the authorization code has expired". The PR changes the `AuthCanceled` message to "...was canceled. Please try logging in again.", and IdP token-exchange failures now go to the `AuthException` branches keyed on `recovery`. Update the quoted text and say which message an IdP-rejected verifier now produces.
2. `doc/source/admin/authentication.md`, "Database Tables" (around line 354), describes an `oidc_user_authnz_tokens` row as provider + `uid` + `extra_data`. Add `id_key`, and explain that identities now match on `(provider, uid, id_key)`.
3. `doc/source/admin/authentication.md` has no admin guidance for the PR description's note: associations of backends whose `ID_KEY` was overridden in `oidc_config.xml` get the default key from the migration and won't match, so login fails with "could not be safely matched ... contact an administrator". It also doesn't describe the Google `email`-to-`sub` lazy migration. An admin upgrade note (or a release-notes entry) should cover both, with the SQL to fix overridden rows.
4. `doc/source/dev/oidc.md`, "Request flow" step 1, says "The OIDC backend persists its nonce separately through python-social-auth storage". After the PR, every OAuth2 `state` is also recorded and consumed as a `PSANonce`, and the flow session holds per-state transactions (`<backend>_oauth2_state_<state>`). Galaxy's callback check is `_transaction_state()`.
5. `doc/source/dev/oidc.md`, "State and validation boundaries", says "Preserve the backend's chosen UID (Google may use email)". Under social-core 6, Google defaults to `sub`, and legacy email-keyed rows are migrated on login. The confirmation payload now also carries `id_key`, which deferred creation must store.

## Post-merge activities

- Once #25081 merges, the queued `Component - OIDC Authentication` research note should describe the merged `id_key` model, the state/nonce double guard, and the `recovery`-based error handling rather than pre-6 behavior.
- Optionally add `doc/source/dev/oidc.md`'s "Regression coverage" entries for the new unit tests: `test_nonce_is_used_and_consumed_once`, `test_google_association_from_before_social_auth_core_6_is_migrated`, `test_association_from_before_social_auth_core_6_needs_id_key`, and `test_failed_association_creation_leaves_session_usable`.
