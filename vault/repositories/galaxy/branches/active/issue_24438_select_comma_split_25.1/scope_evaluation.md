# Scope evaluation (round 2, post re-scope)

**Recommendation: keep scope as implemented (Scope B, as delivered).** Scope B was already the modest expansion from round 1: the parse fix plus `galaxy.xsd` docs plus the `TestsParamMultipleSelectCommaOptions` lint warning. All three are in the 4-commit branch (`82a6d15cf4e` baseline, `d5ad8013146` fix, `30baf371bf0` linter, `386a1c925b0` docs). The candidates left are either dev-only (E: `hidden_data`, `test_case_json`), impossible on 25.1 (D: move off the legacy API), heuristic and against upstream's direction (C: option-aware splitting), or profile-gated and dev-oriented (linting through the validated `case.py` path). The smaller generalizations (drill_down, qualified-path keying) have no reported case and would add false-positive risk to a linter that planemo fails on by default. B is complete: the `value_json` attribute doc in the xsd is neutral (it says nothing about splitting), and the `select` subsection now carries the comma rule, so nothing is left unfinished. The reporter's tool (`mirnature.xml`, `repeat_filter`) is a plain single select, so the fix covers it.

## Possible Decompositions

The branch has 225 inserted lines: 62 in `lib/`, the rest tests plus a sample tool. Ordering constraints:
- The baseline commit `82a6d15cf4e` lands first, whatever the split.
- The xsd sentence "a select without `multiple` is used as given" is only true after `d5ad8013146`. So the docs land with or after the fix, never before it.
- The linter `30baf371bf0` doesn't depend on the fix. Its message ("use value_json") pairs naturally with the docs.

Options (not a recommendation):
1. **One PR**, as now. All four commits.
2. **Two PRs.** (a) baseline + parse fix + framework tool + docs (`82a6d15cf4e`, `d5ad8013146`, `386a1c925b0`). Then (b) the linter (`30baf371bf0`), stacked or independent.
3. **Three PRs.** (a) baseline tests alone (the ftpfile unit test and the `multi` `value_json` cases, all green on base). (b) parse fix + docs. (c) linter.

## A. As implemented (= round-1 Scope B, recommended)

`verify/parse.py` comma-splits test values only for `data` and `multiple` inputs (`ftpfile` is multiple by default). Other values, including conditional discriminators, are wrapped as `[value]`. A warn-level linter flags `value=` on a multiple select whose static option values contain commas, but only when some comma-split part isn't an option value or label. The xsd docs explain the rule and the `value_json` list form.

| Pros | Cons |
|---|---|
| <ul><li>Fixes both shapes in the issue (plain select and conditional `when`), plus `value_json` strings; covers the reporter's `repeat_filter`</li><li>The split gate matches `case.py` and the request model (split only when `multiple`)</li><li>The remaining ambiguity (multiple + comma options) is documented and linted, not left as a trap</li><li>The linter now fires only on tests that would fail at runtime anyway (parts aren't legal options), so false-positive risk is low</li><li>It has been through 2 normal reviews, 2 codex rounds and 2 thermo-nuclear rounds</li></ul> | <ul><li>Touches `linters/`, and needs a linter-count bump (142 -> 143)</li><li>Four false-positive classes were found and fixed across review rounds. That's evidence the linter is the riskiest piece</li><li>Duplicate short names are skipped, not resolved, so a few real cases aren't linted</li></ul> |

## B. Contract: drop the linter (fix + docs only)

Ship `82a6d15cf4e`, `d5ad8013146` and `386a1c925b0`, and drop `30baf371bf0`. That is close to the `_alt_original_scope` alt plus the xsd paragraph.

| Pros | Cons |
|---|---|
| <ul><li>Removes the riskiest piece from a release branch. `planemo lint` defaults to `--fail_level warn`, so a missed false-positive class could break IUC CI</li><li>About 45 fewer lines in `lib/` and about 70 fewer test lines</li></ul> | <ul><li>Authors only learn about the multiple + comma trap from the docs or from a runtime failure</li><li>Throws away a reviewed, conservative linter whose remaining hits are tests that are already broken</li><li>Reverses the round-1 decision without new evidence against it</li></ul> |

## C. Expand: lint through the validated test-case path

Detect the trap in `parameters/case.py` / `TestsCaseValidation`, which models multiple selects and their options properly, instead of in raw XML (thermo-nuclear #4).

| Pros | Cons |
|---|---|
| <ul><li>The long-term home. It resolves real input paths and options</li></ul> | <ul><li>Profile-gated (24.2+) and dev-oriented, so it misses older-profile tools on 25.1</li><li>A bigger change to validation code on a release branch</li></ul> |

## D. Expand: key test params by qualified path

Resolve test params through `inputs._param_path` instead of skipping short names that several inputs share (thermo-nuclear #3, normal review 2).

| Pros | Cons |
|---|---|
| <ul><li>Lints the few duplicate-name cases that are skipped now</li></ul> | <ul><li>Legacy test parsing accepts both short names and `\|` paths. Keying by full path would miss short-name tests or need both lookups</li><li>No reported case. More code for a corner of a corner</li></ul> |

## E. Expand: extend the linter to multiple drill_down

Also flag `value=` on `drill_down` with `multiple="true"` whose nested `<option value>`s contain commas.

| Pros | Cons |
|---|---|
| <ul><li>The obvious "slight generalization". The parse split is gated the same way</li></ul> | <ul><li>No reported case. drill_down options are nested trees, so the lookup isn't the flat `option` scan</li><li>Adds another false-positive surface to a linter that fails IUC CI on warnings</li></ul> |

## Carried forward from round 1 (unchanged verdicts)

- **Option-aware splitting for multiple selects (round-1 C):** not done. It's heuristic (options `a`, `b`, `a,b` stay ambiguous), needs both the legacy parser and `SelectParameterModel.split_str` changed, and dev is moving toward `value_json` for typed values.
- **Move tests off the legacy API (round-1 D):** impossible on 25.1, which has no non-legacy test submission. Even on dev, `verify/parse.py` runs client-side against servers of every version.
- **Dev forward-merge (round-1 E):** add `hidden_data` to the split gate, and don't comma-split `test_case_json` strings. Required at merge time, but it can't land on 25.1. The initial and rescope debriefs already record it.
- **Drop the ftpfile default (round-1 F):** no. It would bring back the codex round-1 regression.

<details>

**Considered, no action**
- Single `data` still splits. This is legacy behavior, and a non-multiple data param given two files was never valid.
- Data `location` comma split (`parse.py:281`): predates the branch, and no URL containing a comma has been reported.
- `multiple_select_value_split` (newline split, strip) for the legacy path: a behavior change with no reported bug.
- Moving `_iter_param` to `linters/_util.py`: a refactor on a release branch that conflicts with dev's diverged copy. Declined by thermo-nuclear round 2 and the baseline refactor pass.
- No other `split_if_str` call sites in `tool_util` or `tools` need the gate. The only remaining one is the data `location` split.

**Status note:** this is the second scope evaluation after a re-scope, and it recommends no change, so the branch can go to READY rather than being parked for a scope decision. The rescope and test-challenge debriefs cite some pre-thermo SHAs (`2d81ad155af`, `09d4aa1e11b`). The current ones are listed above.

</details>
