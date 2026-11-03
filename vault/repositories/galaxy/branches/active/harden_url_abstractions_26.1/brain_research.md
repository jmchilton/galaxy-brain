```yaml
documents:
  - path: vault/repositories/galaxy/branches/active/harden_url_abstractions_25.1/brain_research.md
    why: Base research for this port; its document list and code observations still apply, and the notes below record only what differs on release_26.1.
  - path: vault/repositories/galaxy/branches/active/harden_url_abstractions_25.1/initial_implementation_debrief.md
    why: Commit-by-commit description and decisions (per-client adapters, ValidatingSession, configured TRS servers unchanged) to replay on 26.1. Its commit list stops at 7 commits; the branch head has 13.
    load_when: Planning the port order and the baseline-tests commit.
  - path: vault/repositories/galaxy/branches/active/harden_url_abstractions_25.1/baseline_refactor.md
    why: Lists the 13-commit history (baselines, test patch helper, TrsServer session factory, shared ZIP session, then fixes) and what each refactor commit does.
    load_when: Choosing commit order on 26.1.
  - path: vault/repositories/galaxy/branches/active/harden_url_abstractions_26.0/brain_research.md
    why: Sibling port note for release_26.0; uris.py, remotezip, test_uris, test_remotezip and the whitespace-return-value differences are the same on 26.1 and are not repeated below.
    load_when: Resolving uris.py, test_uris.py and test_remotezip.py conflicts.
  - path: vault/repositories/galaxy/branches/active/harden_url_abstractions_25.1/test_challenges_debrief.md
    why: Which 25.1 tests were judged necessary; tells you which to carry over when resolving test conflicts.
    load_when: Resolving test conflicts.
  - path: vault/projects/url_abstraction_hardening/index.md
    why: Project plan - per-release branches and the rule that a branch that doesn't merge forward cleanly gets its own port.
  - path: vault/research/Component - Tool Citations and External Metadata Fetch.md
    why: Section 7 describes validate_non_local / validate_uri_access plumbing and call sites; anchored on dev.
    load_when: Re-checking callers of validate_non_local.
  - path: vault/repositories/galaxy/branches/active/citation_fetch_hardening_26.1/initial_implementation_debrief.md
    why: bounded_get design (per-hop validator injection); bounded_get is not on release_26.1, so it is background only.
    load_when: Comparing with the per-client adapters used here.
  - path: vault/research/Component - DRS Support.md
    why: DRS-driven downloads re-enter the http file source, so test_drs.py needs the same opener-patch and DNS-fixture changes.
    load_when: Updating test_drs.py.
  - path: vault/research/Component - Workflow Import.md
    why: TrsProxy role in import-by-TRS-URL and subworkflow resolution.
    load_when: Reviewing the TrsProxy/TrsServer change.
  - path: vault/research/Component - Data Fetch.md
    why: Fetch API URL validation upstream of the http file source.
    load_when: Confirming parser changes keep fetch validation behavior.
  - path: vault/repositories/galaxy/branches/merged/fix_format_source_docs/polish_debrief.md
    why: test_trs_proxy.py network-bound tests can be red in CI independent of a branch.
    load_when: Interpreting CI for TRS tests.
research_requests: []
```

## Differences on release_26.1 (verified at `6da0d325952`; 25.1 branch head `178587b7e40`, base `9eb3271d60a`)

Compared with `git diff origin/release_25.1 origin/release_26.1 -- <paths>` and `origin/release_26.0..origin/release_26.1`. `remotezip.py` is identical on 25.1, 26.0 and 26.1.

- **`files/uris.py`:** same as the 26.0 note (`strip()` for the scheme check and the parsed/returned URL, empty-netloc check, `UnicodeError` caught around `getaddrinfo`). The only extra 26.1 difference is `stream_url_to_file(..., metadata_out=...)`, which doesn't touch the checks. `validate_uri_access` still uses `lstrip().startswith("file://")`. `urlparse(url).netloc` is still unguarded against `ValueError`, so the 25.1 guard still applies. In `_host_matches_requests` the `url.strip()` is redundant on 26.1 (`url` is already stripped).
- **Return value:** 26.1 `validate_non_local` returns the stripped URL, so the 25.1 `test_validate_non_local_whitespace` expectations that keep trailing whitespace (`"http://example.org/a "`, `"...\r\n"`) become the stripped form. `upload_common.py` uses the return value.
- **`files/sources/http.py` differs from 26.0.** 26.1 no longer has the `try/except` for "control characters". It has `_DISALLOWED_URL_CHARACTERS` and `_requote_http_url`: for http(s) URLs it raises `ValueError("URL contains unencoded characters ...")` if the part before `#` contains `[\x00-\x20\x7f]`, otherwise percent-encodes everything after the authority (`request_url`). Then `page = urllib.request.urlopen(req, ...)`, `with page:`, and the post-redirect `validate_non_local(page.geturl(), ...)`.
  - The port swaps `urlopen` for `opener.open` with `ValidatingRedirectHandler`, as on 25.1.
  - `request_url` and `source_path` share scheme and authority, so either can go to the initial `validate_non_local`; passing `request_url` checks what urllib receives.
  - The disallowed-character `ValueError` fires before any validation if the initial check goes after it; keep that order or the tests need to pin it. `ftp://` URLs skip the requote branch and `validate_non_local` passes them through.
  - New 26.1 `test_http.py` tests (`_realize_capturing_request_url`, the percent-encode and fragment tests, the spaces-in-URL error test) mock `urllib.request.urlopen` or use real DNS. They need `patch_http_open` / `fake_public_dns` once the initial URL is validated. `test_file_source_http_with_spaces_in_url_error` uses `example.com` and has no DNS fixture.
- **`test_drs.py`:** 26.1 patches `urllib.request.urlopen` at three sites (lines near 158, 204, 367; 25.1 has one). Each needs `patch_http_open` and `fake_public_dns` after the initial-URL check. `test_drs_compact_identifiers.py` and other new test files are unrelated to the port.
- **`workflow/trs_proxy.py`:** 26.1 `_get` wraps `requests.get` in `try/except` (`Timeout` -> `GatewayTimeoutException`, `ConnectionError` -> `UpstreamProxyError`) and, for non-OK responses, reports `TRS server <url> responded with HTTP <code>.` unless the body is a TRS error document. `galaxy.util.unittest_utils.skip_if_workflowhub_down` matches these exact messages ("responded with HTTP (403|429|5xx)", "did not respond in time", "could not be reached"), so the session-based `_get` must keep them. `requests` is still imported from `galaxy.util` and is needed for `requests.exceptions`; the 25.1 change dropped that import, so keep it. `ValidatingSession.send` raises Galaxy exceptions, which pass through the `requests.exceptions` handlers.
- **`galaxy.util.requests` changed on 26.1** to a real `Session` class (sets default headers on the instance) plus `RetrySession`; `get`/`post`/... open a short-lived `Session()`. The 25.1 `TrsServer` passes `get_default_headers()` explicitly and subclasses bare `requests.Session`; on 26.1 `ValidatingSession` could subclass `galaxy.util.requests.Session` instead, though `remotezip.py` uses plain `requests` today (default headers would be new there). `galaxy.util.requests` imports only `.user_agent`, so importing it from `galaxy.files.uris` doesn't loop.
- **`test_trs_proxy.py`:** 26.1 adds tests (`test_non_trs_error_page_reports_status_without_body`, `test_trs_error_document_is_passed_through`, `test_timeout_is_gateway_timeout`) and changes the parametrized skip cases (`ConnectTimeout("connect timed out")`, `ConnectionError("connection refused")`). `_mock_get` patches `galaxy.util.requests.get`; once `TrsServer._get` uses a session it must patch `requests.Session.request` as on 25.1 (the homepage check in `skip_if_workflowhub_down` goes through the same patch). The 25.1 mock signature is `request(method, url, **kwargs)`.
- **`test/unit/files/` conftest and `_util.py`:** `conftest.py` adds `mock_http_server` and `non_utc_local_time`; `fake_public_dns` is unchanged. `_util.py` adds `TEST_OIDC_ACCESS_TOKENS` and an `onedrive` context key; the 25.1 `patch_http_open` addition lands in the same file with a small context shift. `test/unit/workflows/conftest.py` doesn't exist on 26.1 (the 25.1 branch creates it).
- **`test_remotezip.py`:** 26.1 `test_file_source` is offline (`mock_http_server`, `LOCALHOST_ALLOWLIST` 127.0.0.0/24), so it will run through `ValidatingSession` with the allowlist; confirm the mock server answers HEAD and range requests. The 25.1 baseline commit for remote ZIP (which adds `responses`-based tests next to a network-bound `test_file_source`) needs rewriting around the new fixture.
- **`webapps/galaxy/api/proxy.py`:** much reworked on 26.1 (anyio worker-thread offload of `_validate_url_and_access`, stream size/time limits, streaming `client.send`) but the per-hop loop and `validate_uri_access(url, ...)` call (line ~201) behave as on 25.1. The 25.1 branch doesn't touch the file. It only inherits the `uris.py` change; `lib/galaxy_test/api/test_proxy.py` is the existing API coverage.
- **`galaxy.util.requests`/other callers:** `bounded_get` is not on release_26.1.
- **New callers of the shared checks on 26.1 (vs 25.1):**
  - `managers/workflows.py` `__build_subworkflow_from_url` (line ~2218): `validate_uri_access(url, trans.user_is_admin, ...)`, then `stream_url_to_str(url, file_sources=...)`, which goes through the http file source. It inherits the `uris.py` and http source changes; no change of its own is needed. `content_source == "url"` passes the string straight in, while the fallback `_is_url` prefix test (`startswith(("http://", "https://", "base64://"))`) is case-sensitive and stays so.
  - `__build_subworkflow_from_trs_url` uses `trs_proxy.get_trs_id_and_version_from_trs_url` / `get_version_from_trs_url`, i.e. `match_url` + `server_from_url`, so it picks up `ValidatingSession`. `self.trs_proxy._match_url` in the fallback only runs the regex.
  - `services/wes.py` has a comment that `validate_non_local` is applied via `HTTPFilesSource`; WES URL fetch goes through the http source, so it gains the initial and per-hop checks with no edit.
- **Merge shape:** expect conflicts in `uris.py`, `http.py`, `trs_proxy.py`, `test_uris.py`, `test_http.py`, `test_drs.py`, `test_remotezip.py`, `test_trs_proxy.py` and `_util.py`; the other files from the older merge base are unrelated to the change.
