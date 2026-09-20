# PR 16617 — "Adding wlcg oidc endpoint." (maikenp)

`galaxyproject/galaxy#16617` — +26/-0 across 2 files.
Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/16617/` (HEAD `ca291bbb98d`, `origin/dev` merged in).

**Verdict: request changes.** The upstream dependency question resolves in the author's
favour — the blocker is gone. But as wired, every WLCG user collides on a single identity
record, and the refresh-token capability the sample advertises never works. Both are
provable against Galaxy's pinned `social-auth-core`, and both have an existing in-tree
precedent (`TapisOAuth2`) showing the maintainers already hit and fixed this exact hole
for the only other bare-`BaseOAuth2` backend.

## What the PR does

1. `lib/galaxy/authnz/psa_authnz.py:94` — `"wlcg": "social_core.backends.wlcg.WLCGOAuth2",` in `BACKENDS`
2. `lib/galaxy/authnz/psa_authnz.py:113` — `"wlcg": "wlcg",` in `BACKENDS_NAME`
3. `lib/galaxy/config/sample/oidc_backends_config.xml.sample:271-294` — new `<provider name="wlcg">` block

---

## 1. Dependency — RESOLVED, not a blocker (verified)

`python-social-auth/social-core#820` merged 2023-09-19 and the backend is **present in the
version Galaxy pins**.

- Pin: `lib/galaxy/dependencies/pinned-requirements.txt:257` → `social-auth-core==5.1.1`
- Floor: `pyproject.toml:104` → `"social-auth-core>=4.5.0"`
- Verified on disk in a real installed 5.1.1 tree:
  `.../site-packages/social_core/backends/wlcg.py` → `class WLCGOAuth2(BaseOAuth2)`.
  Also verified present in a 5.1.0 tree, so the floor `>=4.5.0` is the only soft spot —
  a site resolving to 4.5.x would not have it. Worth bumping the floor, low priority since
  the pin governs.

I did **not** verify which release *first* shipped it (no network); I verified it is in the
pinned version, which is the question that matters.

Also note `lib/galaxy/authnz/managers.py:170-182` force-imports every configured backend at
startup and raises an actionable `ConfigurationError` on `ImportError`, so even a bad pin
would fail loudly rather than silently. That guard is newer than this PR.

## 2. BLOCKING — every WLCG user gets uid `"None"`; this is account takeover (verified empirically)

`WLCGOAuth2` inherits `ID_KEY = "id"` from `OAuthAuth` (`social_core/backends/oauth.py:57`).
Its `get_user_details()` returns only `username/email/fullname/first_name/last_name` — no `id`.
WLCG IAM (INDIGO IAM) userinfo returns standard OIDC claims (`sub`, `name`,
`preferred_username`, `email`, …), not `id`. So `BaseAuth.get_user_id()`
(`social_core/backends/base.py:228-236`) finds nothing in either `details` or `response`.

I ran this against Galaxy's pinned 5.1.1, feeding a realistic merged
token-response + IAM-userinfo dict:

```
is OIDC backend: False | is BaseOAuth2: True
ID_KEY: 'id'
EXTRA_DATA: None
get_user_id -> None
social_uid pipeline stores -> 'None'
extra_data keys: ['access_token', 'auth_time', 'token_type']
```

Chain:
- `social_core/pipeline/social_auth.py:17` — `social_uid` does `str(backend.get_user_id(...))`
  → stores the literal string `"None"`.
- `social_core/pipeline/social_auth.py:23-40` — `social_user` looks up
  `get_social_auth("wlcg", "None")`. **User two matches user one's `UserAuthnzToken`.** With no
  Galaxy session user, `social_user` takes the `if not user: user = social.user` branch — so the
  second WLCG person to log in is **authenticated as the first one**. That is account takeover,
  not a data-hygiene wart, and it is the reason this is blocking. (With a session user present
  it instead raises `AuthAlreadyAssociated`.)
- Nothing in Galaxy's pipeline catches it. `contains_required_data`
  (`lib/galaxy/authnz/psa_authnz.py:704-780`) does no uid validation, and its OIDC-specific
  branch is gated on `is_oidc_backend(backend)` (line 761), which is False here.

**Inference boundary:** the one thing I cannot verify without hitting the live IAM is that
its userinfo/token responses contain no `id` key. Two in-repo corroborations:

- `TapisOAuth2` is the *only* other bare-`BaseOAuth2` entry in `BACKENDS`, and
  `lib/galaxy/authnz/tapis.py:38-46` overrides `get_user_id` explicitly — with a comment about
  cross-tenant collisions. The maintainers already patched this exact hole once.
- Galaxy's own deferred-creation path uses `sub`:
  `lib/galaxy/authnz/psa_authnz.py:552-556` builds `UserAuthnzToken(uid=userinfo.get("sub"), ...)`.
  So with `require_create_confirmation` on, uid is `sub`; with it off, uid is `"None"` — an
  internal inconsistency that itself argues `sub` is correct.
  Worth verifying with the author whether returning users can re-associate at all under
  `require_create_confirmation`: their lookup goes through `social_uid` → `"None"`, which can
  never match the stored `sub` row, so on the evidence here they fall through
  `check_user_creation_confirmation` (email matches, so no re-prompt) into `associate_user` and
  pick up a *second* `UserAuthnzToken`. I did not confirm the end state — flagging, not
  asserting.

Minimum fix: `ID_KEY = "sub"` on the backend (upstream, or a Galaxy-local subclass). Proper
fix is §5.

## 3. BLOCKING-ish — refresh tokens are never persisted (verified empirically)

`WLCGOAuth2` sets no `EXTRA_DATA`, and `BaseAuth.EXTRA_DATA` defaults to `None`
(`social_core/backends/base.py:30`). `OAuthAuth.extra_data` adds `access_token`,
`BaseOAuth2.extra_data` adds `token_type`, `BaseAuth.extra_data` adds `auth_time`. That is
the whole set — confirmed by the probe above.

Consequence in `PSAAuthnz.refresh()` (`lib/galaxy/authnz/psa_authnz.py:301-306`):

```python
if (not user_authnz_token or not user_authnz_token.extra_data
        or "refresh_token" not in user_authnz_token.extra_data):
    return False
```

This returns False on the **first guard, always**, for every WLCG token. The secondary guard
at line 309-312 (`locate_token_expiration` finding `expires`/`expires_in`) would also fail —
neither is persisted.

Important distinction: the token *response* does carry `refresh_token` (IAM honours
`offline_access`), so `contains_required_data`'s `is_new and not response.get("refresh_token")`
check at line 768 passes and **login succeeds**. The refresh token is simply never written to
`UserAuthnzToken.extra_data`. The failure is silent.

This matters concretely because the sample block this PR adds tells admins to request
`offline_access` + `refresh_token` grant and says "A token from The WLCG IAM can be used to
submit jobs to an ARC distributed computing endpoint". That is the advertised capability, and
it does not work — the stored access token expires (IAM default ~1h) with no way to renew, and
`require_session_refresh` would then force re-auth.

Precedent again — `lib/galaxy/authnz/tapis.py:34-36`:

```python
# Upstream this is initialized to None, but it is expected this will be a list of tuples
EXTRA_DATA = [
    ("refresh_token", "refresh_token"),
]
```

Same fix shape needed here, plus `expires_in`.

## 4. Other silent no-ops from being non-OIDC (verified by reading)

`_is_oidc_backend()` (`lib/galaxy/authnz/psa_authnz.py:221-228`) string-matches
`"OpenIdConnect"` in the class path. `"social_core.backends.wlcg.WLCGOAuth2"` → False. The
runtime `is_oidc_backend()` (`lib/galaxy/authnz/oidc_utils.py:23-30`) is an
`isinstance(backend, OpenIdConnectAuth)` check → also False. So, all skipped:

- `lib/galaxy/authnz/psa_authnz.py:264-269` — `PKCE_SUPPORT`, `IDPHINT`, `accepted_audiences`,
  `OIDC_ENDPOINT` are never set. **`<pkce_support>`, `<idphint>`, `<accepted_audiences>`,
  `<oidc_endpoint>` are inert for this provider.**
- `lib/galaxy/authnz/psa_authnz.py:423,446-448` — `logout()` short-circuits.
  **`<enable_idp_logout>` is inert**; logout is Galaxy-local only, IAM session survives.
- `lib/galaxy/authnz/psa_authnz.py:761-766` — `verify_oidc_response()` never runs. No id_token
  presence/`iat` validation.
- `lib/galaxy/authnz/psa_authnz.py:465-466` — `decode_access_token` raises
  `NotImplementedError`. **Bearer-token API auth is unavailable** for WLCG identities.
- `lib/galaxy/authnz/psa_authnz.py:968-969` — the access-token decode pipeline step returns early.

None of these is wrong per se (tapis is in the same boat), but the sample block gives admins no
hint that these knobs do nothing, and WLCG IAM *is* a full OIDC provider, so the degradation is
gratuitous rather than forced.

One reachable non-gated path worth flagging: `create_user()`
(`lib/galaxy/authnz/psa_authnz.py:508-560`) is **not** OIDC-gated and hard-raises
`Exception("Missing id_token in stored authentication data")` at line 526-528. For WLCG the
stored blob is the raw merged response (`json.dumps(response)` at line 1097), which should
contain `id_token` given the `openid` scope — so this likely works. But it is an unguarded
assumption for a backend Galaxy classifies as non-OIDC. Untested, and only reachable with
`require_create_confirmation` enabled.

## 5. Reuse / abstraction — this should not be a new one-off entry

Every other `BACKENDS` entry except `tapis` resolves to an `...OpenIdConnect` class, and the
Galaxy-local ones all inherit a shared seam:
`GalaxyOpenIdConnect` (`lib/galaxy/authnz/oidc.py:23`) ← `KeycloakOpenIdConnect`
(`lib/galaxy/authnz/keycloak.py:10`), `CILogonOpenIdConnect` (`lib/galaxy/authnz/cilogon.py:10`),
`GalaxyAuth0OpenIdConnect`. Each is ~30 lines: a `name`, a `DEFAULT_SCOPE`, an `auth_params`
tweak, an `oidc_endpoint()`. That seam gives PKCE, localhost dev mode, refresh support,
discovery, and `oidc_utils` token verification for free.

WLCG IAM is INDIGO IAM — a standards-compliant OIDC provider publishing
`.well-known/openid-configuration`. Two better routes, in order:

**(a) Possibly zero code.** `BACKENDS` already has
`"oidc": "galaxy.authnz.oidc.GalaxyOpenIdConnect"`, and `_setup_idp` already pipes
`<oidc_endpoint>` through (`lib/galaxy/authnz/psa_authnz.py:268-269`); `OpenIdConnectAuth.oidc_endpoint()`
(`social_core/backends/open_id_connect.py:157-162`) fetches the discovery doc from it. An admin
may be able to configure WLCG today as
`<provider name="oidc"><oidc_endpoint>https://wlcg.cloud.cnaf.infn.it</oidc_endpoint>…</provider>`
with `<label>`/`<icon>`/`<custom_button_text>` for branding. Caveat: `oidc_backends_config` is
keyed by provider name, so only **one** generic `oidc` provider per instance — a site already
using the generic slot needs a named backend. Worth asking the author whether the generic
provider was tried; if it works, this PR reduces to a sample-file doc addition.

**(b) A ~10-line Galaxy-local subclass.** `lib/galaxy/authnz/wlcg.py`:

```python
class WLCGOpenIdConnect(GalaxyOpenIdConnect):
    name = "wlcg"
    DEFAULT_SCOPE = ["openid", "email", "profile", "wlcg", "offline_access"]
    OIDC_ENDPOINT = "https://wlcg.cloud.cnaf.infn.it"
```

— same shape as `cilogon.py` / `keycloak.py`, though both of those override the
`oidc_endpoint()` *method* rather than setting the class attribute (either works; the attribute
is the `setting("OIDC_ENDPOINT", ...)` fallback, and a method override is the better fit if the
endpoint should come from `<oidc_endpoint>`). This single move fixes §2 (`OpenIdConnectAuth.ID_KEY = "sub"`),
§3 (`EXTRA_DATA = ["id_token", "refresh_token", ("sub", "id")]`,
`social_core/backends/open_id_connect.py:67`), §4 (all the OIDC-gated features light up), and
§6 (`<url>`/`<oidc_endpoint>` become live config).

**Frame this fairly to the author.** This PR is from 2023. `GalaxyOpenIdConnect`,
`oidc_utils.py`, and the `oidc_endpoint`-driven generic provider all postdate it — dev has moved
and the seam that makes this a three-line change now exists. This is "rebase onto the new
abstraction", not "you ignored the obvious one".

## 6. `<url>` in the sample is dead config (verified by reading)

`_setup_idp` maps `<url>` to `setting_name("URL")` → `SOCIAL_AUTH_URL`
(`lib/galaxy/authnz/psa_authnz.py:254-255`). `WLCGOAuth2` never calls `self.setting("URL")`:

- `authorization_url()` reads `setting("AUTHORIZATION_URL", self.AUTHORIZATION_URL)`
  (`social_core/backends/oauth.py:149-153`) — the class constant, hardcoded to
  `https://wlcg.cloud.cnaf.infn.it/authorize`.
- `access_token_url()` likewise (`oauth.py:158-162`).
- `user_data()` inlines the full userinfo URL as an f-string — no setting, no `API_URL`.

So the sample's `<url>https://wlcg.cloud.cnaf.infn.it/login</url>` is inert **and misleading**:
an admin editing it gets no behaviour change. It is also not the issuer base (`/login` is a UI
route, not an OIDC endpoint) — so even if it were wired, the value is wrong. Same for
`<username_key>` (`get_user_details` is fully overridden, `USERNAME_KEY` unused) and
`<api_url>`.

Compounding: the hardcoded host is the **testing** IAM instance, per the upstream PR title
("New backend for the WLCG IAM testing site"). A named, non-configurable, single-tenant backend
pointing at a test endpoint is not something to ship to admins as a production provider. Route
(b) above makes the endpoint configurable and solves this.

## 7. Tests

**Existing coverage this PR inherits for free.** `test/unit/authnz/test_psa_authnz.py:687` and
`:716` are both `@pytest.mark.parametrize("provider, backend_path", BACKENDS.items())`, so the
new entry is automatically exercised. I ran the suite against the PR branch:

```
test/unit/authnz/test_psa_authnz.py — 57 passed in 10.71s
  ...test_configured_extra_scopes_are_requested_without_mutating_backend_default_scope[wlcg-social_core.backends.wlcg.WLCGOAuth2] PASSED
  ...test_authenticate_with_real_backend_does_not_accumulate_extra_scopes[wlcg-social_core.backends.wlcg.WLCGOAuth2] PASSED
```

(Run with a borrowed venv from another worktree — `PYTHONPATH=<wt>/lib:<wt>/test`, pinned
social-auth-core 5.1.1 — since `pr/16617` has no `.venv`.)

**Do not read that green as validation.** Those two cases assert only scope handling
(`get_scope()` / `DEFAULT_SCOPE` non-mutation). The suite passes *while* uid is `"None"` and
refresh is dead. That is the sharpest argument for the missing test.

**Minimal addition (purely additive — nothing weakened or removed).** Extend the same
`BACKENDS.items()` parametrize family in `test/unit/authnz/test_psa_authnz.py` with two cases:

1. `get_user_id(details, response)` returns a non-`None`, stable value given a representative
   OIDC-ish response (one containing `sub` but no `id`).
2. `backend.extra_data(...)` retains `refresh_token` when the response carries one.

Both go **red for `wlcg` today** and green for every other entry in `BACKENDS` — textbook
red-to-green, and it would have caught this before review. Also worth a `test_oidc_backends.py`
case if route (b) is taken (that file already covers keycloak/cilogon instantiation, scopes,
logout endpoints, disconnect).

Integration: `test/integration/oidc/test_auth_oidc.py` runs against a local Keycloak. Not
practical to extend for WLCG (external test IAM, real credentials) — do not ask for it.

## 8. Sample-file hygiene (low priority)

`lib/galaxy/config/sample/oidc_backends_config.xml.sample:271-294`:

- Child elements indented 6 spaces; every other provider block in the file uses 8
  (cf. `:264-265`).
- Tabs inside the comment body (`\t   Sign in with x509 …`) mixed with leading spaces. The file
  does contain tabs already (`:268`, egi_checkin), so not unprecedented, but this block mixes
  both within itself.
- Trailing whitespace on several lines, plus two whitespace-only lines (`+      ` after
  `<icon>`, `+    ` after `</provider>`).
- Sentences with trailing spaces before newline: "Otherwise keep defaults. ", "with actual
  values. ", "redirect_uri: ", "/authnz/wlcg/callback ", "to allow it. ".
- Nit: comment says "Create a WLCG IAM client at …/login" — that is the login page, not the
  client-registration page.

No `.pre-commit-config.yaml` in the tree, so this is not CI-enforced; cosmetic only.

## Non-findings (checked, clean)

- **Imports.** No new imports; nothing added inside a function body. Clean on the user's
  module-top-level rule.
- **No assertions weakened, no tests removed.** Diff is +26/-0.
- **Startup safety.** `managers.py:150-158` rejects unknown provider names with
  `ConfigurationError`, and `:170-182` force-imports the backend. Adding to `BACKENDS_NAME` is
  what makes `<provider name="wlcg">` legal at all — both map entries are required, and the PR
  got that right.
- **XSD.** `lib/galaxy/authnz/xsd/oidc_backends_config.xsd` does not enumerate provider names,
  so no schema change was needed. All elements used in the new block (`url`, `client_id`,
  `client_secret`, `redirect_uri`, `icon`) are declared. Correct as far as it goes.
- **Icon.** Sample supplies one explicitly, so no `DEFAULT_OIDC_IDP_ICONS`
  (`managers.py:54-58`) entry is needed. Consistent with how most providers do it.
- **CI.** Only red is `Integration Selenium :: Test (3.10)` /
  `test_multiple_quota_sources_for_user` — unrelated flake, per prior assessment. Not
  investigated.

## Upstream-facing note (optional, not this PR's job)

`WLCGOAuth2.user_data()` passes the access token as a **query parameter**
(`?access_token=…`). Tokens in URLs land in proxy/server logs and `Referer` headers. IAM
supports `Authorization: Bearer`. That is upstream social-core code, not this diff, but it is
one more reason to prefer `OpenIdConnectAuth` (which uses the discovery-provided userinfo
endpoint with a Bearer header).

---

## Suggested review shape

Lead with the good news (dependency is in, blocker gone), then the two blockers, then the
abstraction recommendation as the constructive path that fixes all of it at once.

Questions for the author:
1. Was `<provider name="oidc">` with `<oidc_endpoint>https://wlcg.cloud.cnaf.infn.it</oidc_endpoint>`
   tried? If it works, is a named backend still wanted (branding / generic-slot conflict)?
2. Has login been exercised with **two distinct** WLCG accounts against the same Galaxy? That
   is the reproducer for the uid collision.
3. Was ARC job submission with a *refreshed* (not first-issue) token ever exercised?
4. Is the CNAF host intended as the production WLCG IAM, or is it still the testing instance?
