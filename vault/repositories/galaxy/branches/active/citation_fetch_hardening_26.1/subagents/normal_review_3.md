# Normal review 3 (re-scope: shared cached_fetch, Tool Shed citation_cache_url)

No bugs found. Acted on:
- `FetchCache.put` now names `expiretime` explicitly.
- A bio.tools 404 is shown to stay cached past the failure TTL; the test fails if `cache_not_found` is turned off.
- `CachedFetchFailed` messages carry the first failure's cause.
- Renamed `FetchSkipped` to `CachedFetchSkipped`.
- The bio.tools retry test now patches the module's `time` instead of the global one.
- `_is_not_found` reads `e.response` directly.

Not acted on:
- `InMemoryCache` keeps the new `get`/`put` interface and doesn't accept the old `createfunc` form. Nothing in Galaxy or planemo uses the old form; it's noted for the PR body since galaxy-tool-util is published.
- Treating a legacy persisted `None` as a miss: Galaxy's bio.tools cache moved to a new namespace earlier on this branch, so it can't hit this.
- If `citation_cache_expire` is set below 600, cached failures outlive cached successes. That's an admin-chosen edge case, noted for the PR body.

<details>
<summary>Full review</summary>

Run via Claude Opus 5.5 (subagent reviewer).

# Normal review 3: re-scope commits `8fb806e8e37..2bc8c6ee685`

**Verdict: approve with small follow-ups. No blocking bugs.** `cached_fetch` matches beaker's `get`/`put` semantics. bio.tools parity holds: a 404 is kept, other failures are retried after an hour, and the linter keeps a shared process-wide cache. The Tool Shed fix is correct and has a test that would fail without it. Targeted tests pass (62 passed, covering `test_requests`, `test_metadata_source`, `tool_shed/test_config`, `test_CitationsManager`, `test_CitationsManager_db` and `app/tools/test_biotools`). ruff and black are clean, and mypy reports nothing new in the changed hunks (the `citations.py:208-220` `BaseCitation` errors are outside this range). No security findings.

## Bugs

None found.

## Should fix (small)

1. **`FetchCache.put` hides `expiretime` inside `**kwargs`** (`lib/galaxy/util/requests.py`). `cached_fetch` relies on the cache honoring `expiretime`. A cache that satisfies the Protocol but quietly drops unknown kwargs would cache failures forever, which is the bug this re-scope fixes. Make it explicit:
   ```python
   def put(self, key: str, value: Any, expiretime: Optional[float] = None) -> None: ...
   ```
   Then drop `**kwargs` from `InMemoryCache.put`. beaker's `Cache` is untyped, so this costs nothing. Also align `failure_expire: int` with `expiretime: Optional[float]` (either type is fine, but use one).

2. **Test gap: bio.tools `cache_not_found=True` isn't pinned at the source level.** In `test_api_content_offline` both 404 lookups happen within the 1h failure TTL. If `ApiBiotoolsMetadataSource` passed `cache_not_found=False`, every biotools test would still pass, and only the util-level `test_cached_fetch_can_keep_not_found` covers the behavior. Add a step that moves time past `BIOTOOLS_FAILURE_EXPIRE` and asserts that `johnscoolbowtie` is not refetched, mirroring `test_api_content_retries_failed_lookup_after_expiry`.

3. **The DOI failure log loses its cause.** `DoiCitation.to_bibtex` logs `log.debug("No bibtex for DOI %s: %r", doi, e)`. `e` is now `CachedFetchFailed('10.x/…')`, so the first-failure reason (timeout, refused by validator, oversize, HTTP status) disappears from the log. Before this change it showed the original exception. Either build the message with the cause (`CachedFetchFailed(f"{key}: {e!r}")`) or log with `exc_info=True`. A one-line change keeps operators able to debug citation failures.

## Behavior and compatibility notes (judged acceptable, note in the PR)

- **beaker semantics check out.** `Cache.put(key, v, expiretime=N)` stores `(storedtime, N, v)`, and `get(key)` without `createfunc` checks the per-entry stored expiry and raises `KeyError` on a miss or expiry (`beaker/container.py` `Value.get_value`, beaker 1.13.0). A success `put` with no `expiretime` gets the cache-level `expire` (`citation_cache_expire` for DOI, `None` for the `"biotools"` cache). A failure `put` overrides it with `failure_expire`. One pre-existing quirk from `cd7113cae2a`: if `citation_cache_expire` is less than 600, failures outlive successes. Harmless.
- **The DOI exception type changed on first failure** (`HTTPError`/`BoundedFetchError` → `CachedFetchFailed`). The only production caller (`DoiCitation.to_bibtex`) catches `Exception`, so the type change has no functional effect. The old `DoiFetchFailed`/`DoiFetchSkipped`/`DOI_FETCH_FAILED` names have no other references in `lib/` or `test/`. Old cached `__galaxy_doi_fetch_failed__` entries expire within 10 minutes and were never released, so the sentinel rename is safe.
- **The `InMemoryCache` public interface changed** (`get(key, createfunc)` → `get(key)`/`put`, and the class-level `backend` dict is gone). Nothing in this repo, a local planemo clone or galaxy-language-server calls it or passes a createfunc-style cache. beaker `Cache` objects, the only real external cache type, still work. galaxy-tool-util is published, so a consumer that passes a custom `get(key, createfunc)` cache to `ApiBiotoolsMetadataSource(cache=...)` or `BiotoolsMetadataSourceConfig.cache` would now get a `TypeError`. That risk looks low. Mention it in the PR, or keep `get(key, createfunc=None)` tolerant if you want zero breakage.
- **No dogpile lock for bio.tools.** The old `get(key, createfunc=...)` path used beaker's creation lock. Concurrent misses now fetch in parallel. Toolbox loading is effectively serial, and DOI has worked this way since `cd7113cae2a`. Fine.
- **Legacy `None` values.** A persisted cache that holds `None` from the old createfunc path would make `cached_fetch` return `None` and `json.loads(None)` raise. Galaxy can't hit this, because `39322243b13` moved bio.tools to a fresh `"biotools"` namespace in the same PR. External persistent caches are the only exposure. Optional: treat `None` as a miss.
- **Linter and `DEFAULT_CACHE`.** Before this change, every `InMemoryCache()` shared one class-level dict, so `BioToolsValid` reused lookups across xrefs. `DEFAULT_CACHE` keeps that sharing for `ApiBiotoolsMetadataSource()` with no args, while explicit `InMemoryCache()` instances are now independent, which is correct. Growth is bounded by the distinct references seen, as before. Thread races in `InMemoryCache.get` (a double `del`) surface as `KeyError`, which means a miss, so they're benign.
- **Package boundaries are fine.** `galaxy.util.requests` imports only requests and typing_extensions, and `typing-extensions` is already in `packages/util/setup.cfg`. `tool_util/biotools/source.py` imports only `galaxy.util.requests`, and `galaxy.files` stays in `lib/galaxy/tools/biotools.py`. Imports are at module top.

## Nits

- `test_api_content_retries_failed_lookup_after_expiry` uses `monkeypatch.setattr(source_module.time, "monotonic", ...)`, which patches the global `time.monotonic`, including `bounded_get`'s deadline. It works because the lambda is constant, but it's fragile. Replacing the module attribute (as `test_CitationsManager` does with `Bunch(monotonic=...)`) is narrower.
- `FetchSkipped` vs `CachedFetchFailed`: consider `CachedFetchSkipped` for a matching pair. Optional.
- `_is_not_found`: `isinstance(e, exceptions.HTTPError) and e.response is not None and e.response.status_code == 404` reads more simply than `getattr`, since `HTTPError` always has `.response`.
- `tool_shed/test_config.py` is a good red→green test. `/tmp/locks` is never created (verified), so it's fine.

## Reuse

`cached_fetch` is the shared get-or-fetch policy the scope evaluation asked for. Both cache-backed remote lookups in the codebase (DOI, bio.tools) now use it, and there is no other `createfunc=` beaker user left in `lib/`. Placing it in `galaxy.util.requests` beside `bounded_get` is reasonable, since its not-found detection is requests-specific.

</details>
