Run via Claude Opus 5.5.

# harden_url_abstractions_25.1: refactor baseline

Three refactor commits now sit between the Baseline tests and the fixes: a urllib opener patch helper for the tests, an injectable session factory for `TrsServer`, and one shared `requests` session in the remote ZIP source. Each redirect-hop fix commit now carries only its validating piece (the redirect handler, `ValidatingSession`, or the session swap) plus its tests.

Head moved from `9e32bd469a7` to `178587b7e40` (not pushed). The final tree is identical apart from one test comment. Baseline tests are still first and pass on base.

## New history

1. Baseline tests for validate_non_local
2. Baseline tests for remote ZIP file source
3. Baseline tests for http file source redirects
4. Baseline tests for TRS servers built from user URLs
5. **Patch urllib OpenerDirector.open in http file source tests** (new, refactor)
6. **Let TrsServer take a requests session factory** (new, refactor)
7. **Use one requests session for remote ZIP file source requests** (new, refactor)
8. Compare URL schemes case-insensitively in URI checks
9. Make validate_non_local read hosts the way requests does
10. Validate each redirect hop in http file source (shrunk)
11. Check redirect hops of TRS servers built from user URLs (shrunk)
12. Check redirect hops in remote ZIP file source (shrunk)
13. Check initial URL and redirect schemes in http file source

## Refactor commits

- **Test patch helper (5):** `patch_http_open` in `test/unit/files/_util.py` patches `urllib.request.OpenerDirector.open`. Base `urlopen` also goes through that method, so the existing http and DRS tests switch to the helper and pass unchanged on base code. This moves all the mock churn out of commit 10, which keeps only the redirect handler, the per-request opener and the new redirect test.
- **TRS session factory (6):** `TrsServer(trs_url, session_factory=RequestsSession)`. `_get` opens a session from the factory and passes `get_default_headers()` explicitly, which is what `galaxy.util.requests.get` did, so there is no behavior change. The workflowhub skip tests' `_mock_get` now patches `requests.Session.request`. Commit 11 keeps only `ValidatingSession`, `server_from_url`'s `partial(ValidatingSession, allowlist)`, and the refusal test.
- **Remote ZIP session (7):** `get_final_url`, `get_range`, `calculate_file_data_offset` and `stream_and_decompress` take a session. `_realize_to` opens `with requests.Session()`. One small difference from base: the HEAD and range GETs now share one connection pool and cookie jar. Before, the HEAD used its own unclosed session and each GET used `requests.get`. The commit message says so. Commit 12 keeps only the allowlist local, `requests.Session()` → `ValidatingSession(allowlist)`, and its two tests.

## Final tree change

The `_mock_get` comment now reads "shared by requests.get and the session TrsServer opens". The old comment said "the session TrsServer uses for user URLs", which was wrong once every server opens a session.

## Not extracted

- **`build_opener()` / `opener.open` in http.py:** a per-request opener ignores a globally installed urllib opener, so this isn't a pure refactor. It stays in commit 10.
- **Scheme lowercasing, `_host_matches_requests`, the `urlparse` `ValueError` → `RequestParameterInvalidException` change, and the initial-URL and redirect-scheme checks:** all change behavior, so they stay as fixes.
- **The thermo-review "noted for dev" items** (a single netloc parser, moving the redirect handler next to `ValidatingSession`): out of scope.

The extra commits don't change the net diff, so the forward-merge conflicts for 26.0 and 26.1 are the same as before. Commit 10 no longer matches the never-opened `http_redirect_validation_25.1` cherry-pick. That branch is already folded in, so this doesn't matter.

## Validation

`git rebase -x` ran ruff, black, isort, mypy (changed lib files) and `test/unit/files/ test/unit/workflows/test_trs_proxy.py` at every commit, and all passed. Pass counts by commit:

- Commits 1–4 (Baselines): 140, 141, 142, 146.
- Commits 5–7 (refactors): 146 each.
- Commits 8–13 (fixes): 151, 157, 158, 159, 161, 163.

Each step also had 17 skipped. The final count matches the old head. In a temp worktree, the new tests in commits 10, 11 and 12 fail against their refactor parents (1, 1 and 2 failures), so each fix commit still has its red step.
