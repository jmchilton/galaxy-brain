# Normal review 1 (phase 1: bounded fetch helper, DOI and bio.tools lookups)

Acted on all bugs and most test and design notes. The deadline is now enforced between socket reads (urllib3 2 `read1`), with a slow-server test. URLs are normalized before validation and request. Added charset, gzip and boundary tests; an adapter test for the bio.tools wiring; moved the namespace rename into its own commit; added a `UrlValidator` alias; built the DOI validator with `functools.partial`; and dropped the class-level allowlist default. A possible security issue was reported privately to John.

Not acted on:
- `fake_dns` patches `socket.getaddrinfo` process-wide via monkeypatch: it's undone after each test and scoped to tests that request it.
- The DOI cache keeps `getattr(config, "fetch_url_allowlist_ips", None) or []`: the Tool Shed's config has no such attribute (commented). The bio.tools adapter now reads it directly.
- `quote(doi, safe="/")` double-encodes DOIs that already contain `%XX`: rare, and such DOIs didn't resolve reliably before either.

<details>
<summary>Full review</summary>

# Normal review 1 (raw) - origin/release_26.1..eb816d013bc

Verdict: solid, well-scoped, commits split cleanly. One real bug (total deadline not enforced during body reads), one withheld item, a few test gaps. Package boundaries respected: `galaxy.util.requests` and `galaxy.tool_util.biotools` don't import `galaxy.files`; validator is injected from app-side `galaxy.tools.biotools` / `galaxy.managers.citations`. Tests: 26 pass at baseline commit b94764421ba, 41 pass at eb816d013bc.

## Bugs

1. **`bounded_get` deadline is not a total bound for Content-Length bodies.** `timeout=_remaining(deadline)` is a per-socket-op timeout and `_remaining(deadline)` is only checked between 16 KiB `iter_content` chunks. urllib3 2.x `read(amt)` loops until `amt` bytes or EOF, so a slow body holds one chunk read indefinitely as long as each recv lands inside the timeout. Reproduced locally: server sending 1 byte / 0.2 s with `Content-Length: 100`, `timeout=1.0` -> `BoundedFetchError` only after **20.2 s** (full body). Same with `Transfer-Encoding: chunked` (1-byte chunks) -> fails at 1.0 s as intended. Docstring ("within a total time") overstates. With DOI's 64 KiB cap and 10 s timeout the worst case is far beyond 10 s.
   Options: read with `response.raw.read1(chunk)` where available (urllib3 >= 2.x has it; galaxy-util may still allow 1.x), or a much smaller chunk_size (mitigates, doesn't fix), or document it as per-read bound + overall check between reads and use `(connect, read)` tuple timeout. Add a test (local socket server like the RetrySession tests in test_requests.py already use) that pins whichever behavior is chosen. Note DNS resolution (in `validate_non_local` and in the connect) is not covered by the timeout either; acceptable, but worth one line.

2. possible security issue, details withheld.

## Test strength (mutation checks run on eb816d013bc)

- `response.encoding or "utf-8"` -> `"utf-8"`: all tests pass. Declared-charset decoding (parity with old `res.text` for DOI) is untested; and the `encoding is None -> utf-8` fallback is untested too, since `responses` with a str body sends `text/plain; charset=utf-8`. Add one test with `content_type="application/x-bibtex"` + UTF-8 bytes (fallback) and one with `charset=iso-8859-1` (declared). Old bio.tools path used `apparent_encoding`; new uses declared/utf-8 (requests maps `application/json` to utf-8) - fine, but mention in commit/PR as an intended change.
- Removing the in-loop `_remaining(deadline)`: all tests pass (see bug 1). `test_bounded_get_enforces_total_deadline` only covers the between-hops check and depends on exactly 3 `monotonic()` calls (StopIteration otherwise) - brittle.
- Beaker namespace back to `"doi"` in `lib/galaxy/tools/biotools.py`: all tests pass. Dropping `validate_url` plumbing in `get_biotools_metadata_source`: all tests pass. `get_galaxy_biotools_metadata_source` (namespace, `validate_non_local` partial, config allowlist) has no test. A small test building it from a Bunch config and asserting a redirect to `internal.example` is refused (reusing `fake_dns`) would cover the wiring.
- `fake_dns` patches `galaxy.files.uris.socket.getaddrinfo`, i.e. the global `socket.getaddrinfo` for the whole test. Fine today (psycopg resolves in libpq), but the fixture docstring/target suggests module scope. Consider patching only what's needed or note it.
- `test_doi_citation_caps_response_size` asserts only the stub; it would also pass if the fetch failed for any other reason. Low priority since `test_bounded_get_limits_size` covers the mechanism.

## Reuse / design

- Good: builds on `galaxy.util.requests.Session` (default UA headers), reuses `validate_non_local` + `fetch_url_allowlist_ips` per John's decision, leaves a reusable `bounded_get`.
- `DoiCache._ip_allowlist: list = []` class attribute exists only because `MockDoiCache` in `test_CitationsManager_db.py` skips `__init__`. Production code is accommodating a test mock (and it's a mutable class default). Prefer setting `self._ip_allowlist = []` in `MockDoiCache.__init__` (or have the mock call a shared cache-builder).
- `getattr(config, "fetch_url_allowlist_ips", None) or []` in two places: `GalaxyAppConfiguration` always sets it; the getattr is for Bunch test configs. Either add it to the test Bunch or keep but it's duplicated - small helper or just `config.fetch_url_allowlist_ips`.
- Inconsistent shape: DoiCache uses a bound method `_validate_url`, biotools uses `functools.partial(validate_non_local, ...)`. Either is fine; pick one.
- `validate_url: Optional[Callable[[str], object]]` repeated 4x; a `UrlValidator = Callable[[str], object]` alias in `galaxy.util.requests` would read better and document the contract (raise to reject).
- Beaker namespace rename `"doi"` -> `"biotools"` is a real fix (both `citation_cache_table_name` and `biotools_service_cache_table_name` default to `beaker_cache`, so with `ext:database` the two caches shared a namespace). Side effect: existing biotools cache entries are orphaned (harmless refetch). It's bundled in "Bound bio.tools API lookups"; since the goal is splittable PRs, consider its own commit and call it out in the PR body.

## Redirect handling

- `is_redirect` covers 301/302/303/307/308 with a Location; all hops are GET so 303/307/308 semantics are fine. Relative and scheme-relative Locations resolved with `urljoin` (tested for `/b`). Per-hop scheme check + validator before request; rejected hop not requested (tested). `max_redirects` counts hops correctly (3 calls for max 2).
- Nit: requests' own redirect code also re-encodes non-ASCII Location (latin-1 -> utf-8) and requotes; `urljoin` on raw header won't. Edge case, no action needed.
- Headers (Accept + UA) carried across hosts; nothing sensitive. OK.

## DOI encoding

- `quote(doi, safe='/')` now encodes `%`, so a DOI already containing `%XX` is double-encoded (previously `requote_uri` left valid escapes alone). Rare in tool XML; mention or use `safe="/%"`-style handling only if it matters. Test `test_doi_cache_encodes_doi_in_url` is good.
- bio.tools `quote(..., safe='')` fine.

## Nits

- `DOI_FETCH_TIMEOUT` 10 s replaces `DEFAULT_SOCKET_TIMEOUT` (600 s); good, mention in PR as behavior change.
- `# --- bounded_get ---` banner comment in test_requests.py is noise.
- Comment in `_raw_get_bibtex` is fine and short.
- Imports all at module top. Docstrings short.

</details>
