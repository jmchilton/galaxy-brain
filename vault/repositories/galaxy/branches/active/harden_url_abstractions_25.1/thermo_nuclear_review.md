Run via Claude Opus 5.5.

# Thermo-nuclear code quality review (round 2, after re-scope)

Reviewed `83296278444...10160ed812c` fresh. The previous round is in [earlier_drafts/1/thermo_nuclear_review.md](earlier_drafts/1/thermo_nuclear_review.md).

**Acted on one finding.** `ValidatingSession.send` used `validate_non_local(request.url or "", ...)`. An empty string is returned unchanged, so the fallback quietly papered over a "prepared requests always have a URL" invariant instead of stating it. It is now `assert request.url` followed by a direct call. This was folded into "Check redirect hops of TRS servers built from user URLs" as a fixup. Pure refactor, no red step.

New head is `30aa9f1eb5a`, still 15 commits with the 4 "Baseline tests" commits first. At every commit (`git rebase -x`), ruff, black, isort and mypy pass on the changed `.py` files, and so do `test/unit/files/` and `test/unit/workflows/test_trs_proxy.py`: 142 passed at the first commit, 177 passed at the head, 17 skipped throughout. `git merge-tree` against `origin/release_26.0` and `origin/release_26.1` gives the same conflicting files before and after (4 and 7).

Not acted on:
- **The final `page.geturl()` check in `http.py` stays.** Round 2's test challenge called it unreachable, but that only holds for the default `url_regex`. `url_regex` is admin-configurable, and with other settings, deleting the check would not be a pure refactor. A single up-front check on `req.full_url` would make it redundant. That is a behavior change, and on 26.1 it interacts with `_requote_http_url`, so it's left for later. Merge cost is not the reason, because the branch already rewrites that line.
- **The redirect handler's scheme refusal never fires for its only production caller.** `HTTPRedirectHandler.http_error_302` already refuses anything outside http, https and ftp before `redirect_request` runs, and the http source passes exactly that set. The refusal only matters for the default `HTTP_SCHEMES`, which is the shape a future dataverse or invenio caller would use. An alternative was considered: drop the handler's `schemes` parameter and the refusal, have the handler always validate the schemes urllib follows, and have `http.py` reuse that constant instead of `FETCH_SCHEMES`. That deletes a parameter, a branch and the caller-side sync. Kept as is, because both shapes are sound and the swap is churn on a release branch.
- **`validate_non_local` still has two URL readers** (the hand-rolled netloc parser, plus `_host_matches_requests` for http(s)). The line-160 condition mixes the percent-escape check and the scheme-gated requests check into one `if`. Carried forward from round 1 as a dev-only cleanup: let the prepared URL's `hostname`/`port` replace the hand-rolled parser. That changes bracketed IPv6 behavior and conflicts with 26.x edits in that function.
- **Remote ZIP checks the source twice**, once in `validate_uri_access` and again on the session's first send. `validate_uri_access` is base code and also does the `file://` admin check, so it stays. The cost is one extra DNS lookup.
- **Test nits.** `_realize_with_redirect(..., None, ...)` is also used for initial-URL refusals, where no redirect happens, so the name is off. `test/unit/workflows/conftest.py` re-exports `fake_public_dns` from `test/unit/files/conftest.py`, and there is no `test/unit/conftest.py` to hoist it into. Renaming would churn several commits through autosquash, so both are left.
- **Other urllib or requests file sources** (dataverse `urlopen`, invenio `urlopen`, elabftw's own session) are out of scope and noted only. With `ValidatingRedirectHandler` and `ValidatingSession` both in `galaxy.files.uris`, they are the natural adapters for those sources.

Resolved since round 1: `ValidatingRedirectHandler` now lives in `uris.py` next to `ValidatingSession`, and `TrsServer` takes a session factory instead of a nullable allowlist mode.

<details>
<summary>Full review</summary>

## Verdict

The branch is small and split one concern per commit. The four files under `lib/` are 94 to 229 lines, so the 1k-line rule doesn't come into play. No structural regressions. The re-scope's additions (an opt-in `schemes` tuple, the handler moving to `uris.py`, timeouts on remote ZIP requests) use the existing abstractions rather than adding parallel ones. The one silent fallback is fixed. The larger simplification, a single URL reader in `validate_non_local`, is out of reach on a release branch.

## Findings

1. **`request.url or ""` in `ValidatingSession.send`** (type and boundary). The empty-string fallback hides an invariant behind the "not a URL, return unchanged" path. **Fixed** with `assert request.url`.
2. **Final `geturl()` check** (possible dead code). It was investigated as a candidate for deletion. It is only unreachable under the default `url_regex`. **Kept.** The cleaner up-front boundary (`req.full_url`) is noted for later.
3. **Handler `schemes` plus refusal** (a parameter whose non-default path is the only one used). This is the code-judo candidate: one urllib-derived scheme set inside the handler would delete the parameter, the refusal and `FETCH_SCHEMES`. **Noted.** The current shape is explicit and correct.
4. **Two URL readers in `validate_non_local`**, with a compound condition. **Noted for dev.**
5. **`schemes` on `validate_non_local`** is a typed tuple with a default that keeps every other caller unchanged. It is a reasonable parameter, not a mode flag. No action.
6. **Remote ZIP session threading.** Passing one session explicitly through the helpers is boring and correct. No action.
7. **`TrsServer` session factory.** It is a single path, and the trust decision sits with `TrsProxy`. No action.

## Considered and rejected

- Validating in urllib's `http_request`/`https_request`/`ftp_request` preprocessors, so one handler covers the initial URL and every hop. It relies on the handler-method naming protocol, which is more indirect than the explicit call.
- Moving `fake_public_dns` to a new `test/unit/conftest.py`. That adds a file to every suite for one consumer.

</details>
