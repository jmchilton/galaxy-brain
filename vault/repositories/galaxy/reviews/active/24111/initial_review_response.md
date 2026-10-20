(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile: gx_risk_assessment, Opus 5.5 at low effort, reviewed commit a55b237469afdcf9af7ab9f19ff09ac9007b3268.

The one-way door is part B: a new admin-facing config option, `allowed_login_redirect_hosts`, with fixed matching semantics, exposed through `/api/configuration` and shipped on a release branch (`release_26.1`), so deployments will start relying on its name and behaviour in a point release; the OIDC URL fixes in part A are a two-way door.

<details><summary>Risk Details</summary>

- `allowed_login_redirect_hosts` becomes public config once it ships: name, comma-list format, exact-authority matching, `:443` stripping, https-only, and no wildcards. Changing any of these later (for example, adding wildcards or http) changes what admins already rely on.
- A new feature lands on a release branch. Admins on 26.1.x get a new option between point releases, and it has to be kept going forward into `dev`/27.0.
- The allowed host list is returned by `/api/configuration`, so it becomes part of the configuration API response that clients may read.
- The server (`galaxy.util.is_safe_login_redirect`) and the client (`safeLoginRedirect` in `client/src/utils/redirect.ts`) check redirects separately and must agree. Any later change has to update both, or the guard and the server will disagree about what is allowed.
- Changed landing page: after a first OIDC login from a deep link, users now land on that page instead of `user/external_ids`. Users and docs may come to expect this. The PR says reverting it is a one-line change.
- Password login (`user.__get_redirect_url`) now refuses some absolute URLs back to this Galaxy that it accepted before (backslash and userinfo spellings). Existing links in that form will stop working.
- Detecting a stopped login now depends on the PSA `do_complete` return type (`Redirect` versus a plain string). If a social-auth upgrade changes that, this check could break quietly.

</details>

<details><summary>Risk Review Advice</summary>

Maintainers should decide whether part B (the new option) belongs on `release_26.1` or on `dev`. Part A stands on its own and is low risk to roll back. If part B ships, the main decision is the option's contract: its name, the entry format, and the strict exact-authority, https-only rules. These are hard to loosen or tighten later without surprising admins. Also confirm that it is acceptable for `/api/configuration` to expose the list.

Reviewers should read `is_safe_login_redirect` next to `safeLoginRedirect` to make sure they match, and confirm with the author the account-linking landing decision (deep-link destination versus `user/external_ids`). The `isinstance(redirect, Redirect)` stopped-login check depends on an internal PSA detail that is worth noting.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24111_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

# Review branch [`pr_24111_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24111_review_0)

This branch starts at the reviewed commit `a55b2374`. It makes all three login paths use one post-login redirect check. That check lives in `galaxy.util` (`is_safe_login_redirect(..., base_url=)`) and is called through `authnz.is_allowed_login_redirect`, which also logs refused targets. Password login now refuses the same ambiguous spellings as OIDC, including surrounding whitespace. The branch also keeps the URL-safe character set in one place and adds the Keycloak tests and the password-login integration test that the PR was missing. The server and client redirect test vectors now match, and two tests are made more robust. In total it changes 11 files, +286/−129.

- [`74953438e2f`](https://github.com/jmchilton/galaxy/commit/74953438e2f) Share post-login redirect check across root, authnz and user controllers. Moves `_is_absolute_url_to` into `is_safe_login_redirect` as `base_url=`, so the redirect check, and its warning message, is now written in one place; a red-to-green whitespace case is added to `test_login.py`, plus `base_url` unit tests.
- [`26f9d9b5503`](https://github.com/jmchilton/galaxy/commit/26f9d9b5503) Share URL_SAFE_CHARACTERS via galaxy.util instead of a second copy. `authnz.py` and `files/sources/http.py` now import one constant.
- [`19937499cbb`](https://github.com/jmchilton/galaxy/commit/19937499cbb) Align server and client login-redirect test vectors; use it.each. Each side gains the cases only the other side had; both implementations agree on all of them.
- [`d450267c80f`](https://github.com/jmchilton/galaxy/commit/d450267c80f) Restore window.location.href even when LoginForm redirect test fails. Moves the restore into `try/finally`.
- [`55bf7fdd58a`](https://github.com/jmchilton/galaxy/commit/55bf7fdd58a) Cover OIDC landing decision and external/refused destinations in Keycloak tests. Adds four Keycloak tests: deep-link first login, refused `next` that lands on `user/external_ids`, and confirmation to an allowed or a refused external host. Also asserts the `user/external_ids` path in `test_oidc_login_new_user`.
- [`7d4f7412e10`](https://github.com/jmchilton/galaxy/commit/7d4f7412e10) Parametrize password-login redirect test; add integration test under url prefix. Parametrizes `test_login_redirect` and adds `test/integration/test_login_redirect.py` (`galaxy_url_prefix` plus an allowlisted host).

</details>

</details>

### P2 1: Post-login redirect policy is applied by hand at three call sites, and the copies have already drifted (implementation verified)

`root.login`, `authnz.login_destination` and `User.__get_redirect_url` each read `allowed_login_redirect_hosts`, call `is_safe_login_redirect`, and log the same "Ignoring post-login redirect target that is not allowed" message that the admin docs quote. On top of that, `user.py` adds a private `DEFAULT_PORTS` / `_origin` / `_is_absolute_url_to` that copies the backslash, control-character and `@`-in-netloc refusals from `is_safe_login_redirect`. The copy has already fallen behind: it lacks the surrounding-whitespace refusal. So password login accepts `" https://galaxy.example/galaxy/x"` and returns it unchanged. It stays on this Galaxy, so it is not a redirect hole, but it shows what goes wrong when one trust decision is kept in two places.

<details><summary>Evidence</summary>

I added the case `(" https://galaxy.example/galaxy/x", root)` to `test_login_redirect`. It fails at `a55b2374` and passes on the review branch.

</details>

Fold the same-origin check into `galaxy.util` as `is_safe_login_redirect(target, allowed_hosts, base_url=None)`, so both checks share a single URL split with one set of refusals. Then route all three controllers through a small `is_allowed_login_redirect(trans, target, base_url=None)` in `controllers/authnz.py`, which validates the target and logs the refusal once. The review branch makes this change in about 40 lines.

Fixed on the review branch in [`74953438e2f`](https://github.com/jmchilton/galaxy/commit/74953438e2f).

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

Fixed on the review branch in [`55bf7fdd58a`](https://github.com/jmchilton/galaxy/commit/55bf7fdd58a).

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

Fixed on the review branch in [`7d4f7412e10`](https://github.com/jmchilton/galaxy/commit/7d4f7412e10).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 1: `URL_SAFE_CHARACTERS` is a second copy of a constant already on the branch (implementation verified)

`controllers/authnz.py` hard-codes the `requests.utils.requote_uri` safe set. `lib/galaxy/files/sources/http.py` already carries the same string as `_URL_SAFE_CHARACTERS`. Calling `requote_uri` directly is not a drop-in replacement, because it also decodes unreserved escapes, and 078061b29f7 deliberately avoided that. Instead, keep one `URL_SAFE_CHARACTERS` in `galaxy.util` and import it in both places.

Fixed on the review branch in [`26f9d9b5503`](https://github.com/jmchilton/galaxy/commit/26f9d9b5503).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: The server and client redirect test vectors are maintained separately and have drifted (implementation verified)

The PR says `safeLoginRedirect` mirrors `is_safe_login_redirect`, but the two test lists were copied by hand and no longer match. Only the server tests IPv6, `:notaport`, `https:///`, `eviltools.` and `\.evil`. Only the client tests full-width and percent-encoded dots. I ran each side's target URLs through the other side's check, and the two implementations agree on every one.

The review branch adds the missing target URLs to both lists, notes on each side that they must stay in step, and uses `it.each` in `redirect.test.ts`. One server-only test remains: `test_allowlist_entries_may_name_the_default_port`. The client doesn't strip `:443` from allowlist entries; it relies on the config parser having normalized them before `/api/configuration` exposes the list.

Fixed on the review branch in [`19937499cbb`](https://github.com/jmchilton/galaxy/commit/19937499cbb).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: `LoginForm.test.ts` doesn't restore `window.location.href` when the assertion fails (implementation verified)

The new redirect test restores `window.location.href` only after `expect` passes, so a failure leaks the external URL into the tests that run after it. The review branch moves the restore into `finally`.

Fixed on the review branch in [`d450267c80f`](https://github.com/jmchilton/galaxy/commit/d450267c80f).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Suggested Follow-Up Refactoring for dev</summary>

Here's draft text for a follow-up issue covering refactorings this review recommends that don't fit this PR or its target branch. When creating the issue, feel free to assign John (jmchilton).

````markdown
# Consolidate post-login redirect resolution

This follows up on #24111 (`release_26.1`). It targets `dev`, not the release branch.

## Problem

All three login paths (`root.login`, `authnz.login_destination` and the password login in `user.__get_redirect_url`) validate the post-login target. If the `pr_24111_review_0` changes land, they share one check: `is_safe_login_redirect(target, allowed_hosts, base_url=None)` in `galaxy.util`, called through `authnz.is_allowed_login_redirect`. Otherwise, the first step is to move `user.py`'s `_is_absolute_url_to` into that check and drop the three copies of the validate-and-log code. Either way, what happens after the check still differs between the paths:

- `login_destination` re-quotes the target and applies `galaxy_url_prefix` to local paths.
- The password login leaves the prefix for the client to add and rejects logout targets. The OIDC paths do not reject logout targets.
- The OIDC controller works out that the pipeline stopped by checking whether the URL starts with `url_for('/login/start')` and differs from `login_next`. `PSAAuthnz.callback` already knows this, because `do_complete` returned something other than a `Redirect`. The backend also decides whether the user had a destination by comparing `login_redirect_url == trans.url_builder("/")`. The PR's "Known limitations" section notes that this string matching lets a crafted `next` show an error in place of the linking prompt.

## Plan

1. Add one helper that turns a raw target into the final destination, for example `resolve_login_redirect(trans, target, *, qualified_base=None) -> str`. It would:
   - validate the target;
   - quote it with `URL_SAFE_CHARACTERS`;
   - apply `galaxy_url_prefix` to local paths;
   - reject logout targets on every path.

   Use it from `root.py`, `authnz.py` and `user.py`.
2. Have `PSAAuthnz.callback` return whether the pipeline stopped, either as a flag or as a small result dataclass. Then remove the `startswith(url_for('/login/start'))` and `== url_builder("/")` comparisons from the controller and the backend.
3. Point the existing tests (`test/unit/util/test_safe_local_redirect.py`, `test/unit/webapps/test_authnz_login_next.py`, `test_login.py`, and the Keycloak and password-login integration tests) at the shared helper, rather than adding new tests for each controller.
````

</details>
