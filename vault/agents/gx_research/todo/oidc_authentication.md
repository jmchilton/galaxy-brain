# Component - OIDC Authentication

Cover Galaxy's OIDC/OAuth2 login built on python-social-auth: `AuthnzManager` (provider config, exception-to-message mapping, token refresh), `PSAAuthnz` with its `Strategy`/`Storage` adapters and `AUTH_PIPELINE` (stock vs Galaxy steps), `FlowState` (browser-bound single-use login and confirmation records in `PSAPartial`), the storage models in `galaxy.model` (`UserAuthnzToken` with `(provider, uid, id_key)` identity matching and `migrate_social_auth`, `PSANonce` use/consume), deferred account creation (`require_create_confirmation`), account linking by email, and the `oidc_user_authnz_tokens` migrations (Custos to PSA, `id_key` backfill). Leave out per-provider XML option catalogs (the sample config covers them), local password handling (`Component - User Password Management`), and LDAP/PAM/remote-user.

## Why

PR #25081 reshapes identity matching, OAuth2 state/nonce handling and the social-core storage contract. No research note covers authnz. `Component - User Password Management` explicitly excludes OIDC.

## Requested by

- vault/repositories/galaxy/reviews/active/25081/: learning review needed baseline architecture of PSA authnz and the social-auth-core 6 storage contract
