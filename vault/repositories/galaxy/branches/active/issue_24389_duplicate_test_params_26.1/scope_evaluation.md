# Scope evaluation (round 2, after re-scope)

**Recommendation: keep the scope as implemented. No further change.** Round 1's modest expansion (store `<edit_attributes>` children as dicts) is in as `6b6251ff6e2`, and the round 2 Codex follow-up (`60607462357`, ignore generated composite renames inside duplicate collections) closed a false-rejection hole the expansion's comparison logic left open. Every remaining candidate fails a concrete test, not just a "stay narrow" preference. Moving the generated composite rename out of `edit_attributes` would delete `_comparable_collection` and the prefix filter, but it fixes no bug and refactors upload/rename code every composite test depends on; that is dev work. The XSD `xs:unique` still can't be profile-gated and still breaks the working ≤24.1 elided-outer-repeat idiom. Making the legacy runtime path below 24.2 raise would break old tools' runtime tests, which the profile gate exists to prevent, and `TestsCaseValidation` already warns there. A content-derived (deterministic) composite name would also let the filter go, but it changes upload naming and can merge distinct uploads; not a release-branch move. The issue's question ("linter or schema?") is answered: `TestsCaseValidation` / `planemo lint` reports the cutadapt shape as an error at profile ≥24.2, a warning below. The PR body still has to name sourmash sketch (25.0) and isoformswitchanalyzer (25.1), which go red at load, and list the `edit_attributes` JSON fix as a separate bug fix.

## Possible Decompositions

About 338 added / 19 removed lines: ~60 lib lines (`case.py`, `parser/util.py`, `parser/xml.py`), 215 in the new `test_parameter_test_cases_duplicates.py`, 64 in `test_tool_linters.py`. Five commits: baseline tests, prefix constant, fix (with content comparison folded in), `edit_attributes` as dicts, composite-collection comparison.

Ordering constraints:
- The fix (`0887ec8a863`) needs its content comparison, or identical duplicates with `edit_attributes`/`composite_data` children become false "Ambiguous" errors (already folded together).
- The content comparison (and the collection recursion, `60607462357`) can land before the fix as its own bug fix. On base, `_resolve_matching_inputs` already runs on the unqualified fallbacks (`5a443294512`) and compares by identity/uuid. Probe: a profile 25.1 tool with two identical unqualified `<param name="input"><composite_data .../></param>` inside a conditional fails on base with `Ambiguous unqualified test parameter name (input) for (c|input)`; HEAD gets past it.
- The `try` move in `test_case_validation` must land with or before the fix, or lint output collapses to one "Serious problem parsing" message per tool.
- `edit_attributes` as dicts is independent of the fix. Base it first and `_comparable_test_input` keeps its simple `.get()` form; base it after and it is as now.

Options:
- **A. One PR**, as now.
- **B. Two PRs.**
  1. `edit_attributes` as dicts plus its JSON round-trip test. Stands alone: fixes tests silently vanishing from `Tool.tests` / `/api/tools/{id}/test_data` for any tool using `<edit_attributes>`. The bug dates to `071c3767735` (in `release_24.2` onward), so this piece could target an older release.
  2. The rest: baseline tests, prefix constant, the fix with content comparison and `try` move, collection recursion, linter tests.
- **C. Three PRs.** (1) The dicts fix from B1. (2) Comparison fix: identical-children baseline tests, prefix constant, `_comparable_test_input` / `_comparable_collection`, with tests on the unqualified path. Fixes false "Ambiguous" rejections of identical unqualified composite duplicates on base. (3) Main fix: qualified baseline tests, `input_for` through `_resolve_matching_inputs`, `_inputs_by_name`, `try` move, conflicting/legacy-profile tests, linter tests.
- **D. Four PRs.** As C, with the `try` move split out first: a release-branch copy of dev's `262e080dfe0` that gives per-test lint messages on its own.

## Scopes considered

### 1. As implemented (recommended)

Conflicting duplicate qualified test params (top level, repeat, repeat > conditional, any exact-name match) raise the existing "Ambiguous test parameter" error through `_resolve_matching_inputs`; identical ones are tolerated, compared by content with generated composite renames ignored, including inside collections. That becomes a per-test `TestsCaseValidation` finding (error ≥24.2, warning below) and a load-time error test at ≥24.2. The XML parser stores `edit_attributes` as dicts, which also fixes `to_dict()` JSON serialization.

| Pros | Cons |
|---|---|
| <ul><li>Fixes the reported cutadapt shape at lint and load time, plus top-level and plain-repeat variants</li><li>Reuses `_resolve_matching_inputs` and `visitor.repeat_inputs_to_array`; no new linter, flag or XSD</li><li>Fixes a separate live bug (tests dropped from `test_data` for `<edit_attributes>` tools)</li><li>Also fixes false "Ambiguous" on base for identical unqualified composite duplicates (probed)</li><li>`test_parameter_test_cases.py` untouched; new module and dev-mirroring `try` move keep merge-forward small</li></ul> | <ul><li>Comparison still filters on xml.py's generated-name prefix and recurses into collections (`_comparable_collection`)</li><li>sourmash sketch and isoformswitchanalyzer go red at load on a point release (PR-body note)</li><li>Below 24.2 the runtime still silently takes the last value; only lint warns</li></ul> |

### 2. Original scope (alt `issue_24389_duplicate_test_params_26.1_alt_original_scope`, `497b90bc667`)

The duplicate fix without the parser change; `_comparable_test_input` duck-types Elements vs dicts.

| Pros | Cons |
|---|---|
| <ul><li>Doesn't change the parsed test dict shape</li></ul> | <ul><li>Leaves the `edit_attributes` JSON bug that drops whole tools' tests from `test_data`</li><li>Keeps `hasattr(edit, "attrib")` duck-typing</li><li>No consumer relies on Elements (re-scope review), so nothing is gained</li></ul> |

### 3. Move the generated composite rename out of `edit_attributes`

Carry `_COMPOSITE_RENAMED_...` in its own parsed key, teach `require_file` and `test_data_iter` to apply it, delete the prefix filter, `_comparable_collection` and `COMPOSITE_DATA_RENAME_PREFIX`. Thermo-nuclear's preferred end state, now worth more since round 2 added the collection recursion.

| Pros | Cons |
|---|---|
| <ul><li>`_comparable_test_input` becomes plain value + attributes equality; ~25 lib lines and one commit go away</li><li>Author-written attributes no longer mix with generated data</li></ul> | <ul><li>Cross-version risk over `/api/tools/{id}/test_data` unless `require_file` re-inserts the name into `edit_attributes` server-side (plain and collection-element uploads both go through `require_file`, `verify/parse.py:358`); the serialized collection def's attributes would still change shape</li><li>Touches upload/rename code every composite test depends on</li><li>No user-visible bug fixed; dev follow-up</li></ul> |

### 4. Deterministic composite rename name

Derive the generated name from the test index and the param's content (hash of `composite_data`, `ftype`, metadata) instead of `uuid1`, so identical duplicates get identical names and the filter and collection recursion can go without changing the API shape.

| Pros | Cons |
|---|---|
| <ul><li>Same simplification as scope 3 with no new key</li><li>Identical uploads dedupe in `require_file`</li></ul> | <ul><li>Two distinct params (or collection elements, all parsed with `i=0`) with identical content would share one upload and name; needs proof the interactor's name lookup copes</li><li>Changes upload naming on a release branch to delete ~25 lines; no bug fixed</li></ul> |

### 4b. Flag the generated rename entry instead of matching its prefix

Have the parser add a marker key (e.g. `"generated": True`) to the inserted composite rename dict; `test_data_iter` reads only `type`/`value`, so old clients ignore it. The comparison filters on the flag.

| Pros | Cons |
|---|---|
| <ul><li>Properly fixes Codex's refuted prefix-collision case with no wire break</li><li>Drops the `COMPOSITE_DATA_RENAME_PREFIX` coupling between `case.py` and `xml.py`</li></ul> | <ul><li>Keeps `_comparable_collection`; same line count</li><li>Fixes nothing reachable (no author uses the internal prefix)</li></ul> |

### 5. Re-add the XSD `xs:unique` (root-cause comment proposal)

Add `xs:unique` on `param/@name` per test `repeat`/`conditional`/`section` so schema validation flags duplicates.

| Pros | Cons |
|---|---|
| <ul><li>Literal answer to "can the test schema cover this"; editor feedback</li></ul> | <ul><li>Rejects a working ≤24.1 idiom (outer repeat elided, same-name params fill successive instances); reproduced in normal review</li><li>XSD can't be profile-gated</li><li>Duplicates `TestsCaseValidation`, which already uses the right per-profile level</li></ul> |

### 6. Legacy runtime path below 24.2

Make `ParamContext.__raw_param_found` (`verify/parse.py`) detect conflicting or unconsumed duplicates, or agree with the modern path on first vs. last.

| Pros | Cons |
|---|---|
| <ul><li>Closes the last silent drop for old-profile tools</li></ul> | <ul><li>No warning channel at runtime; raising breaks old tools' tests, which the profile gate exists to prevent</li><li>`TestsCaseValidation` already warns below 24.2</li><li>First/last divergence is moot for conflicting values now</li></ul> |

### 7. Contraction: lint-only, no load-time error at ≥24.2

Report conflicting duplicates only through `TestsCaseValidation`; at runtime keep resolving them silently so no IUC test goes red on 26.1.

| Pros | Cons |
|---|---|
| <ul><li>No IUC test flips from pass to error on 26.1</li></ul> | <ul><li>Needs a validation-vs-runtime mode flag</li><li>Keeps the reported bug (runs with a silently chosen value, fails as an output mismatch)</li><li>Inconsistent with conflicting unqualified duplicates, which already fail at load (`5a443294512`)</li></ul> |

### 8. Small items from round 2 reviews

- **Hand-written `edit_attributes` names starting with `_COMPOSITE_RENAMED_` are ignored in the comparison** (Codex P2, refuted). Only reachable by an author copying Galaxy's internal prefix; a position-based filter would couple to parser insertion order. Scope 3 removes it properly on dev.
- **Move the pre-existing unqualified-duplicate tests (`5a443294512`) into `test_parameter_test_cases_duplicates.py`.** Test-only churn that would break the "base test file untouched" property on 26.1. Dev follow-up.
- **YAML collection shape in `_comparable_collection`.** Unreachable (YAML test inputs are a mapping, so no duplicates); no guard needed.

### Note: companion tool fixes

Not branch scope: one-line IUC fixes for sourmash sketch and isoformswitchanalyzer (red at load), and optionally hicAdjustMatrix, augustus, qiime make_emperor (lint warnings only).
