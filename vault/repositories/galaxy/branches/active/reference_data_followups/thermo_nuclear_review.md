Run via Claude Opus 5.5 at low (reasoning_effort=15) effort.

# Thermo-nuclear code quality review (re-harden): reference_data_followups

Reviewed `b333e14eab4` (8 commits) fresh. Verdict: approve. I found no structural blockers and made two small fixes:

- Hoisted the leftover inline `setup_for_runtimeify` import in `evaluation.py`, folded into "Share reference_data runtime dumping and table access rule".
- Aliased the parser `YamlToolSource` import in the fixture parity test as `YamlToolSourceParser`, folded into "Fix YAML text defaults dropped by to_internal()".

The new head is `05f155c5e78`, and the four Baseline commits are still first. No security findings.

Not acted on:
- **Root cause of the text-default drop stays open.** `default_value=` vanished silently because `ToolSourceBaseModel` (`tool_util_models/_base.py`) has no `model_config`, so the internal parameter models ignore unknown kwargs. The structural guard would be `extra="forbid"` on that base, or `populate_by_name=True` on `TextParameterModel`. That is a codebase-wide change, so it is a follow-up. The static half of this is normal review 2's mypy `init_forbid_extra` note.
- **No other alias trap exists.** I checked this because the parity test only covers fields the fixtures use. `TextParameterModel.default_value` (`alias="value"`) is the only aliased field on a parameter *definition* model. The data and collection `extensions` fields use `validation_alias=AliasChoices(...)` and `populate_by_name`, so both names work.
- **Settled in the [first pass](earlier_drafts/1/thermo_nuclear_review.md), not relitigated:**
  - the factory split (#23888)
  - the duplicated YAML-only guard, including its duplicated message literal
  - the `reference_data_runtime_json` signature
  - the duplicated `table_name`/`trusted` on `ReferenceDataToolParameter`

  The parity-test class `if` from the first pass is closed: the test challenge replaced it with `DynamicToolSources`.
- **The `TYPE_CHECKING` import of `YamlReferenceDataParameter` in `parser/interface.py`** follows the file's existing pattern for annotation-only imports.
- **`_common_param_kwargs` (factory) and `_common_internal_kwargs` (yaml_parameters) are near-duplicates.** Both predate the branch. They would collapse naturally under #23888.

<details><summary>Full review</summary>

## Scope since the first pass

The re-scope adds `b333e14eab4`. It is a one-token fix, `YamlTextParameter.to_internal()` passing `value=` instead of `default_value=`, plus a fixture-wide parity test. The test runs every functional YAML fixture × GalaxyUserTool/GalaxyTool × full/`exclude_unset` dump. The other seven commits only changed through test-challenge folds. I re-read them all fresh.

## 1. Text-default fix (sound; root cause noted)

The fix matches the factory, which already passes `value=default_value` (`factory.py:151`). The parity test is the right shape:

- It asserts `factory(dump(model)) == [p.to_internal() for p in model.inputs]` over real fixtures.
- It pins every v1 type the fixtures use, including nested conditional `whens`.

The failure class is silent kwarg loss on internal models. Pydantic ignores extras on `ToolSourceBaseModel`, and an aliased field without `populate_by_name` only accepts its alias. I audited `tool_util_models/parameters.py`:

- **`TextParameterModel.default_value`** is the only definition-model field with a bare `alias=`.
- **Request and runtime models** have their `alias="class"` and `alias="__class__"` fields constructed from dicts, not kwargs.
- **`extensions` on the data and collection models** uses `AliasChoices`.

So nothing else in `to_internal()` can hit this today. A future aliased field would hit it again, which is why `extra="forbid"` on the definition base is the durable fix. It is out of scope because it changes validation for every internal parameter model.

## 2. Leftover inline import (acted on)

`UserToolEvaluator.build_param_dict` imported `setup_for_runtimeify` locally even though `galaxy.tools.runtime` was already imported at module top for `setup_for_reference_data`. The branch hoisted `runtimeify` out of that same block and left this sibling. It is now part of the existing top-level `galaxy.tools.runtime` import. The local import came from dev, but this branch already touched the block.

## 3. Test naming (acted on)

`test_user_tool_source_fixtures.py` imported the *parser* `YamlToolSource` from `galaxy.tool_util.parser.yaml`. The module's docstring and comments use `YamlToolSource` for the *pydantic model* in `tool_util_models`. `test_yaml_parameters.py` already aliases the parser as `YamlToolSourceParser`, and the fixture test now does the same.

## 4. Structure re-check (no action)

- **`_canonical_input_source` + `CanonicalYamlReferenceDataInputSource`.** There is one dispatch point, and the model is non-optional. The trusted-only key check still runs on the dumped dict. `dynamic_options` would be rejected earlier by `extra="forbid"` anyway, so the error surface is the same.
- **`ToolDataTable.readable_by(*, trusted)`.** This is the one access rule, and both the form and the job read through it.
- **`reference_data_runtime_json`.** It dedupes the dump policy across `runtimeify` and the legacy visitor.
- **Module docstring in `yaml_parameters.py`.** It now records that only reference_data loads through `to_internal()`. Accurate.

## 5. File size

No file crosses 1k lines because of this branch:

| File | branch |
| --- | --- |
| `parser/interface.py` | 988 |
| `parameters/convert.py` | 889 |
| `parser/yaml.py` | 744 |

`evaluation.py` was already over 1k on dev. This pass nets +2 lines there (import list).

## 6. Tests

- No weak or OR-assertions found.
- `_GALAXY_TOOL_ONLY_FIXTURES` is an explicit one-entry exception set. That is preferable to try/except class detection.

## Verification

- Unit: `test_reference_data.py`, `test_yaml_parameters.py`, `test_user_tool_source_fixtures.py`, `test_evaluation.py`, `test_parsing.py`, `test_parameter_specification.py`: 410 passed.
- Intermediate commit `f6723040770`: `test_reference_data.py` + `test_evaluation.py` 40 passed.
- API, run one at a time:
  - `test_user_tool_contract.py -k reference`: 18 passed.
  - `test_unprivileged_tools.py -k "reference or table_closed or admin_yaml_tool"`: 3 passed.
- Lint and types:
  - ruff, black and isort are clean, and the pre-commit hooks pass.
  - mypy reports no errors on changed lines. The remaining `evaluation.py` errors are on untyped defs that already exist.

</details>
