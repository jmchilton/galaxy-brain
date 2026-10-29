# citation_fetch_hardening_26.1 — initial implementation debrief

Tip `1026962df8d` on `jmchilton/citation_fetch_hardening_26.1`, base `origin/release_26.1` (`f7f8c6935a2`). 12 commits, 21 files, +847/−82.

```
created .../differential-review/snapshots/20261029T125307Z-implementation-1026962df8de.json
  implementation @ 1026962df8de vs origin/release_26.1 (merge-base f7f8c6935a25)
  first snapshot: 12 commits, 21 files, 43 hunks
```

## What it does

Tool citation handling is hardened for every tool source (XML, YAML, user-defined). DOI→BibTeX lookups get time, size and redirect bounds. Each request makes a bounded number of uncached lookups. Every tool gets one citation cap. A new `galaxy.util.requests.bounded_get` helper is shared by the DOI and bio.tools lookups.

## Commits (oldest first) and suggested PR split

**PR A: bounded external metadata fetches**
1. Baseline tests: DOI fetch, stub fallback, dedupe, offline bio.tools lookup, tool-level citations, and API tests for the tool and history citation endpoints.
2. `bounded_get`:
   - a total deadline checked between socket reads (urllib3 2 `read1`)
   - a response size cap and a redirect limit
   - https only, with URLs normalized
   - each hop checked by an injected validator
3. DOI lookups through `bounded_get`:
   - 10s timeout, 64KB response cap
   - each redirect hop checked with `validate_non_local` (honoring `fetch_url_allowlist`)
   - the DOI percent-encoded in the URL path
4. bio.tools lookups through `bounded_get`, with the validator injected from the Galaxy adapter.
5. A separate beaker namespace for bio.tools. Both caches defaulted to the `beaker_cache` table under the `"doi"` namespace.

**PR B: citation resolution limits** (needs A for 9; the rest are independent)

6. Comparing a DOI citation with a BibTeX one no longer fetches the DOI.
7. Failed lookups are cached for 10 minutes.
8. Per-request fetch budget: 10 uncached DOIs per tool or history citations response; the rest get the existing stub.
9. Per-tool cap for every source: 50 citations, and BibTeX entries over 32KB dropped, with a warning.
10. DoiCache tidy: the validator is built once.
11. The `Citation` model stores stripped content. A YAML block scalar's trailing newline had reached the DOI URL.

**PR C: config options**

12. `citation_fetch_timeout`, `citation_max_fetches_per_request` and `citation_cache_expire`, with the sample config and docs regenerated (citation hunks only).

## Decisions

From John:
- release_26.1 for everything.
- One cap for everyone, no profile gating.
- Redirects checked with `validate_non_local` per hop, no host allowlist.

Mine, with defaults to confirm:
- 10 fetches per request, 10 minute failure TTL, 64KB response cap.
- 50 citations per tool. tools-iuc's largest is 8; the in-tree `bibtex` test tool has 28, so 25 was too low.
- 32KB per BibTeX entry (tools-iuc max is about 1.4KB).
- DOI-shape tightening reduced to strip plus percent-encode. Malformed DOIs now just fail to resolve.
- Who may populate the shared cache (user tools vs admin tools) is left to Scope 2 on `yaml_tool_model_validation_26.1`. This branch doesn't change who can trigger lookups.

## Validation

- Unit tests pass at every commit (121→151 in the touched set). The broader set of 398, including linters, parsing, deserialization and config, passes at the tip.
- API: `test_tools.py -k test_tool_citations` and `test_histories.py -k test_history_citations` pass at the tip, and the tool test passes at the baseline commit.
- Every non-baseline test was seen red without its change.
- mypy: only the pre-existing `BaseCitation` attribute errors in `citations.py`. ruff, black and isort are clean.
- Not run: the Selenium tool-form citations test (`test_tool_form.py`, around line 400).

## Notes for the PR body

- The DOI fetch timeout drops from 600s to 10s.
- bio.tools responses decode with the declared charset, else utf-8, instead of a guessed encoding.
- A DOI citation and an equivalent BibTeX citation are no longer deduped.
- `ParsedTool` (Tool Shed tool API) isn't capped. It is display only.
- The pre-commit hook trimmed trailing whitespace in parts of the generated `galaxy.yml.sample` and `galaxy_options.rst` it touched.
- Existing bio.tools cache entries are refetched once after the namespace change.

Reviews: [normal 1](subagents/normal_review_1.md) · [normal 2](subagents/normal_review_2.md).
