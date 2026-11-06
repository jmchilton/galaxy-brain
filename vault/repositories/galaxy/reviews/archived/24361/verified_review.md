### P1 1: `HALFilesSource` has no tests (implementation verified)

`lib/galaxy/files/sources/hal.py` adds about 300 lines of path parsing, host and scheme filtering of URLs taken from HAL metadata, version pinning, HEAD-based sizes, pagination and a per-hop redirect guard. The only new test, `test_production_hal`, checks template expansion. Nothing in CI exercises the source, so a regression in the security-relevant URL filtering or redirect validation would go unnoticed.

Add `test/unit/files/test_hal.py` using `responses`, as `test_http.py` and `test_cbioportal_download.py` do. Drive the public `list()`/`realize_to()` and use the existing `fake_public_dns` fixture so `validate_non_local` still runs without network.

<details><summary>Details</summary>

The review branch's first commit adds 19 tests that pass against the PR; later commits bring the suite to 24. They cover:

- root listing, `numFound` totals and search parameters
- deposit listing that drops non-HAL hosts, `http://`, wrong path shapes, `..` and encoded-slash names
- HEAD sizes, including the 500, non-identity `Content-Encoding` and junk `Content-Length` cases
- HEAD issued only for the visible page, and the in-deposit filename filter
- realize from the version-pinned URL, and a file missing from the deposit
- stale-version and ambiguous-attachment errors
- 401/403 embargo and 404 mapping, and HTML-page rejection
- a redirect to `169.254.169.254` refused before it is requested, and the redirect cap
- `writable: true` rejected, and invalid paths

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P2 1: Extract the redirect-validating fetch into a shared helper (implementation verified)

`HALFilesSource._open_url` contains generic logic: `allow_redirects=False`, `validate_non_local` on every hop before that hop is requested, scheme and credential checks, and a cap on redirects. This is stricter than `http.py`, which lets `requests` follow redirects and validates only the final `response.url`. Kept private to HAL, the next file source will re-implement it or skip it. Every call also opens a fresh `requests.Session()` and ignores `get_reusable_http_session()`. Only the search and download calls run on the caller's thread and could reuse its session; the size HEADs run in worker threads and still get fresh sessions.

Add `open_validated_url(url, ip_allowlist, *, method, params, headers, timeout, max_redirects)` to `galaxy.files.uris`, next to `validate_non_local` and `get_reusable_http_session`. Have it reuse the thread's session when one is set. HAL keeps only its own handling: the 404 mapping, the 401/403 embargo message and the HTML rejection.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 1: Unpaginated deposit listings send a HEAD for every attachment (implementation verified)

`page = entries[start : start + limit if limit is not None else None]` returns the whole deposit when `limit` is omitted. The `remote_files` API defaults `limit` to `None` (`lib/galaxy/webapps/galaxy/api/remote_files.py`). An API listing of a deposit with many annexes therefore fans out one HEAD per file, 4 at a time with a 5 s timeout each.

When `limit is None`, probe sizes only for the first `DEFAULT_PAGE_LIMIT` entries. The review branch's test fails before this change (30 HEADs) and passes after it (25).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: The HTML Content-Type rejection also blocks genuine HTML attachments (implementation verified)

`_open_url` raises "HAL returned an HTML page" for any `text/html` response. That includes `_realize_to` and the size HEADs, so an attached `.html` annex could never be imported and would always list with size 0. The reviewer could not confirm that such annexes exist in HAL.

Keep the check, since it guards against login or embargo pages served as `200 text/html`, but skip it when the requested file ends in `.html` or `.htm`. The review branch's test fails without this change (realize raises) and passes with it. `test_realize_rejects_html_page` still passes.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 3: The hardcoded attachment-host allowlist ignores a configurable `api_url` (implementation verified)

`_record_files` accepts files only from `hal.science`, `*.hal.science`, `hal.inrae.fr` and `(*.)archives-ouvertes.fr`, and the list is inline in the condition. `api_url` is user-templatable. Pointing it at another HAL deployment lists deposits whose attachments are all silently dropped, which leaves empty directories.

Move the hosts into named module constants (`FILE_HOSTS`, `FILE_DOMAINS`). State in the template's `api_url` help that only HAL-hosted attachments are supported, or derive the allowed hosts from configuration.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 4: One malformed search result fails the whole root page (implementation verified)

At the root, `_record_id` raises on a doc missing `version_i`, so one bad doc fails the entire listing. Skip it with a `log.warning` instead. The review branch's test fails before this change and passes after it.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 5: A trailing slash on a deposit path is rejected as invalid (implementation verified)

`_split_path("/hal-01479142v2/")` raises `ObjectNotFound`, while `cbioportal._normalize_path` strips a trailing slash. Strip slashes from both ends before splitting. The review branch's test fails before this change and passes after it.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 6: The `isinstance(entry, RemoteFile)` check exists only for typing (implementation verified)

In `_list`, deposit entries reuse the root branch's `entries: list[AnyRemoteEntry]` name, so `entry.size` needs an `isinstance` guard on a list that only ever holds `RemoteFile`s. Give the deposit list its own name, typed `list[RemoteFile]`, and widen it at return.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>
