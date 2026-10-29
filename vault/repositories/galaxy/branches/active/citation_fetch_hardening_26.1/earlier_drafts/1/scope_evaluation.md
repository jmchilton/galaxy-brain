Run via Claude Opus 5.5 at high effort.

# citation_fetch_hardening_26.1 — scope evaluation

**Recommendation: expand modestly (Scope 2).** John's scope asks for "reusable cached-fetch infrastructure", but the branch only shares the fetch half (`bounded_get`). The cache policy (get, else fetch, with a short failure TTL) exists only inside `DoiCache.get_bibtex`. bio.tools still uses beaker `get(key, createfunc)` and swallows every error to `None`, and beaker persists that `None` with no expiry, so a failed lookup is pinned for good on deployments that enable `biotools_use_api` (default off; cache default `file`). The branch makes this more likely: its new `"biotools"` namespace forces a cold refetch of every bio.tools xref at the first toolbox load after upgrade, and its 15s cap (was 600s) turns slow answers into failures. Pull the DOI cache policy into a small shared get-or-fetch helper in `galaxy.util`, route both lookups through it, and fix the one-line Tool Shed `citation_cache_url` config bug that feeds `DoiCache`. Everything else raised is either the yaml branch's Scope 2, dev-only, or a different seam.

Evaluated at `8fb806e8e37` (15 commits) against `origin/release_26.1`. No new security findings. The prior reviews' withheld items are unchanged and no scope below depends on them.

## Possible Decompositions

Size: +901/−71 (972 changed lines) across 21 files. `galaxy_options.rst` and `galaxy.yml.sample` (+47) are generated, which leaves about 925 non-generated changed lines. Production under `lib/galaxy` (schema included, sample excluded) is +254/−52; the rest is tests. Commits, oldest first:

| # | SHA | Subject | Size |
|---|---|---|---|
| 1 | `fca40862660` | Baseline tests for DOI and bio.tools metadata fetching | +145/−10 |
| 2 | `e39f0a9d505` | Add `galaxy.util.requests.bounded_get` | +236 |
| 3 | `96fc28183ad` | Bound DOI BibTeX fetches | +78/−18 |
| 4 | `4a554b4aa90` | Bound bio.tools API lookups | +52/−11 |
| 5 | `39322243b13` | Separate beaker namespace for bio.tools | +58/−1 |
| 6 | `35e0559eb05` | Refactor: `CitationsManager.parse_citations` | +11/−7 |
| 7 | `67ba4fe4be6` | Refactor: `CitationsManager.citations_to_bibtex` | +10/−2 |
| 8 | `6ca8ce8a682` | Don't fetch DOI BibTeX to dedupe against BibTeX | +13 |
| 9 | `cd7113cae2a` | Briefly cache failed DOI lookups | +62/−4 |
| 10 | `974c609a827` | Limit uncached DOI lookups per request | +50/−8 |
| 11 | `c8b7e649910` | Cap citations per tool | +38/−2 |
| 12 | `67b248eb14f` | Tidy DoiCache URL validation | +12/−8 |
| 13 | `f76acf266dd` | Strip citation content in the `Citation` model | +9/−5 |
| 14 | `2b2e8c4d435` | Per-request deadline on DOI lookups | +28/−3 |
| 15 | `8fb806e8e37` | Add citation fetch config options | +125/−18 |

Ordering constraints:
- 3 and 4 need 2.
- 12 tidies code that 3 added, so it can't land without 3. It sits in B but logically belongs to A.
- 9, 10 and 14 build on `DoiCache.get_bibtex` as reshaped in 3.
- 15 wires config into code from 3, 9 and 10.
- 6, 7, 8, 11 and 13 don't need A's changes.
- Under Scope 2, the shared cache helper lands in A after 5. Commit 9 then becomes "DoiCache uses the helper", or the helper is extracted from 9 in place.

**Option A: three PRs (the current plan).**
1. Bounded fetches: commits 1–5 (+12 as a fixup into 3).
2. Citation resolution limits: commits 6–11, 13 and 14.
3. Config options: commit 15.

**Option B: two PRs.** Fold the config options into the limits PR. Commit 15 is mostly generated docs plus three schema entries. Reviewers on a release branch often want a new limit and the knob to tune it in one place.

**Option C: four PRs, with the independent limits first.**
1. Fetch-free fixes that need nothing else: 6, 7, 8, 11 and 13. These are the dedupe-without-fetch, per-tool cap and content-strip changes.
2. Bounded fetches: 1–5 and 12.
3. DOI request budget: 9, 10 and 14.
4. Config: 15.

C.1 needs no network code. It does not unblock yaml Scope 2 on its own, since that needs the bounded fetch and budget (C.2, C.3). C reorders 6–8, 11 and 13 ahead of 1–5; that reorder hasn't been test-cherry-picked, and the shared test files (`test_CitationsManager.py`, `test_citations.py`) may conflict. C.1's baseline tests would have to be cut out of commit 1.

**Option D: one PR.** Every behavior commit is red→green or a no-behavior refactor, so review can go commit by commit.

## Scope 1 — As implemented

`bounded_get` gives DOI and bio.tools lookups a deadline, a size cap, https only, and a `validate_non_local` check per redirect hop. DOI lookups get a 10-minute failure cache, a per-request budget (count plus a 30s deadline), and no fetch for mixed-type dedupe. Every tool source is capped at 50 citations, and BibTeX entries over 32KB are dropped with a warning. Three config options were added.

| Pros | Cons |
|---|---|
| - Matches John's decisions: release_26.1, one cap, `validate_non_local` per hop, split-friendly history<br>- `bounded_get` sits in the right layer and has two real callers<br>- Caps live in one place (`CitationsManager.parse_citations`), so YAML and user tools get them as soon as they load citations<br>- No reviewer found an open bug; tests are red→green | - "Reusable cached-fetch infrastructure" is only half done. The failure TTL is DOI-only<br>- bio.tools failures are pinned permanently, and the branch's namespace rename plus the 15s cap make the first restart after upgrade the likeliest time for that (Scope 2)<br>- The `ParsedTool` / Tool Shed display path stays uncapped (Scope 4)<br>- Parked: the header-phase deadline gap in `bounded_get` |

## Scope 2 — Modest expansion: shared cached-fetch helper, plus the Tool Shed config fix (recommended)

Extract `DoiCache.get_bibtex`'s policy into a small helper in `galaxy.util`, so `tool_util` can import it. The policy is: cache get; on a miss, an optional budget check; fetch; on failure, put a failure marker with a short `expiretime`; else put the value. Use it for the bio.tools API source too, keeping its current "return `None` on failure" API. Give `InMemoryCache` `put` with expiry and an instance-level dict. Also fix `tool_shed/webapp/config.py:134`, which reads `citation_cache_url` from the `citation_cache_lock_dir` key.

| Pros | Cons |
|---|---|
| - Delivers the "reusable cached-fetch infrastructure" in John's own scope line, not just the fetch half<br>- Fixes permanent bio.tools miss pinning, which the branch makes more likely (cold namespace, 15s cap)<br>- Builds the general piece and routes both existing cases through it, with no new one-off logic<br>- Fixes the shared class-level `InMemoryCache` dict the test challenge flagged; `_DictCache` in the tests can then go<br>- The Tool Shed fix is one line in config that feeds `DoiCache`, which this branch rewrites and already special-cases for the Tool Shed<br>- Rough size: about 30–40 production lines and 3–4 unit tests, all in PR A | - Touches `galaxy.tool_util.biotools`, a Galaxy-agnostic package that planemo consumes. The API stays the same, but the cache contract gains `put`<br>- One more re-review of PR A<br>- bio.tools has no `*_expire` config, so the failure TTL is a constant (DOI's is too)<br>- Negative caching vs transient failure: a definitive 404 (stale xref) must stay cached long or forever; only timeouts, connection errors and 5xx get the short TTL. A blanket TTL would refetch every stale xref serially at toolbox load<br>- The Tool Shed fix is pre-existing and unrelated to fetching; it could ride alone |

<details>
<summary>Details</summary>

- Verified with the worktree's beaker: a file-backed `get_cache("biotools")` whose `createfunc` returns `None` stores it. A second `CacheManager` on the same dir returns `None` without calling `createfunc`. `get_galaxy_biotools_metadata_source` passes no `expire`, and the config schema has no `biotools_service_cache_expire`, so the miss never expires. This applies only with `biotools_use_api: true` (default false); the default cache type is `file`, which is what was tested. The performance debrief's "until the cache expires" is wrong for that setup.
- `ApiBiotoolsMetadataSource._raw_get_metadata` catches every exception, including `bounded_get` timeouts and redirect refusals, and returns `None`. That `None` is what gets cached.
- A helper shape that fits both callers: `cached_fetch(cache, key, fetch, failure_expire, budget=None)`. It returns the value or raises a `FetchFailed`/`FetchSkipped`. DoiCache keeps its exception contract (the DB test asserts `DoiFetchFailed`; subclass it or alias it). bio.tools catches and returns `None`.
- The helper must branch on failure kind. `bounded_get` raises `HTTPError` via `raise_for_status`, so a 404 can be stored as a long-lived or permanent `None` while timeouts, connection errors and 5xx get the short failure TTL. DOI lookups could use the same split (doi.org 404 = unknown DOI).
- The beaker creation lock is dropped for bio.tools too. That's the trade-off already accepted for DOI, and it's harmless at toolbox load, which is serial.
- Tool Shed: when `citation_cache_lock_dir` is set, `citation_cache_url` becomes that path, which matters for `ext:database`. When it's unset, `citation_cache_url` is `None` whatever `citation_cache_url` says. One line, plus a config unit test.

</details>

## Scope 3 — Absorb the yaml branch's Scope 2 here (user-tool citation resolution)

Resolve user tools in `GET /api/tools/{id}/citations` (by uuid plus `trans.user`) and in history citations (through `ToolBox.tool_for_job`).

| Pros | Cons |
|---|---|
| - Puts every citation change in one branch<br>- The history-citations "Tool not found" entries for user-tool jobs are pre-existing and independent of YAML loading | - YAML and user-tool citations only load on `yaml_tool_model_validation_26.1`, so the endpoint half can't be tested end to end here<br>- It carries the parked decision on whether user tools may fill the shared DOI cache<br>- Crosses into the client (`ToolFooter`/`ToolCard`)<br>- This branch exists to unblock that work, not to own it |

## Scope 4 — Cap `ParsedTool` too: move the limits into `tool_util`

Move `MAX_CITATIONS_PER_TOOL` and `MAX_BIBTEX_CITATION_LENGTH` into a `tool_util`-level helper, for example next to `Citation` in `tool_util_models`. Call it from both `CitationsManager.parse_citations` and `model_factory.parse_tool`.

| Pros | Cons |
|---|---|
| - Removes the sibling divergence normal review 2 flagged; the Tool Shed tool API and `ToolVersionPage` stop carrying oversized citations<br>- One home for the limits, which a linter can also read | - `ParsedTool` never fetches, so this is display and size only<br>- Collides with the yaml branch's `ToolSource._parse_citation_list`. Easier after that branch lands<br>- The PR-body note already covers it |

## Scope 5 — Lint warning for over-cap or oversized citations

Have `CitationsInvalid` (`tool_util/linters/citations.py`) warn when a tool has more than 50 citations or a BibTeX entry over 32KB.

| Pros | Cons |
|---|---|
| - Authors learn about the drop at lint time, not only admins through logs<br>- `CitationsInvalid` already builds `Citation` per entry, so it's a few lines | - Needs Scope 4's move first, because linters can't import `galaxy.managers`<br>- The citation linters read `xml_tree` only, so YAML and user-tool authors, whom the cap mostly targets, wouldn't see it<br>- No real tool is near either limit (tools-iuc max: 8 citations, about 1.4KB) |

## Scope 6 — Fix `agents/operations.py:get_tool_citations`

It reads `citation.doi` (a bound method) and `citation.bibtex`/`citation.type` (missing attributes). The output is unserializable for DOI citations and never includes BibTeX.

| Pros | Cons |
|---|---|
| - A real pre-existing citation bug, about 5 lines plus a unit test | - Reads `tool.citations` and never fetches, so it touches nothing this branch changes<br>- It's the agents seam, so it's better as its own small release fix |

## Scope 7 — Route other external `requests.get` callers through `bounded_get`

Candidates include `workflow/trs_proxy.py`, `services/help.py` (no timeout at all), `controllers/async.py` and `tools/error_reports/plugins/base_git.py`.

| Pros | Cons |
|---|---|
| - More callers for the new helper; several of them use the 600s default or no timeout | - Each is a different seam, with its own semantics for redirects, streaming and error shape<br>- Some need non-https or allowlisted internal hosts<br>- Far beyond "citation hardening"; better as a dev follow-up per caller |

## Scope 8 — Contractions

- **Drop the config options (commit 15).** It removes 125 lines, mostly generated, but the limits can't be tuned without a code change. Admins who hit doi.org slowness would have no recourse. Not recommended.
- **Drop the bio.tools hardening (commits 4–5).** That leaves the 600s bio.tools fetch, which runs at toolbox load, unbounded. It's the opposite of Scope 2. Not recommended.
- **Drop the per-request deadline (14).** It's 28 lines, and without it the default worst case goes from about 40s to about 100s for a sync request. Not recommended.

## Scope 9 — Carried, not recommended

| Item | Why not here |
|---|---|
| Set-based `CitationCollection` dedupe | O(n²) only shows above about 2000 citations; the cap keeps it far away. A follow-up |
| History citations N+1 | Pre-existing; a fix changes copied-dataset semantics. Dev, with a query-count test |
| Per-key lock for concurrent cold misses | Duplicates are bounded by the budget; complexity isn't worth it on a release branch |
| Drop `BaseCitation.to_dict` (no in-tree caller now) | Dev cleanup |
| Shared `fake_dns`/`fake_public_dns` test fixture | Touches the files tests; a test-only follow-up |
| `DOI_MAX_LENGTH` (200) on DOI citations | The 50-citation cap already bounds total DOI work; percent-encoding handles odd content. Cheap if Scope 4 happens |
| Parked: header-phase deadline in `bounded_get`; user tools filling the shared DOI cache | John's calls; not scored |

## Review notes on scope

- **Normal review 1.** No scope items. The `getattr` Tool Shed fallbacks were kept, and that bears on Scope 2's Tool Shed fix.
- **Normal review 2.** `ParsedTool` divergence → Scope 4. Lint warning → Scope 5. `agents/operations.py` → Scope 6. Beaker `ext:database` single row → Scope 9 (not listed separately; pre-existing).
- **Test challenges.** `InMemoryCache` class dict → Scope 2. `fake_dns` reuse → Scope 9. Header-phase deadline → parked.
- **Performance challenges.** bio.tools `None` pinning ("until the cache expires", actually forever) → Scope 2. N+1, O(n²) dedupe and the per-key lock → Scope 9.
- **Codex.** YAML/user-tool citations discarded → yaml branch (Scope 3). Trickle timeout → parked. Concurrent misses → Scope 9.
- **Thermo-nuclear.** The Tool Shed `citation_cache_url` bug was called "worth a separate fix" → folded into Scope 2. `to_dict` removal → Scope 9.
- **Baseline refactor.** No scope items. It confirms commits 6–7 don't need PR A, which enables Option C.
