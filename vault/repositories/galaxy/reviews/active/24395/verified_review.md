### P1 1: Selected branch uses the option label, not its value, so labelled defaults break test parsing (implementation verified)

Adding `break` makes the `selected` branch in `_matching_case_for_value` reachable for the first time. That branch assigns `name`, but `parse_static_options()` returns `(text, value, selected)`, so `name` is the option's label. `case_when` is compared against it, and `case_when` holds option values. When a selected option's label differs from its value (e.g. `<option value="b" selected="true">B</option>`), no `when` matches. `_matching_case_for_value` returns `None`, and the tuple unpack at `parse.py:247` raises `TypeError`. The whole test then becomes an error. Before this PR, such a test was expanded into the wrong branch but still ran. This is why CI fails `test/unit/tool_util/test_parameter_test_cases.py::test_legacy_features_fail_validation_with_24_2`, on `test/functional/tools/implicit_default_conds.xml`.

<details><summary>Details</summary>

Bundled tools with a non-first labelled `selected` option in a conditional (`tools/maf/*`, `tools/meme/meme.xml`, `tools/next_gen_conversion/fastq_gen_conv.xml`, `tools/phenotype_association/master2gd_snp.xml`) would hit the same error at the PR head. The same holds for any IUC tool with this pattern once `galaxy-tool-util` ships.

</details>

<details><summary>Evidence</summary>

- At `b95cd79f9bb`, parsing `implicit_default_conds.xml` gives `error: True` with `TypeError: cannot unpack non-iterable NoneType object` from `parse.py:247`.
- `test_legacy_features_fail_validation_with_24_2` fails at `b95cd79f9bb` and passes after the fix.
- The `parse_static_options` doctest shows `[('A', 'a', False), ('B', 'b', False)]`, so the tuple is `(text, value, selected)`.

</details>

Use the value, which matches `SelectToolParameter.get_initial_value` and `SelectParameterModel.default_value` (the first selected option's value):

```diff
-            for name, _, selected in static_options:
+            for _, value, selected in static_options:
                 if selected:
-                    default_option = name
+                    default_option = value
                     break
```

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P2 1: No regression test for the selected-option default (implementation verified)

The PR adds no test. Existing coverage caught the label/value bug only by accident, through the 24.2 legacy-features test. `implicit_default_conds.xml` can't show the original bug either. Both of its `when`s use the same param name, and its test sets no conditional params, so base and fixed parsing expand the same inputs.

The review branch adds `test/functional/tools/parameters/gx_conditional_select_selected.xml`, a sibling of `gx_conditional_select.xml`. It has a non-first `selected` option whose label differs from its value, and a different param in each `when`. Its second test omits the selector and sets only `boolean_parameter`, qualified inside `<conditional>`, from the selected `when`. A new parsing test, `test_conditional_defaults_to_selected_option` in `test/unit/tool_util/test_test_definition_parsing.py`, checks that this expands to `{"conditional_parameter|boolean_parameter": [True]}`. The tool's own `inputs_json` assertions check the same thing in the framework run.

<details><summary>Evidence</summary>

| | `origin/release_26.1` | `b95cd79f9bb` | review branch |
|---|---|---|---|
| unit `test_conditional_defaults_to_selected_option` | fails: `{} != {'conditional_parameter\|boolean_parameter': [True]}` (resolved to first `when`, param dropped) | fails: `TypeError` | passes |
| framework `gx_conditional_select_selected` test 1 | fails: `Failed to find property [boolean_parameter] with JSON value [true]` | not run | passes (both tests) |

`test_validate_framework_test_tools` and `test_framework_tool_checks` still pass with the new tool present.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 1: Failure log prints `declared_value`, which is always `None` on the default path (implementation verified)

When no `when` matches the default, the log reads `Failed to find case matching value (None) ...`, which is the line that shows up in this PR's CI logs. It should name the value it actually tried to match.

The review branch tracks an `effective_value` (the declared value, the boolean query value, or the select default) and logs that. A tool whose selected option `z` has no `when` now logs `Failed to find case matching value (z) ...`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: Default-`when` selection is re-derived instead of reusing the typed model (dev follow-up, non-blocking)

"Which `when` is the default" now lives in three places: this parser, `SelectToolParameter.get_initial_value`, and `SelectParameterModel.default_value` / `cond_test_parameter_default_value()` in `tool_util_models/parameters.py`, which the model factory already uses to set `is_default_when`. They have already drifted. This label/value slip is one case. Another is that the test parser ignores `optional` selects. `parse.py` already imports `galaxy.tool_util.parameters`.

On `dev`, a follow-up could have `_matching_case_for_value` use the parsed `is_default_when`, or the typed model's default, instead of re-walking the static options. The one-token fix above is the right size for `release_26.1`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort.

</details>
