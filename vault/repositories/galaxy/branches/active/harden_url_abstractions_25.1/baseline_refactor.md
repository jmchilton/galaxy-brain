Run via Claude Opus 5.5.

# harden_url_abstractions_25.1: refactor baseline (round 2, after re-scope)

I added one refactor commit, "Let validate_non_local take the URL schemes it checks". It sits after the three round-1 refactors, so the ftp fix no longer has to add the `schemes` parameter to `validate_non_local`. The round-1 refactors are still pure and stay as they were.

Head moved from `30aa9f1eb5a` to `3355e25a9b2` (not pushed). The base is still `83296278444`. `git diff 30aa9f1eb5a 3355e25a9b2` is empty, so the final tree hasn't changed. There are now 16 commits, and the 4 "Baseline tests" commits are still first and pass on base. Round 1's report is [earlier_drafts/1/baseline_refactor.md](earlier_drafts/1/baseline_refactor.md).

## New history

1. Baseline tests for validate_non_local
2. Baseline tests for remote ZIP file source
3. Baseline tests for http file source redirects and ftp URLs
4. Baseline tests for TRS servers built from user URLs
5. Patch urllib OpenerDirector.open in http file source tests (refactor, round 1)
6. Let TrsServer take a requests session factory (refactor, round 1)
7. Use one requests session for remote ZIP file source requests (refactor, round 1)
8. **Let validate_non_local take the URL schemes it checks** (new, refactor)
9. Compare URL schemes case-insensitively in URI checks
10. Make validate_non_local read hosts the way requests and urllib do
11. Validate each redirect hop in http file source
12. Check redirect hops of TRS servers built from user URLs
13. Check redirect hops in remote ZIP file source
14. Set socket timeout on remote ZIP file source requests
15. Check initial URL in http file source
16. Check ftp URLs in http file source (shrunk, message reworded)

## New refactor commit (8)

Commit 8 adds three things:
- an `HTTP_SCHEMES = ("http", "https")` constant;
- a `schemes: tuple[str, ...] = HTTP_SCHEMES` parameter on `validate_non_local`, plus a one-line docstring;
- a scheme gate, `scheme, sep, _ = uri.lstrip().partition("://")` followed by `if not sep or scheme not in schemes`.

With the default schemes, the gate checks exactly the strings the base `startswith("http://")` / `startswith("https://")` test checked, and returns everything else unchanged. That covers a bare `http`, ` HTTPS`, `ftp://`, `file://`, plain text and the empty string, which the baseline cases pin, and the pass count doesn't change from commit 7 to commit 8. No caller passes a third positional argument, and no caller passes `schemes` until commit 16.

Lowercasing the scheme changes behavior, so it stays in commit 9, which now adds only `scheme = scheme.lower()` on that gate.

After the change, commit 16 contains only:
- `FETCH_SCHEMES` and the http source passing it;
- the `scheme in HTTP_SCHEMES` guard on the requests host comparison;
- `ValidatingRedirectHandler`'s `schemes` parameter and its refusal;
- the ftp tests.

Its message no longer claims to add the tuple to `validate_non_local`.

## Not extracted

- **The `allowlist` locals in `http.py` and `remotezip.py`.** Each local is only worth having because the fix commit uses it a second time. On its own it is a single-use local, not a meaningful refactor.
- **The `_realize_with_redirect` test helper and the `fake_public_dns` marks** added in commits 15 and 16. They shape tests inside the fix series, and no base test would use them.
- **The timeout commit (14) and the initial-URL check (15).** Both change behavior.
- **Round-1 exclusions still hold.** The per-request `build_opener()` ignores a globally installed urllib opener, so it is not pure. Scheme lowercasing, `_host_matches_requests`, the `urlparse` `ValueError` → `RequestParameterInvalidException` change, and the redirect-hop checks all change behavior. The thermo-review "noted for dev" items, such as a single netloc parser in `validate_non_local`, remain out of scope.

## Forward-merge impact

The net diff hasn't changed. `git merge-tree` against `origin/release_26.0` and `origin/release_26.1` lists the same conflicting files for the old and new heads. Counting only files the branch touches, that is 4 for 26.0 and 7 for 26.1.

## Validation

`git rebase -x` ran ruff, black, isort and mypy on the changed `.py` files at every commit, plus `test/unit/files/` and `test/unit/workflows/test_trs_proxy.py`. All of it passed. Pass counts by commit:

- Commits 1–4 (Baselines): 142, 143, 146, 151.
- Commits 5–8 (refactors): 151 each.
- Commits 9–16 (fixes): 156, 164, 165, 166, 168, 169, 170, 177.

Every step also had 17 skipped, and 177 at the head matches the old head. I also ran commit 16's tests against the lib files of its new parent, commit 15. That gave 7 failures: the ftp redirect, initial ftp URL and handler-refusal tests. So commit 16 still has its red step.

The same check for commit 9 (its tests against commit 8's lib files) gave 5 failures: the mixed-case `HTTP://`, `HtTpS://`, `FILE://` and ` File://` cases.
