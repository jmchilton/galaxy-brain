# citation_fetch_hardening_26.1 — implementation debrief

**STATUS: READY.** The second scope evaluation says to keep scope.

Tip `cda4733996f` on `jmchilton/citation_fetch_hardening_26.1`, base `origin/release_26.1` (`f7f8c6935a2`). 19 commits, 25 files, +1100/−109. Alt: `citation_fetch_hardening_26.1_alt_original_scope` (`8fb806e8e37`, [alt](alts/original_scope.md)).

```
created .../differential-review/snapshots/20261029T154748Z-hardening-cda4733996f0.json
  hardening @ cda4733996f0 vs origin/release_26.1 (merge-base f7f8c6935a25)
  since 20261029T144548Z-implementation-eecdf72d0072:
    commits: 0 same, 11 rebased, 6 changed, 2 new, 0 dropped
```

## What it does

Hardens tool citation handling for every tool source, and the bio.tools lookups along with it.
- **`galaxy.util.requests.bounded_get`:**
  - a deadline checked between body reads
  - a response size cap and at most 3 redirects
  - https only, with URLs normalized
  - every hop checked by an injected validator (`validate_non_local` in Galaxy)
- **`galaxy.util.requests.cached_fetch`:** a get-or-fetch policy over beaker or `InMemoryCache`. Failures are cached for a short time, a 404 can be kept, and a `may_fetch` hook supports budgets.
- **DOI lookups:**
  - 10s timeout and 64KB cap, with the DOI percent-encoded in the URL
  - failures cached for 10 minutes
  - at most 10 uncached lookups per tool or history citations request, and none started after 30s; the rest get the existing stub
  - comparing a DOI citation with a BibTeX one never fetches
- **Per-tool cap for every source:** 50 citations, and BibTeX entries over 32KB dropped, with a warning.
- **`Citation` model** stores stripped content.
- **bio.tools lookups:**
  - bounded, with the reference encoded
  - their own beaker namespace
  - failures expire after 1h; 404s are kept
- **Config:** `citation_fetch_timeout`, `citation_max_fetches_per_request` (0 turns DOI fetching off) and `citation_cache_expire`.
- **Tool Shed:** `citation_cache_url` now comes from its schema, not the lock-dir key.

## Suggested PR split ([baseline_refactor.md](baseline_refactor.md), [scope_evaluation.md](scope_evaluation.md))

- **A, bounded fetches:** `34c4806e4a2`..`8b1276118ae`. Baseline tests (including API tests for both citation endpoints), `bounded_get`, DOI, bio.tools, bio.tools namespace.
- **B, DOI per-request limits:** `30369819298`..`77e30cdfb2b`. FakeClock and two citation refactors first, then dedupe, failure cache, budget, cap, tidy, strip, deadline.
- **C, config options:** `65bbf129f24`.
- **D, shared `cached_fetch` plus bio.tools expiry:** `fffd53e4785`, `a3208098d5c`. It sits on C only because of a text conflict.
- **E, Tool Shed `citation_cache_url`:** `cda4733996f`. Independent.

The FakeClock and Tool Shed commits each apply cleanly to `release_26.1`. Fewer PRs also work: A / BCD / E, or a single PR.

## Decisions

From John:
- Everything on release_26.1.
- One citation cap for everyone, with no profile gating.
- Redirect hops checked with `validate_non_local`, no host allowlist.
- Splittable history.

Defaults I chose, to confirm:
- 10 fetches and 30s per request.
- 10 min DOI failure TTL and 1h for bio.tools.
- 64KB DOI response cap.
- 50 citations per tool. The in-tree `bibtex` test tool has 28; tools-iuc's largest has 8.
- 32KB per BibTeX entry.
- DOI-shape tightening reduced to stripping and percent-encoding.
- DOI 404s aren't kept, so a DOI cited before it's registered still resolves later.

Re-scoped once: shared `cached_fetch` and the Tool Shed fix ([re-scope](implementation_rescope_debrief.md)).

## For John

- **Parked:** `bounded_get`'s deadline doesn't cover connecting and reading headers. The docstring says so. A wall-clock bound needs a watchdog that closes the socket.
- **Unblocks** `yaml_tool_model_validation_26.1` Scope 2: user-tool citations get the caps, bounded and validated fetches, and per-request budgets.
  - Whether user tools may write the shared DOI cache is Scope 2's call.
  - A zero-fetch `DoiFetchBudget` skips before anything is written, so it gives read-only behavior per citation with no change here.
- **Private notes:** reviews and scope evaluations wrote several, under `~` with the `security-galaxy-citation_fetch_hardening-*` prefix. One describes a pre-existing gap outside this branch worth a separate private fix.
- **Follow-ups** (dev material):
  - history citations N+1
  - set-based citation dedupe
  - remove the uncalled `BaseCitation.to_dict`
  - `agents/operations.py:get_tool_citations` attribute misuse
  - cap `ParsedTool` and lint over-cap citations once the yaml branch's `_parse_citation_list` lands
  - beaker namespace-as-one-pickle cost

## Validation

- Unit tests pass at every commit: 256→273 across the touched set, which includes linters, ontologies and SSE dispatch.
- API: `test_tools.py -k test_tool_citations` and `test_histories.py -k test_history_citations` pass, and the tool test passes at baseline. Neither was rerun after the later re-scope; it didn't touch the endpoints, only refactors under them.
- `make format` makes no changes. mypy error counts per changed file equal base.
- Every non-baseline test was shown red without its change.
- Not run: the Selenium tool-form citations test, and CI.

## PR-body notes

- The DOI fetch timeout drops from 600s to 10s, configurable.
- bio.tools: decodes with the declared charset or utf-8, failures are retried after 1h, and the cache is refetched once after upgrade (new namespace).
- A DOI citation and an equivalent BibTeX citation are no longer deduped.
- `InMemoryCache` (galaxy-tool-util) now has a `get`/`put` interface, replacing `get(key, createfunc)`. No known external users.
- If `citation_cache_expire` is set below 600, cached failures outlive cached successes.
- `ParsedTool` (Tool Shed tool API) isn't capped; it's display only.

## Debriefs

[initial](initial_implementation_debrief.md) · [re-scope](implementation_rescope_debrief.md) · [test challenges](test_challenges_debrief.md) · [performance](performance_challenges_debrief.md) · [codex](codex_review.md) · [thermo-nuclear](thermo_nuclear_review.md) · [baseline refactor](baseline_refactor.md) · [scope](scope_evaluation.md) · reviews in `subagents/` · first hardening pass in `earlier_drafts/1/`.
