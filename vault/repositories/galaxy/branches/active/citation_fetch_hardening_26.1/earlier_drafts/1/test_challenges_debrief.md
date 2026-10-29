Run via Claude Opus 5.5 at high effort.

# citation_fetch_hardening_26.1 — test challenges debrief

Tip before: `1026962df8d`. Tip after: `5a9bd45ca7e`. All changes went in as fixups and were autosquashed with no conflicts. There are still 12 commits, and the Baseline tests commit `fca40862660` is unchanged.

## Changes

- **`test/unit/app/tools/test_biotools.py`** (commit `74562789e3d`, namespace). The old test read private attributes (`_sources`, `_cache.namespace_name`, `_validate_url.func.__name__`), so it only tested the implementation. Two behavior tests replace it:
  - `test_biotools_lookups_do_not_share_doi_cache_entries`: a DoiCache and the bio.tools source share one file cache dir. A DOI entry keyed `bwa` is cached first, and the bio.tools `bwa` lookup must still hit the API. Without the namespace change it fails with a `JSONDecodeError`, because the cached BibTeX is served as bio.tools JSON.
  - `test_biotools_lookup_does_not_follow_redirect_to_local_address`: the Galaxy adapter must reject a bio.tools redirect to a loopback host, with only one request made. It fails when the adapter's `validate_url` wiring is removed.
  - Both tests sit in the namespace commit because that commit creates the file. Splitting the validator test into `ab0f6f35b35` would conflict, and both commits belong to PR A anyway.
- **`fake_dns` fixture** moved from `test/unit/app/managers/conftest.py` to `test/unit/app/conftest.py` (commit `f51943504c5`) so the tools tests can use it.
- **`test_doi_cache_reads_fetch_config`** (commit `5a9bd45ca7e`). It no longer monkeypatches `citations.bounded_get` with a stub. It now uses `responses` and asserts on the timeout passed to the request. The cache-expire half now checks the refetch by call count. It is seen red without the change (`9.99 <= 3.0`).
- **`test_citations_manager_reads_max_fetches_config`** (commit `5a9bd45ca7e`), strengthened. It now has `@responses.activate`, `fake_dns` and `len(responses.calls) == 0`. Before, it had no network mocking, so without the change it either reached the real doi.org or fell back to the stub and passed anyway. It now fails at its own assertion without the change.
- **`test/unit/util/test_requests.py`** (commit `0c8ff40b86e`):
  - Dropped `test_bounded_get_returns_text`. `test_bounded_get_defaults_to_utf8` and `test_bounded_get_uses_declared_charset` cover the same path.
  - Replaced `test_bounded_get_passes_timeout`, which asserted on the request kwargs, with `test_bounded_get_times_out_when_server_stalls`. That test uses a real socket server that never responds and asserts `Timeout` within 3s. It fails (`ConnectionError` after the server's 5s cap) when the per-request timeout is removed.
  - `slow_body_server` became a factory fixture, `slow_http_server(head, trickle)`, shared by the stall and slow-body tests. The server caps itself at 5s, so a regression fails instead of hanging.

The touched unit set passes at every commit: 120 at the baseline, 150 at the tip. The 2 skips at the middle commits are the online bio.tools tests (`skip_if_site_down`). isort, black and ruff are clean. No API tests changed, so none were rerun.

## Kept as is, and why

- **API tests** (`test_tool_citations`, `test_history_citations`). Each URL is used once, so no new helper is needed. These are baseline tests that pass before and after.
- **Per-tool cap and oversized BibTeX tests** (`test_citations.py`). An API test would need a new test tool with more than 50 citations. The unit test goes through `create_tool_from_source`, so it already exercises the real load path.
- **`test_citation_content_is_stripped`**. YAML and user-defined tools build `Citation` models directly, and `YamlToolSource` has no `parse_citations`, so the model is the right layer.
- **`test_DoiCache_failure_expires`** (db). It duplicates the file-backend failure-TTL test, but it checks per-entry `expiretime` on the default `ext:database` backend.
- **`test_bounded_get_enforces_total_deadline_across_redirects`**. Its fake `time.monotonic` is tied to the number of clock calls. Doing the same with a real server across a redirect would cost seconds. Kept.
- **`_DictCache`** in `test_metadata_source.py`. `InMemoryCache.backend` is a class-level dict shared by every instance (pre-existing), so using the default cache would leak state between tests. A follow-up could fix `InMemoryCache` to use an instance dict, and then `_DictCache` could be dropped. That is out of scope here.
- **`Bunch` configs**. This is the existing pattern in these files, and `DoiCache` reads optional attributes with `getattr` defaults, which a dataclass with defaults would hide. Not converted.
- **`fake_dns` vs the existing `fake_public_dns`** (`test/unit/files/conftest.py`). The existing fixture resolves names to a public address and IP literals normally.
  - The branch could reuse it by moving it to a new `test/unit/conftest.py` and pointing the redirect tests at `https://127.0.0.1/...` instead of `internal.example`. That would drop `fake_dns`.
  - Not done here because it touches the files tests outside the branch. Recommended as a hardening or follow-up item.
- **DoiCache config `Bunch`** is built in both `test_biotools.py` and `_cache_config` in `test_CitationsManager.py`. A shared helper in `test/unit/app/conftest.py` would dedupe them. It's a small nit, left as is.
- **E2E**: no UI change. The existing tool-form citations Selenium test (`test_tool_form.py`) covers rendering and was not run.

## Finding for the coordinator (not fixed)

`bounded_get`'s total deadline does not cover reading the response status line and headers. Each socket read gets the remaining time as its timeout, so a server that sends header bytes slowly keeps every read under that timeout. Locally, `timeout=1.0` against a server sending a 60-byte head at one byte per 0.2s returned `BoundedFetchError` only after 17.5s. The deadline was enforced only once the body loop started. The docstring claim, "can overrun `timeout` by at most one read timeout", is therefore wrong for slow headers.

Options:
1. Bound the whole request with a wall-clock check. One way is a socket-level deadline through a custom adapter, or setting the remaining time on the socket before each header read.
2. Narrow the docstring and accept the gap.

No test was added for it. A red test would document a known failure, and the fix belongs to the implementation, not to the test challenge.
