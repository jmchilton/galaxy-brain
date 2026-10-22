# Test challenges review — PR #24111

- Profile: gx_test_challenger
- Model: Claude Opus 5.5, low effort
- Reviewed commit: a55b237469afdcf9af7ab9f19ff09ac9007b3268
- Details: [test_challenges_debrief.md](test_challenges_debrief.md)

No bugs hunted. Unit coverage of the pure guards is strong; gaps are at the integration layer for the behaviour the PR explicitly flags for review.

### P2 1: Integration coverage missing for the account-linking landing decision and refused/external confirmation destinations

The PR calls out the new-association landing (`user/external_ids` + notification only when no destination) as a decision to review, but no Keycloak integration test asserts it. Also uncovered end-to-end: the confirmation POST to an allowed external host (only a stubbed unit test), and a disallowed external `next` falling back to root. Add these to `test_auth_oidc.py` reusing `_login_via_keycloak`/`_begin_confirmation`/`_submit_confirmation`.

### P2 2: Replace the `CompletingTrans` stub tests with integration coverage

`test_callback_sends_the_user_to_an_allowed_destination` and `test_account_confirmation_sends_the_user_to_an_allowed_destination` drive `OIDC.callback`/`create_user` via a hand-built trans (lambdas, `object.__new__(OIDC)`) whose backend just echoes `login_redirect_url`, largely duplicating `test_oidc_login_returns_to_allowed_destination`/`test_confirmation_returns_to_destination`. Drop them once P2 1 lands; keep `test_callback_encodes_the_destination_for_url_for`, which uses real `url_for`.

### P2 3: Password-login redirect check could be an integration test

`test_login.py::test_login_redirect` patches `url_for` to fake a prefix and loops 12 cases in one test. At minimum `pytest.mark.parametrize` it; better, cover the allowlisted-host and same-origin/logout cases with an integration test posting to `/user/login` under `allowed_login_redirect_hosts` (and a prefix), leaving only the pure `_is_absolute_url_to` edge cases as unit tests.

### P3 1: Share server/client redirect test vectors

The PR claims client `safeLoginRedirect` mirrors `is_safe_login_redirect`, but the two case lists are hand-copied and already differ (IPv6, `:notaport`, `https:///` only server; full-width/percent dots only client). A shared JSON vector file read by both pytest and vitest would make parity enforceable. Also use `it.each` instead of `for` loops in `redirect.test.ts`.

### P3 2: Dedup the `url_builder` fake

Identical `url_builder` closures in `test_deferred_user_creation.py` and `test_oidc_backends.py` (the latter via `SimpleNamespace`). Hoist one helper/dataclass into a shared authnz test module.

### P3 3: Make host-list parsing a public util

`test_allowed_login_redirect_hosts.py` calls private `GalaxyAppConfiguration._parse_allowed_login_redirect_hosts`. Moving it beside `normalize_https_authority` in `galaxy.util` keeps parse/match normalization in one place and tests a public function.

### P3 4: `LoginForm.test.ts` leaks `window.location.href` on failure

Restore in `afterEach` or `try/finally` rather than after the assertion.
