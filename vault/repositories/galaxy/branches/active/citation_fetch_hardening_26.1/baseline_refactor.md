Run via Claude Opus 5.5 at high effort.

Two refactors were split out:
- **`FakeClock`** came out of the deadline commit as its own base-applicable commit at the start of PR B's refactor block.
- **`cached_fetch`**: the re-scope commit was split into a DOI-only refactor and the bio.tools behavior change. Both stay after the config commit.

Tip `1c52b49b926` → `cda4733996f`, now 19 commits. `git diff 1c52b49b926 cda4733996f` is empty. Backup branch: `citation_fetch_hardening_26.1_pre_baseline_refactor_2` (old tip). Nothing was pushed. First pass: [earlier_drafts/1/baseline_refactor.md](earlier_drafts/1/baseline_refactor.md).

## New commits

1. **`30369819298` Share FakeClock in galaxy.util.unittest_utils**
   - It moves the SSE dispatch cache tests' local `FakeClock` into `galaxy.util.unittest_utils`, with no behavior change.
   - The hunks are taken verbatim from the deadline commit.
   - `git merge-tree` against `origin/release_26.1` is clean, so it applies to the base.
   - It now has three consumers: the SSE tests, the DOI budget tests and the bio.tools tests.
   - It sits after `Use a separate beaker namespace for bio.tools lookups` and before the `parse_citations`/`citations_to_bibtex` refactors.
2. **`fffd53e4785` Move DoiCache's get-or-fetch policy into cached_fetch**
   - Files: `util/requests.py`, `managers/citations.py`, `test_requests.py` and `test_CitationsManager_db.py`.
   - `cached_fetch` lands whole, `cache_not_found` included, because `test_cached_fetch_hits_do_not_ask_may_fetch` uses it.
   - Output is unchanged. The internal exceptions change: `DoiFetchFailed`/`DoiFetchSkipped` become `CachedFetchFailed`/`CachedFetchSkipped`.
   - The first failure raises `CachedFetchFailed` instead of the underlying `HTTPError`, and the sentinel is renamed. The commit message says all three.
   - `git grep` at the config commit finds no catchers of the old exceptions beyond the DB test. The only caller, `DoiCitation.to_bibtex`, catches `Exception`.
3. **`a3208098d5c` Expire failed bio.tools lookups with cached_fetch**
   - Files: `biotools/source.py` and `test_metadata_source.py`.
   - This is the behavior change: bio.tools failures expire after 1h and 404s are kept.
   - `InMemoryCache` gets per-instance storage and expiry, with a shared `DEFAULT_CACHE`.
   - This commit is where `test_api_content_validates_redirects` is dropped. `test_challenges_debrief.md` explains why: it is covered by `test_biotools.py` and the `bounded_get` tests.

## Rewritten commits

- **`Stop starting DOI lookups after a per-request deadline`** (`77e30cdfb2b`) loses the `FakeClock` hunks and the `FakeClock` paragraph in its message. Its tree is identical to old `a657acaf849`.
- **The 9 commits from `parse_citations` through `Strip citation content`** differ from their old counterparts only by the `FakeClock` hunks.
- **`Add citation fetch config options`** (`65bbf129f24`) was re-created with `--no-verify`.
  - Its tree is identical to old `4f22904ceb7`.
  - `git diff 4f22904ceb7 65bbf129f24 -- lib/galaxy/config/sample/galaxy.yml.sample doc/source/admin/galaxy_options.rst` is empty.
- **The Tool Shed fix** (`cda4733996f`) has the same tree as old `1c52b49b926`.

## Placement of the cached_fetch split

The DOI half can't go on the base. It moves policy this branch adds: the failure TTL in `Briefly cache failed DOI lookups`, and the budget hook in `Limit uncached DOI lookups` and the deadline commit.

The bio.tools half needs `bounded_get` (PR A) and `FakeClock`.

Moving the pair before the config commit would gain nothing for splitting. The DOI half conflicts with config's context either way, on the `get_bibtex` def line and the DB-test imports, so one PR stacks on the other regardless. Keeping it after config also avoided rewriting the generated files again.

## Considered and left alone

- **`bounded_get`, bio.tools validator injection, `Tidy DoiCache URL validation`, `DoiCache._cache_options`**: the first-pass reasons still hold.
- **Tool Shed `citation_cache_url` fix**: it isn't a refactor. It is independent and applies cleanly to `origin/release_26.1` (`git merge-tree` is clean), so it stays at the end and can be cherry-picked as its own PR.

## Commit map (old → new)

| Old | New | Subject |
|---|---|---|
| 34c4806e4a2 | 34c4806e4a2 | Baseline tests for DOI and bio.tools metadata fetching |
| 20c3fb1fbd4 | 20c3fb1fbd4 | Add galaxy.util.requests.bounded_get |
| 2f586fd27c7 | 2f586fd27c7 | Bound DOI BibTeX fetches |
| 2b39d10e73a | 2b39d10e73a | Bound bio.tools API lookups |
| 8b1276118ae | 8b1276118ae | Use a separate beaker namespace for bio.tools lookups |
| — (from a657acaf849) | 30369819298 | Share FakeClock in galaxy.util.unittest_utils |
| 7c1c43a88f9 | 7656ba5692e | Move tool citation parsing into CitationsManager.parse_citations |
| fabddbca60b | 29c7e9162fb | Render citation BibTeX through CitationsManager.citations_to_bibtex |
| 78e4bd7ef73 | 30803f4bc6e | Don't fetch DOI BibTeX to dedupe against BibTeX citations |
| 6912666dc71 | 57c9e0c4727 | Briefly cache failed DOI lookups |
| e02a931cff1 | 42c4ce4421b | Limit uncached DOI lookups per citations request |
| 900e1545bb6 | 2e0590df304 | Cap citations per tool |
| 6bda0c97ac5 | 9629e375d9e | Tidy DoiCache URL validation |
| 42381dc23f9 | acdd29cb43d | Strip citation content in the Citation model |
| a657acaf849 | 77e30cdfb2b | Stop starting DOI lookups after a per-request deadline |
| 4f22904ceb7 | 65bbf129f24 | Add citation fetch config options |
| 39575753f14 | fffd53e4785 | Move DoiCache's get-or-fetch policy into cached_fetch |
| 39575753f14 | a3208098d5c | Expire failed bio.tools lookups with cached_fetch |
| 1c52b49b926 | cda4733996f | Read the Tool Shed's citation_cache_url from its own option |

## Suggested PR grouping

- **A, bounded fetches**: `34c4806e4a2`..`8b1276118ae` (5 commits).
- **B, DOI per-request limits**: `30369819298`..`77e30cdfb2b` (10 commits, 3 refactors first). Stacks on A.
- **C, config options**: `65bbf129f24`. Stacks on B.
- **D, shared cached_fetch and bio.tools expiry**: `fffd53e4785`, `a3208098d5c`. Stacks on C because of a textual conflict only.
- **E, Tool Shed `citation_cache_url`**: `cda4733996f`. Independent; it can lead or follow.

`30369819298` (`FakeClock`) could also go upstream on its own, ahead of B.

## Validation

- **Unit tests at all 14 rewritten commits**:
  - Files: test_CitationsManager(_db), test_sse_dispatch_cache, test_biotools, test_citations, test_requests, test_parsing, `tool_util/biotools/`, test_ontologies and test_tool_linters.
  - `tool_shed/test_config.py` also ran where present.
  - Every commit passes, 256 tests rising to 273 at the tip.
- **ruff, black, isort**: clean on the 3 new commits.
- **mypy**:
  - No new errors in `lib/`.
  - At the `cached_fetch` commit, `test_requests.py` has 3 "Need type annotation" errors. The original re-scope commit had the same errors, so the split didn't introduce them.
- **API tests**: not run. No API-facing code was newly split. The first pass ran the citations API tests at the refactor commits.

No security-relevant findings.
