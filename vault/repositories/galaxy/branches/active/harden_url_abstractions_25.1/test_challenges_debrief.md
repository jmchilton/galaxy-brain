Run via Claude Opus 5.5.

# harden_url_abstractions_25.1 — test challenges debrief

Head `5ec20de1c2f` → `a794f2a41cc` (rewritten history, not pushed). 9 commits, 4 of them "Baseline tests" first. `test/unit/files/` + `test/unit/workflows/test_trs_proxy.py`: 161 passed, 17 skipped at head. ruff, black, isort and mypy pass at every commit (`git rebase -x`).

## Red/green classification (the main fix)

Several tests in change commits passed on `release_25.1`, so they were really baseline tests. Moved or dropped:

- `https://BÜCHER.example:8443/` (pass case added by the host-reading commit) passes before and after the change. Moved into "Baseline tests for validate_non_local".
- `test_validate_uri_access_file_requires_admin[file:///x]` passed on base and `test_validate` already covers lowercase `file://`. Dropped that param. `FILE:///x` and ` File://foo/bar` stay.
- `test_match_url_rejects_file_uri`: the lowercase param moved to a new baseline commit, and the scheme-case commit adds the `FILE:` param.
- `test_server_from_url_follows_redirect_to_public_host` and `test_configured_server_follows_redirect_unchecked` moved to the new commit **Baseline tests for TRS servers built from user URLs**, along with `test/unit/workflows/conftest.py`.

## Dropped

- `test_validating_session_refuses_redirect_to_private_address` and `test_validating_session_follows_allowlisted_redirect` (`test_uris.py`). On base they fail only because `ValidatingSession` can't be imported. Refusal is covered by the callers' tests (TRS, remote ZIP HEAD, remote ZIP range). The scheme, case and port variants are covered by the `validate_non_local` tables.

## Added

- `test_server_from_url_follows_allowlisted_redirect` (TRS baseline). Replaces the dropped session-level allowlist test at the caller. It checks that `fetch_url_allowlist` reaches the session `server_from_url` builds.
- **Baseline tests for http file source redirects:** `test_file_source_http_follows_allowlisted_redirect` uses a real local `pytest-httpserver` (already pinned) with a loopback allowlist. Before this, nothing showed that the http source still follows redirects or passes its allowlist to the new redirect handler. The test can't use `fake_public_dns`, because that fixture also redirects urllib's connect.

## Restructured

- `patch_http_open` (`test/unit/files/_util.py`) now matches `OpenerDirector.open(req, data, timeout)`. That covers `urlopen` too, so the 7 existing http/DRS tests pass against both the old and new `http.py`. Only the new redirect test fails on the old one. Port branches can use the same helper for tests that still patch `urlopen`.

## Challenged, kept

- **http refusal test, mocked transport** (`HTTPHandler.http_open`/`HTTPSHandler.https_open`): a real server can't stand in for a public host. On base the request would also try to reach the unreachable target and hang until the socket timeout. The opener is built for each call, so patching the handler classes takes effect.
- **remote ZIP tests, `responses`:** no mocks to replace. `len(responses.calls) == 2` in the range test is already stricter than checking the target's call count.
- **`_mock_get` → `requests.Session.request`:** needed so the workflowhub skip tests stay offline now that a session is used. It works on base too.
- **`validate_non_local` parametrized tables:** behavior tables, not implementation tests.
- **`doc/source/dev/writing_tests.md`:** the tests follow its unit-test guidance. Everything new runs offline (mocked transport, `responses`, or a local server), with no slow or network-dependent tests.
- **No API, integration or E2E tests:** these are file-source and TRS internals with no UI, and the API layer adds nothing over offline unit tests.

## Red checks

Each change commit's new tests were run with the parent's `lib/` files written into the worktree. Every one fails at its own `pytest.raises` or assertion, not at an import:

- `HTTP://`/`HtTpS://`, `FILE:`, ` File:` → DID NOT RAISE.
- Host-reading cases → DID NOT RAISE. `http://[::1/` raises `ValueError` instead, which is the behavior change.
- http redirect test → `requested == [test_url]` fails.
- TRS refusal and both remote ZIP refusals → DID NOT RAISE.

The baseline commits change only tests, so their `rebase -x` runs used base `lib/`.

## Forward-merge note

On 26.1, `test_http.py` has more tests that patch `urllib.request.urlopen` (`capture_url` and the percent-encoding tests). After the port these won't conflict in text, but they will stop intercepting requests. The 26.1 branch must switch them to `patch_http_open`, which now accepts urlopen-style calls. History was rewritten with edit stops rather than autosquash, because tests moved between commits. The final tree matches the intended tree exactly.
