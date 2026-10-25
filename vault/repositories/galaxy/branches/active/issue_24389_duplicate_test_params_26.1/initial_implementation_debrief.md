# Initial implementation debrief

Fixes #24389: conflicting duplicate test params got silently dropped. The issue reports the repeat > conditional case. The same thing happens at top level and in a plain repeat.

## Commits

1. `603e09ad2e5` Baseline tests: identical duplicate qualified test params are tolerated at top level, in a repeat and in a repeat > conditional. Passes before the change.
2. `c0171cfc6ae` The fix:
   - `LegacyTestInputResolver.input_for`: exact-name matches go through the existing `_resolve_matching_inputs`. Conflicting values raise `Ambiguous test parameter (<path>) specified more than once with different values`. Identical values are still tolerated.
   - `_repeat_inputs_to_array`: `_inputs_as_dict` (last value wins) is replaced by `_inputs_by_name` (name → list). Duplicates now reach `input_for` instead of vanishing. This reuses `visitor.repeat_inputs_to_array` unchanged.
   - `test_case_validation`: the state build now happens inside the `try`, so a merge-time error becomes that test's `validation_error`. Before, it escaped, and the linter reported a single coarse "Serious problem parsing" for the whole tool. Dev already does this (`262e080dfe0`).
   - `galaxy.xsd`: `xs:unique` on `param/@name` for direct children of test `repeat`/`conditional`/`section`, declared in the shared `TestParamElement` group so it applies at every nesting level.

## Tests

- `test_parameter_test_cases.py`: parametrized conflicting-duplicate test across the 3 placements. It checks `case_state` raising, the linter path (`validate_test_cases_for_tool_source`) and the runtime path (`parse_tool_test_descriptions` → error test). It was red before the fix.
- `test_tool_linters.py::test_tests_duplicate_param_in_container`: on the cutadapt shape, the XSD error and `TestsCaseValidation` both fire, on test 1 only. Sibling `<repeat>` elements with the same names (test 2) stay valid. The XSD half was red before the fix.
- Results: `test_parameter_test_cases.py`, `test_test_definition_parsing.py`, `test_tool_linters.py` and `test_assertion_models.py` all pass (151). The full `test/unit/tool_util` run has 38 failures, all env/network: mulled, cwl schema fetch, conda, and the toolbox watcher. None touch this code.
- All 298 `test/functional/tools/*.xml` validate against the new XSD (the `.ci/validate_test_tools.sh` loop).

## Real-world impact (tools-iuc `origin/main` `ace97b1e2`, 2066 tool files)

The pre-fix cutadapt (`729b15e~1`) gets flagged by both the XSD and case validation. On current main 5 tools are flagged, all genuine authoring slips with conflicting values:

| tool | profile | XSD | case validation |
|---|---|---|---|
| qiime make_emperor | 18.01 | - | warn (top-level `map_fp`) |
| hicexplorer hicAdjustMatrix | 23.0 | error | warn |
| augustus | 23.1 | - | warn (top-level `outputs`: `value_json=null` vs `value=""`) |
| sourmash sketch | 25.0 | error | error + test now errors at load |
| isoformswitchanalyzer | 25.1 | error | error + test now errors at load |

For profile ≥ 24.2, the test now fails at load instead of running with a silently chosen value. Conflicting unqualified duplicates already behaved this way.

## Not done

- The legacy runtime path (`verify/parse.py` `ParamContext.__raw_param_found`) still takes the last match for profile < 24.2, so for old tools the linter warning is the only signal. Making it raise would break old tools' runtime tests on a release branch.
- The top-level legacy-vs-modern first/last divergence is gone for conflicting values: they now raise on the modern path.

## After normal review

I dropped the XSD hunk. It hard-errors on a legacy (≤24.1) idiom that still works: an outer repeat left out of the test, so same-name params in one test container fill successive repeat instances. The XSD can't be gated on profile. The fix commit is now `85fdcfa736f` and touches only `case.py` plus tests. The linter test checks `TestsCaseValidation`: error at 25.1, warning at 23.0. A new pin test shows that below 24.2 the test still runs on the legacy inputs. In the impact table, the XSD column no longer applies, so hicAdjustMatrix is now warning-only.
