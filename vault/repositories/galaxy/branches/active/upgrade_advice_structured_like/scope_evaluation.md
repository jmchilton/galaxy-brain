# Scope evaluation (post-rescope) — upgrade_advice_structured_like (#23884)

**Recommendation: keep.** The tip (`07b1b68e6a9`) already contains the earlier expansion. It fixes the wrong `structured_like` advice (18.01 → 26.0), adds 26.1/26.2 migrations, and raises `latest_supported_version` to 26.2. It also fixes three advisor bugs found along the way (21.09 empty code, `<` profile skip, `_find_all` ignoring xpath). A sweep of dev for `Version("26.x")` gates finds none left uncovered: citations, empty multiple test values, optional booleans, tool-provided metadata, tabular separator, and unqualified `structured_like`/`execute.py:585` all have advice. Both halves of the issue are now covered. The candidates that remain are either niche (top-level shadowing, two-deep bare refs) or cleanups that touch callers outside the advisor (`use_latest_profile`, moving modules). Adding them would make the PR bigger for little user value. The strongest of them is C (shadowing advice), which also fits as a small follow-up.

## Possible Decompositions

The diff is 519 lines added and 155 removed across 8 files and 13 commits (about 250 of the added lines are tests).

1. **Refactor / sharing** (`252fdeb0715`, `c0406db498f`, `acea709859b`): move the input-reference walker and the `galaxy.json` detection into `linters/_util.py`, and lift `tool_requests_provided_metadata` into `parser/output_objects.py`. No behavior change. Lands first.
2. **structured_like advice** (`8210455c21d`, `bf0d8aa626a`, `d7cec17a4e4`, `07b1b68e6a9`): the 26.0 migration replaces the 18.01 `consider`, with partial-qualification, repeat-skip and dataset-only filtering. Depends on 1.
3. **Advisor bug fixes** (`901c34f0298`, `145022e5d7c`, `09c03b73cde`): independent red→green fixes. These could go first or be their own small PR. The `<=` skip is a behavior change.
4. **26.1/26.2 migrations** (`6e63305a91e`, `1020e86a7d9`, `b5a085365fd`): new codes plus the `profile` kwarg on `validate_test_cases_for_tool_source`. Depends on 1 (shared helpers) and on 3 (`_find_all` fix).

Other options: put 1+2 together as the #23884 PR and 3+4 as a second "profile 26.x upgrade advice" PR. Or keep the branch as one PR, as now.

## Scopes considered

### A. As implemented (recommended)
26.0 `structured_like` must_fix advice, the 26.1/26.2 migrations covering every current profile gate, `latest_supported_version` 26.2, three advisor bug fixes, and shared helpers in place of duplicated logic.

| Pros | Cons |
|---|---|
| Covers both complaints in the issue, and every 26.x gate on dev | Already broad, and the title has to say "26.x upgrade advice" |
| Reuses the linter/parser logic and removes duplicates | `upgrade` imports from `linters._util` (layer leak, known) |
| Each piece is in its own commit, so it splits easily | |

### B. A + derive `use_latest_profile` from the advisor's latest version
`case.py:692` hardcodes `"26.1"`. Swap it for a shared latest-profile constant, or collapse the `use_latest_profile` and `profile` modes into one.

| Pros | Cons |
|---|---|
| Removes a stale constant that will drift with each release | Touches the linter, the script and test callers outside the advisor |
| Gets rid of the overlapping modes flagged by the thermo review | No 26.2 test-validation gate exists, so "26.1" is not wrong today |

### C. A + top-level shadowing advice
Advise when a top-level `structured_like` name is shadowed by an earlier nested input with the same name. Before 26.0 the runtime resolves to the nested input (`execute.py:585`); from 26.0 it resolves to the top-level one.

| Pros | Cons |
|---|---|
| The same 26.0 semantic change, in code this branch already touches | Rare pattern, and a silent behavior shift that is hard to state as advice |
| Makes the 26.0 migration complete | Needs new resolver queries plus tests, and was deferred as a follow-up last round |

### D. A + two-deep bare `structured_like` advice
The rescope review saw no advice for a bare name nested two conditionals deep.

| Pros | Cons |
|---|---|
| Possible gap in the 26.0 advice | The linter already errors on it, and legacy lookup may never have resolved it, so it may not be a regression |

### E. A + move the walker to `parser/output_references.py`
Fixes the layer leak.

| Pros | Cons |
|---|---|
| Cleaner layering | #23891/#23902 already plan this move, so doing it here would conflict |

### F. Contract to the original scope (alt `_alt_original_scope`)
Only the 26.0 structured_like fix.

| Pros | Cons |
|---|---|
| Smaller PR | The advisor goes back to refusing 26.1/26.2 tools. John already chose the expansion |
