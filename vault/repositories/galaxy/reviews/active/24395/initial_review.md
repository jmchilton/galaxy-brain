# PR #24395 initial review — default profile

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Claude Opus 5.5, low effort
- Reviewed commit: `b95cd79f9bb` (base `release_26.1`)

## Verdict

Request changes. The diagnosis is right: without `break`, the `for ... else` always runs the `else`, so the test parser ignores `selected="true"` and always falls back to the first option. That bug dates to 2013 (`48b7a50eb20`, `lib/galaxy/tools/test.py`) and was copied into `verify/parse.py` by `90c6dcc590d` (24.2). But adding `break` turns on a branch that was dead until now, and that branch has its own bug: it stores the option's **label** where the code needs its **value**. Any select whose selected option has a label different from its value now fails to parse its tests. This breaks the existing `implicit_default_conds.xml` test tool, and CI is red because of it. The fix is one more token.

## P1 1: Selected branch uses the option label, not the value; breaks tests for labelled options

`parse_static_options()` returns `(text, value, selected)` tuples (doctest `lib/galaxy/tool_util/parser/xml.py:1506`). The newly live loop is:

```python
for name, _, selected in static_options:
    if selected:
        default_option = name   # label
        break
```

`case_when` is compared against `default_option`, and `case_when` is an option value. So for `<option value="different" selected="true">A different value</option>`, no `when` matches. `_matching_case_for_value` logs and returns `None`. The caller (`parse.py:247`) then runs `case_when, case_input_sources = None`, which raises `TypeError: cannot unpack non-iterable NoneType object`. That error is caught, and the whole test becomes an `InvalidToolTestDict`. Before this PR, that test was mis-expanded but still ran. Now it errors.

**Evidence**

- Repro: I parsed a small tool (conditional select with option `b` marked `selected`, a `when` per option, and unqualified test params `pa`/`pb`) under three versions of the file. I used the main checkout's `.venv` with `PYTHONPATH` pointed at the worktree's `lib`, because the worktree has no `.venv`.

  | variant | no labels | labels != values |
  |---|---|---|
  | base `release_26.1` | `{'c\|pa': ['7']}` (wrong branch) | `{'c\|pa': ['7']}` (wrong branch) |
  | PR head | `{'c\|pb': ['5']}` | **error: TypeError** |
  | PR + use value | `{'c\|pb': ['5']}` | `{'c\|pb': ['5']}` |

- Existing tool `test/functional/tools/implicit_default_conds.xml`: conditional `p2` has `<option value="different" selected="true">A different value</option>`. Base parses fine. The PR head gives `error: True ... TypeError`. With value instead of label it parses fine again.
- CI on `b95cd79f9bb`: "Test Galaxy packages" and "Unit tests" fail `test/unit/tool_util/test_parameter_test_cases.py::test_legacy_features_fail_validation_with_24_2` on `implicit_default_conds.xml`. The log has `implicit_default_conds - Failed to find case matching value (None) for ... conditional p2`, and the same line appears in the tool framework job's log. Many other CI reds are infra problems (Playwright/chromium on ubuntu26.04, etc.) and unrelated.

**Fix**

```diff
-            for name, _, selected in static_options:
+            for _, value, selected in static_options:
                 if selected:
-                    default_option = name
+                    default_option = value
                     break
```

This matches runtime and the typed models. `SelectToolParameter.get_initial_value` (`lib/galaxy/tools/parameters/basic.py:1175`) and `SelectParameterModel.default_value` (`lib/galaxy/tool_util_models/parameters.py:~1846`) both take the **first** selected option's **value**. With the fix, verify/parse agrees with both.

## P2 1: No red-to-green test

The PR adds no test. The existing coverage only caught the regression by accident. Suggested test, which fails on base and passes once fixed:

- Add a small test tool, e.g. `test/functional/tools/select_default_cond.xml` (also register it in `sample_tool_conf.xml`). Give it a conditional whose select has a non-first `selected` option with a label different from its value, plus a `<test>` that leaves the selector unset and sets only a param from the selected branch.
- Add an expectation in `test/unit/tool_util/test_test_definition_parsing.py` that `inputs` contains `cond|<selected-branch-param>` and not the first-branch param. Optionally also assert the output in the functional test, so the framework run checks what the job actually executes.

`implicit_default_conds.xml` alone is not enough. Its test sets no conditional params, so base and fixed parsing give the same `inputs`, and the runtime picks the right branch anyway.

## P3 1: Use the existing typed-model default instead of re-deriving it (follow-up, not for release branch)

`parse.py` already imports `galaxy.tool_util.parameters`. `cond_test_parameter_default_value()` / `SelectParameterModel.default_value` (`tool_util_models/parameters.py:2138`) already encodes "first selected value, else first option unless optional". The factory uses it to set `is_default_when`, so the "which `when` is the default" logic now lives in three places that have already drifted apart. Two concrete drifts: this label/value slip, and the fact that the test parser ignores `optional`. On `dev`, a follow-up could have `_matching_case_for_value` use the typed model or the parsed `is_default_when`. For `release_26.1` the one-token fix above is the right size.

## P3 2: Failure log prints `declared_value`, which is always `None` on this path

When nothing matches on the default path, the message says `Failed to find case matching value (None)`. It should report `default_option`, so a tool author can see which value failed to match. The CI log above shows how unhelpful the current message is. Separately, returning `None` into a tuple unpack at `parse.py:247` turns a logged "unspecified behavior" into an opaque `TypeError`. A clear error, or returning `(None, None)`, would be better. That code predates this PR, so this is optional.

## Notes (no action)

- Behavior change for tools in the wild: tests that leave a conditional selector unset, where the selector has a non-first `selected` default, will now expand unqualified params into the selected branch instead of the first branch. That matches what the runtime actually runs, so tests that passed only by accident may change outcome. That is the intended fix. Scanning `test/functional/tools/` turned up only `implicit_default_conds.xml` (labelled) and `multiple_versions_changes_v02.xml` (label equals value, unaffected). In bundled `tools/`, several have a non-first selected option with labels (`maf/*`, `meme/meme.xml`, `next_gen_conversion/fastq_gen_conv.xml`, `phenotype_association/master2gd_snp.xml`). All of them would hit P1 if run as tool tests at the PR head.
- The PR description asks for a minor release. If that happens, it should include the value fix, or every IUC tool with a labelled default selector loses its tests.
