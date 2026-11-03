Run via Claude Opus 5.5.

# Thermo-nuclear code quality review

Reviewed `origin/release_25.1...f31d8e97df6`.

**Acted on one finding.** `TrsServer` no longer has a nullable mode. It used to take `ip_allowlist: Optional[list] = None`, where `None` meant unchecked, and `_get` branched between `requests.get` and `ValidatingSession`. Now it takes `session_factory: Callable[[], RequestsSession] = RequestsSession`. `TrsProxy.server_from_url` passes `partial(ValidatingSession, allowlist)`, so the configured-vs-user-URL decision sits with `TrsProxy`, which already owns it. `_get` is a single path that opens a session from the factory. The annotation follows the existing pattern in `elabftw.py` (`from requests import Session as RequestsSession`). The unused `galaxy.util.requests` import was dropped. Configured servers behave the same as before: `requests.get` opens and closes its own `Session`, and the UA headers are still passed explicitly. I did not use the `galaxy.util.requests.Session` wrapper, because it replaces the session's default headers.

The change was folded into "Check redirect hops of TRS servers built from user URLs" as an `amend!` commit, with the commit message updated. New head is `9e32bd469a7`. Baseline commits are still first. ruff, black, isort, mypy and `test/unit/files/ test/unit/workflows/test_trs_proxy.py` pass at every commit: 140 tests pass at the first commit and 163 at the last, with 17 skipped. That matches the old head, which also had 163. This was a pure refactor, so there was no red step. `test_configured_server_follows_redirect_unchecked` and `test_server_from_url_refuses_redirect_to_private_address` pin both paths.

Not acted on:
- **Redundant final `page.geturl()` check in `http.py`.** The initial URL and every redirect hop are now checked, so this check adds nothing. It's base code that 26.0 wraps in a `try`, so deleting it would grow that conflict. Kept for merge cost.
- **The hand-rolled netloc parser in `validate_non_local`.** This is the real code-judo target. `_host_matches_requests` already prepares the URL with requests. On dev, the credential stripping, IPv6 colon counting and `split_port` could be replaced by the prepared URL's `hostname`/`port`, which leaves one parser instead of two. Not done here: it changes behavior (bracketed IPv6 would start resolving instead of failing to verify), and 26.x has its own edits in that function.
- **`ValidatingRedirectHandler` lives in `http.py`, while `ValidatingSession` lives in `uris.py`.** The two per-client adapters are in different modules. The handler has a single consumer, and its commit is a cherry-pick, so moving it would diverge from the earlier branch. Revisit if another urllib caller needs it.
- **Other urllib file sources:** dataverse (`dataverse.py:465`) and invenio (`invenio.py:369`) still use plain `urlopen`, and elabftw uses its own session. Out of scope, noted here only.
- **Consolidating with `bounded_get` on 26.1:** already noted in normal review 1.
- **The file-URI prefix check appears twice,** in `validate_uri_access` and `TrsProxy.match_url`. This duplication predates the branch, and each site is one line.

<details>
<summary>Full review</summary>

## Verdict

The branch is a tight change split one concern per commit. File sizes are small (`uris.py` 204 lines, `trs_proxy.py` about 185), so the 1k-line rule doesn't come into play. There was one structural smell, the nullable-mode flag in `TrsServer`, and it is fixed. The larger missed simplification is a single parser for `validate_non_local`. It's out of reach on a release branch and noted for dev.

## Findings

1. **`TrsServer(ip_allowlist=None)` was a nullable mode** (spaghetti or branching, plus ownership). `None` meant "configured, skip checks" and a list meant "user URL, check every hop". `_get` duplicated the `get` call across the two branches, and the docstring had to explain what `None` meant. Code judo: inject the session factory, and the mode, the branch and the docstring all go away. The trust decision moves to `TrsProxy`, which already decides between `get_server` and `server_from_url`. **Fixed.**
2. **`validate_non_local` now has two URL parsers** (missed simplification). The hand-rolled netloc parser picks the host passed to `getaddrinfo`, and `_host_matches_requests` checks it against requests' prepared URL. Since requests' reading is now authoritative, the hand-rolled one could go. **Noted for dev:** it changes IPv6 behavior and adds conflicts on 26.x.
3. **The final `geturl()` check in `http.py` is redundant** now that the source URL is checked up front and the redirect handler checks every hop. **Kept:** it's a base line, and deleting it would grow the 26.0 `try` conflict.
4. **The adapters are split across modules** (`ValidatingRedirectHandler` in `http.py`, `ValidatingSession` in `uris.py`). The asymmetry is acceptable with one consumer each. **Noted.**
5. **Remote ZIP:** passing one session down through four helpers is explicit and boring, which is the right choice. No action.
6. **`_host_matches_requests` placement:** one call just before `getaddrinfo`, with the logic in a helper. That's acceptable in a busy function on a release branch. No action.

## Considered and rejected

- **Validating inside urllib's `http_request`/`https_request` preprocessors,** so one handler covers the initial URL and every hop, mirroring `ValidatingSession.send`. It would remove the explicit initial call. But it depends on urllib's handler naming protocol, which is more magic than the direct call, and the ftp-redirect refusal would still need `redirect_request`.
- **Setting UA headers in `ValidatingSession`:** this would change remote ZIP's request headers. Out of scope.

</details>
