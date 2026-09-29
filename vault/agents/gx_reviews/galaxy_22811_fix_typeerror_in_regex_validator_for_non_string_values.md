# PR #22811 — Fix TypeError in regex validator for non-string values

- PR: https://github.com/galaxyproject/galaxy/pull/22811 (base `dev`, +15/-1, 2 files)
- Author: SAY-5 (contributor)
- Head SHA: 910fcc5d03c (single commit)
- Closes: #22689 (Sentry bot: `TypeError: expected string or buffer`, from `workflow/modules.py` `InputParameterModule.execute` -> `TextToolParameter.validate` -> `RegexValidator.validate` -> `regex_validation`)
- Reviewers requested: jmchilton, bernt-matthias
- CI: 3/3 pass (labels, update-title, CircleCI get_code_and_test). No unit/API suites reported on the PR.
- Worktree: `~/projects/worktrees/galaxy/pr/22811`, no `.venv`, tests not run locally.

## Summary

One-line change in `RegexParameterValidatorModel.regex_validation`: `regex.match(expression, val or "")` -> `regex.match(expression, str(val) if val else "")`. Adds one test in `test/unit/app/tools/test_parameter_validation.py` using an `integer` param with a regex validator.

It stops the crash. But the fix has a falsy-value bug for exactly the int case it targets. It contradicts the typed/pydantic path, which rejects non-strings. And the test covers a param/validator combination the linter flags as an error, not the workflow text-parameter path from the Sentry trace. The follow-up PR comment says "isinstance guard ... so non string values fail validation". That describes the opposite of the committed code, which coerces.

Verdict: request changes. Small PR, easy to fix.

## Findings (ranked)

### 1. `if val` collapses legitimate falsy values to `""` (bug)
`lib/galaxy/tool_util_models/parameter_validators.py:186`

`str(val) if val else ""` maps `0`, `0.0` and `False` to `""`. With `<validator type="regex">[0-9]+</validator>` and value `0`, the match is against `""` and fails ("Value '0' does not match..."). A value of `10` passes. The old `val or ""` had the same falsiness, but only `None` and `""` could reach it without crashing, so it didn't matter. Once non-strings are accepted it matters.

Fix, if coercion stays: `"" if val is None else str(val)`.

### 2. Coercion contradicts the typed validation path. Choose one contract and share it.
`lib/galaxy/tool_util_models/parameter_validators.py:176-179` vs `:181-187`

`statically_validate` (the pydantic / tool-state path, via `pydantic_validator_for` in `tool_util_models/parameters.py:349-362`) already does:

```python
if value and not isinstance(value, str):
    raise ValueError(f"Wrong type found value {value}")
```

before calling `regex_validation`. So the new tool-state path treats a non-string as **invalid**, and after this PR the legacy `RegexValidator.validate` path (`tools/parameters/validation.py:80-81`) treats it as **stringify and match**. The same validator model gives two answers depending on the caller. `regex_validation` is the shared seam both paths already use (legacy `RegexValidator` delegates to it), so fix it there once:

- Preferred, matches the typed path and the author's own comment: move the type check into `regex_validation` so both callers inherit it. Non-None, non-str (per list element) -> `raise_error_if_validation_fails(False, validator, value_to_show=val)`, or a ValueError. Either way the caller sees a `ValueError`, not a `TypeError`. That matters: `InputParameterModule.execute` (`workflow/modules.py:1693-1714`) only catches `ValueError` and turns it into a clean `FailWorkflowEvaluation(workflow_parameter_invalid)`. The current `TypeError` escapes as a generic "Failed to execute scheduled workflow". Then drop the duplicate check in `statically_validate`.
- Alternative: if maintainers want a workflow text param to accept `5` as `"5"`, do the coercion in one place and make `statically_validate` agree, with the `is None` fix from #1. Also note that `negate="true"` validators then pass silently for stringified junk like `"{'a': 1}"`, `"True"`, `"[1, 2]"` (nested lists) or `"1e-05"`.

With either choice, the regex validator stops having two contracts.

### 3. The test covers an unsupported configuration, not the reported bug
`test/unit/app/tools/test_parameter_validation.py:144-156`

- `PARAMETER_VALIDATOR_TYPE_COMPATIBILITY["integer"] = ["in_range", "expression"]` (`lib/galaxy/tool_util/linters/inputs.py:69-71`). `<param type="integer">` with `<validator type="regex">` is a **lint error**. The test pins down behavior for a config Galaxy tells tool authors not to write.
- The Sentry trace is a workflow **text** parameter (`TextToolParameter.validate`, line 435 in the trace; regex validators are only offered for `text`/`directory_uri` workflow inputs, `workflow/modules.py:1351-1394,1512`). The value arrives raw from `progress.inputs_by_step_id` / step state (`get_input_value`, `modules.py:1721-1736`) with no `from_json`. A faithful test is `<param type="text">` plus regex, `p.validate(10)` (and `p.validate(0)`, which catches #1), asserting whichever contract #2 settles on.
- Nit: the second case builds a new parameter inline in the `with` block. Build it first so only `validate` sits inside `assertRaisesRegex`, matching the other tests in the module.
- Placement is right: extending `TestParameterValidation` next to the existing `test_RegexValidator*` tests is the correct module. No assertions are weakened.
- Optional: if #2 moves the type check into `regex_validation`, a direct unit test on `RegexParameterValidatorModel.regex_validation` (or a `gx_text_regex_validation` `request_invalid: - parameter: 5` entry in `test/unit/tool_util/parameter_specification.yml:325`) locks in that both paths agree.

### 4. Sibling validators: same class of bug? (checked)
- `LengthValidator.validate` (`tools/parameters/validation.py:150-156`) calls `len(value)` and raises `TypeError` on an int. It isn't reachable from workflow parameter forms (they only expose regex, plus min/max for int/float). In tool forms it's only allowed on text/select-like params, where `from_json` gives strings or lists. It's latent, not in scope, but it's the same "ValueError vs TypeError" contract, so worth a follow-up if the shared-seam approach is taken. `LengthParameterValidatorModel.statically_validate` just skips non-str.
- `ExpressionValidator` catches all exceptions and turns them into a validation failure (`parameter_validators.py:146-153`), so it's safe.
- `InRangeParameterValidatorModel.statically_validate` skips non-numeric values. The legacy `InRangeValidator` goes through expression eval with `float(value)`, which is also caught. Safe.

### 5. Question: should this target a release branch?
The Sentry report came from usegalaxy.org (main). Galaxy usually lands bug fixes on the oldest supported `release_XX.Y` and merges forward. Maintainers can decide. Not blocking.

### 6. Question: where do non-string text values come from?
Probably API workflow invocations passing JSON numbers for a text parameter input, or a subworkflow text input connected to a numeric upstream parameter. Not verified. Reproducing that path would settle whether #2 should coerce (be lenient with API clients) or reject (match the typed path).

## Reuse assessment

`regex_validation` is already the shared seam for both the legacy `RegexValidator` and the pydantic `statically_validate`. The PR edits the right function but leaves the type policy split: reject in `statically_validate`, coerce in `regex_validation`. Moving the policy fully into `regex_validation` (and removing the duplicate check from `statically_validate`) leaves one reusable, consistent contract. No new abstraction is needed. `pydantic_to_galaxy_type` (`tool_util_models/parameters.py:271`) is the existing typed-path normalization hook, but it only unwraps `AnyUrl` and doesn't apply to the legacy path, so it isn't the right place here. The parameter `from_json` layer isn't a good fit either: the workflow path never calls it, and changing `TextToolParameter.from_json` would change persisted job params.

## Test assessment

- One new test in the right module and class, with no weakened assertions.
- It uses an `integer` param + regex, which the linter rejects. It should use a `text` param like the Sentry path.
- It misses the `0`/falsy case that exposes #1.
- It doesn't cover the typed path, so the legacy/typed divergence (#2) isn't caught.
- Not run locally (no venv). CI on the PR shows only lightweight checks passing.

## Draft GitHub review comment

> Posted by Claude (AI assistant) on behalf of jmchilton.
>
> Thanks for picking this up. The Sentry crash is real and worth fixing. A few things before merge:
>
> 1. **Falsy values**: `str(val) if val else ""` turns `0`/`0.0`/`False` into `""`, so an int `0` fails `[0-9]+` while `10` passes. If coercion stays it should be `"" if val is None else str(val)`.
>
> 2. **Two contracts for one validator**: `RegexParameterValidatorModel.statically_validate` (the tool-state/pydantic path) already rejects non-strings with `ValueError("Wrong type ...")` before calling `regex_validation`. With this change the legacy `RegexValidator` path stringifies instead, so the same validator accepts `10` on one path and rejects it on the other. Your PR comment describes an isinstance guard that makes non-strings fail validation. I think that's the better fix. Could the type check move into `regex_validation` itself (per element, `None` still treated as `""`) so both callers share it, and the duplicate in `statically_validate` go away? The error must be a `ValueError`: `InputParameterModule.execute` only catches `ValueError`, so the invocation would fail with a proper `workflow_parameter_invalid` reason instead of a generic scheduling failure.
>
> 3. **Test**: `integer` params with a `regex` validator are flagged as incompatible by the tool linter (`PARAMETER_VALIDATOR_TYPE_COMPATIBILITY["integer"]` only allows `in_range`/`expression`), so the test covers a configuration we don't support. The Sentry trace is a workflow `text` parameter receiving a non-string value. Could the test use `<param type="text">` with `p.validate(10)` and `p.validate(0)`, asserting the chosen behavior? Also please build the parameter outside the `assertRaisesRegex` block so only `validate` is inside it.
>
> Optional: since this is a bug seen on usegalaxy.org, it might be worth retargeting to the current release branch.
