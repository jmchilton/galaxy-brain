# Codex review

Codex reviewed `origin/release_25.1...a794f2a41cc`, without seeing this session's reasoning. It found two issues, both in the http file source, and I fixed both in `f31d8e97df6` ("Check initial URL and redirect schemes in http file source"), with red-to-green tests.

- **The source URL was checked only after it was opened.** `_realize_to` checked `page.geturl()` after urllib had already requested the source URL. Most callers check upstream, but DRS access URLs reach the source unchecked. It now runs `validate_non_local` on `source_path` before opening it. `test_file_source_drs_http` uses `fake_public_dns` now, since its access URL is checked before it's opened.
- **Redirects to other schemes passed the hop check.** urllib's `HTTPRedirectHandler` also follows redirects to `ftp://`, and `validate_non_local` passes non-http(s) URLs through. `ValidatingRedirectHandler` now follows only http(s) redirects.

Not acted on: none.

<details>
<summary>Findings (Codex, default model and effort)</summary>

1. P1, `lib/galaxy/files/sources/http.py:82`: the HTTP file source still requests the initial URL before validating it. `BaseFilesSource.realize_to` adds no URL check. Realizing `http://127.0.0.1/` with an empty allowlist reaches it before the final check rejects it.
2. P1, `lib/galaxy/files/sources/http.py:47`: an HTTP redirect to an `ftp://` URL passes the hop check, because `validate_non_local` returns non-HTTP schemes unchecked and `HTTPRedirectHandler` permits FTP redirects.

Coverage: uris.py, http.py, remotezip.py, files/sources/__init__.py, trs_proxy.py, util/requests.py, util/user_agent.py and the touched tests. No tests were run.

</details>
