Run via Claude Opus 5.5.

# harden_url_abstractions_26.1: implementation debrief

Head `112f92c0f96` on `jmchilton/harden_url_abstractions_26.1`, base `release_26.1` at `f1fd95ed067`. 18 commits, none dropped; all picked from `harden_url_abstractions_25.1` at `74187814435`.

## Conflicts

- `uris.py`: kept 26.1 `strip()`, empty-netloc check and `UnicodeError`; added 25.1 lowercase scheme and `ValueError` guard. Dropped the now-redundant `strip()` in `_host_matches_requests`.
- `http.py`: kept 26.1 disallowed-character check and requoting; added opener, then `validate_non_local(request_url, ..., schemes=FETCH_SCHEMES)` after requoting, so the character `ValueError` still comes first.
- `trs_proxy.py`: session factory merged cleanly into 26.1 `_get`; its timeout and error messages are kept. `Callable` imported from `collections.abc` for 26.1 ruff.
- `util.py`: 25.1 edits reapplied by hand on the rewritten file.
- Tests: kept both sides. `test_uris` whitespace cases expect the stripped URL. `test_drs` and `test_http` `urlopen` sites use `patch_http_open`; `fake_public_dns` added on two DRS tests.

## DRS `requests.get`

| Call | Handling |
|---|---|
| `retry_and_get` | `ValidatingSession`; compact-resolved URLs included |
| `_get_access_info` | `ValidatingSession` |
| `_query_identifiers_org` (2 calls) | unchanged; identifiers.org treated as a fixed configured host |
| `_download_s3_file` signed branch | unchanged; only reached with `s3://` URLs, which requests refuses with `InvalidSchema` before any connection |

Added beyond 25.1: `test_drs_compact_identifier_lookup_refuses_redirect_to_private_address`. Adapted mocks: `test_drs_compact_identifiers.py` (unit: session is now the first `retry_and_get` argument; integration: object lookup asserted on `ValidatingSession.get`).

## New callers

No code change needed. `managers/workflows.py` subworkflow URL and WES go through the http source or `trs_proxy`, so they inherit the checks. `dataverse.py` `urlopen` is also on 25.1 and left alone.

## Verification

- `test/unit/files` + `test_trs_proxy.py` + integration `test_drs_compact_identifiers.py`: 365 passed, 16 skipped.
- `test_drs.py`: green at each commit, after moving `fake_public_dns` to "Check initial URL". The full loop ran before that move; the three commits it rewrote were rerun.
- Red check: with base `util.py` and these tests, 6 fail, the DRS redirect, private-address and 202-header tests.
- API `lib/galaxy_test/api/test_drs.py::TestDrsApi`: 5 passed.
- ruff and black clean on changed files.
