# Scope evaluation

**Recommendation: modest expansion (Scope B).** Keep the parse fix as implemented. Add two small pieces so the issue's whole "select values with commas" surface is handled on 25.1. First, update the `galaxy.xsd` test `<param>` docs: a single select takes a comma-containing option value verbatim, and a `multiple` select needs a `value_json` list. Second, add a tool-test linter warning for `value=` strings on a `multiple` select whose static option values contain commas. The fix itself stays the same. Don't do option-aware splitting (C) or move off the legacy API (D) here: D can't be done on 25.1, and C goes against where upstream is heading. The forward-merge to dev must also add `hidden_data` to the gate, and should stop splitting `test_case_json` strings (E).

No "Possible Decompositions" section: the branch is about 80 inserted lines, under the 100-line threshold. Scope B would add roughly 40-60 more (docs, linter, linter test). If it grows that way, the natural split is the parse fix first, then docs and linter.

## A. As implemented

`verify/parse.py` comma-splits test values only for `data` and `multiple` inputs (`ftpfile` counts as multiple by default). Other values are wrapped as `[value]`. This applies to plain params and conditional discriminators. Covered by the new `select_comma_value` framework tool and an `ftpfile` unit test.

| Pros | Cons |
|---|---|
| <ul><li>Fixes both shapes in the issue (plain select, conditional `when`) plus `value_json` strings</li><li>Same gate `case.py` and the request model already use (split only when `multiple`), so the legacy and validated paths now agree</li><li>Tiny, private helper; red-to-green framework test with the issue's exact error</li></ul> | <ul><li>A `multiple` select with comma option values is still ambiguous in `value=` form. Tool authors only learn this by hitting a confusing error</li><li>Nothing in the docs or linter says which params get comma-split</li></ul> |

## B. A + xsd docs + lint warning (recommended)

As A, plus the `galaxy.xsd` `TestParam` `select` / `value_json` docs explain the comma rule. A new `linters/tests.py` warning flags `value=` on `multiple` selects whose static options contain commas and points to `value_json='["a,b"]'`.

| Pros | Cons |
|---|---|
| <ul><li>Covers the remaining limitation, which normal review 1 and the initial debrief both raised, without guessing at ambiguous strings</li><li>The xsd text currently says multiple selects take a "comma separated list", which is exactly the trap</li><li>Lint reaches IUC and planemo authors before CI fails. It fires only on tests that are already ambiguous</li><li>Galaxy accepts linter and doc additions on release branches</li></ul> | <ul><li>Scope creeps into `linters/` and needs a linter unit test</li><li>A linter on 25.1 reaches users only through galaxy-tool-util/planemo releases from that branch</li></ul> |

<details>

- Linter shape: iterate test `<param>`s, resolve the input via the existing `TestsParamInInputs`-style lookup, and check `multiple` plus `option/@value` containing `,` plus `value` attribute (not `value_json`). Static options only, since dynamic options can't be resolved at lint time.
- Docs: the `select` subsection of the `TestParam` documentation (galaxy.xsd around line 1758) and the `value_json` attribute doc.
- Droppable piece if John wants it smaller: the linter. The doc note is a few lines and is the minimum worth adding.

</details>

## C. Option-aware splitting for multiple selects

Don't split a `value=` string that exactly matches a static option value, or rejoin split pieces into known options, so `value="relax,150,100"` works on a `multiple` select too.

| Pros | Cons |
|---|---|
| <ul><li>Would close the remaining ambiguity outright</li><li>Issue title is generic ("select values with comma")</li></ul> | <ul><li>Needs both parsers: legacy `parse.py`, and `SelectParameterModel.split_str` (a static validator with no option access) for 24.2+ validate-on-load. Not modest</li><li>Heuristic. Options `a`, `b`, `a,b` stay ambiguous</li><li>Goes against upstream: dev's request model still comma-splits `test_case_xml` strings for multiple selects, and dev `case.py` requires `value_json` for typed values (for example `value_json="[]"` at profile 26.1+)</li><li>Dynamic options can't be resolved at parse time</li></ul> |

## D. Move tool tests off the legacy API path (structural alternative from the issue comment / thermo-nuclear review)

Submit tests through the tool request API so the already-correct `case.py` request state is used instead of `_process_raw_inputs` output.

| Pros | Cons |
|---|---|
| <ul><li>The long-term fix. The request state is already right for single selects</li></ul> | <ul><li>Impossible on 25.1: the branch has no non-legacy test submission (`use_legacy_api` / `DEFAULT_USE_LEGACY_API` don't exist there)</li><li>Even on dev (`DEFAULT_USE_LEGACY_API = "always"`), `verify/parse.py` runs client-side in galaxy-tool-util/planemo against servers of every version, so the legacy-path fix is still needed</li><li>Flipping the default changes behavior across the whole tool ecosystem. That is a separate dev decision</li></ul> |

## E. Dev forward-merge adjustments

When merging forward, extend the gate for dev-only features. Add `hidden_data` next to `data` (dev checks `param_type in ("data", "hidden_data")`). For `value_state_representation == "test_case_json"` (YAML tests), don't comma-split strings at all.

| Pros | Cons |
|---|---|
| <ul><li>Required for correctness on dev. Without `hidden_data`, those inputs would stop splitting</li><li>Dev's request model doesn't split `test_case_json` strings ("lists are already validated as lists"), but dev's legacy `parse.py` still does. The two paths diverge for YAML tests</li></ul> | <ul><li>Dev-only. It can't land on 25.1, so it happens at merge time or in a small dev follow-up</li><li>The `test_case_json` change alters YAML tests that rely on comma strings for multiple params (probably rare)</li></ul> |

## F. Contract: drop the ftpfile default / unit test

Revert `6caf89ba51d` and leave `ftpfile` unsplit.

| Pros | Cons |
|---|---|
| <ul><li>Smaller diff</li></ul> | <ul><li>Brings back a confirmed regression (codex P2): `value="a.txt,b.txt"` on `ftpfile` would become one filename</li></ul> |

## Considered, no action

- **Single `data` still splits**: unchanged legacy behavior. A non-multiple data param given two files was never valid, and changing this risks breaking existing tests.
- **data_column / genomebuild / group_tag**: the gate already matches `case.py` (split only when `multiple`). drill_down is gated on `multiple` the same way. Comma values on single-valued variants were already invalid.
- **`multiple_select_value_split` (newline split, strip) for multiple params**: a behavior change in the legacy path for no reported bug (normal review 1).
- **Data `location` comma split**: predates this branch. URLs containing commas aren't reported.
- **Restore the dropped unit tests**: a test-challenge decision, not a scope question.
