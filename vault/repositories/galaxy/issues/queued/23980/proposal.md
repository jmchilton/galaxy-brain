# Workflow text parameters with a static list of allowed values ignore their default in the run form

The workflow run form preselects the first allowed value, not the author's default, for a text input restricted to a static list of values.

| Input definition | Default | `value` sent to the run form | Options sent (`selected` flag) | Run form shows (per client code) |
|---|---|---|---|---|
| `restrictions: [a, b, c]` | `b` | ❌ `'a'` | `a` False, `b` False, `c` False | ❌ `a` |
| `restrictions: [a, b, c]`, `multiple: true` | `[b, c]` | ❌ `None` | `a` False, `b` False, `c` False | ❌ `a` |

A user who accepts the form as shown runs the workflow with `a` instead of the `b` (or `b, c`) the workflow author chose. The same default works under "Attempt restrictions based on connections" (`restrictOnConnections`), which marks the matching option `selected` so `value` comes out right.

The last column comes from reading the client, not from a browser run. `WorkflowRunFormSimple.vue` and the expert form pass the step input's `value` from the `style=run` payload straight to the form element, and nothing in `client/src/components/Workflow/Run` applies a default from elsewhere. `FormSelection.vue` builds options from label and value only, ignoring the `selected` flag. For the `None` case, `FormSelect.vue` fills a required select that has no value with its first option on mount, so it shows `a` too.

<details><summary>Reproduction (dev @ 02a2e659909)</summary>

From `test/unit/workflows` with `PYTHONPATH=../../../lib:.`. It builds the same runtime input `_workflow_to_dict_run` builds for `GET /api/workflows/{id}/download?style=run` and serializes it with `to_dict`. The two `trans` attributes are set only because `MockTrans` lacks them.

```python
from galaxy import model
from galaxy.security.idencoding import IdEncodingHelper
from galaxy.tools.parameters.workflow_utils import workflow_building_modes
from galaxy.workflow import modules
from workflow_support import MockTrans

trans = MockTrans()
trans.security = IdEncodingHelper(id_secret="x" * 16)
trans.workflow_building_mode = workflow_building_modes.USE_HISTORY  # as _workflow_to_dict_run sets it

for multiple, default in [(False, "b"), (True, ["b", "c"])]:
    step = model.WorkflowStep()
    step.type = "parameter_input"
    step.tool_inputs = {"parameter_type": "text", "optional": False, "multiple": multiple,
                        "default": default, "restrictions": ["a", "b", "c"]}
    module = modules.module_factory.from_workflow_step(trans, step)
    p = module.get_runtime_inputs(step, connections=step.output_connections)["input"]
    d = p.to_dict(trans)
    print(f"multiple={multiple} default={default!r}")
    print("  get_initial_value:", repr(p.get_initial_value(trans, {})))
    print("  to_dict value:    ", repr(d["value"]))
    print("  to_dict options:  ", d["options"])
```

```text
multiple=False default='b'
  get_initial_value: 'a'
  to_dict value:     'a'
  to_dict options:   [('a', 'a', False), ('b', 'b', False), ('c', 'c', False)]
multiple=True default=['b', 'c']
  get_initial_value: None
  to_dict value:     None
  to_dict options:   [('a', 'a', False), ('b', 'b', False), ('c', 'c', False)]
```

</details>

<details><summary>Why</summary>

In `InputParameterModule.get_runtime_inputs` (`lib/galaxy/workflow/modules.py`), the static path builds options with `_parameter_def_list_to_options`, which never sets `selected`. It then passes the default as a top-level `selected` key:

```python
if client_parameter_type == "select":
    parameter_kwds["selected"] = default_value
```

The dict input source ignores that key. `tool_util/parser/yaml.py` reads `selected` only per option (`option.get("selected", False)`). With nothing selected, `SelectToolParameter.get_initial_value` falls back to the first option for a single select and to `None` for a multiple one.

`restrict_options` (the `restrictOnConnections` path) sets `"selected"` on each option, which is why that path works. #13293 (2022) made those per-option flags follow the default and added the top-level `selected` kwarg in the same change. The kwarg has never had any effect.

</details>

## Context

Bug discovered while working on 🌿 [`issue_21015_multiple_text_param`](https://github.com/jmchilton/galaxy/tree/issue_21015_multiple_text_param) for 🎯 #21015 (multiple text workflow parameters). That branch makes the `restrictOnConnections` path preselect every value of a list default and doesn't touch the static path. Bug related to 🎯 #13242 - the same symptom in the `restrictOnConnections` path, fixed there by 🔀 #13293 (the issue stays open for a separate editor request).

## Proposed Approach

When building static restriction options, mark each option `selected` if it matches the default (a scalar, or any entry of a list default), the way `restrict_options` does. Then delete the unused `parameter_kwds["selected"]` assignment. Move the default-matching into one small helper that both paths call.

<details><summary>Tests</summary>

- Unit test in `test/unit/workflows/test_modules.py`: the runtime input's `get_initial_value` is `"b"` for the scalar case and `["b", "c"]` for the multiple case. Both fail on dev.
- API test next to the `test_value_restriction_*` tests in `lib/galaxy_test/api/test_workflows.py`: upload a workflow with `restrictions` and a `default`, fetch `download?style=run`, and assert the input's `value` and the `selected` flags on its options.
- Optional: a Selenium/Playwright run-form check that the default is what's selected.

</details>

## Alternative Approaches

We could make the dict input source honor a top-level `selected` key, so the existing kwarg starts working. Marking options directly matches how `restrict_options` already does it and how tool XML/YAML express selection. Changing the parser instead would affect every dict-sourced select, not only workflow parameters.

<details><summary>Alternatives In Detail</summary>

### Alternative: Teach the dict input source a top-level `selected`

<details><summary>Description</summary>

#### Details

`YamlInputSource.parse_static_options` (or the select parameter's constructor) would read a top-level `selected` (scalar or list) and mark matching options. `get_runtime_inputs` would stay as it is.

#### Why the proposed approach is preferred

It adds a second way to express selection to a parser shared by tool YAML and other dict sources, only to support one caller. Fixing the caller keeps selection per option everywhere and gives the static and connection paths a shared helper.

</details>

### Alternative: Set `value` instead of `selected` for select inputs

<details><summary>Description</summary>

#### Details

Pass the default as `value`, the way non-select inputs do.

#### Why the proposed approach is preferred

`SelectToolParameter` derives its initial value from the options' `selected` flags, not from `value`, so this would need its own change to the select parameter. The options would also still serialize as unselected.

</details>

</details>
