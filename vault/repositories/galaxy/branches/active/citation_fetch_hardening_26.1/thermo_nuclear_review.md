Run via Claude Opus 5.5 at high effort.

# citation_fetch_hardening_26.1: thermo-nuclear code quality review (second pass)

Prompt: `vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md`. This is a fresh pass after the re-scope. It reviewed tip `c05b250203b` against `origin/release_26.1`. The new tip is `1c52b49b926`, with the same 17 commits. Every fixup autosquashed with no conflicts. The first pass is in [earlier_drafts/1/thermo_nuclear_review.md](earlier_drafts/1/thermo_nuclear_review.md).

## Verdict

Approve after the small fixes below. Since the re-scope there's no structural regression, and the new abstractions earn their keep:
- `cached_fetch` and `FetchCache` replace two separate get-or-fetch policies, one in `DoiCache` and one in the `InMemoryCache` createfunc path. Every cache-backed remote lookup in `lib/` now goes through it.
- `may_fetch` is the smallest hook that lets the DOI budget count only real misses. Wrapping `fetch` instead would cache a skip as a failure.
- The `clock` injection on `InMemoryCache` and `DoiFetchBudget` follows the existing pattern in `managers/sse_dispatch.py`.

Every touched file stays small: `util/requests.py` is 193 lines, `managers/citations.py` 273 and `tool_util/biotools/source.py` 133.

The findings are one missed reuse, one Tool Shed fix that could delete the bug class rather than patch it, a redundant sentinel, and loose typing.

## Findings

1. **`FakeClock` duplicates an existing helper (missed reuse).**
   - `test/unit/app/managers/test_sse_dispatch_cache.py` already has an identical `FakeClock` on `release_26.1`: same `now`, `__call__` and `advance`.
   - The branch adds a shared one in `galaxy.util.unittest_utils` but leaves that copy in place.
2. **The Tool Shed fix patches a typo in a line that shouldn't exist.**
   - `ToolShedAppConfiguration` is schema-driven, and `tool_shed_config_schema.yml` already declares `citation_cache_url` and `citation_cache_schema_name` with no default.
   - The hand-written `kwargs.get(...)` lines just re-set what the schema loader already set, and that duplication is how the wrong key slipped in.
   - Deleting the lines removes the bug class.
   - `citation_cache_table_name` has to stay: its hand-written `None` differs from the schema default `beaker_cache`.
   - `data_dir` and `lock_dir` have to stay too, because they apply `_in_root_dir` with different defaults.
3. **`cached_fetch` keeps two sentinels it never tells apart on read.**
   - `CACHED_FETCH_FAILED` and `CACHED_FETCH_NOT_FOUND` differ only in the expiry they're stored with. On read, both raise the same `CachedFetchFailed`.
   - Neither has shipped, so there are no persisted values to stay compatible with.
4. **`FetchCache` is declared but not used at the bio.tools boundary.**
   - `cache` is untyped in `ApiBiotoolsMetadataSource`, `CascadingBiotoolsMetadataSource` and `BiotoolsMetadataSourceConfig`.
   - The protocol only types `cached_fetch`'s parameter, so nothing states what a caller has to pass.
5. **`DoiFetchBudget(deadline=...)` is optional and unused.** No caller passes it; tests only inject `clock`. This is a nit.
6. **`cached_fetch` lives in `galaxy.util.requests`, but it's mostly cache policy.**
7. **`InMemoryCache` is a generic `FetchCache` but lives in `tool_util/biotools/source.py`.**
8. **`CachedFetchSkipped` and `CachedFetchFailed` are separate exceptions.** The DOI caller catches `Exception` for both, and bio.tools never passes `may_fetch`.
9. **`DoiCache.get_bibtex(doi, budget)` couples the cache to the budget type**, only to turn it into `may_fetch`.

## Changed (each as a fixup, autosquashed into its owning commit)

- (1) → `Stop starting DOI lookups after a per-request deadline`, the commit that adds the shared `FakeClock`. `test_sse_dispatch_cache.py` now imports it instead of defining its own copy. That's 17 lines gone, and the test's behavior is unchanged.
- (2) → `Read the Tool Shed's citation_cache_url from its own option`.
  - I deleted the hand-written `citation_cache_url` and `citation_cache_schema_name` lines, so the schema loader's values stand.
  - I checked the behavior directly: both options still come through from kwargs, both still default to `None`, and `citation_cache_table_name` is still `None`.
  - `test_citation_cache_url` passes, and it would still fail on base.
- (3) → `Share cached_fetch between DOI and bio.tools lookups`.
  - There's now one `CACHED_FETCH_FAILED` sentinel. A 404 is still stored without `expiretime`, and other failures are stored with `failure_expire`.
  - I kept the two `put` call shapes on purpose. beaker's `Cache._get_value` uses `kw.setdefault("expiretime", self.expiretime)`, so passing an explicit `expiretime=None` would bypass a cache-level `expire`.
  - `test_cached_fetch_can_keep_not_found` and `test_api_content_offline` still pin "404 kept past the failure TTL".
- (4) → same commit. `cache: Optional[FetchCache]` on the three bio.tools signatures and attributes. beaker `Cache` is untyped, so `tools/biotools.py` still type-checks.
- (5) → `Stop starting DOI lookups after a per-request deadline`. I dropped the unused `deadline` parameter; the budget always uses `DOI_FETCH_REQUEST_DEADLINE`.
- I reworded two commit bodies to match: the deadline commit now mentions the shared `FakeClock` and the SSE test, and the Tool Shed commit now describes deleting the two schema-duplicate lines. `git diff` of the tree before and after the reword is empty.

None of these change behavior, and no test was removed or weakened.

Verification:
- I ran the touched unit tests (`--exec`) at every rebased commit: 21→58 under a citation/DOI/bio.tools/bounded/config `-k` filter, all passing.
- At the tip, the full touched files pass: 71 tests, including `test_CitationsManager_db.py` and `test_sse_dispatch_cache.py`. `test_sse_dispatch_cache.py` also passes at the commit that now owns its change.
- ruff, black and isort are clean.
- mypy on the changed lib files shows only the known 3 `BaseCitation` errors in `citations.py`. `tool_shed/webapp/config.py` has the same pre-existing "Cannot determine type" errors as base: 12 on base, and 12 now, since the line numbers only shifted.
- `Add citation fetch config options` was picked unchanged, so its `galaxy.yml.sample` and `galaxy_options.rst` are byte-identical to before (`git diff` between the two picks is empty).
- I didn't rerun API tests, because no API-facing behavior changed.

## Declined

- (6) The 404 detection in `cached_fetch` depends on requests, and the helper sits beside its only fetch primitive, `bounded_get`. A new module for about 40 lines would be churn.
- (7) `InMemoryCache` is a published galaxy-tool-util name with one consumer, so moving it would break imports for nothing. cachetools isn't an option either: `TTLCache` has one TTL for the whole cache rather than per entry, and galaxy-tool-util doesn't depend on cachetools.
- (8) Making `CachedFetchSkipped` a subclass of `CachedFetchFailed`, or dropping it, would blur "budget spent" with "lookup failed" in the logs. Neither caller needs to tell them apart today. That's a nit.
- (9) Passing `may_fetch` instead of the budget would only move the `budget.take if budget is not None else None` conditional up into `DoiCitation`. It wouldn't delete anything.
- I didn't re-raise the first pass's declines: the Tool Shed `getattr` fallbacks, the module-level `citations_to_bibtex`, `allowed_schemes`, the shared `validate_non_local` partial, the `_iter_reads` fallback, and the exception-vs-`Optional` question. This pass's deletion of the Tool Shed lines doesn't change the `getattr` case. The new fetch options aren't in the Tool Shed schema, and adding them would create new admin-visible options that do nothing there.
- I also didn't re-raise anything John decided or parked: the release target, one cap for every tool, redirect checks without an allowlist, and the header-phase deadline gap in `bounded_get`.

No security-relevant findings came out of this review.
