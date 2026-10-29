# citation_fetch_hardening_26.1 — re-scope debrief

The first scope evaluation ([earlier_drafts/1/scope_evaluation.md](earlier_drafts/1/scope_evaluation.md)) recommended a modest expansion. The fetch half of the "reusable cached-fetch infrastructure" was shared (`bounded_get`), but the cache policy wasn't. bio.tools still cached every failure as `None` with no expiry. The branch made that likelier: a new namespace means a refetch after upgrade, and the 15s limit replaced 600s.

The original scope is kept as `citation_fetch_hardening_26.1_alt_original_scope` (`8fb806e8e37`, [alt](alts/original_scope.md)).

Added after `8fb806e8e37`:
1. **Share `cached_fetch` between DOI and bio.tools lookups.**
   - `galaxy.util.requests.cached_fetch` and the `FetchCache` protocol hold the get-or-fetch policy.
   - Failures are cached for a short TTL. With `cache_not_found`, a 404 is kept like a success.
   - Fetching can be skipped through a `may_fetch` hook, which the DOI per-request budget uses.
   - `DoiCache` uses it.
   - The bio.tools API source uses it with a 1h failure TTL and keeps 404s.
   - `InMemoryCache` gets per-instance storage and expiry. A shared module default keeps the linter's cross-xref reuse.
2. **Tool Shed `citation_cache_url`** was read from `citation_cache_lock_dir`. It now reads its own option, with a test.

Both are red→green. [Normal review 3](subagents/normal_review_3.md) found no bugs, and its small fixes are folded in.

Tip `eecdf72d007`, 17 commits. The two new commits sit at the end. For a PR split they belong with PR A (bounded fetches) or as a fourth small PR; the Tool Shed fix is independent.

Not taken from the evaluation:
- Scope 2 of `yaml_tool_model_validation_26.1`.
- Capping `ParsedTool`.
- A lint warning for over-cap citations.
- Fixing `agents/operations.py:get_tool_citations`.
- Routing other callers through `bounded_get`.

The evaluation's reasons stand for each.
