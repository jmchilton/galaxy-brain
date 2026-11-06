# issue_23980_static_restriction_default — implementation debrief

Branch: `issue_23980_static_restriction_default` @ `55b74d41f40` (jmchilton fork), 3 commits on origin/dev `9fd083720a7`.
Issue: galaxyproject/galaxy#23980 — workflow text params with static `restrictions` ignore their `default` in the run form.

## Fix (`lib/galaxy/workflow/modules.py`)

- `_is_default_option(value, default_value)`: module-level matcher; a list default selects each entry, a scalar default keeps the old `bool(default and value == default)` check. Used by both `restrict_options` paths (single connection + intersection) and the static path.
- `_parameter_def_list_to_options(parameter_value, default_value=None) -> list[OptionDict]` hoisted from a closure in `get_runtime_inputs`; sets per-option `selected`. Suggestions call it without a default, so every option gets `selected: False` (a `TextToolParameter` ignores it).
- Dropped the dead top-level `parameter_kwds["selected"]`; the dict input source only reads per-option `selected` (`tool_util/parser/yaml.py`). `parameter_kwds` annotation narrowed to `list[OptionDict]`.
- Execution is unaffected: `execute`/`get_input_value` use `step.get_input_default_value`, never `get_initial_value`. Only the run form's `to_dict` changes, and it now matches what a run with no value supplied already did.

## Tests

- API `test_value_restriction_static_default_selected`: scalar, multiple (`[text]`, default `[b, c]`) and dict `{value, label}` restrictions; checks `value` and the option `selected` flags from `download?style=run`. Red on dev (`'a' == 'b'`).
- API `test_value_restriction_selects_multiple_text_list_default`: copied from the `issue_21015_multiple_text_param` branch (`4736fd1d066`); covers the list-default change on the `restrictOnConnections` path. Red on dev (`[] == ['ex2', '--ex3']`).
- Selenium `test_execution_with_text_default_value_and_static_restrictions` (test challenge): run form shows `Ex2`, then submits and checks the output. **Not run locally**, so CI is the first run.
- All 7 `test_value_restriction*` API tests pass. `test/unit/workflows` passes (174, 1 skipped). ruff/black/isort clean; mypy reports no errors in `modules.py`.
- Local runs borrowed the `issue_21015_multiple_text_param` venv (it doesn't install `galaxy` itself; `PYTHONPATH=lib`) because disk space was low. This worktree has no `.venv`.

## Test challenge

The parametrized unit test was dropped: it duplicated the API test and recomputed the expected flags itself. Its dict-form case moved into the API test. See [test_challenges_debrief.md](test_challenges_debrief.md).

## Review findings not acted on

- Falsy scalar default (`""`) never matches, while a list containing `""` does. I kept the old truthiness guard to stay identical to the 21015 branch and existing behavior; the edge case is obscure.
- A list default on a `multiple: false` input marks several options selected (the form shows the first). This isn't a regression; 21015 adds save-time validation for it.
- Out of scope, seen on dev: `_parameter_option_def_to_tool_form_str` crashes on non-string restrictions (`[0, 1]` → `TypeError`) and on dict restrictions without `label` (`KeyError`). Possible separate issue.
- No E2E test for the multiple case: multiselect chip text is hard to predict and no existing E2E test submits a multiple text input. The API test covers that payload.

## Overlap with `issue_21015_multiple_text_param`

Both branches edit the same two `"selected":` lines in `restrict_options`; 21015 also adds a `default_values` block just above them. The two approaches behave the same. Whichever lands second keeps `_is_default_option` and drops 21015's `default_values` block. 21015's commit `4736fd1d066` becomes redundant: its API test is now here, so drop it there to avoid a duplicate test. The rest of 21015 doesn't conflict.
