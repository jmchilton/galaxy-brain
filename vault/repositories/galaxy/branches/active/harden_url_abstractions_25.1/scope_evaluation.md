Run via Claude Opus 5.5.

# harden_url_abstractions_25.1: scope evaluation (round 3, after DRS)

**Recommendation: keep as implemented.** DRS was the last stock file source fetching user URLs without hop checks, and it's now on the branch. No review of the DRS change raised a scope change. Checking `util.py`'s DRS code for related bugs, as the process leans toward fixing those, found no further candidate beyond the headers fix already on the branch.

Reviewed at head `c7579bb67cb` (18 commits, 13 files, +671/−49) against `release_25.1` at `7650883076c`. Limited to what the DRS change alters; round 2's carried-forward items in `earlier_drafts/2/scope_evaluation.md` stand.

## Possible Decompositions

Same as round 2's options, with the DRS commits added. Its baseline joins the baselines. The DRS change needs `ValidatingSession`, which arrives in the TRS commit.

- **A. One PR.** All 18 commits, baselines first.
- **B. Shared reading first, then one PR per consumer:** baselines and refactors; `validate_non_local` reading; http file source; TRS; remote ZIP; DRS. Remote ZIP and DRS depend on TRS unless `ValidatingSession` moves into the reading PR.
- **C. All of `uris.py` first, then consumer wiring:** baselines; refactors; `uris.py` with both adapters; consumer hop checks, DRS included.
- **D. Two PRs:** one URL reading (`schemes` refactor, reading changes, their baseline); every hop checked (the rest, DRS included).

## Scopes considered

### 1. As implemented, with DRS (recommended)

The http, remote ZIP and DRS sources and TRS servers built from user URLs check every hop through the two `galaxy.files.uris` adapters. DRS lookups keep configured headers on 202 retries and keep Galaxy's user agent.

| Pros | Cons |
|---|---|
| <ul><li>Round 2's inconsistency is gone: the DRS lookups now apply the same allowlist as its download.</li><li>Each change commit has red tests, and `test_drs.py` passes before and after DRS.</li></ul> | <ul><li>DRS servers on non-public addresses now need a `fetch_url_allowlist` entry, which needs a release note.</li><li>26.0 and 26.1 ports need their own DRS edit, and must decide about 26.x's added `requests.get` calls.</li></ul> |

### 2. Contraction: drop DRS

| Pros | Cons |
|---|---|
| <ul><li>Fewer port conflicts on 26.x.</li></ul> | <ul><li>John decided to add it. It'd bring back the inconsistency round 2 flagged.</li></ul> |

### 3. Carried forward (no change)

| Item | Disposition |
|---|---|
| dataverse, invenio and elabftw requests | Out of scope: they still use plain `requests` and `urllib`, and need a policy decision for user-templated sources. |
| Compact identifiers on 26.x DRS | For the port branches: a fixed resolver host, like configured TRS servers. |
