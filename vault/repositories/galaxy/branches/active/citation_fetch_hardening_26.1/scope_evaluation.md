Run via Claude Opus 5.5 at high effort.

# citation_fetch_hardening_26.1: scope evaluation (second pass, after re-scope)

**Recommendation: keep the scope as implemented (Scope 1). Hand off as READY.** The first evaluation asked for two additions, and both are on the branch now. `cached_fetch` holds the get-or-fetch policy that DOI and bio.tools lookups share, with a short failure TTL, kept 404s, and a `may_fetch` hook. The Tool Shed's `citation_cache_url` bug is fixed. That completes John's scope line, including the reusable cached-fetch infrastructure. Every remaining candidate falls into one of four groups:
- the yaml branch's Scope 2;
- a different seam;
- blocked on the yaml branch's `_parse_citation_list`;
- a tuning trade-off that doesn't clearly beat keeping scope.

None of them is a bug this branch introduces or makes worse. Recommending a change would park the branch, and nothing here is worth that.

Evaluated at `cda4733996f` (19 commits) against `origin/release_26.1`.

The branch covers what yaml Scope 2 needs:
- User tools build through `Tool._parse_citations`, so they get the 50-citation and 32KB caps.
- Their fetches go through `bounded_get` with per-hop `validate_non_local`.
- Both citation endpoints already pass a per-request budget.

John's parked call on whether user tools may fill the shared DOI cache needs no change here. The existing `may_fetch` hook supports a read-only answer: a zero-fetch `DoiFetchBudget` skips before anything is written to the cache. Scope 2 would make that choice per citation, not per request, because history requests mix admin and user tools.

Possible security issue, details withheld; it doesn't change this branch's scope.

## Possible Decompositions

Size: +1100/−109 across 25 files. `galaxy_options.rst` and `galaxy.yml.sample` (+47) are generated, which leaves about 1160 non-generated changed lines:
- production in `lib/galaxy`, schema included: +355/−70;
- tests: +698/−37;
- Tool Shed: −2.

| # | SHA | Subject | Size | Group |
|---|---|---|---|---|
| 1 | `34c4806e4a2` | Baseline tests for DOI and bio.tools metadata fetching | +157/−10 | A |
| 2 | `20c3fb1fbd4` | Add `galaxy.util.requests.bounded_get` | +236 | A |
| 3 | `2f586fd27c7` | Bound DOI BibTeX fetches | +66/−18 | A |
| 4 | `2b39d10e73a` | Bound bio.tools API lookups | +52/−11 | A |
| 5 | `8b1276118ae` | Separate beaker namespace for bio.tools | +58/−1 | A |
| 6 | `30369819298` | Share `FakeClock` in `galaxy.util.unittest_utils` | +14/−17 | B (refactor) |
| 7 | `7656ba5692e` | Refactor: `CitationsManager.parse_citations` | +11/−7 | B (refactor) |
| 8 | `29c7e9162fb` | Refactor: `CitationsManager.citations_to_bibtex` | +10/−2 | B (refactor) |
| 9 | `30803f4bc6e` | Don't fetch DOI BibTeX to dedupe against BibTeX | +13 | B |
| 10 | `57c9e0c4727` | Briefly cache failed DOI lookups | +62/−4 | B |
| 11 | `42c4ce4421b` | Limit uncached DOI lookups per request | +50/−8 | B |
| 12 | `2e0590df304` | Cap citations per tool | +38/−2 | B |
| 13 | `9629e375d9e` | Tidy DoiCache URL validation | +12/−8 | B |
| 14 | `acdd29cb43d` | Strip citation content in the `Citation` model | +9/−5 | B |
| 15 | `77e30cdfb2b` | Per-request deadline on DOI lookups | +33/−4 | B |
| 16 | `65bbf129f24` | Add citation fetch config options | +125/−18 | C |
| 17 | `fffd53e4785` | Move DoiCache's get-or-fetch policy into `cached_fetch` | +160/−31 | D |
| 18 | `a3208098d5c` | Expire failed bio.tools lookups with `cached_fetch` | +74/−49 | D |
| 19 | `cda4733996f` | Tool Shed `citation_cache_url` from its own option | +8/−2 | E |

Ordering constraints (from [baseline_refactor.md](baseline_refactor.md)):
- 3 and 4 need 2.
- 13 tidies code from 3.
- 10, 11 and 15 build on 3's `get_bibtex`.
- 16 wires config into 3, 10 and 11.
- 17 moves policy from 10, 11 and 15. 18 needs 2, 4, 6 (`FakeClock`) and 17 (`cached_fetch`, `cache_not_found`).
- D stacks on C only because of a textual conflict on the `get_bibtex` def line and the DB-test imports.
- 6 applies to the base on its own (`merge-tree` clean). 19 is independent and also `merge-tree` clean.
- 7, 8, 9, 12 and 14 don't need A. Reordering them ahead of A has **not** been cherry-picked or tested, and the shared test files may conflict.

**Option 1: five PRs (A–E, the baseline-refactor grouping).** A is bounded fetches (1–5). B is the DOI per-request limits (6–15). C is the config options (16). D is shared `cached_fetch` and bio.tools expiry (17–18). E is the Tool Shed fix (19).
- Each PR is small and themed. E can land first or last.
- Four of them stack in sequence: A → B → C → D.

**Option 2: three PRs.**
1. Bounded fetches (A).
2. Citation limits, config and shared cache (B + C + D, 6–18).
3. The Tool Shed fix (E), on its own.

A new limit lands with its config knob and its final cache shape. That avoids reviewing `DoiCache.get_bibtex` twice (once in 10, again in 17).

**Option 3: three PRs, with the fetch infrastructure together.**
1. Fetch infrastructure: A plus 6, 17 and 18. This means `bounded_get` and `cached_fetch` both with their consumers, plus bio.tools expiry.
2. DOI request limits, caps and config: 7–16.
3. The Tool Shed fix (E).

This groups the reusable `galaxy.util.requests` pieces in one review. It needs 17 split: `cached_fetch` itself (with tests) moves into PR 1, and the half that switches DoiCache over to it lands at the end of PR 2, after 16, because it moves policy from 10, 11 and 15. Until then the `may_fetch` hook has no caller. That is a real rewrite, so it is untested.

**Option 4: two PRs.** Everything except E, plus E. The Tool Shed fix is unrelated to fetching, so it can be reviewed on its own.

**Option 5: one PR.** Every behavior commit is red→green or a no-behavior refactor, so a reviewer can go commit by commit.

**Prelude for any option:** upstream 6 (`FakeClock`) on its own first. It is a test-only refactor with three consumers.

## Scope 1: As implemented (recommended)

- Bounded DOI and bio.tools fetches:
  - deadline;
  - size cap;
  - https only;
  - `validate_non_local` on every redirect hop.
- A per-request DOI budget: a count plus a 30s start deadline.
- No fetch for mixed-type dedupe.
- One cap for every tool: 50 citations and 32KB BibTeX.
- Three config options.
- A shared `cached_fetch` with a failure TTL. DOI failures expire after 10 min. bio.tools failures expire after 1h, and its 404s are kept.
- The Tool Shed `citation_cache_url` fix.

| Pros | Cons |
|---|---|
| - Delivers every clause of John's scope line, including the cached-fetch infrastructure the first evaluation found half-done<br>- Matches John's decisions: release_26.1, one cap, `validate_non_local` per hop, splittable history<br>- Unblocks yaml Scope 2. User tools get the caps, the bounded fetch and the budget, and `may_fetch` supports either answer to the parked cache question<br>- Both cache-backed remote lookups in `lib/` use `cached_fetch`, and no `createfunc=` beaker user is left (normal review 3, thermo-nuclear)<br>- Every second-pass review is clean: thermo-nuclear approved after small fixes, Codex found no missing abstraction, and normal review 3 found no bugs | - The `ParsedTool` / Tool Shed display path stays uncapped (Scope 4)<br>- Over-cap citations are reported only in admin logs (Scope 5)<br>- `InMemoryCache` drops the `createfunc` form, which affects the published galaxy-tool-util. That needs a PR-body line<br>- Parked: the header-phase deadline gap and user-tool cache fill |

## Scope 2: Tiny: keep DOI 404s like bio.tools (`cache_not_found=True` in `DoiCache.get_bibtex`)

doi.org returns 404 for an unknown DOI. Today that is refetched every 10 minutes. bio.tools keeps 404s.

| Pros | Cons |
|---|---|
| - One argument plus one test. The first evaluation floated it<br>- Unknown DOIs stop costing a budget slot every 10 minutes | - With `citation_cache_expire: 0` (the default), a 404 is pinned forever. A DOI cited before it's registered with doi.org would never resolve. That's a correctness regression for a minor saving<br>- The budget and the 10-minute TTL already bound the cost |

## Scope 3: Small: document that `citation_max_fetches_per_request: 0` disables DOI fetching

The behavior already works: `DoiFetchBudget(0)` skips every fetch, and cached entries still render. Only the schema text and generated docs would change.

| Pros | Cons |
|---|---|
| - Gives admins a documented kill switch (the plan once floated `citation_resolve_dois`)<br>- Two sentences | - A doc tweak, not scope. It can fold into commit 16 during PR polish without a scope change<br>- Regenerating the docs touches generated files again |

## Scope 4: Absorb the yaml branch's Scope 2 (user-tool citation resolution). Carried, unchanged

This resolves user tools by uuid plus user in `tools/{id}/citations`, and through `tool_for_job` in history citations.

| Pros | Cons |
|---|---|
| - Puts every citation change in one place | - YAML and user-tool citations only load on `yaml_tool_model_validation_26.1`, so this can't be tested end to end here<br>- Carries John's parked cache decision<br>- Crosses into the client<br>- This branch exists to unblock that work, not own it |

## Scope 5: Cap `ParsedTool` / lint over-cap citations. Carried, unchanged

Move the limits to a `tool_util` helper. Call it from `model_factory.parse_tool`, and optionally warn from `CitationsInvalid`.

| Pros | Cons |
|---|---|
| - The Tool Shed display path and the linters would share the same limits | - It collides with the yaml branch's `ToolSource._parse_citation_list`, so it's easier after that branch lands<br>- `ParsedTool` never fetches; the problem is display size only<br>- The XML-only citation linters wouldn't reach YAML or user-tool authors<br>- No real tool is near the limits |

## Scope 6: Fix `agents/operations.py:get_tool_citations`. Carried, unchanged

| Pros | Cons |
|---|---|
| - A real pre-existing bug in about 5 lines | - It never fetches and touches nothing this branch changes. It belongs in a separate small fix on the agents seam |

## Scope 7: Route other external `requests.get` callers through `bounded_get`. Carried, unchanged

| Pros | Cons |
|---|---|
| - More consumers for the helper | - Each caller has its own redirect, streaming and allowlist semantics. Each is a per-caller dev follow-up |

## Scope 8: Contractions

- **Return to the original scope** (`_alt_original_scope`, `8fb806e8e37`). That would bring back the permanent pinning of bio.tools `None` that the re-scope fixed, and leave the scope line's "reusable cached-fetch infrastructure" half done. Not recommended.
- **Drop the Tool Shed fix (19).** It is independent and already isolated as its own commit. Splitting it into its own PR is a decomposition choice, not a scope cut. Not recommended.
- **Drop the config options or the per-request deadline.** The first evaluation's reasons still hold: admins would have no way to tune the limits, and without the deadline the default worst case goes from about 40s to about 100s. Not recommended.

## Carried follow-ups (not scope)

| Item | Status |
|---|---|
| Set-based `CitationCollection` dedupe; history citations N+1; per-key lock on cold misses | Unchanged: pre-existing, or bounded by the budget. Dev follow-ups |
| Beaker namespace I/O is quadratic (one pickle or row per namespace) | Pre-existing. Performance pass 2 measured it. Dev follow-up: a per-key backend or guidance |
| Per-process bio.tools back-off after a transport failure | Optional. It could use the existing `may_fetch` hook (performance pass 2) |
| Drop `BaseCitation.to_dict`; shared `fake_dns` fixture; `_bwa_json()` test helper | Dev cleanups and nits |
| `InMemoryCache` `createfunc` tolerance | PR-body line, or a tolerant `get(key, createfunc=None)` if John wants zero breakage |
| Parked: header-phase deadline in `bounded_get`; user tools filling the shared DOI cache | John's calls. Not scored |

## Review notes on scope

- **First scope evaluation.** Its Scope 2 is done: `cached_fetch`, bio.tools expiry, kept 404s, a per-instance `InMemoryCache` and the Tool Shed fix. Its Scopes 3–9 were rechecked. None changed. Its Scope 4 and Scope 5 are merged here as Scope 5.
- **Re-scope debrief.** Its "not taken" list matches Scopes 4–7 here.
- **Normal review 3.** No scope items. The `InMemoryCache` interface change and the case where `citation_cache_expire` is below 600 are PR-body notes.
- **Test challenges (pass 2).** No scope items. The `FakeClock` dedupe was later done by the thermo-nuclear pass.
- **Performance challenges (pass 2).** The bio.tools retry cost was measured and accepted. Back-off and quadratic beaker I/O are follow-ups.
- **Codex (pass 2).** It found no missing abstraction. The last-lookup deadline and the 32KB cap on fetched responses are documented bounds. Possible security issue, details withheld; not a scope item.
- **Thermo-nuclear (pass 2).** Approved. It deleted the Tool Shed schema-duplicate lines rather than patching them. Its declined items are structural, not scope.
- **Baseline refactor (pass 2).** It set up the A–E grouping used in Option 1 and confirmed that 6 and 19 are base-applicable.
