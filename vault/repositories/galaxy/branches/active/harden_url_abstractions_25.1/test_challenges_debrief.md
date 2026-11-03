Run via Claude Opus 5.5.

# harden_url_abstractions_25.1: test challenges debrief (round 2, after re-scope)

Head went from `46d9408d239` to `10160ed812c`. History was rewritten but not pushed, still 15 commits on `release_25.1` at `83296278444`, with the 4 "Baseline tests" commits first.

At every commit (`git rebase -x`), ruff, black, isort and mypy pass on all changed `.py` files (tests included), and so do `test/unit/files/` and `test/unit/workflows/test_trs_proxy.py`. At the head that suite gives 177 passed, 17 skipped.

The previous round's debrief is in `earlier_drafts/1/test_challenges_debrief.md`. This round re-checked every test from scratch, and most of the work was on what the re-scope added.

## Red/green fixes (the main finding)

All three `schemes=` tables in `test_uris.py` failed on their parent with `TypeError: unexpected keyword 'schemes'`, not at their own assertion. This is the same problem that got the `ValidatingSession` tests dropped last round. The tables were `test_validate_non_local_extra_scheme_public_host_passes`, `_local_ip` and `_unverifiable`. Their cases moved to the http file source, the only caller that passes `schemes`:

- **Refusals (ftp commit):** `test_file_source_http_validates_initial_ftp_url` now covers 4 initial URLs: plain, `user:pw@…:21`, `%31` and `%40`. `test_file_source_http_validates_ftp_redirect_target` covers `ftp://` and `FTP://` redirect targets. An uppercase `FTP://` can only reach this source as a redirect target, because the source's `url_regex` is case-sensitive.
- **Pass cases (moved to baseline):** these pass on base, so they belong in a baseline commit:
  - `test_file_source_http_follows_ftp_redirect_to_public_host` (fake handlers) is replaced by `test_file_source_http_follows_allowlisted_ftp_redirect`. That test uses no mocks: the local `httpserver` sends a 302 to `ftp://anonymous@127.0.0.1:<port>/README` on the existing `ftp_server` fixture, with a loopback allowlist. It covers userinfo, port and allowlisted ftp hops.
  - The new `test_file_source_http_realizes_idn_ftp_url` (`ftp://bücher.example/`) pins that the requests host comparison is skipped for ftp. This was the only reason the old public-host table existed.
  - Both tests went into the commit now titled **"Baseline tests for http file source redirects and ftp URLs"**, which also introduces a shared `LOOPBACK_ALLOWLIST`.
- Dropped the allowlisted-ftp half of `_local_ip`. Allowlist matching doesn't depend on the scheme, the http tables already cover it, and the real ftp baseline above uses an allowlist.
- Because nothing calls the "follow without refusal" path any more, `_realize_with_redirect` goes back to requiring `expected_exception`, and `nullcontext` is gone.

## Dropped

- `test_file_source_http_validates_final_ftp_url`: it faked a final `geturl()` that differs from every URL that was requested. The opener can't produce that once every hop is checked. The initial-URL and redirect-hop tests cover ftp.
- The second half of `test_redirect_handler_refuses_unchecked_scheme`, where `schemes=WITH_FTP` follows the ftp redirect. That duplicated the caller tests, so `WITH_FTP` is gone too.

## Added

- `test_trs_requests_send_galaxy_user_agent`, in the TRS baseline commit. `Let TrsServer take a requests session factory` replaced `galaxy.util.requests.get`, which adds Galaxy's user agent, with an explicit `headers=get_default_headers()`. Nothing pinned that header. The test covers both `server_from_url` and `get_server`. When the header is removed it fails with `python-requests/…` ≠ `galaxy/<VERSION>`.

## Lint fix found on the way

Galaxy's CI runs `mypy test lib`, but the earlier `rebase -x` lint ran mypy only on the lib files. Two test errors had slipped through:
- `addinfourl` has no `msg` (`_realize_with_redirect`, from `Validate each redirect hop…`). Fixed by annotating it `Any`, as the file's other fake responses are.
- `PreparedRequest` has no `req_kwargs` (the remote ZIP timeout test). Fixed with a `type: ignore[attr-defined]` and a one-line note that `responses` records the `send()` kwargs.

## Challenged, kept

- **`test_redirect_handler_refuses_unchecked_scheme` (first half only):** the refusal can't be reached through the http source, because urllib's `http_error_302` already limits redirects to http/https/ftp, and `FETCH_SCHEMES` covers all three. The re-scope review kept the refusal to protect the default tuple for future callers. This is its only test, and it fails at its own `pytest.raises` on the parent.
- **Remote ZIP timeout test:** it checks the kwargs that were sent rather than a real stall. A behavior test would need a sleeping server plus a patched module constant, which is slower and no less tied to the code.
- **`validate_non_local` http tables, remote ZIP `responses` tests, TRS redirect tests, mocked transport in `_realize_with_redirect`, `_mock_get` on `Session.request`:** the previous round's reasoning still holds. These are behavior tables, a real server can't stand in for a public host, and the tests run offline.
- **No API, integration or E2E tests:** these are file-source and TRS internals with no UI.
- **`doc/source/dev/writing_tests.md`:** all new tests are offline unit tests in `test/unit`, using real local servers where possible.

## Red checks (fresh, every change commit)

Each change commit's new tests (by collected node id) were run with the parent's `lib/` checked out in the worktree. All of them fail at their own `pytest.raises` or `assert`, and none fails with `TypeError` or `ImportError`:

- Scheme case: 5 tests, all DID NOT RAISE.
- Host reading: 7 DID NOT RAISE. `http://[::1/` raises `ValueError` instead, which is the intended change of exception type.
- http redirect hop: `requested == [test_url]` fails.
- TRS refusal and both remote ZIP refusals: DID NOT RAISE.
- Timeout: `[None, None, None] == [600, 600, 600]` fails.
- Initial URL: `requested == []` fails.
- ftp commit: 6 http source cases and the handler refusal, all DID NOT RAISE.

The new baseline tests were also checked by temporarily breaking the head code, and each one fails:
- The IDN test fails once the `scheme in HTTP_SCHEMES` guard is removed.
- The real ftp redirect test fails once `schemes=` is left off the handler in `http.py`.
- The user-agent test fails once `headers=` is removed.

Last round reported 180 passed and 18 skipped. The totals reconcile (198 − 11 dropped + 7 added = 194). One test that depends on the environment ran this time instead of being skipped.

## History mechanics

Tests moved between commits, so autosquash would have conflicted in `test_http.py`. The intended final tree was committed as a temporary commit first. Each original commit was then replayed with its test files regenerated from scripted transforms (author and message kept, except the two retitled or extended baseline commits). `git diff <tmp> HEAD` is empty.
