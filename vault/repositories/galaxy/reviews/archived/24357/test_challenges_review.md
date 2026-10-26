# Test challenges review — PR #24357 @ 81bcc6ea (low effort)

Coverage is reasonable for a release-branch fix: an API test drives the real `dataset/set_edit` path and confirms both storage as int and the column data provider skipping comment lines; unit tests cover `IntParameter` marshal/wrap including legacy string values. Tests not run locally (low effort).

### P3 1: Hand-rolled browser-session login in API test duplicates OIDC test helper

`test_set_edit_stores_comment_lines_as_int` inlines CSRF scraping + `user/login` POST (regex, `requests.Session`). `test/integration/oidc/test_auth_oidc.py` already has the same pattern (`REGEX_GALAXY_CSRF_TOKEN`, `_csrf_token`). Extract a small `galaxy_test.base` helper (e.g. on `ApiTestCase`/populator: `browser_session_for(email)`) and reuse in both, so future legacy-controller API tests don't copy this again. Optional on a release branch; could be a dev follow-up.

### P3 2: Unit tests partly restate implementation; idempotence check is the useful bit

`test_tabular_comment_lines_unwrap_stores_int` cases `(3,3)`, `(None,None)` are trivial passthroughs. The meaningful assertions are string→int, blank→None, invalid→raises, and wrap of legacy `"abc"` passthrough. Fine to keep but could be trimmed; no new tests needed. Missing case worth one line: negative/float strings (`"-1"`, `"2.5"`) — `"2.5"` raises, `"-1"` is accepted as -1; confirm intended.

No missing E2E/Selenium coverage recommended: the edit-attributes UI just submits the form value the API test already sends.
