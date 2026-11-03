```yaml
documents:
  - path: vault/repositories/galaxy/branches/active/harden_url_abstractions_25.1/brain_research.md
    why: Base research for this port; the document list and code observations there still apply, and the notes below record only what differs on release_26.0.
  - path: vault/repositories/galaxy/branches/active/harden_url_abstractions_25.1/initial_implementation_debrief.md
    why: Commit-by-commit description and decisions (per-client adapters, ValidatingSession, configured TRS servers unchanged) to replay on 26.0.
    load_when: Planning the port order and the baseline-tests commit.
  - path: vault/repositories/galaxy/branches/active/harden_url_abstractions_25.1/test_challenges_debrief.md
    why: Which 25.1 tests were judged necessary; tells you which to carry over when resolving test conflicts.
    load_when: Resolving test_uris.py, test_http.py and test_remotezip.py conflicts.
  - path: vault/projects/url_abstraction_hardening/index.md
    why: Project plan - per-release branches and the rule that a branch that doesn't merge forward cleanly gets its own port.
  - path: vault/research/Component - Tool Citations and External Metadata Fetch.md
    why: Section 7 describes validate_non_local / validate_uri_access plumbing and call sites; anchored on dev.
    load_when: Re-checking callers of validate_non_local.
  - path: vault/repositories/galaxy/branches/active/citation_fetch_hardening_26.1/initial_implementation_debrief.md
    why: bounded_get design (per-hop validator injection); bounded_get is not on release_26.0, so it is background only.
    load_when: Comparing with the per-client adapters used here.
  - path: vault/research/Component - DRS Support.md
    why: DRS-driven downloads re-enter the http file source, so test_drs.py needs the same urlopen-patch and DNS-fixture changes.
    load_when: Updating test_drs.py.
  - path: vault/research/Component - Workflow Import.md
    why: TrsProxy role in import-by-TRS-URL.
    load_when: Reviewing the TrsProxy/TrsServer change.
  - path: vault/research/Component - Data Fetch.md
    why: Fetch API URL validation upstream of the http file source.
    load_when: Confirming parser changes keep fetch validation behavior.
  - path: vault/repositories/galaxy/branches/merged/fix_format_source_docs/polish_debrief.md
    why: test_trs_proxy.py network-bound tests can be red in CI independent of a branch.
    load_when: Interpreting CI for TRS tests.
research_requests: []
```

## Differences on release_26.0 (verified at `a13b42eaa5d`; 25.1 branch head `178587b7e40`, base `9eb3271d60a`)

Dry-run `git merge-tree` of the 25.1 branch onto 26.0 conflicts in `lib/galaxy/files/uris.py`, `lib/galaxy/files/sources/http.py`, `test/unit/files/test_uris.py` and `test/unit/files/test_remotezip.py` (plus unrelated client/API-test files from the older merge base; ignore those). `trs_proxy.py`, `remotezip.py`, `test_trs_proxy.py` and `test/unit/files/_util.py` are identical between release_25.1 and release_26.0, so those commits should apply as-is. `test_drs.py` and `test_http.py` auto-merge.

- **`files/uris.py`** already has, on 26.0: `uri.strip()` used for both the scheme check and the url that is parsed and returned (25.1 only `lstrip()`s); an empty-netloc check raising `RequestParameterInvalidException`; and `except (socket.gaierror, UnicodeError)` around `getaddrinfo`. Merge by keeping these and adding the 25.1 `.lower()` scheme compare, the `urlparse` `ValueError` guard, `_host_matches_requests`, and `ValidatingSession`. `_host_matches_requests` hits `host.encode("idna")`, whose `UnicodeError` is a `ValueError` and is already treated as "can't verify".
- **Return value differs:** on 26.0 `validate_non_local` returns the stripped URL on both ends. The 25.1 `test_validate_non_local_whitespace` expects trailing whitespace preserved (`"http://example.org/a "`, `"...\r\n"`); those expectations need to become the stripped form. `upload_common.py` uses the return value, so it now gets the trimmed string.
- **26.0 tests already in `test_uris.py`:** `test_validate_non_local_rejects_malformed_host` (`https://.../x`, `https://./foo`, `https://..example.com/x`, `https:///foo`, `http:// /foo`) and `test_validate_non_local_strips_surrounding_whitespace`. Keep alongside the 25.1 parametrized tests; check the overlap and that the malformed-host cases still raise `RequestParameterInvalidException` with `_host_matches_requests` in place. Imports in the file differ from 25.1 (`RequestParameterInvalidException` already imported).
- **`files/sources/http.py`:** 26.0 wraps `urllib.request.urlopen` in a `try/except` that turns a "control characters" error into a `ValueError` ("URL contains unencoded characters"), then `with page:`. The 25.1 change replaces `urlopen` with `opener.open` and pre-validates `source_path`; keep the `try/except` around `opener.open`, and keep the pre-validation before it so the `ValueError` message still comes from the open call.
- **New 26.0 test `test_file_source_http_with_spaces_in_url_error`** (`https://example.com/Markers File.csv`, unmocked) now passes through the new initial-URL `validate_non_local`, which resolves `example.com`; it needs `@pytest.mark.usefixtures("fake_public_dns")` or it depends on runner DNS.
- **`test_http.py` / `test_drs.py` on 26.0:** same `mock.patch.object(urllib.request, "urlopen", ...)` sites as 25.1 (six in `test_http.py`, one in `test_drs.py`), so the `patch_http_open` helper in `_util.py` and its use apply unchanged. `test_drs.py` on 26.0 has an extra `access/1234` mocked callback per test (DRS access flow) and a new `test_drs_compact_identifiers.py` that patches `requests.get`/`stream_url_to_file` rather than urllib; neither needs changes beyond `fake_public_dns` on `test_file_source_drs_http`. New `test_ascp.py` makes no http-file-source network calls.
- **`remotezip.py` / `test_remotezip.py`:** source file identical. 26.0's `test_file_source` no longer uses `skip_if_github_down`; it serves the zip from the `mock_http_server` fixture (127.0.0.1) with `LOCALHOST_ALLOWLIST` passed to `configured_file_sources`, so it will go through `ValidatingSession` with the allowlist (should pass; confirm HEAD and range requests on the mock server). Resolve the conflict by dropping the unused `skip_if_github_down` import, keeping `ipaddress`, `FileSourcePluginsConfig`, and adding the 25.1 `responses`-based tests and imports (`io`, `zipfile`, `responses`, `ConfigDoesNotAllowException`). `mock_http_server` (`lib/galaxy_test/base/mock_http_server.py`, `redirect_to_self` option) exists only on 26.0 and could back a redirect test, though the 25.1 `responses` tests are enough.
- **`webapps/galaxy/api/proxy.py`:** differs a lot from 25.1 (anyio worker-thread offload of `_validate_url_and_access`, stream size/time limits, `UpstreamProxyError`/`GatewayTimeoutException`) but the 25.1 branch doesn't touch it. The per-hop loop and the `validate_uri_access` call at line 203 are unchanged in behavior, so it only inherits the `uris.py` parsing change. `validate_uri_access` is called from a thread there, so extra work in `_host_matches_requests` is not on the event loop.
- **Callers of `validate_non_local` / `validate_uri_access` on 26.0:** same set as 25.1 (`_fetch_util.py`, `upload_common.py`, `api/workflows.py`, `services/histories.py`, `api/proxy.py`, `trs_proxy.py`, `http.py`, `remotezip.py`) with shifted line numbers. The only addition is a comment in `services/wes.py` saying `validate_non_local` is applied via `HTTPFilesSource`; WES URL fetch goes through the http file source, so it picks up the per-hop and initial-URL checks with no code change.
- **Other 26.0 differences:** `galaxy.util.user_agent.get_default_headers` exists (needed by the 25.1 `TrsServer._get`); `bounded_get` is not present; `test/unit/workflows/conftest.py` does not exist yet (25.1 adds it, importing `fake_public_dns` from `test/unit/files/conftest.py`, which 26.0 defines identically). `test/unit/files/conftest.py` on 26.0 adds the `mock_http_server` fixture and modern imports; no overlap with the 25.1 edits.
- **Noted:** 25.1 head has two commits past those in its debrief (`85507f36b7d` patching `OpenerDirector.open` in http tests, `178587b7e40` initial URL and redirect-scheme check in the http file source); the debrief's commit list stops earlier.
