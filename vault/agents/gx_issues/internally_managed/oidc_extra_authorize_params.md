# OIDC: allow configuring extra authorization request parameters (acr_values, login_hint) per provider

Galaxy's generic OIDC backend forwards only `prompt` to the provider's authorization endpoint, so admins can't request an assurance level (`acr_values`) or steer users to a specific identity source (`login_hint`) without patching code.

Both are standard OIDC parameters and institutional IdPs use them heavily:

- `acr_values` — require e.g. MFA / a specific AAL or REFEDS assurance profile for this application.
- `login_hint` (or IdP-specific hints) — skip a federated provider's "choose your identity source" page and send staff straight to the institutional login.

Keycloak already gets its own hint (`kc_idp_hint`) via a dedicated subclass; generic providers have no equivalent.

<details><summary>Code read (dev, unverified)</summary>

`_setup_idp` in `lib/galaxy/authnz/psa_authnz.py` sets `AUTH_EXTRA_ARGUMENTS` from `prompt` only. `keycloak.py` adds `kc_idp_hint` in its subclass.

</details>

## Context

Same area as `oidc_optional_refresh_token.md`.

## Proposed Approach

A per-provider `<auth_extra_params>` element in `oidc_backends_config.xml` (key/value pairs, validated in the XSD) merged into `AUTH_EXTRA_ARGUMENTS` alongside `prompt`. Document in the sample config; integration test that the parameters appear on the authorize redirect.

## Alternative Approaches

Explicit `<acr_values>` and `<login_hint>` elements are more discoverable and easier to validate, but every new IdP-specific parameter would need a schema change. Generic pass-through with a short documented list of common keys covers both.
