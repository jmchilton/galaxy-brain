# Normal review 1 (all commits, origin/release_25.1..bea0e9733de)

Run via Claude Opus 5.5 (claude-opus-5-5).

Acted on three items and added one test. The requests-host comparison now asks requests itself (`PreparedRequest.prepare_url`) which host it would connect to, and compares that with the host as `getaddrinfo` looks it up (IDNA 2003, case-folded). Two more host forms now fail to verify: percent-escaped hosts and labels that IDNA 2003 and 2008 encode differently (`straße`). The direct `idna`/`urllib3` imports and `_comparable_host` are gone. Remote ZIP now opens one `ValidatingSession` in `_realize_to` and passes it down, so the streamed range response is read while its session is still open. The `fake_public_dns` move is reverted: the workflows conftest imports it from `..files.conftest`, which removes two forward-merge conflicts on 26.0 and 26.1. Added a test pinning that configured TRS servers follow redirects without URL checks. A private note was appended.

New head `5ec20de1c2f`. Fixups were autosquashed, with commit messages updated for the three commits that changed (`amend!`). Baseline commits are still first. ruff, black, isort, mypy and `test/unit/files/ test/unit/workflows/test_trs_proxy.py` pass at every commit (139 tests pass at the first commit, 164 at the last, 17 skipped).

Not acted on:
- **Unusual hosts that no longer verify:** fullwidth or emoji IDN labels, port > 65535, and a space inside the host. requests refuses or rewrites all of these, so failing to verify is the consistent choice. Unbracketed IPv6 (`http://2001:db8::1/`) now raises `RequestParameterInvalidException` instead of `ConfigDoesNotAllowException`, and both refuse it. Bracketed IPv6 was already unverifiable on base.
- **Handling of schemes other than http(s):** out of scope. Noted separately.
- **http file source:** the initial URL is still only checked after `opener.open` returns. This is pre-existing, and every caller validates first. The final-URL check is kept: it's harmless and keeps the 26.x merge simple.
- **`get_range` has no timeout:** pre-existing, and outside this branch's goal.
- **`ValidatingSession` lives in `galaxy.files.uris`:** `galaxy.util.requests` can't depend on `galaxy.files`. On 26.1 it may be worth consolidating with `bounded_get` (citation_fetch_hardening_26.1), which injects a validator per hop.
- **Remaining forward-merge conflicts:**
  - These are inherent, and each is a short adjacent edit: `uris.py` (26.x `strip()` and empty-netloc check next to the scheme and `urlparse` lines), `http.py` (26.0 wraps `urlopen` in a try), and import or appended-test hunks in `test_remotezip.py` and `test_uris.py`.
  - 26.1 also conflicts in `trs_proxy.py`, `test_drs.py` and `test_trs_proxy.py`.
  - The 25.1 whitespace baseline test expects trailing whitespace to be kept. 26.x strips it, so take 26.x's expectation when merging.

<details>
<summary>Full review</summary>

# Normal review 1 (raw)

Verdict: well scoped and split cleanly (baseline tests first, one concern per commit). There was one real design gap: the host comparison modeled urllib3's parser rather than the prepared URL requests sends. The remote ZIP session lifetime worked only because of an implementation detail. The fixture move added forward-merge churn. Everything else is nits.

## `_comparable_host` / `_host_matches_requests` (d0087dd57b8, was 8cf1441c1dc)

I compared base and branch over about 30 URL forms with a fake resolver (scratch script). Results:

- **Unchanged, still pass:** ports (including `:080`), userinfo (including `@` in the password and `%40` in the user), uppercase host and scheme, trailing dot, `bücher`/`BÜCHER`/`xn--`, underscores, `?x=@…`, `#@…`, spaces in the path, numeric IPv4 forms.
- **Unchanged, still unverifiable:** bracketed IPv6 (with or without a port), `host:` with an empty port.
- **Model requests directly:** `prepare_url` does more than `parse_url` (it requotes the URL), and `getaddrinfo(str)` encodes with Python's IDNA 2003 codec while requests and httpx use IDNA 2008. The comparison is now `PreparedRequest().prepare_url(url.strip(), None)`, then `urlparse(prepared.url).hostname`, which is the host requests 2.32 keys its connection pool on. That is compared with `host.encode("idna").decode().lower()`, which is what `getaddrinfo` looks up.
- **New refusals:** percent-escaped hosts and labels that IDNA 2003 and 2008 encode differently (`straße`) now fail to verify, because the two clients read them as different names. `straße` moved from the passing list to the unverifiable list.
  - No bracket or whitespace handling is needed: bracketed IPv6 fails at `getaddrinfo` either way.
  - `UnicodeError` from the codec is a `ValueError`, so `a..b` now gives `RequestParameterInvalidException` instead of an uncaught `UnicodeError`. 26.x fixes that case separately.
  - Red-to-green: the `straße` and `ex%61mple.org` cases failed against the old helper and pass now.
- **Why `url.strip()`:** `prepare_url` only left-strips. Without the strip, `http://example.org\r\n` (a baseline test) would no longer verify.
- **Comment fix:** the comment "httpx and urllib read hosts like urlparse" was wrong about httpx, which uses IDNA 2008. It is now "urllib reads hosts like urlparse". httpx is covered because the check requires the IDNA 2003 and 2008 encodings to agree.

## Remote ZIP (5ec20de1c2f, was bea0e9733de)

- **Session lifetime:** `get_range` returned a `stream=True` response from a session it had already closed. With urllib3 2.5 that works only because `PoolManager.clear()` closes idle pooled connections, not the checked-out one the response holds. Also, three sessions were made per extraction.
- **Fix:** `_realize_to` opens one `ValidatingSession(allowlist)` and passes it to `stream_and_decompress` → `get_final_url`, `calculate_file_data_offset` and `get_range`. This is also a smaller diff against base: `import requests` stays, and the `IpAllowedListEntryT` import is dropped.
- **Merge cost:** `remotezip.py` is identical on 26.0 and 26.1, so the restructure adds no conflicts.
- **Tests:** existing offline tests cover HEAD redirects, GET redirects and the public-redirect success path.

## `fake_public_dns` move (c19b8eb7b6f, was 14717be8b73)

- **Churn:** moving the fixture into `galaxy.util.unittest_utils` put a test fixture in a shipped module. It also conflicted on 26.0 and 26.1: both append to the end of that file, and both rewrote the imports in `test/unit/files/conftest.py`.
- **Fix:** `test/unit/` is a package tree, so `test/unit/workflows/conftest.py` can import it with `from ..files.conftest import fake_public_dns`. There is a precedent: `test_ftp.py` imports from `.conftest`.
- **Packaging:** `packages/files/tests/files` links to `test/unit/files`, and `workflows` isn't packaged, so package test runs are unaffected.
- **Checked:** the workflows suite on its own, files + TRS together, and `packages/files` `test_uris.py`.

## TRS (c19b8eb7b6f)

- **The `None`/list split is clear:** only `get_server` (configured, `None`) and `server_from_url` (user URL, list) construct `TrsServer`. The docstring is one line.
- **`get_default_headers()`:** the validating path passes it explicitly, matching `galaxy.util.requests.get`. Good.
- **Gap and fix:** nothing pinned that configured servers stay unchecked. Added `test_configured_server_follows_redirect_unchecked`: a dockstore redirect to 127.0.0.1 is followed, with no fake DNS. It goes red if configured servers start validating, which I checked by mutation.
- **`_mock_get`:** patching `requests.Session.request` covers both paths. Fine.

## http file source (e0f4f2ebcc1)

- **Handler and test:** `ValidatingRedirectHandler.redirect_request` is minimal. The offline test patches `https_open`/`http_open` and asserts that the redirect target is never requested. Good.
- **`patch_http_open`:** the helper keeps the existing tests' fake-response shape. Fine.
- **26.1:** the urllib code is still there, so the commit carries forward.

## Scheme commit (8324dc41a38)

Small and correct. Tests cover `HTTP://` and `HtTpS://` private addresses, `FILE://` with admin and non-admin, and TRS `FILE://`.

## Nits checked, no action

- Imports are all at module top. Docstrings are one line, except the restored `fake_public_dns` docstring, which is untouched base code.
- `ValidatingSession.send` uses `request.url or ""`, which only satisfies typing. A non-http URL there fails in requests anyway.
- `test_validating_session_refuses_redirect_to_private_address` uses a regex target so the `call_count == 0` assertion covers all three locations. Fine.

</details>
