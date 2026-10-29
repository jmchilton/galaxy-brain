Run via Claude Opus 5.5 at high effort.

# citation_fetch_hardening_26.1: test challenges debrief (second pass, after re-scope)

Tip before: `eecdf72d007`. Tip after: `c096e6ce883`. All fixups were autosquashed without conflicts, and the branch still has 17 commits. Because the Baseline tests commit changed, every SHA changed:

| old | new | commit |
| --- | --- | --- |
| `fca40862660` | `34c4806e4a2` | Baseline tests for DOI and bio.tools metadata fetching |
| `e39f0a9d505` | `20c3fb1fbd4` | Add galaxy.util.requests.bounded_get |
| `96fc28183ad` | `2f586fd27c7` | Bound DOI BibTeX fetches |
| `4a554b4aa90` | `2b39d10e73a` | Bound bio.tools API lookups |
| `39322243b13` | `8b1276118ae` | Use a separate beaker namespace for bio.tools lookups |
| `35e0559eb05` | `7c1c43a88f9` | Move tool citation parsing into CitationsManager.parse_citations |
| `67ba4fe4be6` | `fabddbca60b` | Render citation BibTeX through CitationsManager.citations_to_bibtex |
| `6ca8ce8a682` | `78e4bd7ef73` | Don't fetch DOI BibTeX to dedupe against BibTeX citations |
| `cd7113cae2a` | `6912666dc71` | Briefly cache failed DOI lookups |
| `974c609a827` | `e02a931cff1` | Limit uncached DOI lookups per citations request |
| `c8b7e649910` | `900e1545bb6` | Cap citations per tool |
| `67b248eb14f` | `6bda0c97ac5` | Tidy DoiCache URL validation |
| `f76acf266dd` | `42381dc23f9` | Strip citation content in the Citation model |
| `2b2e8c4d435` | `d4f69a167b5` | Stop starting DOI lookups after a per-request deadline |
| `8fb806e8e37` | `f543d7c13ab` | Add citation fetch config options |
| `dce887714d5` | `95592a08ad5` | Share cached_fetch between DOI and bio.tools lookups |
| `eecdf72d007` | `c096e6ce883` | Read the Tool Shed's citation_cache_url from its own option |

The content was changed only in the Baseline tests commit, "Bound DOI BibTeX fetches", the deadline commit and the `cached_fetch` commit. The config commit's generated `galaxy.yml.sample` and `galaxy_options.rst` are byte-identical (`git diff 8fb806e8e37 f543d7c13ab` on them is empty).

## Changes

- **Moved `test_doi_cache_follows_public_redirect` from "Bound DOI BibTeX fetches" into the Baseline tests commit.**
  - With `release_26.1`'s `_raw_get_bibtex` (`requests.get`, which follows redirects by default) it passes, so it pins existing behavior.
  - It now sits after `test_doi_cache_requests_bibtex_and_caches`. It passes at the baseline (122 tests there).
- **Clock-injection commit dependency.** For PR splitting: `FakeClock` is added in the deadline commit, and the `cached_fetch` commit's tests import it. Keep those two commits together, or move `FakeClock` with whichever lands first.
- **Clock injection replaces module `time` monkeypatching.** Before, tests swapped a module's whole `time` attribute for a `Bunch(monotonic=...)`.
  - `DoiFetchBudget(max_fetches, deadline, clock=time.monotonic)` (`d4f69a167b5`) and `InMemoryCache(clock=time.monotonic)` (`95592a08ad5`) now take the clock as a parameter.
  - Galaxy already does this elsewhere: `SSEEventDispatcher` takes a clock, and its tests pass a `FakeClock`.
  - A shared `FakeClock` was added to `galaxy.util.unittest_utils` (`d4f69a167b5`). Both test modules use it.
- **`test_citations_to_bibtex_stops_fetching_after_deadline` is now `test_doi_fetch_budget_stops_fetching_after_deadline`** (`d4f69a167b5`). It drives `citation.to_bibtex(DoiFetchBudget(10, clock=clock))` directly, with no monkeypatch.
  - `citations_to_bibtex`'s signature is unchanged. The per-request max-fetch path is still covered by `test_citations_to_bibtex_limits_fetches` and `test_citations_manager_reads_max_fetches_config`.
- **`test_api_content_offline` and `test_api_content_retries_failed_lookup_after_expiry`** (`95592a08ad5`) pass `InMemoryCache(clock=FakeClock())` and call `clock.advance(...)`. They no longer use `monkeypatch`, `Bunch` or `import time`.
- **`test_in_memory_caches_are_independent` is now `test_api_sources_with_separate_caches_do_not_share_lookups`** (`95592a08ad5`).
  - The old test called `InMemoryCache.put`, which doesn't exist before the change, so it failed with an `AttributeError` and not at its own assertion.
  - The new test makes two `ApiBiotoolsMetadataSource(cache=InMemoryCache())` lookups of `bwa` and asserts 2 requests. Before the change the class-level dict was shared, so it fails with `assert 1 == 2`.
- **Dropped `test_api_content_validates_redirects`** (`test_metadata_source.py`). Two tests already cover it:
  - `test_biotools_lookup_does_not_follow_redirect_to_local_address` (app level, real `validate_non_local` wiring through the cascading source) checks that `ApiBiotoolsMetadataSource` passes `validate_url` through.
  - `test_bounded_get_follows_validated_redirects` and `test_bounded_get_rejected_redirect_is_not_requested` check that every hop is validated.
  - The old test also failed before `4a554b4aa90` on the missing `validate_url` keyword, not at its own assertion.
  - The drop went into the `dce887714d5` fixup, not `4a554b4aa90`. Removing the block that `dce887714d5` appends after would conflict on rebase. Between `4a554b4aa90` and `dce887714d5` it still passes.

## Red checks

Each rewritten test was checked by removing the behavior while keeping the clock seam:

| check | result |
| --- | --- |
| `source.py` from before `dce887714d5` (class-level dict) | separate-caches test fails, `assert 1 == 2` |
| `InMemoryCache.get` expiry check removed | `retries_failed_lookup_after_expiry` fails, `assert None is not None` |
| `cache_not_found=False` in the bio.tools source | `test_api_content_offline` fails, `assert 3 == 2` |
| `release_26.1`'s `_raw_get_bibtex` body at the tip | the encode, local-redirect and size-cap DOI tests fail; the public-redirect test passes, so it was moved to the baseline |
| Tool Shed `config.py` from before the fix | `test_citation_cache_url` fails, `'/tmp/locks' == 'postgresql:///citations'` |
| deadline check removed from `DoiFetchBudget.take` | deadline test fails at `assert all(...)` |

The `test_bounded_get_*` and `test_cached_fetch_*` tests exercise new functions, so without the change they can only fail on the missing API. That's expected for new shared infrastructure; their consumers' tests above are red at their own assertions.

The clock-seam tests can't be shown red by checking out the pre-change commit. The seam (`clock=` or `import time`) arrives together with the behavior, so that run fails on the API instead. The red runs above remove the behavior and keep the seam.

## Validation

- The touched unit set passes at every commit, from 122 at the baseline to 158 at the tip. The set is `test_CitationsManager.py`, `test_CitationsManager_db.py`, `app/tools/test_biotools.py`, `app/tools/test_citations.py`, `tool_util/biotools/`, `util/test_requests.py`, `tool_shed/test_config.py` and `tool_util/test_parsing.py`.
- isort, black and ruff are clean. ruff's UP035 moved `Callable` into the existing `collections.abc` import.
- mypy shows the same three `BaseCitation has no attribute` errors in `citations.py` as `release_26.1`.
- No API test changed, so none were rerun.

## Kept as is, and why

- **API tests** (`test_tool_citations`, `test_history_citations`).
  - Each URL is fetched once in the API tests. The Selenium `test_bibtex_rendering` fetches `tools/bibtex/citations` twice, but through the Selenium mixin's own `api_get`, not a populator.
  - A `DatasetPopulator` citations helper would only serve one API caller, so none was added.
- **Overlapping failure-TTL tests.** Four tests check failure-TTL behavior:
  - `cached_fetch` with a beaker memory cache.
  - DoiCache with the file backend.
  - DoiCache with the database backend.
  - bio.tools with `InMemoryCache`.

  The `cached_fetch` test covers the shared policy. The other three check each consumer's wiring (`failure_expire`, `cache_not_found`) and each backend's per-entry `expiretime`. A regression in any one of those shows up only in its own test.
- **`test_bounded_get_enforces_total_deadline_across_redirects`** still patches `galaxy_requests.time.monotonic`.
  - That is the stdlib `time` module, so the patch applies globally for the duration of the test, and the fake clock depends on how many times the clock is read.
  - A real-server version would need a slowly trickled redirect head and about 1.5s. Adding a `clock` parameter to the public `bounded_get` only for tests isn't worth it, and the earlier pass's reasoning still holds.
- **`beaker.container.time.time` patches** in the DOI expiry tests. Beaker reads its own clock, so it can't be injected without wrapping beaker.
- **`test/unit/tool_shed/test_config.py`** is a new file for a one-line fix.
  - It is product config, not test or dev infrastructure, and there was no existing Tool Shed config test file to add it to.
  - It is red without the fix (re-run this pass).
- **`Bunch` configs** and **`fake_dns` vs `fake_public_dns`**. These follow-ups are unchanged from [earlier_drafts/1/test_challenges_debrief.md](earlier_drafts/1/test_challenges_debrief.md).
- **The bwa JSON fixture is read in four `test_metadata_source.py` tests.** A `_bwa_json()` helper would be tidier, but adding it would touch three commits. Nit, not done.
- **E2E**: no UI change. The existing Selenium `test_bibtex_rendering` covers rendering.

## Follow-ups

- `test/unit/app/managers/test_sse_dispatch_cache.py` defines its own `FakeClock`, identical to the new `galaxy.util.unittest_utils.FakeClock`. It could import the shared one. Not done, because that file is outside this branch.
