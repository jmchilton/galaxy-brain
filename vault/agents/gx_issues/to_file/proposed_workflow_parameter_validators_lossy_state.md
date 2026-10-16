# Workflow input validators are rewritten on import, so a saved workflow can validate differently from its `.ga`

Importing a workflow rewrites the validators on its parameter inputs: `negate`, every range but the last, and a range's `message` are dropped, so the saved workflow can accept values its `.ga` rejects and reject values it accepts.

| Validators in the imported `.ga` | Saved and exported as | Value | `.ga` says | Galaxy does |
| --- | --- | --- | --- | --- |
| text, regex `^bad`, `negate: true` | regex `^bad`, `negate: false` | `bad1` | ❌ | ✅ |
| | | `good` | ✅ | ❌ |
| integer, in_range 1–5, `negate: true` | in_range 1–5, `negate: false` | `3` | ❌ | ✅ |
| | | `7` | ✅ | ❌ |
| integer, in_range `min: 1` plus in_range `max: 5` | one in_range `{min: null, max: 5}` | `0` | ❌ | ✅ |
| integer, in_range 1–5, `message: "1-5 only"` | in_range 1–5, no message | `7` | ❌ "1-5 only" | ❌ "must fulfill (1 <= value <= 5)" |

✅ accepted, ❌ rejected. Every row comes from the import path (`module_factory.from_dict` then `save_to_step`) on `dev` [`5ff1e46b8c3`](https://github.com/galaxyproject/galaxy/commit/5ff1e46b8c38c704be8da75b4db05b3d56f93f3d); the rewritten list is what is stored in the database and what a later `.ga` download contains. The two negated validators are inverted, not merely weakened.

A separate gap in the same validators: an in_range with `min: 5, max: 1` imports and is stored unchanged, and building the input's runtime parameter then fails with `AssertionError: min must be less than or equal to max` (`InRangeValidator` in `lib/galaxy/tools/parameters/validation.py`). That was seen at module level only; how it surfaces in the run form or an invocation was not checked on a server.

The workflow editor cannot create any of these validators: its form offers regex rows without `negate` and a single min/max pair. They come from API-built or hand-edited workflows, and soon from Format2 (see Context).

<details><summary>Reproduction: five failing unit tests</summary>

Save as `test/unit/workflows/test_parameter_validators_repro.py` and run `PYTHONPATH=lib python -m pytest test/unit/workflows/test_parameter_validators_repro.py -q` in Galaxy's unit-test environment. All five fail on `dev` `5ff1e46b8c3`.

```python
import json

import pytest

from galaxy import model
from galaxy.tools.parameters.workflow_utils import workflow_building_modes
from galaxy.workflow import modules
from .workflow_support import MockTrans


def import_input(parameter_type, validators):
    trans = MockTrans()
    trans.workflow_building_mode = workflow_building_modes.DISABLED
    tool_state = {"parameter_type": parameter_type, "optional": False, "validators": validators}
    module = modules.module_factory.from_dict(
        trans, {"type": "parameter_input", "label": "p", "tool_state": json.dumps(tool_state)}
    )
    step = model.WorkflowStep()
    module.save_to_step(step)  # as workflow import does
    return trans, step, module


@pytest.mark.parametrize(
    "parameter_type,validators,accepted,rejected",
    [
        ("text", [{"type": "regex", "expression": "^bad", "message": "no bad", "negate": True}], "good", "bad1"),
        ("integer", [{"type": "in_range", "min": 1, "max": 5, "negate": True}], 7, 3),
        ("integer", [{"type": "in_range", "min": 1, "negate": False}, {"type": "in_range", "max": 5, "negate": False}], 3, 0),
    ],
)
def test_imported_validators_are_kept(parameter_type, validators, accepted, rejected):
    trans, step, module = import_input(parameter_type, validators)
    param = module.get_runtime_inputs(step)["input"]
    param.validate(accepted, trans)
    with pytest.raises(ValueError):
        param.validate(rejected, trans)


def test_imported_range_message_is_kept():
    trans, step, module = import_input("integer", [{"type": "in_range", "min": 1, "max": 5, "message": "1-5 only"}])
    param = module.get_runtime_inputs(step)["input"]
    with pytest.raises(ValueError, match="1-5 only"):
        param.validate(7, trans)


def test_min_greater_than_max_rejected_at_import():
    with pytest.raises(Exception):
        import_input("integer", [{"type": "in_range", "min": 5, "max": 1}])
```

Failures: the negated regex rejects `good` with "no bad"; the negated range rejects `7` with "must fulfill (1 <= value <= 5)"; the split range accepts `0`; the range message test sees the default message; the `min > max` import does not raise.

</details>

<details><summary>Where the validators are lost</summary>

All in `InputParameterModule` ([`lib/galaxy/workflow/modules.py`](https://github.com/galaxyproject/galaxy/blob/5ff1e46b8c38c704be8da75b4db05b3d56f93f3d/lib/galaxy/workflow/modules.py)):

```text
import (.ga / API)
  module_factory.from_dict
    recover_state
      step_state_to_tool_state      stored validators -> editor form state
        regex     -> {regex_doc, regex_match}            negate dropped
        in_range  -> parameter_definition.min / .max     negate, message, exclude_* dropped; last range wins
  save_to_step
    step.tool_inputs = _parse_state_into_dict()      editor form state -> stored validators
        min/max   -> one in_range, negate: False
        regex row -> regex, negate: False
runtime / export
  get_runtime_inputs   -> _parse_state_into_dict()   same rewritten list
  get_export_state     -> _parse_state_into_dict()   same rewritten list
editor
  load: get_tool_state()                             form state only
  save: from_tool_form=True -> save_to_step          form state -> _parse_state_into_dict()
```

`get_runtime_inputs` already parses validators with `parse_dict_validators` (via `get_input_source(..., trusted=False)`), so the runtime side handles `negate`, repeated ranges and messages; it is only handed the rewritten list. The stored shape is already the tool-YAML validator shape, which Galaxy models in `lib/galaxy/tool_util_models/parameter_validators.py` (`RegexParameterValidatorModel`, `InRangeParameterValidatorModel`, both with `negate`; the range model also has `exclude_min`/`exclude_max`). The workflow module only round-trips the subset its editor form can express. `InRangeParameterValidatorModel` does not check `min <= max`; only the legacy `InRangeValidator` constructor asserts it.

</details>

## Context

Bug discovered while working on 🔀 galaxyproject/gxformat2#265, which round-trips text-input regex validators, including `negate`, between Format2 and native workflows. That change is merged but not yet released (Galaxy pins gxformat2 0.27.0); once Galaxy picks it up, a Format2 workflow declaring `negate: true` will be imported with the opposite meaning. The Format2-side checks for numeric bounds, including `min > max`, are tracked in 🎯 galaxyproject/gxformat2#266. Workflow input validators were added in 🔀 #19092.

## Proposed Approach

Keep the validators a workflow declares: parse them with the existing validator models at import so invalid ones (including `min > max`) are rejected there, store them unchanged, build the runtime parameter from them, and carry validators the editor form cannot represent through an editor re-save.

<details><summary>Approach details</summary>

- Import: validate stored validators with `parse_dict_validators` (the parser `get_runtime_inputs` already uses) instead of passing them through the editor form conversion, and give a clear import error for an invalid one. Add the `min <= max` check to `InRangeParameterValidatorModel` so tools and workflows share it.
- Runtime and export: `get_runtime_inputs` and `get_export_state` use the stored list, not `_parse_state_into_dict()`.
- Editor: the form keeps its regex rows and min/max fields. Validators it cannot show (negated, extra ranges, range messages, exclusive bounds) are kept on re-save rather than rewritten. The editor saves form state (`from_tool_form=True`), so they must travel in that state, e.g. as a hidden form field that `_parse_state_into_dict()` merges back. This is the largest piece. Exposing `negate` on regex rows is a small, optional follow-up.
- Tests: the reproduction above, plus an API test that imports a `.ga` with a negated regex validator, downloads it, and runs it with a value the validator should reject.
- Related: numeric bounds are also missing from the run form's number field, also in `get_runtime_inputs`. A fix there should read the same stored list and treat negated or repeated ranges conservatively.

</details>

## Alternative Approaches

Galaxy could instead treat the editor's vocabulary as the complete one and reject, at import, any validator the editor cannot represent, with gxformat2 dropping `negate` from its text validator schema to match. That is a smaller change, but it rejects workflows that use validator features Galaxy's tool validators already support and gxformat2 now documents. Preserving the declared validators keeps one validator vocabulary across tools, native workflows and Format2.

<details><summary>Alternatives in detail</summary>

### Alternative: reject what the editor cannot represent

<details><summary>Description</summary>

#### Details

At import, fail with a clear error on `negate: true`, more than one in_range, a range `message`, or exclusive bounds. Validate `min <= max` at import. gxformat2 removes `negate` from `WorkflowTextValidator` before releasing galaxyproject/gxformat2#265.

#### Why the proposed approach is preferred

Both approaches end the silent rewrite. Rejection narrows workflow validators to an editor limitation rather than a modelling one: the stored shape and the validator models already support these fields, so the cost of keeping them is mainly in the editor round trip. Rejection also needs gxformat2 to drop a field it just added.

</details>

### Alternative: validate `min <= max` only

<details><summary>Description</summary>

#### Details

Fix only the `min > max` case at import and leave the round trip as is.

#### Why the proposed approach is preferred

It removes the assertion but leaves negated and repeated validators silently inverted or weakened.

</details>

</details>
