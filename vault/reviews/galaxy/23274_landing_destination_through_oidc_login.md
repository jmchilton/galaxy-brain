# PR 23274 — Carry the landing-request destination through OIDC login

| | |
|---|---|
| **PR** | https://github.com/galaxyproject/galaxy/pull/23274 |
| **Author** | dannon (Dannon Baker) |
| **Base branch** | `release_26.1` (not `dev`) |
| **Head** | `c1a89ff5e1` |
| **Size** | 15 files, +667 / -29 |
| **Worktree** | `/Users/jxc755/projects/worktrees/galaxy/pr/23274` |
| **Verdict** | **Approve with comments.** No P1. All three fixes are correct and I verified red-to-green by actually reverting two of them. Two P2s: the login-next stash gets *copied* into `root.py` instead of factored out (the one structural ask), and `quote()` introduces a latent double-encode on the local-login leg. Keep the open-redirect hardening on the release branch — see "Release-branch scope", it is not as separable as the PR body suggests. |

---

## What it does

A deep link with a query string (`/tool_landings/<uuid>?public=true`) loses its destination on the
way through login on a `require_login: true` + OIDC instance. Three independent drops, all real:

1. `RootController.login`'s single-OIDC-provider shortcut bounced straight to the IdP without ever
   writing `galaxy-oidc-login-next`, so `OIDC.callback` fell through to `url_for("/")`.
2. `_ensure_logged_in_user` forwarded `self.request.path`, which is `SCRIPT_NAME + PATH_INFO` —
   dropping the query string and double-applying the prefix.
3. Client `redirectLoggedIn()` returned `"/"` unconditionally.

Plus new open-redirect validation: `is_safe_local_redirect` (server) and `safeRedirectPath` (client).

---

## Claims I verified

**1. `self.request.path` really is double-prefixed.** `lib/galaxy/web/framework/base.py:469-471`:
`return self.environ.get("SCRIPT_NAME", "") + self.environ["PATH_INFO"]`. And
`routes.url_for("/x")` with `SCRIPT_NAME="/galaxy"` returns `/galaxy/x` — I ran it. So the old
value went `/galaxy/tool_landings/…` into the cookie and came back out of `OIDC.callback` as
`/galaxy/galaxy/tool_landings/…`. ✓

**2. `OIDC.login` already sets the cookie for the multi-provider case, and the client feeds it.**
`controllers/authnz.py:93`. The client half is `ExternalLogin.vue:74-77` —
`urlParams.get("redirect")` → `submitOIDCLogon(idp, redirectParam)` → POST `next=`. So the
multi-provider path genuinely worked and only the single-provider shortcut was broken, exactly as
described. ✓

**3. Consumption-side validation does cover `OIDC.login`'s unvalidated `next`.**
`authnz.py:93` still writes `next` verbatim with no check; `authnz.py:109-110` validates on read.
So the callback check is the load-bearing one and it closes the pre-existing hole. ✓

**4. `require_login` really is un-integration-testable today.** `wait_for_http_server`
(`lib/galaxy_test/driver/driver_util.py:480-502`) does `conn.request("GET", prefix)` and breaks
only on `response.status == 200`; `http.client` does not follow redirects. And `/` is *not* in
`allowed_paths` (`lib/galaxy/webapps/base/webapp.py:710-731` — the list is login/user/welcome
paths, not root). So an anonymous `GET /` under `require_login` is a 302 forever and the driver
times out after 150 tries. Claim holds. See P3-6 for the cheap fix. ✓

**5. Red-to-green is real — I checked it rather than taking the author's word.**

- Reverted the `root.py:69-75` cookie stash → `test_root_login.py`: **7 failed, 1 passed**.
- Reverted `webapp.py:761-770` back to `url_for("/login", redirect=self.request.path)` →
  `test_require_login_redirect.py`: **2 failed, 4 passed** (`…preserves_the_query_string` and
  `…is_root_relative_under_a_prefix` — precisely the two behaviours).
- Restored; working tree clean.

All four new server test files at HEAD: **52 passed**. `git diff --diff-filter=DR` against
`origin/release_26.1` is empty — no test deleted or renamed, and the only pre-existing test file
touched (`client/src/utils/redirect.test.ts`) is purely additive plus an import line. Nothing
weakened. ✓

**6. `is_safe_local_redirect` survives adversarial input.** I ported `safeRedirectPath` to Python
(including JS `trim()` semantics — `Zs` category plus `﻿`) and ran both against ~40 hostile
spellings:

| input | server | client | resolves to |
|---|---|---|---|
| `//evil.com`, `///evil.com`, `/\evil.com`, `/\\evil.com` | reject | reject | |
| `/\t/evil.com`, `/\n/evil.com`, `/\r/evil.com` | reject | reject | browsers strip these → `//host` |
| `https://`, `http:/`, `https:evil.com`, `javascript:`, `data:` | reject | reject | |
| ` //evil.com`, `/histories/list ` | reject | reject | |
| `/%2f%2fevil.com`, `/%5c%5cevil.com`, `/%09/evil.com` | accept | accept | same origin — browsers do not decode `%2f` before authority parsing |
| `/.//evil.com`, `/..//evil.com` | accept | accept | same origin; dot-segment removal happens *after* the authority is fixed, so this is the path `//evil.com` on this host |
| `/ //evil.com`, `/\xa0//evil.com`, `/﻿/evil.com`, `/ /evil.com` | accept | accept | same origin — the WHATWG parser strips only C0+space (leading/trailing) and interior tab/LF/CR, none of which survive the control-char check |
| `/⁄/evil.com`, `/／/evil.com` (U+2044, U+FF0F) | accept | accept | not separators; no browser normalizes them |
| `/@evil.com`, `/localhost`, `/:evil.com` | accept | accept | authority needs `//` |
| `/foo?x=//evil.com`, `/foo#//evil.com` | accept | accept | |

Zero escapes. And `url_for()` applied afterward cannot reintroduce an absolute URL: for a string
argument it only prepends `SCRIPT_NAME` (verified against the real `routes` package). ✓

**7. The client-side validator is load-bearing, not decoration.** `redirectLoggedIn` runs entirely
in the browser on `/login/start?redirect=X` for an already-signed-in user — that value never
reaches the server validator. Without `safeRedirectPath` an attacker link would bounce a logged-in
Galaxy user straight off-site. Not redundant. ✓

**8. The client route restructuring follows a real convention.** `admin-routes.js`,
`library-routes.js`, `storage-routes.ts` all default-export a bare untyped array; `login-routes.ts`
matches, down to not annotating `RouteConfig[]` (nothing in `client/src` imports that type).
And `guards.ts` is not a new one-off — it already existed and already contained
`redirectIfAnonymous` (`client/src/router/guards.ts:33-45`), which does
`next({ path: "/login/start", query: { redirect: to.fullPath } })`. `redirectLoggedIn` is the
symmetric counterpart in exactly the right file. ✓

**9. The deliberate omissions are as described — with one the body understates.**
`redirectToSingleProvider` does call `submitOIDCLogon(idp, "")`
(`ExternalIDHelper.ts:126`), and `submitCILogon(useIDPHint, idpHint)` takes no redirect parameter
(`ExternalIDHelper.ts:71`). But `submitCILogon`'s *other* caller is `clickCILogonLogin`
(`ExternalLogin.vue:104`) — the ordinary multi-provider CILogon button, not the single-provider
shortcut. So a CILogon deployment loses the destination on the normal path too, not just the
`disable_local_accounts` one. The reasoning for deferring still stands (fixing half is worse), but
the scope of what's deferred is wider than the PR body says. See P3-5.

---

## P2 findings

### P2-1 — The login-next stash is copied into `root.py` rather than factored out

**Files:** `lib/galaxy/webapps/galaxy/controllers/root.py:20,69-75`;
`lib/galaxy/webapps/galaxy/controllers/authnz.py:92-96,109-116`

This is the one structural ask, and it's the difference between leaving an abstraction behind and
accreting. After this PR there are **three writers** of one cookie, with three different rules:

| site | value written | validated? | `age` |
|---|---|---|---|
| `authnz.py:93` (`OIDC.login`) | `next`, verbatim | **no** | `1` |
| `authnz.py:96` (`OIDC.login`, else) | `"/"` | n/a | **default `90`** |
| `root.py:75` (new) | `redirect`, or `"/"` | **yes** | `1` |

and one reader at `authnz.py:109`. `root.py` reaches across for `LOGIN_NEXT_COOKIE_NAME`
(`root.py:20` — `from .authnz import LOGIN_NEXT_COOKIE_NAME`), which is nearly unprecedented in
that package: `git grep "^from \.[a-z]" lib/galaxy/webapps/galaxy/controllers/` returns exactly two
hits, this one and `admin_toolshed.py:19`. Everything else imports `..api`.

The code-judo move is a module-level pair in `controllers/authnz.py`, next to the constant that
already lives there:

```python
def stash_login_next(trans, destination: Optional[str]) -> None:
    """Remember where the user was headed before handing them to an identity provider."""
    if destination and not is_safe_local_redirect(destination):
        log.warning("Ignoring post-login redirect target outside of Galaxy: %s", destination)
        destination = None
    trans.set_cookie(value=destination or "/", name=LOGIN_NEXT_COOKIE_NAME, age=1)


def pop_login_next(trans) -> str:
    """Where to send the user now that an identity provider has handed them back."""
    destination = trans.get_cookie(name=LOGIN_NEXT_COOKIE_NAME)
    # This cookie can sometimes be set to a literal string 'None'.
    if destination and destination != "None":
        if is_safe_local_redirect(destination):
            return url_for(destination)
        log.warning("Ignoring post-login redirect target outside of Galaxy: %s", destination)
    return url_for("/")
```

That is a *smaller* net diff than what's here now, and it:

- deletes the four new lines in `root.py`, which becomes `stash_login_next(trans, redirect)` — and
  `root.py` no longer needs to know the cookie name or import `is_safe_local_redirect` at all;
- gives `OIDC.login` the validation it still lacks (`authnz.py:93` today stores an arbitrary
  attacker-supplied `next`), by collapsing its `if next: … else: …` to the same one call;
- incidentally fixes the `age=90` inconsistency at `authnz.py:96`;
- makes `OIDC.callback` a one-liner and puts the "should this cookie be trusted" rule in exactly
  one place instead of two.

Delegating further — pushing this onto `authnz_manager` so no controller reaches across at all —
would be the `dev`-branch version. `authnz_manager.authenticate` (`lib/galaxy/authnz/managers.py:378`)
already takes `trans`, so it's a natural home, but that's more churn than a release branch wants.
The module-level helper is the proportionate move here.

### P2-2 — `quote()` is correct for the OIDC leg and wrong for the local-login leg

**File:** `lib/galaxy/webapps/base/webapp.py:766-770`, with
`client/src/components/Login/LoginForm.vue:117`

I traced the encoding end to end rather than assuming, because this looked like double-encoding and
mostly isn't:

- `routes.url_for("/login", redirect=X)` **does** percent-encode `X` — I ran it:
  `redirect="/a b/c%20d?x=1"` comes out as `/login?redirect=/a%20b/c%2520d%3Fx%3D1`.
- WSGI `PATH_INFO` is already percent-*decoded*, so `quote()` re-encodes it back to path form.
  `query_string` is already encoded and is appended raw. The two halves are therefore in the same
  representation, `routes` encodes the whole thing once for transport, and the client decodes once.
  **The round trip is exact.** Not double-encoded.
- The cookie survives it: `SimpleCookie` quotes `/` and `?`, and `Request.cookies`
  (`web/framework/base.py:441-454`) unquotes via `webob.cookies.parse_cookie`. Verified.
- `url_for(cookie_value)` in the callback does not re-encode — string arguments only get
  `SCRIPT_NAME` prepended.

So the OIDC leg is right. The **local login leg is not.** That destination goes
`root.py:79` → `/login/start?redirect=…` → `Login.vue:45` → `LoginForm.vue:88` → POST to
`/user/login` → `user.py:211` `__get_redirect_url` (passes relative paths through unchanged) →
`LoginForm.vue:117`:

```js
window.location.href = withPrefix(encodeURI(response.data.redirect));
```

`encodeURI("%")` is `"%25"`, so `encodeURI` double-encodes anything `quote()` already escaped:
`/a%20b` → `/a%2520b`. Before this PR the value was the *unquoted* `request.path`, so `encodeURI`
was the only encoder and the result was right (if double-prefixed). This PR adds a second encoder
upstream of it.

Impact is narrow — `/tool_landings/<uuid>` is pure ASCII, `quote()` is a no-op, and the reported
scenario is unaffected. But the PR body claims this change "incidentally fixes the local login
path", and for any path with a space, a non-ASCII character or a literal `%` it now breaks it in a
different way. Two ways out, both fine:

- **Smallest release diff:** drop `quote()`, send `self.request.path_info` raw. That is the exact
  minimal fix for the reported bug (SCRIPT_NAME removal + query string), and it restores
  `encodeURI` as the single encoder. The cost is a pathological path containing a literal `?`
  (i.e. `%3F` in the original URL) confusing the query boundary — I'd take that trade on a
  release branch.
- Or keep `quote()` and drop the `encodeURI` at `LoginForm.vue:117`. Correct, but it touches a
  shared login path for a case nobody has reported.

Either way the comment at `webapp.py:761-765` should say why the path half is quoted and the query
half isn't — that asymmetry is correct and completely non-obvious, and it is the thing the next
reader will "fix".

---

## Release-branch scope — keep the hardening

The author offers to drop the open-redirect work to narrow the diff. **Don't.** It is less
separable than the offer implies:

`RootController.login` did not previously store `redirect` anywhere. This PR makes it write an
attacker-supplied query-string value into a cookie that `OIDC.callback` turns into a `Location`
header. Without `is_safe_local_redirect`, *this PR introduces* an open redirect on every
single-provider OIDC deployment — `/login?redirect=https://evil.example.com` would work. The check
at `root.py:73` is not hardening, it's part of the fix.

The `authnz.py:110` check is genuinely separable (it closes a pre-existing hole via
`OIDC.login`'s `next`), but it is two lines and it's what makes the `root.py` check belt-and-braces
rather than the only line of defence.

On `lib/galaxy/util/__init__.py` being widely imported: the addition is purely additive — a new
function and a new module-level `CONTROL_CHARACTERS` constant, no existing behaviour touched, and
`git grep CONTROL_CHARACTERS lib test` shows no name collision. `compare_urls` sits directly above
it, so the placement is right. No release-branch risk.

---

## Reuse check

**Is there an existing server-side safe-redirect helper?** No. `git grep` for `safe_redirect`,
`is_safe_url`, `open_redirect`, `validate_url` across `lib` and `test` returns nothing but this
PR's own code.

The closest prior art is `UserController.__get_redirect_url`
(`lib/galaxy/webapps/galaxy/controllers/user.py:362-374`), which uses `util.compare_urls` to keep
the post-login redirect on-site. It is **not** a substitute — it operates on *qualified* URLs
(`url_for("/", qualified=True)` and hostname comparison), whereas the login-next cookie carries
root-relative paths and `compare_urls` skips the hostname check entirely when one side has no
hostname. So writing a new function was right. But say so somewhere, because the codebase now has
two different answers to "is this redirect safe", and someone will eventually find only the wrong
one. (Unrelated, worth an issue: `__get_redirect_url`'s `elif` at `user.py:373` is dead — the
identical condition is already in the `if` via `or`.)

**Client side.** `client/src/components/Notifications/Broadcasts/BroadcastContainer.vue:110` and
`client/src/components/admin/Notifications/BroadcastsList.vue:61` both do a bare
`if (link.startsWith("/"))` before navigating — the same rule, weaker, applied to
admin-authored broadcast links. Those are two ready-made reuse sites for `safeRedirectPath`, and
converting them is the cheapest way to make this a shared abstraction rather than a second
one-off. Follow-up against `dev`, not this PR.

**What this leaves behind.** Net positive, with one gap:

- `safeRedirectPath` — genuinely reusable, correctly placed next to `withPrefix` in
  `utils/redirect.ts`, and has two waiting callers.
- `is_safe_local_redirect` — reusable, correctly placed next to `compare_urls`.
- `redirectLoggedIn` in `router/guards.ts` — the right home, symmetric with the
  `redirectIfAnonymous` that was already there. Not an accretion.
- `login-routes.ts` — follows the existing route-module convention exactly.
- The login-next cookie protocol is the gap. It is the only piece this PR *duplicates* instead of
  naming, and it's the one thing a fourth caller will get wrong. That's P2-1.

---

## P3 findings

**P3-1 — `is_safe_local_redirect(path: Any)` should take `object`.**
`lib/galaxy/util/__init__.py:1380`. `Any` silences mypy at every call site, which is the opposite
of what a validator wants; `object` still permits the `isinstance` narrowing on line 1388 and makes
the "callers pass unvalidated junk" contract real. One-word change.

**P3-2 — Client and server disagree on two trailing characters.** I diffed them exhaustively;
exactly two divergences, both from `str.strip()` vs JS `trim()`:

| input | server | client |
|---|---|---|
| `/evil﻿` (BOM) | accept | reject — JS `trim()` strips ZWNBSP, Python's doesn't |
| `/evil\x85` (NEL) | reject | accept — Python's `isspace()` includes NEL, JS's doesn't |

Neither is a separator and neither is exploitable, but "the client accepts something the server
rejects" is a bug factory in general. If you want them provably identical, replace both
trim-comparisons with an explicit rule (`path.strip(" \t\r\n\f\v﻿\xa0") != path`, or just drop
the trim check entirely and rely on `startswith("/")` — a leading space already fails that, and
trailing whitespace on a path is harmless). Genuinely a nit; noting it so the divergence is a
choice.

**P3-3 — `LOGIN_ENTRY_ROUTES` duplicates the paths it guards.**
`client/src/router/guards.ts:10` hardcodes `["/login/start", "/register/start"]`, and
`login-routes.ts:14,20` declares those same two paths. Two lists that can drift. Deriving the list
from the route array (or exporting the constant from `login-routes.ts` and importing it) removes
the coupling. Note also that the check is exact-match, so `?redirect=/login/start%3Fx%3D1` costs
one extra hop before landing on `/` — no loop, just worth knowing.

**P3-4 — `localStorage["redirect_url"]` beats the fresh `?redirect=`.**
`client/src/components/Login/LoginForm.vue:85-89` prefers `localStorage.getItem("redirect_url")`
over `props.redirect`, and it is only ever *set* (`:138`, from `NewUserConfirmation.vue:43`),
never cleared. So a user who once went through external-ID confirmation has `/user/external_ids`
stuck in localStorage, and it silently wins over the destination this PR works so hard to preserve
— on the local-login path only. Pre-existing, not caused here, but it sits directly in the flow
being fixed and will look like this PR's bug when someone hits it. Worth an issue.

**P3-5 — `redirectAnon()` is a fourth drop point.** `client/src/entry/analysis/router.js:136-145`
returns a bare `"/login/start"` with no `redirect` query for ~30 routes. The newer `requireAuth` /
`redirectIfAnonymous` guard does it properly (`guards.ts:38-40`). Out of scope — with
`require_login: true` the server gate fires first — but it's the same bug class and, unlike the
CILogon items, the PR body doesn't name it. Combined with the wider `submitCILogon` scope from
claim 9, I'd extend the "Not included" section rather than change any code here.

**P3-6 — The `require_login` integration gap is cheaply fixable, and that's the reusable win.**
`driver_util.py:494` is `if response.status == 200: break`. Changing it to
`if response.status in (200, 302): break` unblocks integration-testing `require_login` for
everyone, permanently — which is exactly the kind of thing that's worth more than the PR that
motivated it. I did **not** verify that nothing else depends on the 200-only semantics, and I'd
put it on `dev`, not here. (I considered polling `/api/version` instead, but `allowed_paths`
includes `url_for(controller="api", action="webhooks")`, implying API paths are gated too, and I
did not confirm whether the gate actually runs for anonymous API requests — `_ensure_logged_in_user`
is inside `if self.galaxy_session:` at `webapp.py:373-380`. The status-code change is the safer
suggestion.)

**P3-7 — Imports are clean.** `quote` added to the top-level `urllib.parse` import in `webapp.py:17-20`;
`is_safe_local_redirect` at the top of `authnz.py:16-19` and `root.py:17`; `getGalaxyInstance` and
`safeRedirectPath` at the top of `guards.ts`. Nothing buried in a function. ✓

**P3-8 — Cookie set before `authenticate()` succeeds.** `root.py:75` writes the cookie, then
`:76` calls `authenticate`; on failure the code falls through to the login page with the cookie
already set (1 day). Harmless — it gets used or overwritten — and `OIDC.login` has always done the
same. Noting only so it reads as deliberate.

---

## Test quality

Good, and behavioural rather than implementation-restating.

`test_require_login_redirect.py` is the standout: it builds a real `WebApplication` with a real
`routes` mapper and asserts on the actual `Location` header out of the gate, so it would catch a
change in `routes`' encoding, not just a change in the string this function builds. The `/login`
and `/login/start` non-gating parametrize (`:119-128`) is the right paranoia — either one gated is
an infinite loop.

`test_root_login.py` stubs only the slice of `trans` the function touches and calls
`RootController.login(None, trans, …)` with an explicit comment saying why `self` is unused. The
multi-provider fall-through test (`:77-85`) asserts the *absence* of the cookie, which is the
non-obvious half.

`test_authnz_login_next.py` halts the flow by returning `False` from the stub `authnz_manager.callback`
and asserts on the recorded `login_redirect_url` — a clean seam, no mocking of the function under test.

`test_safe_local_redirect.py` is table-driven and covers the cases that matter. It could stand two
more rows documenting what is *deliberately* accepted (`/%2f%2fevil.com`, `/.//evil.com`) so the
next person doesn't file them as holes; my analysis above says both are safe, but the tests don't
say so.

Client tests read well (`login-routes.test.ts` drives a real `VueRouter` in abstract mode, which is
the right call — it pins the `matched.length === 1` behaviour that a route-level `redirect` fn
would have broken), but **I could not run them** — see below.

---

## What I did not check

- **Client tests were not executed.** `client/node_modules` does not exist in this worktree and I
  did not run `pnpm install`. I read all three new client test files and the code under test; the
  assertions look correct, but "3 client test files pass" is unverified.
- **mypy was not run.** The borrowed venv isn't the project's.
- **No live Galaxy, no real OIDC round trip.** The author's curl-then-browser verification is the
  real proof of the end-to-end flow and I have no way to reproduce it here.
- **Browser URL-resolution claims** for `/ //host`, `/.//host`, `/%2f%2fhost` are reasoned from the
  WHATWG URL spec (the parser strips only leading/trailing C0+space and interior tab/LF/CR; dot
  segments are removed after the authority is fixed), not tested against Chrome/Firefox/Safari.
- **Test environment**: borrowed `~/projects/worktrees/galaxy/pr/22781/.venv`, `PYTHONPATH=lib:test`.
  The full `test/unit/webapps/` run showed **11 failed, 87 passed** — all 11 are in
  `test_request_scoped_sqlalchemy_sessions.py` and `test_streaming_response.py`, both untouched by
  this PR, and all fail with *"async def functions are not natively supported"*: `pytest-asyncio`
  is missing from the borrowed venv. Not a regression. The four files this PR adds: **52 passed**.

---

## Follow-up branch 2026-08-21 — `jmchilton:review-nits`

Both P2s implemented on the standing nits branch (based on 23196 head + `dev`), pushed, no PR.

- `40b9705d61` **P2-1** — `stash_login_next` / `pop_login_next` in `authnz.py`. `root.py` stops
  importing `LOGIN_NEXT_COOKIE_NAME` and `is_safe_local_redirect` entirely; `OIDC.login` collapses
  to one call and gains the validation it lacked; the `age=90` else-branch goes away. Red-to-green:
  6 of the new tests fail on the pre-refactor controller. 60 tests green across
  `test_authnz_login_next.py`, `test_root_login.py`, `test_require_login_redirect.py`,
  `test_safe_local_redirect.py`.
- `a012de2b5b` **P2-2** — took the "keep `quote()`, drop `encodeURI`" option rather than the
  smaller "drop `quote()`" one, since this is `dev` rather than a release branch. Plus the comment
  in `webapp.py` explaining why only the path half is quoted.
  Testing this was awkward: happy-dom neither navigates on `window.location.href = ...` nor
  survives a `defineProperty` on `location.href` (doing that silently kills the axios POST, which
  cost a while to find). The test asserts on a passthrough `vi.mock` spy over `withPrefix`
  instead. Red confirmed by restoring `encodeURI`.

**Still open**: this is `dev`-only. 26.1 keeps the double-encode unless P2-2 is cherry-picked onto
a `release_26.1` branch.
