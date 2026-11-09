# Response to mvdbeek review 1 (ported from 25.1)

The review was against [25.1](../harden_url_abstractions_25.1/review_mvdbeek_response.md). It was ported 2026-11-09, and the new head is `2ceafdbaf31`.

- **P2-1**: applies, and the hole is wider on 26.0. Upstream's loop also has `except Exception: continue`, which swallowed `ConfigDoesNotAllowException` (private-address refusals) as well as "Could not verify url". The fix:
  - `s3://` keeps its own try/fallback.
  - Other methods resolve the file source in a narrow `try` and skip the method when nothing handles it.
  - `stream_url_to_file` re-raises `MessageException` and still falls through to the next method on other errors, which keeps upstream's fallback across methods.
  - Red-to-green: `test_drs_unverifiable_access_url_keeps_verification_error` and the new 26.x-only `test_drs_private_access_url_keeps_refusal`.
- **P2-2**: applied. The s3 `elif` was left as is.
- **P3-1**: applied, reusing the existing `LOCALHOST_ALLOWLIST`.
- **P3-2**: applied. The `with` also covers the s3 path.
- **P3-3**: deferred to `dev`. Not applied.
- **P3-4**: applied.
- **P3-5**: applied. Only the `fetch_url_allowlist` hunks of the rebuild were kept. The base had unrelated drift (quickjs, workflow_completion_monitor_sleep, inference_services), which was left out.

## CI reds on `36d780b40bd`

- `test/integration/test_drs_compact_identifiers.py::test_fetch_compact_identifier_drs_file`: related. The DRS GET now goes through `ValidatingSession`, which resolves `example-drs.com`. The fix, folded into "Check redirect hops of DRS file source lookups", adds a local `fake_public_dns` fixture and uses `responses` for the DRS object.
- Packages job, `test_http.py` `..._follows_allowlisted_redirect` / `..._ftp_redirect`, "fixture 'httpserver' not found": related. Reproduced locally with `-p no:pytest_httpserver`. The tests were rewritten to use `mock_http_server` and folded into the baseline-tests commit.
- first startup, Selenium, Playwright: unrelated. These are `galaxy-static-…` cache-restore misses (`fail-on-cache-miss`), which is infra.

## Tests

- `test/unit/files` with `test_drs_compact_identifiers.py`, run with `-p no:pytest_httpserver`: green at every commit.
- At head: `test/unit/files`, `test_data_fetch.py`, `test_trs_proxy.py` and the compact-identifier tests gave 276 passed, 17 skipped.
- mypy on the touched files: clean.
- API `test_drs.py`: 5 passed.
