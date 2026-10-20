### P2 1: Post-login redirect policy is applied by hand at three call sites, and the copies have already drifted (implementation verified)

`root.login`, `authnz.login_destination` and `User.__get_redirect_url` each read `allowed_login_redirect_hosts`, call `is_safe_login_redirect`, and log the same "Ignoring post-login redirect target that is not allowed" message that the admin docs quote. On top of that, `user.py` adds a private `DEFAULT_PORTS` / `_origin` / `_is_absolute_url_to` that copies the backslash, control-character and `@`-in-netloc refusals from `is_safe_login_redirect`. The copy has already fallen behind: it lacks the surrounding-whitespace refusal. So password login accepts `" https://galaxy.example/galaxy/x"` and returns it unchanged. It stays on this Galaxy, so it is not a redirect hole, but it shows what goes wrong when one trust decision is kept in two places.

<details><summary>Evidence</summary>

I added the case `(" https://galaxy.example/galaxy/x", root)` to `test_login_redirect`. It fails at `a55b2374` and passes on the review branch.

</details>

Fold the same-origin check into `galaxy.util` as `is_safe_login_redirect(target, allowed_hosts, base_url=None)`, so both checks share a single URL split with one set of refusals. Then route all three controllers through a small `is_allowed_login_redirect(trans, target, base_url=None)` in `controllers/authnz.py`, which validates the target and logs the refusal once. The review branch makes this change in about 40 lines.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort, and by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 2: No integration test covers the account-linking landing decision or external and refused confirmation destinations (implementation verified)

The PR asks reviewers to look at one decision in particular: a new association lands on `user/external_ids` with the notification only when no destination was requested. No Keycloak test asserts that. The confirmation POST to an allowed external host is covered only by a stubbed unit test, and no test covers a disallowed external `next`.

The review branch adds four tests to `test/integration/oidc/test_auth_oidc.py`, each using a realm user its class doesn't already use:

- A first login from a deep link lands on the destination and resets the login-next cookie.
- A first login with a refused external `next` lands on `user/external_ids` with the notification.
- A confirmation POST returns an allowed external destination and resets the cookie.
- A confirmation POST with a disallowed external `next` returns `/`.

`test_oidc_login_new_user` now also asserts the `user/external_ids` path. I ran each new or edited test locally against the Keycloak container, and all of them pass.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 3: The `CompletingTrans` stub tests duplicate the integration tests

`test_callback_sends_the_user_to_an_allowed_destination` and `test_account_confirmation_sends_the_user_to_an_allowed_destination` drive `OIDC.callback` and `OIDC.create_user` through a hand-built transaction. It uses lambdas and `object.__new__(OIDC)`, and its backend just echoes `login_redirect_url` back. With the Keycloak tests from P2 2 and the existing `test_oidc_login_returns_to_allowed_destination`, real flows cover the same behaviour.

Consider dropping these two tests and `CompletingTrans`. Keep `test_callback_encodes_the_destination_for_url_for`, which uses the real `url_for`. The review branch leaves them in place.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort.

</details>

### P2 4: The password-login redirect check is tested only with a patched `url_for`, in one looping test (implementation verified)

`test_login.py::test_login_redirect` fakes the prefix by patching `url_for` and loops over 12 cases. The first failing case hides the rest. The behaviour under a real `galaxy_url_prefix` with `allowed_login_redirect_hosts` set is never exercised.

The review branch parametrizes the unit test and keeps every case. It also adds `test/integration/test_login_redirect.py`, which posts to `/user/login` under `galaxy_url_prefix=/galaxypf` with an allowlisted host. That test covers allowed external hosts, local paths, absolute URLs back to Galaxy, and refused targets, including the logout URL.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 1: `URL_SAFE_CHARACTERS` is a second copy of a constant already on the branch (implementation verified)

`controllers/authnz.py` hard-codes the `requests.utils.requote_uri` safe set. `lib/galaxy/files/sources/http.py` already carries the same string as `_URL_SAFE_CHARACTERS`. Calling `requote_uri` directly is not a drop-in replacement, because it also decodes unreserved escapes, and 078061b29f7 deliberately avoided that. Instead, keep one `URL_SAFE_CHARACTERS` in `galaxy.util` and import it in both places.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: The server and client redirect test vectors are maintained separately and have drifted (implementation verified)

The PR says `safeLoginRedirect` mirrors `is_safe_login_redirect`, but the two test lists were copied by hand and no longer match. Only the server tests IPv6, `:notaport`, `https:///`, `eviltools.` and `\.evil`. Only the client tests full-width and percent-encoded dots. I ran each side's target URLs through the other side's check, and the two implementations agree on every one.

The review branch adds the missing target URLs to both lists, notes on each side that they must stay in step, and uses `it.each` in `redirect.test.ts`. One server-only test remains: `test_allowlist_entries_may_name_the_default_port`. The client doesn't strip `:443` from allowlist entries; it relies on the config parser having normalized them before `/api/configuration` exposes the list.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: `LoginForm.test.ts` doesn't restore `window.location.href` when the assertion fails (implementation verified)

The new redirect test restores `window.location.href` only after `expect` passes, so a failure leaks the external URL into the tests that run after it. The review branch moves the restore into `finally`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>
