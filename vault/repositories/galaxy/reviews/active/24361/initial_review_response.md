(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/learning_galaxy.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile: gx_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: 57bac72b9a2

Mostly a two-way door: the new source is additive and read-only. The one-way parts are the `hal` plugin/template type name and the `hal://`-style URI path shape `/<halId>v<version>/<filename>`, which get recorded in dataset sources, user file source instances and possibly workflows once deployed.

<details><summary>Risk Details</summary>

- New `hal` value in `FileSourceTemplateType` and the API schema; renaming or removing it later breaks stored user file source instances and admin template configs.
- The path format `/<halId>v<version>/<url-quoted filename>` becomes a persisted identifier; changing the version suffix scheme or filename quoting later invalidates saved URIs.
- Saved paths pin a deposit version, but HAL's search API exposes only the current version, so previously valid URIs for older versions start failing with an error once a deposit is revised. This behavior is established by design and users/workflows will come to depend on it.
- Download host allowlist (`hal.science`, `*.hal.science`, `hal.inrae.fr`, `*.archives-ouvertes.fr`) is hardcoded; HAL infrastructure changes silently hide attachments rather than erroring.
- `api_url` is a user-overridable template variable (default optional); outbound requests go through `validate_non_local` with the admin `fetch_url_allowlist` and per-hop redirect checks, so behavior matches other HTTP sources.
- Listing a record issues up to one HEAD per visible file (4 workers, 5s timeout), adding external latency to directory browsing.
- Template example is opt-in (`production_hal.yml`); no existing deployment changes until an admin enables it.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether the URI path shape (version-pinned record id plus quoted filename) is the identifier Galaxy wants to keep long term, since it will be persisted in dataset provenance and is hard to change. Confirm that failing on non-current versions, rather than resolving older versions some other way, is acceptable.

Also worth a look: whether exposing `api_url` as a user-editable variable is intended (vs. admin-only), and whether the hardcoded HAL host list should be configurable. Everything else is additive and can be rolled back by removing the template.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24361_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_24361_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24361_review_0), cut from the reviewed commit `57bac72b9a2`, adds a `responses`-based unit suite for the new HAL file source. It moves HAL's per-hop redirect validation into a reusable `open_validated_url` helper in `galaxy.files.uris`, which also reuses the calling thread's HTTP session when one is set. It then fixes the small listing issues one commit at a time, and each behavior change after the first two commits comes with a test that fails without it (the host-constant commit is behavior-neutral). The full HAL suite has 24 passing tests, and the new helper's tests in `test_uris.py` pass too.

- [`54116bbc194`](https://github.com/jmchilton/galaxy/commit/54116bbc194) Add HALFilesSource unit tests: adds `test/unit/files/test_hal.py`, covering listing, filtering, version pinning, sizes, error mapping and redirect validation through the public API.
- [`c9c4b947851`](https://github.com/jmchilton/galaxy/commit/c9c4b947851) Extract redirect-validating fetch into galaxy.files.uris: adds `open_validated_url`, which validates every redirect hop before requesting it, and has HAL use it for its own status and content-type handling.
- [`7d4498229a0`](https://github.com/jmchilton/galaxy/commit/7d4498229a0) Cap HAL size probes for unpaginated listings: when `limit` is `None`, sizes are probed for at most `DEFAULT_PAGE_LIMIT` attachments.
- [`4251e4fcef3`](https://github.com/jmchilton/galaxy/commit/4251e4fcef3) Name HAL attachment hosts; document api_url limit: moves the inline host checks into `FILE_HOSTS`/`FILE_DOMAINS` and notes the limit in the template's `api_url` help.
- [`9680a1bf4ac`](https://github.com/jmchilton/galaxy/commit/9680a1bf4ac) Skip malformed HAL search results instead of failing the page: root results with a bad id or version are logged and skipped.
- [`f896cec1776`](https://github.com/jmchilton/galaxy/commit/f896cec1776) Accept trailing slash on HAL deposit paths: `_split_path` strips slashes from both ends.
- [`6a8c4ce29a0`](https://github.com/jmchilton/galaxy/commit/6a8c4ce29a0) Type HAL deposit entries as RemoteFile, drop isinstance: a separately typed list removes the typing-only `isinstance` guard.
- [`a823ceb8ec1`](https://github.com/jmchilton/galaxy/commit/a823ceb8ec1) Allow text/html for HAL .html/.htm attachments: the HTML-page rejection now skips requests whose path ends in `.html` or `.htm`.

</details>

</details>

### P1 1: `HALFilesSource` has no tests (implementation verified)

`lib/galaxy/files/sources/hal.py` adds about 300 lines of path parsing, host and scheme filtering of URLs taken from HAL metadata, version pinning, HEAD-based sizes, pagination and a per-hop redirect guard. The only new test, `test_production_hal`, checks template expansion. Nothing in CI exercises the source, so a regression in the security-relevant URL filtering or redirect validation would go unnoticed.

Add `test/unit/files/test_hal.py` using `responses`, as `test_http.py` and `test_cbioportal_download.py` do. Drive the public `list()`/`realize_to()` and use the existing `fake_public_dns` fixture so `validate_non_local` still runs without network. Fixed on the review branch in [`54116bbc194`](https://github.com/jmchilton/galaxy/commit/54116bbc194).

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

Add `open_validated_url(url, ip_allowlist, *, method, params, headers, timeout, max_redirects)` to `galaxy.files.uris`, next to `validate_non_local` and `get_reusable_http_session`. Have it reuse the thread's session when one is set. HAL keeps only its own handling: the 404 mapping, the 401/403 embargo message and the HTML rejection. Fixed on the review branch in [`c9c4b947851`](https://github.com/jmchilton/galaxy/commit/c9c4b947851).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 1: Unpaginated deposit listings send a HEAD for every attachment (implementation verified)

`page = entries[start : start + limit if limit is not None else None]` returns the whole deposit when `limit` is omitted. The `remote_files` API defaults `limit` to `None` (`lib/galaxy/webapps/galaxy/api/remote_files.py`). An API listing of a deposit with many annexes therefore fans out one HEAD per file, 4 at a time with a 5 s timeout each.

When `limit is None`, probe sizes only for the first `DEFAULT_PAGE_LIMIT` entries. The review branch's test fails before this change (30 HEADs) and passes after it (25). Fixed on the review branch in [`7d4498229a0`](https://github.com/jmchilton/galaxy/commit/7d4498229a0).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: The HTML Content-Type rejection also blocks genuine HTML attachments (implementation verified)

`_open_url` raises "HAL returned an HTML page" for any `text/html` response. That includes `_realize_to` and the size HEADs, so an attached `.html` annex could never be imported and would always list with size 0. The reviewer could not confirm that such annexes exist in HAL.

Keep the check, since it guards against login or embargo pages served as `200 text/html`, but skip it when the requested file ends in `.html` or `.htm`. The review branch's test fails without this change (realize raises) and passes with it. `test_realize_rejects_html_page` still passes. Fixed on the review branch in [`a823ceb8ec1`](https://github.com/jmchilton/galaxy/commit/a823ceb8ec1).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 3: The hardcoded attachment-host allowlist ignores a configurable `api_url` (implementation verified)

`_record_files` accepts files only from `hal.science`, `*.hal.science`, `hal.inrae.fr` and `(*.)archives-ouvertes.fr`, and the list is inline in the condition. `api_url` is user-templatable. Pointing it at another HAL deployment lists deposits whose attachments are all silently dropped, which leaves empty directories.

Move the hosts into named module constants (`FILE_HOSTS`, `FILE_DOMAINS`). State in the template's `api_url` help that only HAL-hosted attachments are supported, or derive the allowed hosts from configuration. Fixed on the review branch in [`4251e4fcef3`](https://github.com/jmchilton/galaxy/commit/4251e4fcef3).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 4: One malformed search result fails the whole root page (implementation verified)

At the root, `_record_id` raises on a doc missing `version_i`, so one bad doc fails the entire listing. Skip it with a `log.warning` instead. The review branch's test fails before this change and passes after it. Fixed on the review branch in [`9680a1bf4ac`](https://github.com/jmchilton/galaxy/commit/9680a1bf4ac).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 5: A trailing slash on a deposit path is rejected as invalid (implementation verified)

`_split_path("/hal-01479142v2/")` raises `ObjectNotFound`, while `cbioportal._normalize_path` strips a trailing slash. Strip slashes from both ends before splitting. The review branch's test fails before this change and passes after it. Fixed on the review branch in [`f896cec1776`](https://github.com/jmchilton/galaxy/commit/f896cec1776).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 6: The `isinstance(entry, RemoteFile)` check exists only for typing (implementation verified)

In `_list`, deposit entries reuse the root branch's `entries: list[AnyRemoteEntry]` name, so `entry.size` needs an `isinstance` guard on a list that only ever holds `RemoteFile`s. Give the deposit list its own name, typed `list[RemoteFile]`, and widen it at return. Fixed on the review branch in [`6a8c4ce29a0`](https://github.com/jmchilton/galaxy/commit/6a8c4ce29a0).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>
