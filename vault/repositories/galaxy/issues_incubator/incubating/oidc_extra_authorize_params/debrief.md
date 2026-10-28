# Debrief: oidc_extra_authorize_params

Prepared 2026-10-14 from `raw.md`. Outcome: **reject**, see the Rejection section. No proposal was written.

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

## Rejection

Prepared 2026-10-14 from `raw.md`. Galaxy `dev` at `origin-https/dev` [`b62d06dcdce`](https://github.com/galaxyproject/galaxy/commit/b62d06dcdce) (the ref moved past `36fe2ce8428` during the session; `lib/galaxy/authnz` is unchanged between the two).

### Claim

The generic OIDC backend forwards only `prompt` to the authorization endpoint (`_setup_idp` builds `AUTH_EXTRA_ARGUMENTS` from `prompt` alone). So admins can't send `acr_values` or `login_hint` per provider without changing code. Keycloak gets `kc_idp_hint` only through its own subclass.

### Finding

The narrow code read is right: `oidc_backends_config.xml` has no element for these parameters. The XSD is a closed `xs:all`, so `<acr_values>` there fails validation with "Element 'acr_values': This element is not expected." But the conclusion is wrong. They can be set today without changing code:

- Since 4.7.0, social-core's `OpenIdConnectAuth.auth_params` reads `ACR_VALUES`, `LOGIN_HINT`, `MAX_AGE`, `UI_LOCALES`, `DISPLAY`, `PROMPT` and `ID_TOKEN_HINT` from settings and adds them to the authorize URL. Galaxy pins social-auth-core 5.2.0.
- `oidc_config.xml` copies every `<Setter Property="X" Value="V" Type="T"/>` into each provider's PSA config as `SOCIAL_AUTH_X`. The sample says Property is "the name of a Python Social Auth (PSA) configuration attribute".
- PSA looks up `SOCIAL_AUTH_<BACKEND>_<NAME>` before `SOCIAL_AUTH_<NAME>`. A Setter prefixed with the backend name therefore applies to one provider only, and an unprefixed one applies to all of them.

```xml
<!-- oidc_config.xml -->
<Setter Property="KEYCLOAK_ACR_VALUES" Value="https://refeds.org/profile/mfa" Type="str"/>
<Setter Property="KEYCLOAK_LOGIN_HINT" Value="someone@example.org" Type="str"/>
<Setter Property="OIDC_MAX_AGE" Value="300" Type="int"/>
```

With that file, the reproduction below gives these authorize URLs. Keycloak gets `acr_values` and `login_hint` next to its configured `prompt=login`. The generic `oidc` provider gets only `max_age`. With no Setters, neither provider gets either parameter.

| Provider | Authorize params added by the Setters |
| --- | --- |
| `keycloak` | `acr_values=https://refeds.org/profile/mfa`, `login_hint=someone@example.org` (plus the configured `prompt=login`) |
| `oidc` | `max_age=300` |
| `lifescience` with `LIFESCIENCE_LOGIN_HINT` | none (wrong prefix) |
| `lifescience` with `LIFE_SCIENCE_ACR_VALUES` | `acr_values=mfa` |

#### Caveats

The gaps that remain are about documentation and reach. They don't block the capability.

- **The prefix is the PSA backend name, not the Galaxy provider name.** PSA uppercases it and turns `-` into `_`. These names differ:

  | `<provider name>` | Setter prefix |
  | --- | --- |
  | `google` | `GOOGLE_OPENIDCONNECT_` |
  | `okta` | `OKTA_OPENIDCONNECT_` |
  | `lifescience` | `LIFE_SCIENCE_` |
  | `einfracz` | `E_INFRA_CZ_` |
  | `nfdi` | `INFRAPROXY_` |

  The prefix matches the Galaxy name for `oidc`, `keycloak`, `cilogon`, `auth0`, `globus`, `elixir`, `helmholtz` and `egi_checkin` (`EGI_CHECKIN_`). A prefixed `ACR_VALUES` Setter was checked against every OIDC entry in `BACKENDS` through `AuthnzManager.authenticate`; all 13 put it on the authorize URL.
- **Only OIDC backends and standard parameters are covered.** `azure` (`AzureADV2TenantOAuth2`) and `tapis` are plain OAuth2 and don't read these settings. Non-standard parameters (Azure's `domain_hint`, a broker's own IdP-hint parameter behind the generic `oidc` provider) have no supported path on any backend. A prefixed `<BACKEND>_AUTH_EXTRA_ARGUMENTS` Setter can carry them only with `Type="eval"`, since `Type` casts the string with a builtin and `dict("…")` fails. It also replaces Galaxy's computed dict, so `access_type` and `prompt` must be repeated. That works, but it is not something to document.
- **`MAX_AGE` needs `Type="int"`.** With `Type="str"`, social-core's `max_age < 0` check raises and the login fails.
- **Version floor.** `pyproject.toml` (and `packages/data/pyproject.toml`) allows `social-auth-core>=4.5.0`, but these settings only arrived in 4.7.0. On 4.5–4.6 the Setters are silently ignored. Installs from `pinned-requirements.txt` (5.2.0) are fine.
- **Not documented.** Neither `oidc_config.xml.sample`, `oidc_backends_config.xml.sample` nor `doc/source/admin/authentication.md` mentions these parameters, the prefix rule, or that per-provider settings can live in `oidc_config.xml`.
- **A request, not enforcement.** `acr_values` asks the IdP for an assurance level. Requiring MFA still has to be configured at the IdP for this client. A Galaxy-side check of the returned `acr` claim would be a separate feature.
- Keycloak brokering (`kc_idp_hint`) and CILogon (`idphint`) are already covered by the existing `<idphint>` element, fixed in 🔀 #21992.

#### History and duplicates

- `_setup_idp`'s `AUTH_EXTRA_ARGUMENTS` dates from the original PSA backend work (`61bbddefed5`, `35482fd3f02`, `c148606a424`). Keycloak and CILogon moved onto PSA in 🔀 #21234 (`5ddc5965fa9`).
- No issue or PR mentions `acr_values`, `login_hint` or `AUTH_EXTRA_ARGUMENTS` for OIDC. Searched issues and PRs for those terms and for `idphint`, `kc_idp_hint`, "oidc prompt", MFA, `oidc_config` and "keycloak idp hint".
- Related but not duplicates:
  - 🔀 #21992 (`<idphint>` parsing)
  - 🔀 #11561 (`extra_scopes`)
  - 🎯 #21129 and 🎯 #17798 (direct OIDC login URLs, closed)
  - 🎯 #23253 ("OIDC documentation outdated", open)

<details><summary>Reproduction (5 tests pass on dev)</summary>

Save as `test/unit/authnz/test_authorize_params_repro.py` on `dev` and run `PYTHONPATH=lib pytest test/unit/authnz/test_authorize_params_repro.py -s`. It goes through the real login path, `AuthnzManager.authenticate` → `PSAAuthnz.authenticate` → `do_auth`. Only OIDC discovery, nonce storage and the DB-backed flow state are patched.

```python
import tempfile
from unittest.mock import (
    MagicMock,
    patch,
)
from urllib.parse import (
    parse_qs,
    urlparse,
)

import pytest
from social_core.backends.open_id_connect import OpenIdConnectAuth

from galaxy.authnz import psa_authnz
from galaxy.authnz.managers import AuthnzManager

BACKENDS_XML = """<?xml version="1.0"?>
<OIDC>
    <provider name="keycloak">
        <url>https://auth.example.org/realms/r</url>
        <client_id>galaxy</client_id>
        <client_secret>secret</client_secret>
        <redirect_uri>https://galaxy.example.org/authnz/keycloak/callback</redirect_uri>
        <prompt>login</prompt>
        {extra}
    </provider>
    <provider name="oidc">
        <oidc_endpoint>https://idp.example.org</oidc_endpoint>
        <client_id>galaxy</client_id>
        <client_secret>secret</client_secret>
        <redirect_uri>https://galaxy.example.org/authnz/oidc/callback</redirect_uri>
    </provider>
    <provider name="lifescience">
        <client_id>galaxy</client_id>
        <client_secret>secret</client_secret>
        <redirect_uri>https://galaxy.example.org/authnz/lifescience/callback</redirect_uri>
    </provider>
</OIDC>
"""

OIDC_XML = """<OIDC>
    <Setter Property="VERIFY_SSL" Value="False" Type="bool"/>
    {setters}
</OIDC>
"""


def _write(contents):
    f = tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".xml")
    f.write(contents)
    f.flush()
    return f.name


def _manager(setters="", extra=""):
    return AuthnzManager(
        app=MagicMock(),
        oidc_config_file=_write(OIDC_XML.format(setters=setters)),
        oidc_backends_config_file=_write(BACKENDS_XML.format(extra=extra)),
    )


def _authorize_params(manager, provider):
    with (
        patch.object(psa_authnz, "on_the_fly_config"),
        patch.object(psa_authnz, "FlowState"),
        patch.object(
            OpenIdConnectAuth, "oidc_config", return_value={"authorization_endpoint": "https://idp.example.org/auth"}
        ),
        patch.object(OpenIdConnectAuth, "get_and_store_nonce", return_value="n"),
    ):
        ok, message, url = manager.authenticate(provider, MagicMock(request=None))
    assert ok, message
    return {k: v[0] for k, v in parse_qs(urlparse(url).query).items()}


def test_default_authorize_params():
    manager = _manager()
    for provider in ("keycloak", "oidc"):
        params = _authorize_params(manager, provider)
        print(f"{provider} default:", sorted(params))
        assert "acr_values" not in params
        assert "login_hint" not in params
        assert "max_age" not in params


def test_per_backend_setters_reach_authorize_url():
    manager = _manager(
        setters="""
    <Setter Property="KEYCLOAK_ACR_VALUES" Value="https://refeds.org/profile/mfa" Type="str"/>
    <Setter Property="KEYCLOAK_LOGIN_HINT" Value="someone@example.org" Type="str"/>
    <Setter Property="OIDC_MAX_AGE" Value="300" Type="int"/>
"""
    )
    kc = _authorize_params(manager, "keycloak")
    generic = _authorize_params(manager, "oidc")
    print("keycloak:", kc)
    print("oidc:", generic)
    assert kc["acr_values"] == "https://refeds.org/profile/mfa"
    assert kc["login_hint"] == "someone@example.org"
    assert kc["prompt"] == "login"
    assert "max_age" not in kc
    assert "acr_values" not in generic
    assert generic["max_age"] == "300"


def test_unprefixed_setter_applies_to_every_provider():
    manager = _manager(setters='<Setter Property="ACR_VALUES" Value="mfa" Type="str"/>')
    assert _authorize_params(manager, "keycloak")["acr_values"] == "mfa"
    assert _authorize_params(manager, "oidc")["acr_values"] == "mfa"


def test_element_in_backends_config_is_rejected_by_xsd():
    with pytest.raises(Exception, match="acr_values") as e:
        _manager(extra="<acr_values>mfa</acr_values>")
    print(e.value)


def test_prefix_is_the_psa_backend_name_not_the_galaxy_provider_name():
    manager = _manager(
        setters="""
    <Setter Property="LIFESCIENCE_LOGIN_HINT" Value="galaxy-name@example.org" Type="str"/>
    <Setter Property="LIFE_SCIENCE_ACR_VALUES" Value="mfa" Type="str"/>
"""
    )
    params = _authorize_params(manager, "lifescience")
    print("lifescience:", params)
    assert "login_hint" not in params
    assert params["acr_values"] == "mfa"
```

Output (state values elided):

```text
keycloak default: ['access_type', 'client_id', 'nonce', 'prompt', 'redirect_uri', 'response_type', 'scope', 'state']
oidc default: ['access_type', 'client_id', 'nonce', 'redirect_uri', 'response_type', 'scope', 'state']
keycloak: {'client_id': 'galaxy', 'redirect_uri': 'https://galaxy.example.org/authnz/keycloak/callback', 'state': '…', 'response_type': 'code', 'nonce': 'n', 'login_hint': 'someone@example.org', 'acr_values': 'https://refeds.org/profile/mfa', 'scope': 'openid profile email', 'access_type': 'offline', 'prompt': 'login'}
oidc: {'client_id': 'galaxy', 'redirect_uri': 'https://galaxy.example.org/authnz/oidc/callback', 'state': '…', 'response_type': 'code', 'nonce': 'n', 'max_age': '300', 'scope': 'openid profile email', 'access_type': 'offline'}
Element 'acr_values': This element is not expected., line 9
lifescience: {'client_id': 'galaxy', 'redirect_uri': 'https://galaxy.example.org/authnz/lifescience/callback', 'state': '…', 'response_type': 'code', 'nonce': 'n', 'acr_values': 'mfa', 'scope': 'openid email', 'access_type': 'offline'}
5 passed
```

</details>

### Recommendation

Don't file the feature request. Its premise, "can't without code changes", is false on the pinned PSA. At most, open a docs PR:

- Add a commented example to `oidc_config.xml.sample` showing per-provider `<BACKEND>_ACR_VALUES` and `<BACKEND>_LOGIN_HINT` Setters.
- Add a short paragraph to `doc/source/admin/authentication.md` with the backend-name prefix table and the note that `acr_values` is a request, not enforcement.
- Optionally, turn the "per-backend Setter reaches the authorize URL" case above into a regression test in `test/unit/authnz/test_authnz.py`.

It could reference 🎯 #23253. A first-class `<auth_extra_params>` element in `oidc_backends_config.xml` is only worth proposing if someone asks for it. Its real value would be the draft's other motivation, skipping a federation's "choose your identity source" page. `login_hint` is a per-user hint, not IdP selection. Outside Keycloak and CILogon, IdP selection needs non-standard parameters that no supported config path can send today. The element would also keep per-provider settings in one file and cover `azure` and `tapis`.
