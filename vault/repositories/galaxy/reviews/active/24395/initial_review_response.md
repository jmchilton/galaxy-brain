(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Opus 5.5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile gx_risk_assessment, Opus 5.5, low effort, reviewed commit `b95cd79f9bb`.

The one-way-ish risk is behavioral: every tool test (Galaxy, planemo, IUC via `galaxy-tool-util`) that leaves a conditional's select test param unset now resolves to the `selected` option instead of the first, so tests silently passing against the wrong branch for up to ~13 years may start failing after a minor release; the code itself is trivially revertible.

<details><summary>Risk Details</summary>

- Before this PR the `for/else` never broke, so the `else` always ran and `default_option` was always the first option's value; the `selected` branch was dead code since 48b7a50eb20 (2013), carried into 90c6dcc590d (2024).
- Tool tests that relied on the first-option behavior (unset conditional selector, non-first `selected` option, nested params belonging to the first `when`) change meaning; they may fail or exercise a different case. This lands in a patch release of `galaxy-tool-util`, which tool repos pick up via planemo without opting in.
- The newly live branch assigns `name` (tuple[0], the option label/text) while the fallback uses tuple[1] (the value). `parse_static_options()` returns `(text, value, selected)`, and `case_when` values are option values, so for any option whose label differs from its value (the common case, e.g. `<option value="yes" selected="true">Yes</option>`) nothing matches, `_matching_case_for_value` logs at info and returns `None`, and the conditional's nested test params are not resolved under it. The fix only works when label == value or the option has no text.
- Server-side, Galaxy's own select default already honors `selected`, so the test client and server previously disagreed; the fix aligns them, which is the intended behavior change.

</details>

<details><summary>Risk Review Advice</summary>

Confirm the selected branch should use the option value (`_, value, selected` / tuple[1]) rather than the label before merging; as written the fix silently no-ops for most real tools. A regression test with a label differing from its value would catch this.

Decide whether a release-branch patch is the right vehicle given tool-test behavior changes downstream; if so, call it out in release notes so IUC/planemo users understand newly failing tests reflect the tool's declared default.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24395_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_24395_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24395_review_0) builds on the PR head [`b95cd79f9bb`](https://github.com/galaxyproject/galaxy/commit/b95cd79f9bb). It completes the fix so that a conditional's `selected` select option resolves by its value rather than its label, which makes the CI-failing `test_legacy_features_fail_validation_with_24_2` pass again. It also adds a regression tool and a parsing test that fail on both `release_26.1` and the PR head, and makes the "no matching when" log report the value it actually tried.

- [`44f79b84068`](https://github.com/jmchilton/galaxy/commit/44f79b84068) Use option value, not label, for selected conditional default in test parsing: the selected loop now takes tuple[1] (value) instead of tuple[0] (label), matching the runtime and typed-model defaults.
- [`8970e7a489a`](https://github.com/jmchilton/galaxy/commit/8970e7a489a) Test conditional test params resolve against selected select option: adds the `parameters/gx_conditional_select_selected.xml` framework tool and `test_conditional_defaults_to_selected_option` in `test/unit/tool_util/test_test_definition_parsing.py`.
- [`a117a7b1a31`](https://github.com/jmchilton/galaxy/commit/a117a7b1a31) Log effective conditional value when no when matches: the failure log now prints the boolean query value or the select default instead of `declared_value`, which is always `None` on the default path.

</details>

</details>

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

Fixed in [`44f79b84068`](https://github.com/jmchilton/galaxy/commit/44f79b84068).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P2 1: No regression test for the selected-option default (implementation verified)

The PR adds no test. Existing coverage caught the label/value bug only by accident, through the 24.2 legacy-features test. `implicit_default_conds.xml` can't show the original bug either. Both of its `when`s use the same param name, and its test sets no conditional params, so base and fixed parsing expand the same inputs.

The review branch adds `test/functional/tools/parameters/gx_conditional_select_selected.xml`, a sibling of `gx_conditional_select.xml`. It has a non-first `selected` option whose label differs from its value, and a different param in each `when`. Its second test omits the selector and sets only `boolean_parameter`, qualified inside `<conditional>`, from the selected `when`. A new parsing test, `test_conditional_defaults_to_selected_option` in `test/unit/tool_util/test_test_definition_parsing.py`, checks that this expands to `{"conditional_parameter|boolean_parameter": [True]}`. The tool's own `inputs_json` assertions check the same thing in the framework run.

Fixed in [`8970e7a489a`](https://github.com/jmchilton/galaxy/commit/8970e7a489a).

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

Fixed in [`a117a7b1a31`](https://github.com/jmchilton/galaxy/commit/a117a7b1a31).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: Default-`when` selection is re-derived instead of reusing the typed model (dev follow-up, non-blocking)

"Which `when` is the default" now lives in three places: this parser, `SelectToolParameter.get_initial_value`, and `SelectParameterModel.default_value` / `cond_test_parameter_default_value()` in `tool_util_models/parameters.py`, which the model factory already uses to set `is_default_when`. They have already drifted. This label/value slip is one case. Another is that the test parser ignores `optional` selects. `parse.py` already imports `galaxy.tool_util.parameters`.

On `dev`, a follow-up could have `_matching_case_for_value` use the parsed `is_default_when`, or the typed model's default, instead of re-walking the static options. The one-token fix above is the right size for `release_26.1`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort.

</details>
