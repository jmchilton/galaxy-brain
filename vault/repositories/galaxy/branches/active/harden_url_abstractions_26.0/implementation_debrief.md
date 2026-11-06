Run via Claude Opus 5.5.

# harden_url_abstractions_26.0 implementation

Head `bf6aef0c159` on `jmchilton`, base `origin/release_26.0` `784549f48d6`, 18 commits. Stale rebase aborted; old head kept as local `backup/harden_url_abstractions_26.0_pre_rebase` (`0fceefa090c`).

## Conflicts

- `test_trs_proxy.py` imports: union of upstream and port (rerere, checked).
- `trs_proxy.py` `_get`: kept upstream `TRS_REQUEST_TIMEOUT` and timeout/connection error handling, with session factory and default headers inside the `try`. Same as 25.1.
- `test_slow_server_reported_as_timeout`: allowlists 127.0.0.1, in "Check redirect hops of TRS servers built from user URLs". Same as 25.1.
- `util.py` on the DRS commit: 25.1's change reapplied by hand on 26.0's rewritten file.

## DRS `requests.get` calls

- `retry_and_get` (object lookup, includes URLs resolved from compact identifiers): `ValidatingSession`, allowlist, user agent, headers kept on 202 retry.
- `_get_access_info` (access lookup): same session.
- `_query_identifiers_org` (two calls): unchanged. Fixed configured host, like configured TRS servers; the second URL comes from that host's response.
- `_download_s3_file`: unchanged. Only `s3://` URLs reach it and requests raises `InvalidSchema` on them, so it sends nothing (checked by running it).

## Tests adapted from 25.1

- `test_drs.py` uses `drs://127.0.0.1/1`, no port: on 26.0 `host:port` is tried as a compact identifier first, querying identifiers.org, so the call log wouldn't be empty.
- Added two compact-identifier tests: resolved URL private, resolved URL redirects to private.
- `test_drs_compact_identifiers.py`: `args[0]` to `args[1]` for `retry_and_get`'s new session argument. This edits an upstream test.

## Verification

- Red before fix: 6 of the 7 new DRS tests failed; allowlisted-address test passes either way.
- `test/unit/files` + `test_trs_proxy.py`: 249 passed, 18 skipped.
- `test/unit/files/test_drs.py` passes at all 18 commits.
- API `lib/galaxy_test/api/test_drs.py`: 5 passed.
- ruff, black, mypy clean on the 14 changed Python files.

## Behaviour to note

- `drs://host:port/id` queries identifiers.org with `host` as prefix before falling back. Upstream behaviour, unchanged.
