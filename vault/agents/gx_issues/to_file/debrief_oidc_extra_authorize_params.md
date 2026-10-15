# Debrief: oidc_extra_authorize_params

Prepared 2026-10-14 from `internally_managed/oidc_extra_authorize_params.md`. Outcome: **reject**, see `reject_oidc_extra_authorize_params.md`. No proposal was written.

## Research

- Read Galaxy `dev` at `origin-https/dev` read-only. It was at `b62d06dcdce` when read; `lib/galaxy/authnz` is unchanged from the `36fe2ce8428` named in the brief. Ran tests in a throwaway worktree with the existing Galaxy `.venv`. The worktree has been removed.
- **Code path:** `AuthnzManager._parse_oidc_config` (`oidc_config.xml` Setters), `_parse_idp_config` + XSD (`oidc_backends_config.xml`), `PSAAuthnz.__init__` / `_setup_idp`, the Galaxy `Strategy`, and the backends in `oidc.py`, `keycloak.py`, `cilogon.py`, `auth0.py` and `tapis.py`. Also the installed social-core 5.2.0 `OpenIdConnectAuth.auth_params`, `BaseAuth.auth_extra_arguments` and `BaseStrategy.setting`.
- **Key finding:** the draft's code read was right. `_setup_idp` builds `AUTH_EXTRA_ARGUMENTS` from `access_type=offline` plus `prompt`, and the backends XSD is a closed `xs:all`. It missed two other paths:
  - social-core (since 4.7.0) reads `ACR_VALUES`, `LOGIN_HINT`, `MAX_AGE` etc. as settings.
  - Galaxy copies every `oidc_config.xml` Setter into each provider's PSA config.

  A backend-name-prefixed Setter (`KEYCLOAK_ACR_VALUES`) is therefore per-provider today.
- **Reproduction:** a unit test (embedded in the reject note) builds `AuthnzManager` from temp config files and inspects the authorize URL. It confirms:
  - per-backend Setters reach the URL and stay isolated to their provider;
  - unprefixed Setters apply to all providers;
  - `<acr_values>` in the backends file fails XSD validation;
  - the prefix is the PSA backend name, so `LIFESCIENCE_` is ignored and `LIFE_SCIENCE_` works.

  Result: 5 passed.
- **Versions:** social-core 4.6.1 lacks these settings and 4.7.0 adds them. Galaxy allows `>=4.5.0,<6` and pins 5.2.0. Since 5.0, `AUTH_EXTRA_ARGUMENTS` values are no longer overridable from request params by default.
- **MRO check:**
  - Every Galaxy `BACKENDS` entry except `azure` and `tapis` subclasses `OpenIdConnectAuth`.
  - The Galaxy subclasses all call `super().auth_params`.
- **Duplicates:** searched issues and PRs for acr_values, login_hint, AUTH_EXTRA_ARGUMENTS, idphint, kc_idp_hint, "oidc prompt", MFA, oidc_config, "keycloak idp hint" and "cilogon institution". None found. Related: #21992, #21234, #11561, #21129, #17798, #23253 (open, OIDC docs outdated).
- **History:** `AUTH_EXTRA_ARGUMENTS` setup dates from `61bbddefed5`, `35482fd3f02` and `c148606a424`. Keycloak and CILogon moved to PSA in #21234 (`5ddc5965fa9`).

## Changes from the draft

- The verdict flipped from "feature request" to "already possible, undocumented". The proposed `<auth_extra_params>` element is kept only as a might-be-worth-it-if-asked note.
- Caveats added:
  - the backend-name prefix table;
  - OAuth2 backends (`azure`, `tapis`) are not covered;
  - the social-core 4.7.0 floor vs the `>=4.5.0` constraint;
  - no docs;
  - `acr_values` is a request, and enforcement belongs at the IdP.
- Dropped the cross-reference to the sibling draft (`oidc_optional_refresh_token.md`). It's unrelated to the verdict.

## Review round

One fresh-subagent adversarial review. It agreed with the reject and could not break "already possible".

- **Re-ran:**
  - the embedded repro (5 passed);
  - its own test through `AuthnzManager.authenticate` → `PSAAuthnz.authenticate` → `do_auth`, which confirmed all 13 OIDC entries in `BACKENDS` honour a prefixed `ACR_VALUES` Setter.
- **Edits it made to the note:**
  - the repro now goes through `manager.authenticate`, not a hand-built backend;
  - the default test checks both providers;
  - added the "checked on all 13" line;
  - added the `MAX_AGE` needs `Type="int"` caveat;
  - added the `packages/data/pyproject.toml` citation;
  - reworded the recommendation. The draft's "skip the choose-your-identity-source page" motivation is IdP selection, which `login_hint` doesn't do. Outside Keycloak and CILogon it needs non-standard params with no supported path. That is the real case for a future `<auth_extra_params>` element.
- **Correction it made to my claim:** I said `azure` and `tapis` have no config-only path. A prefixed `<BACKEND>_AUTH_EXTRA_ARGUMENTS` Setter with `Type="eval"` does work, because `Type` resolves any builtin. The note now says this works but should not be documented. The file is admin-owned, so it's not a security issue.
- It found nothing sensitive.

## Left over

- The generic IdP-selection gap (non-standard hint params on the generic `oidc` provider and `azure`) is real but has no requester. Decide whether that warrants an enhancement issue alongside a docs PR.
- A docs PR for `oidc_config.xml.sample` and `authentication.md` is the suggested follow-up. It could reference #23253.
- Nothing was posted, committed or pushed. The source, the reject note and this debrief stay in `to_file/` and `internally_managed/` pending John's decision.
