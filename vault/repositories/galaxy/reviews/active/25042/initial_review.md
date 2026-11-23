# Initial review — galaxyproject/galaxy #25042

- Profile: default (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5
- Effort: medium
- Reviewed commit: `c29193e2b0fa39e9d76a09c88c8ea93a88615e11` (diff vs `origin/release_25.1`)

## Verdict

Solid, well-scoped fix. The root cause (editor dict omitted `in`, update path only recreates step inputs from `in`) is correctly identified, the `_add_step_in` extraction removes the export/editor divergence, and the "form wins" rule is applied consistently on load (`show_step_input_defaults`) and save (`step_input_defaults_changed_in_form`) through one shared visitor (`step_input_form_defaults`). Coverage is appropriate: a Selenium test for the real editor round trip, API tests for paths the browser test does not reach (data default, connected input, subworkflow step). No P1s. Findings are a comparison gap for parameters whose `to_python` is the identity, plus small abstraction/typing nits.

Not run: the worktree has no `.venv`, and the review is read-only, so the new unit test was not executed.

## Findings

### P2 1 — Defaults on text/select parameters are dropped on an unchanged save when the default's JSON type differs from the form's

`same_form_value` compares the decoded form value with `input.to_python(default)`. For `IntegerToolParameter`/`FloatToolParameter`/`BooleanToolParameter`, `to_python` normalizes, so `"7"` and `7` match as the PR description claims. But `ToolParameter.to_python` is the identity, and `TextToolParameter` / `SelectToolParameter` (non-dataset values) don't override it to coerce. A Format 2 workflow like

```yaml
steps:
  s:
    tool_id: some_text_tool
    in:
      text_param:
        default: 7        # YAML int
```

goes: editor load writes int `7` into the state (`show_step_input_defaults`), `get_tool_state` encodes it via `to_json` → `"7"`, the client sends it back, `params_from_strings` decodes it with `safe_loads('"7"')` → str `"7"`, and `same_form_value("7", 7)` is `False`. The default is treated as "changed in form" and dropped on a save where the user touched nothing else. Same for a select whose options are numeric strings and whose default was written as a YAML int (`default: 1`).

Runtime result is the same value, so this isn't a wrong-output bug, but it contradicts the stated rule ("kept only while the form still shows it") and silently rewrites the workflow (export loses `in`, the value moves into `state`) on the first unrelated save, which is the exact class of surprise this PR is fixing.

Fix: normalize the default through the same JSON round trip the form value goes through, e.g. compute `value` in `step_input_form_defaults` as `input.to_python(input.to_json(default, app, False), app)` (or `value_from_basic(safe_loads(dumps(value_to_basic(...))))`), so both sides are compared in the decoded-form representation. Floats stay fine (`to_python("2")` and `to_python("2.0")` both give `2.0`). A unit case with a `TextToolParameter` default of `7` against state `"7"` would pin it.

### P3 1 — Step-input defaults are gathered three different ways

`_add_step_in` iterates `step.inputs` filtering `default_value_set`; ~50 lines above it, `_workflow_to_dict_editor` builds `{si.name: si.default_value for si in step.inputs if si.default_value_set}` from the same data; and `__module_from_dict` re-derives the same mapping from `step_dict["in"]`. A small `WorkflowStep` helper (e.g. `input_defaults -> dict[str, Any]`, alongside the existing `inputs_by_name` / `get_input_default_value`) would let `_add_step_in` become `{name: {"default": v}}` over it and the editor branch reuse it, leaving one place that knows what a "set default" is. Optional.

### P3 2 — Loose typing on the new helpers

`step_input_form_defaults(inputs, state_inputs, defaults: dict[Any, Any], connected_input_names, app)` and the two `ToolModule` methods take `dict[Any, Any]` for what is always `dict[str, Any]` keyed by prefixed input name; `inputs`/`state_inputs`/`app` are untyped though `ToolInputsT` and `ToolStateJobInstancePopulatedT` (used by `params_to_strings`) already exist in `galaxy.tools.parameters`. Tightening these is cheap and documents that the keys are `|`-joined prefixed names.

## Notes (not findings)

- Refresh-on-change parameters (conditional test params) keep their default while the form shows the tool value; a user picking a value there is still silently overridden at run time. The PR description calls this out explicitly, so not raised as a finding; worth a follow-up (e.g. an editor warning) if it bites.
- Disconnecting an input whose default was kept because it was connected: on the next save the input is unconnected, the form shows the tool value, and the default is dropped. This matches "form wins" and is no regression (release_25.1 dropped all defaults), just worth knowing.
- `style=editor` is also consumed by the published-workflow view, run graph and `workflowStore`; those now display the default as the step's value, which is what actually runs, so this looks like an improvement rather than a risk.
- Data-input steps' `in.input.default` now also survive editor saves (previously lost); good side effect.
- `test_same_form_value_treats_empty_values_as_equal` is close to a trivial unit test of a three-line function; acceptable since it pins the `None`/`""` equivalence, but the P2 1 case would be a more valuable addition to the unit file.
- Python imports are at module top level; comments are short.
