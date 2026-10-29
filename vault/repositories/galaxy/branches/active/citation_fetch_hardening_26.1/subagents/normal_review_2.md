# Normal review 2 (phase 2: dedupe, failure caching, fetch budget, per-tool cap, model strip)

No bugs found. Acted on:
- API tests for `tools/{id}/citations` and `histories/{id}/citations`, added to the baseline commit. Both pass at baseline and HEAD.
- A BibTeX length boundary test.
- Return/parameter types on `get_bibtex` and `citations_to_bibtex`.
- A note in the failure-caching commit that beaker's creation lock is gone.
- The configured fetch budget now flows through `CitationsManager.citations_to_bibtex` (config commit).
- Separately, I raised the cap from 25 to 50: the in-tree `bibtex` test tool has 28 citations.

Not acted on:
- `ParsedTool` (Tool Shed tool API, `ToolVersionPage`) isn't capped. It only displays and never fetches. Moving the caps into `ToolSource.parse_citations` would collide with `yaml_tool_model_validation_26.1`'s `_parse_citation_list`. Called out for the PR body instead. A lint warning for over-cap citations would also suit a follow-up.
- The module-level `citations_to_bibtex` is kept beside the manager method: unit tests use it without an app.
- Pre-existing and out of scope: `agents/operations.py:get_tool_citations` attribute misuse, and beaker `ext:database` storing a namespace in a single row.

<details>
<summary>Full review</summary>

# Normal review 2 (raw) - phase 2, `50995660413..638155a6ec2`

## Verdict

Mergeable shape; no real bugs found. Budget/failure-cache/cap logic is correct across file and `ext:database` beaker backends, and shared `DoiCitation` state can't leak a stub across requests. Gaps are test boundary coverage, no API test for either citations endpoint, and one sibling-path divergence (`ParsedTool`/model_factory isn't capped). Committed state passes all citation unit tests (19 in managers/tools incl. the DB test; 23 citation-selected in parsing).

Reviewed at `638155a6ec2`. Note: during review a later commit `496022f4c7b` (config options) landed; before it landed, the uncommitted working tree broke `test_CitationsManager_db.py` (`MockDoiCache` lacked `_fetch_timeout`). That commit restructures `MockDoiCache` and is out of this review's range - re-run `test_CitationsManager_db.py` on it.

## Checked and fine

- **Shared `DoiCitation` state / thread-safety.** `DoiFetchBudget` is created per `citations_to_bibtex` call, never stored on a citation. `DoiCitation.raw_bibtex` memoizes only on success; skip and failure leave `BIBTEX_UNSET`, so a stub from an exhausted budget is not pinned on the shared `Tool`. Concurrent writes of `raw_bibtex` are the same value. `test_citations_to_bibtex_limits_fetches` second call proves the stub isn't memoized.
- **Beaker get/put semantics.** `Cache.get(key)` without `createfunc` raises `KeyError` when absent or expired (`container.Value.get_value`). `put(..., expiretime=600)` stores `(storedtime, 600, value)`, and `_is_expired` uses the *stored* expiry, so per-entry TTL works for every backend (file, memory, sqla/`ext:database`; `NamespaceManager.set_value` accepts `expiretime`). Old success entries stored with `expiretime=None` remain valid. DB test covers expiry on `ext:database`.
- **Loss of createfunc locking.** Concurrent misses on the same DOI may now fetch twice (no dogpile lock). For `ext:database` the old creation lock was namespace-wide (`databasecontainer/funclock/doi`), i.e. it serialized *all* DOI fetches across the process tree; dropping it is arguably an improvement. Duplicate fetches are bounded by the per-request budget. Worth one sentence in the "Briefly cache failed DOI lookups" commit message.
- **Failure marker collision.** `"__galaxy_doi_fetch_failed__"` would require doi.org returning exactly that body; negligible. A non-str sentinel (e.g. a small tuple) would remove the possibility entirely, but pickling-across-backends makes the string the simpler choice. Fine as is.
- **Other `to_dict`/`to_bibtex` callers.** Only `api/tools.py` `citations` and `services/histories.py` `citations` render BibTeX; both now go through `citations_to_bibtex`. `BaseCitation.equals` still calls `to_bibtex()` without budget, but only on BibTeX-vs-BibTeX after this phase (no fetch). `galaxy/agents/operations.py:get_tool_citations` reads `getattr(citation, "doi"/"bibtex"/...)` and never fetches. Markdown/pages/invocation reports only use `instance_citation_*` config values. No missed fetch path.
- **Cap vs `CitationCollection` dedupe.** Cap is per tool at load; dedupe is across tools per request; fetch budget then bounds lookups for large histories. Order is sensible. Cap counts only citations that parse (unknown types already dropped).
- **Cap vs XML profile handling.** `xml.py parse_citations` still fails 26.1+ tools on invalid citations and warns/skips for older; the cap and oversized-BibTeX skip apply after that, uniformly, with a warning - matches John's "one cap, no profile gating, no load failure".
- **Tool Shed.** `lib/tool_shed/webapp/app.py` builds `CitationsManager`; Tool Shed config lacks `fetch_url_allowlist_ips`, handled by the `getattr` in `DoiCache.__init__`. Tool Shed tools loaded via `Tool` get the cap too. Tool Shed exposes no BibTeX rendering endpoint, so the budget doesn't matter there.
- `self.id` is set (`tools/__init__.py:1364-1368`) before `_parse_citations` runs, so the warning gets the real id.
- Imports all at module top. Comments short.

## Bugs

None.

## Should-fix / worth considering

1. **No API coverage for either citations endpoint.** `lib/galaxy_test/api` has no test for `GET /api/tools/{id}/citations` or `GET /api/histories/{id}/citations`; reverting either wiring line to `citation.to_dict("bibtex")` passes all unit tests. Only `lib/galaxy_test/selenium/test_tool_form.py` (~L400, `tools/bibtex/citations`) exercises the tool endpoint - worth running that one Selenium test, or (better) add a small API test for both endpoints using a BibTeX-only tool (`bibtex` test tool) so no network is needed and response shape/order is pinned. Not strictly needed for the budget logic, which is unit-tested.
2. **Sibling divergence: `ParsedTool` (`tool_util/model_factory.py:40`) is uncapped.** It calls `tool_source.parse_citations()` directly, so the Tool Shed tool API / `ToolVersionPage.vue` and other ParsedTool consumers still carry all citations and oversized BibTeX. No fetches happen there, so it's display/size only. Options: move the 25/32KB limits into `ToolSource.parse_citations` (one place for every consumer) or leave it and say so in the PR. Also consider a linter warning for >25 citations / oversized BibTeX so authors learn about the drop rather than only admins via logs.
3. **`citations_to_bibtex` is both a module function and a manager pass-through method.** The manager method takes no `max_fetches`, so once config options land (`496022f4c7b`) make sure the configured value flows through the method rather than the module default. Consider keeping only the manager method (callers already depend on the manager) to avoid accretion.

## Nits

- Boundary untested: mutating `len(content) > MAX_BIBTEX_CITATION_LENGTH` to `>=` passes all tests. A test with exactly `MAX_BIBTEX_CITATION_LENGTH` chars kept would pin it (cheap, matches the response-cap boundary test style).
- `parse_citations` cap: the `if len(...) > MAX` only gates the warning; slice is always right. No test asserts the warning, fine.
- `equals` mixed-type branch behavior change (DOI vs equivalent BibTeX no longer deduped) - practically the old exact-string compare never matched; mention in PR body.
- `DoiCache.get_bibtex` lacks a return type (`-> str`); `citations_to_bibtex(citations)` param untyped (`Iterable[CitationT]`).
- Pre-existing, out of scope: `agents/operations.py:get_tool_citations` reads `citation.doi` (a bound method, not a value) and `citation.type` (no such attr) - output is wrong/unserializable for DOI citations. Separate issue.
- Pre-existing, out of scope: `ext:database` beaker backend keeps the whole `doi` namespace in one pickled row and caches it per process (`loaded`), so multi-process writes are last-writer-wins. Failure markers add a few more writes; not worth addressing here.

## Mutation results (throwaway worktree at `638155a6ec2`)

| Mutation | Caught? |
|---|---|
| Budget check removed (`if False:`) | yes (1 fail) |
| `equals` mixed-type branch removed | yes (1 fail) |
| Failure TTL x1000 | yes (2 fail: file + DB) |
| BibTeX length `>` -> `>=` | **no** |
| Cap threshold +1 (warning gate only) | no (harmless; slice unchanged) |

## Tests worth running

- Unit (all pass at `638155a6ec2`): `test/unit/app/managers/test_CitationsManager.py`, `test/unit/app/managers/test_CitationsManager_db.py`, `test/unit/app/tools/test_citations.py`, `test/unit/tool_util/test_parsing.py -k citation`.
- Selenium (one, optional): `lib/galaxy_test/selenium/test_tool_form.py` citations test.
- No existing API tests hit citations endpoints.

</details>
