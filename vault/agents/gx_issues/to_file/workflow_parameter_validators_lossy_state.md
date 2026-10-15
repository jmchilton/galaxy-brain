# Workflow parameter validators: stored negate/extra in_range/message ignored at runtime and rewritten on re-save; min > max crashes

Drafted by the workflow_libs agent (Claude) 2026-10-15 for gx_issues. Rough, agent-to-agent.

## Summary

`InputParameterModule` (parameter_input steps) persists validators in `tool_state.validators` using the tool-YAML shape (`{type: regex|in_range, expression|min|max, message, negate}`). But both **runtime enforcement** and **export/re-save** go through the editor-form round trip, which only models what the editor UI can express:

- `step_state_to_tool_state` (modules.py ~1843) maps stored → form state: regex → `{regex_doc, regex_match}` (drops `negate`), every `in_range` → overwrites `parameter_definition.min/max` (last one wins; drops `negate` and `message`).
- `_parse_state_into_dict` / `get_export_state` (~1920) maps form → stored: one `in_range` with `negate: False`, regex entries with `negate: False`.
- `get_runtime_inputs` (~1673/1761) builds the runtime `ToolParameter` from `_parse_state_into_dict()`, i.e. from the **round-tripped** state, not the stored validators.

So anything outside the editor's vocabulary (API-created workflows, hand-edited `.ga`, gxformat2 imports) is silently reinterpreted.

## Module-level probe (dev `e06e349a91e`, no server)

Built a `parameter_input` WorkflowStep with `tool_inputs.validators` as below, then `module_factory.from_workflow_step` → `get_runtime_inputs(step)["input"].validate(v)` and `get_export_state()["validators"]`:

| Stored validators | Runtime result | Export state after round trip |
| --- | --- | --- |
| text, regex `^bad`, `negate: true` | `bad1` **accepted**, `good` **rejected** (negate ignored → inverted) | regex with `negate: false` |
| integer, in_range 1–5, `negate: true` | `3` accepted, `7` rejected (negate ignored → inverted) | in_range 1–5 `negate: false` |
| integer, in_range `min: 1` + in_range `max: 5` | `0` **accepted** (first validator lost), `7` rejected | single in_range `{min: null, max: 5}` |
| integer, in_range 1–5 with `message: "1-5 only"` | `7` rejected (default message presumably) | message dropped |
| integer, in_range `min: 5, max: 1` | `get_runtime_inputs` raises `AssertionError: min must be less than or equal to max` (`tools/parameters/validation.py:124`, via `basic.py` param init) | n/a |

Probe script (run with Galaxy's venv; needs `lib`, `test/unit/workflows`, and `client/src/utils/navigation/navigation.yml` on disk):

```python
import json
from galaxy import model
from galaxy.tools.parameters.workflow_utils import workflow_building_modes
from galaxy.workflow import modules
from test.unit.workflows.workflow_support import MockTrans


def module_for(parameter_type, validators):
    trans = MockTrans()
    trans.workflow_building_mode = workflow_building_modes.DISABLED
    step = model.WorkflowStep()
    step.type = "parameter_input"
    step.label = "p"
    step.tool_inputs = {"parameter_type": parameter_type, "optional": False, "validators": validators}
    return trans, step, modules.module_factory.from_workflow_step(trans, step)


def check(label, ptype, validators, values):
    trans, step, module = module_for(ptype, validators)
    param = module.get_runtime_inputs(step)["input"]
    results = {}
    for v in values:
        try:
            param.validate(v, trans)
            results[repr(v)] = "ok"
        except ValueError as e:
            results[repr(v)] = "rejected"
    print(f"== {label}")
    print("   stored:      ", json.dumps(validators))
    print("   runtime:     ", results)
    print("   export state:", json.dumps(module.get_export_state().get("validators")))


check("negated regex", "text", [{"type": "regex", "expression": "^bad", "message": "no bad", "negate": True}], ["bad1", "good"])
check("negated in_range", "integer", [{"type": "in_range", "min": 1, "max": 5, "negate": True}], [3, 7])
check("two in_range", "integer", [{"type": "in_range", "min": 1, "negate": False}, {"type": "in_range", "max": 5, "negate": False}], [0, 3, 7])
check("in_range with message", "integer", [{"type": "in_range", "min": 1, "max": 5, "message": "1-5 only", "negate": False}], [7])
check("min > max", "integer", [{"type": "in_range", "min": 5, "max": 1, "negate": False}], [1, 3, 5])
```

## Why it matters now

- gxformat2 #265 (merged 2026-10-15, galaxyproject/gxformat2#265, fixes gxformat2#264) round-trips text `validators` including `negate: true`, and documents `negate` as "Reject matching values instead of values that do not match." Galaxy then ignores it at runtime → a Format2 workflow with a negated regex validates the **opposite** of what it says. Either Galaxy honors stored `negate` or gxformat2 should drop/reject `negate` (decision for John; gxformat2 side tracked at galaxyproject/gxformat2#266 for numeric bounds).
- gxformat2 numeric `min`/`max` → one in_range; fine. But native workflows with multiple/negated ranges from API/hand edits get silently changed.
- `min > max` reaches an assertion in parameter construction rather than a validation error at save/import time. Unknown how it surfaces in UI/API (run form load? invocation `unexpected_failure`?). Needs a real server check. Neither gxformat2 nor (apparently) Galaxy's workflow import rejects it up front.

## Related

- 🔀 #19092 (added parameter validators to workflow inputs; regex + in_range via the form), 🔀 #20980.
- Existing queued draft `proposed_workflow_parameter_range_not_shown_in_run_form.md` — same code area (`get_runtime_inputs` ignores bounds for run-form min/max). A fix that builds runtime params directly from stored validators could address both.
- Galaxy branch `invocation_parameter_expected_failure` (`test_subworkflow_parameter_validator_failure`) exercises regex validators on subworkflow params.

## Possible approaches (rough)

1. Build runtime parameter from **stored** `tool_state.validators` (pass through to `parameter_kwds["validators"]`), and only use the form round trip for the editor. Keeps negate/multiple/message. Editor still lossy on re-save → also preserve validators the form can't express (e.g. stash non-form-representable validators and merge back in `_parse_state_into_dict`), or have the editor expose negate.
2. Or declare editor vocabulary canonical: reject (at import/save) validators the editor can't represent (negate: true, >1 in_range, in_range message), with a clear error. Then gxformat2 drops `negate` from the text validator schema.
3. Either way: validate min <= max at import/save (and in the editor form) instead of asserting at runtime.

Red tests: unit test in `test/unit/workflows/` along the lines of the probe (runtime `validate` + `get_export_state`), plus an API test importing a workflow with a negated regex validator.
