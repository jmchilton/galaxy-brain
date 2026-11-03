Run via Claude Opus 5.5.

# harden_url_abstractions_25.1: normal review of re-scope

Reviewed `git diff origin/release_25.1...8f9c954251a`, each commit, and `git range-diff` against `harden_url_abstractions_25.1_alt_original_scope`. New head `46d9408d239` (pre-review head kept as local branch `backup/harden_url_abstractions_25.1_pre_rescope_review`).

**Acted on (three items, all folded into existing commits):**
1. Commit 15 changed `validate_non_local`'s default reading: a bare `http` / ` HTTPS` (no `://`) now parsed as a URL and raised instead of coming back unchanged, which matters for `upload_common`'s `url_paste`. Fixed by requiring the `://` separator; pinned with two cases in the baseline commit's "returned unchanged" test, so every commit checks it.
2. The percent-escape check applied to ftp only, but the http file source fetches http(s) through urllib too, and urllib percent-decodes every escape in a host, while requests only decodes unreserved ones. Made `unquote(host) == host` apply to every scheme in commit 9 (now "...the way requests and urllib do"), with the requests comparison kept for http(s) only. This also removes commit 15's scheme-conditional `if/else`. Red tests: `http://ex%40mple.org/`, `http://127.0.0.1%3A8080/`. Existing callers: only hosts containing a valid `%XX` now fail before DNS rather than at it.
3. History flip-flop: commit 14 refused redirects to non-http(s) schemes (only ftp reaches the handler, since urllib filters the rest) and commit 15 reversed that. Commit 14 is now "Check initial URL in http file source" only; commit 15 introduces the `schemes` tuple and the handler's refusal together.

A private note was appended.

**Not acted on:**
- `WITH_FTP` in `test_uris.py` duplicates `FETCH_SCHEMES` from `http.py`. Left as is: `test_uris.py` tests `uris.py` and shouldn't depend on the http source.
- The handler's own scheme refusal can't fire under `FETCH_SCHEMES`, because urllib's `http_error_302` already limits redirects to http/https/ftp. Kept, because it protects the default tuple for any future urllib caller.
- `FETCH_SCHEMES` lives in `http.py` rather than `uris.py`. It has one consumer, so it isn't worth moving.
- The redundant final `page.geturl()` check, the `file://` prefix duplication, and the `bounded_get` consolidation were already dispositioned in `scope_evaluation.md`.

Tests: lint (black, isort, ruff, mypy on the four changed lib files) plus `test/unit/files/ test/unit/workflows/test_trs_proxy.py` green at every commit via `git rebase -x`. Head: 180 passed, 18 skipped.

<details>
<summary>Full review</summary>

## Verdict

The expansion is small and does what `scope_evaluation.md` proposed. There was one regression in a default caller and one gap where the http source's reading didn't match urllib's (both fixed). The history needed one fix. Otherwise it's clean: baselines (1–4), refactors (5–7), then changes (8–15). The pre-review range-diff (at `8f9c954251a`) against the alt showed commits 1–9 and 12 identical. This review then changed 1, 9, 14 and 15. 10, 11 and 14 only move the handler into `uris.py`, and 13 and 15 are new.

## Focus questions

**Is `schemes` the simplest shape?** For `validate_non_local`, yes. An opt-in tuple with a default keeps every other caller unchanged, and the http source is the only fetcher of arbitrary `ftp://` URLs. A boolean (`include_ftp`) would be narrower, but it would read worse at the redirect handler. The tuple overpromises a little: the non-http(s) branch only knows how urllib reads ftp hosts. After fix 2 that branch is just "skip the requests comparison", so the remaining knowledge is generic (percent-decoding). For the handler, a hard-coded urllib scheme set (urllib follows only http/https/ftp) was considered as an alternative to a parameter. It was kept parameterized so the default stays aligned with `validate_non_local`'s.

**Does the ftp path's host handling match what urllib connects to?** Checked against CPython `Request._parse` and `FTPHandler.ftp_open`:
- `Request._parse` unquotes the host, then `ftp_open` runs `_splitport`, `_splituser` (rpartition on `@`), `unquote` again, and `gethostbyname`.
- `validate_non_local` strips userinfo at the last `@` and splits the port on `:`, which gives the same host for every non-escaped form.
- The percent check refuses any decodable escape, so the double unquote (e.g. `%2531`) is covered.
- `gethostbyname` is IPv4-only. The bracketed IPv6 that `getaddrinfo` can't resolve fails the check, and unbracketed IPv6 gets the private-address check, so `validate_non_local` is at least as strict.
- ftplib uses the control-connection peer for PASV data connections by default.

The same check showed that urllib also unquotes http(s) hosts, which is the source of fix 2.

**Are existing callers unchanged with the default?** Before the fix they weren't: `partition("://")[0]` treats a string with no separator as its own scheme, so `"http"` raised. After fix 1, the scheme test is exactly equivalent to commit 8's `lower().startswith(("http://", "https://"))`. Fix 2 changes the default path only for hosts containing a valid `%XX`, which never name a host, and which mostly failed DNS anyway.

**History and standalone commits.** Fix 3 removed the flip-flop. Each commit passes lint and the two test paths on its own. Commit 13 (timeouts) directly follows the remote ZIP hop check that rewrote those functions.

## Other review-focus items

- Reuse and abstraction: both per-client adapters (`ValidatingRedirectHandler`, `ValidatingSession`) now live in `galaxy.files.uris` with `validate_non_local`, so a later urllib or requests consumer has one module to import from. `requests` was already a `galaxy-util` dependency, so the `galaxy-files` package doesn't gain a new requirement.
- Imports: all at module top.
- Tests: the expansion's tests aren't trivial. They cover the initial URL, redirect target and final URL for ftp through the source, plus parametrized `validate_non_local` cases. No assertions were weakened. Commit 14's interim refusal test was removed along with the behavior it tested, and commit 15 adds the ftp redirect tests.
- Comments: short. The "requests decodes percent-escapes" test comment was corrected to "unreserved percent-escapes".
- Typing: `tuple[str, ...]` is fine. A `Literal` tuple would add noise for one consumer.

</details>
