Run via Claude Opus 5.5.

# harden_url_abstractions_25.1 — initial implementation debrief

```
created .../differential-review/snapshots/20261103T004924Z-implementation-5ec20de1c2fa.json
  implementation @ 5ec20de1c2fa vs origin/release_25.1 (merge-base 9eb3271d60ab)
  first snapshot: 7 commits, 11 files, 39 hunks
```

Head `5ec20de1c2f` on `jmchilton/harden_url_abstractions_25.1`, base `release_25.1` (`9eb3271d60a`). Part of [URL Abstraction Hardening](../../../../../projects/url_abstraction_hardening/index.md).

## Commits

1. **Baseline tests for validate_non_local:** pins the current scheme, host, port, IPv6, credentials, allowlist and pass-through behavior.
2. **Baseline tests for remote ZIP file source:** one offline extraction that follows a redirect.
3. **Compare URL schemes case-insensitively in URI checks:** `validate_non_local`, `validate_uri_access`'s `file://` check, and `TrsProxy.match_url`.
4. **Make validate_non_local read hosts the way requests does:** the host `validate_non_local` looks up must match the host requests prepares for the URL (`PreparedRequest.prepare_url`). If they differ, the URL fails to verify with `RequestParameterInvalidException`, like other URLs it can't parse. URLs `urlparse` can't parse now raise that too, instead of a bare `ValueError`.
5. **Validate each redirect hop in http file source:** the earlier `http_redirect_validation_25.1` commit, cherry-picked. A urllib redirect handler checks each target before following it.
6. **Check redirect hops of TRS servers built from user URLs:** new `ValidatingSession` (a `requests.Session` that runs `validate_non_local` on every prepared request, so redirect hops included). `TrsServer` takes the allowlist explicitly; configured servers (`get_server`) are unchanged, and a test pins that.
7. **Check redirect hops in remote ZIP file source:** one `ValidatingSession` for the HEAD and both range requests.

## Decisions

- **Not a port of `bounded_get`.** On 25.1 the callers use urllib, requests and httpx, so the shared pieces are the `validate_non_local` reading plus one adapter per client: the urllib redirect handler and `ValidatingSession`. `api/proxy.py` (httpx) already checks each hop.
- **Configured TRS servers keep plain `requests`.** Only servers built from user URLs are checked.
- **`fake_public_dns` stays in `test/unit/files/conftest.py`.** The workflows conftest imports it there, which avoids extra forward-merge conflicts.

## Review

[Normal review 1](subagents/normal_review_1.md): changes made for the host comparison (now uses requests' own URL preparation), one remote ZIP session, the fixture move reverted, and a configured-TRS test added. Not taken: `ftp://` URLs, which `validate_non_local` doesn't check today, left for the scope evaluation.

## Forward merge

Neither release merges cleanly. The branch delta conflicts in `uris.py`, `http.py` and the tests on 26.0, plus `trs_proxy.py` and TRS/DRS tests on 26.1. So `harden_url_abstractions_26.0` and `harden_url_abstractions_26.1` are both needed.

## Validation

ruff, black, isort, mypy and `test/unit/files/` + `test/unit/workflows/test_trs_proxy.py` pass at every commit, rising from 139 to 164 passed, 17 skipped (credentials, optional libraries, env-gated search). Every new test was seen failing before its change. No API tests run.
