# Workflow editor: dataset-driven selects become unexplained text boxes, and the Best Practices fix for them fails

In the workflow editor, a column or select parameter whose options come from a dataset becomes a plain text box with no explanation, and the Best Practices "fix" for connecting it to a workflow parameter fails.

The editor never has a dataset to read options from, so every `data_column` and every `select` with `<options from_dataset=…>` (or other `data_ref`-driven options) reaches the form with `options: []`. This happens whether or not the data input is connected:

| Tool parameter, as the editor shows it | Rendered as | What explains it |
| --- | --- | --- |
| Group, "Group by column" (`data_column`) | Empty text box | Only the tool's own help. Nothing says the columns come from the input dataset, or what to type. |
| `data_column` with `use_header_names="true"` | Empty text box | Nothing. The header names it would list don't exist yet (#21083). |
| `data_column multiple="true"` | Textarea, one value per line | Nothing. This is the case reported in #14304. |
| `select` with `from_dataset` options | Empty text box (an optional one becomes an optional text field) | Nothing. |

An approach that works already exists. Click the small ↔ icon ("Add connection to module.") on the field, then connect a workflow parameter: an integer one for a `data_column`, and a text one for a `select`. Since #23802 and #23992, multiple integer and multiple text parameters also work for multi-valued inputs. But nothing on the field points the author to this.

The Best Practices panel does try to help an author who gets halfway there, and that help fails:

| Author toggles ↔ on a required… | Best Practices panel | Clicking the ✨ fix |
| --- | --- | --- |
| single `data_column` or `select`, and leaves it unconnected | Listed under "Some non-optional inputs are not connected to formal workflow inputs", with a fix | ❌ "Reworking workflow failed…": `Invalid input type parameter encountered` |
| multi-valued `data_column` or `select`, unconnected | Listed, with a fix | ❌ `Cannot extract input for multi-input inputs` |
| either of the above, plus other fixable issues | "Try to automatically fix issues." | ❌ The whole batch fails its dry run, so none of the other fixes are applied |

✨ is the panel's fix button. ❌ marks a refactoring request the server rejects.

<details><summary>Reproduction (module level, on <code>dev</code> <a href="https://github.com/galaxyproject/galaxy/commit/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac"><code>36fe2ce8428</code></a>)</summary>

This builds the editor's config form for test tools with dynamic options. It then marks a column as connectable, which is what the ↔ toggle does, and runs the `extract_input` action that the Best Practices fix sends. It doesn't run a browser. The client steps from the lint item to `extract_input` were checked by reading the code (see below).

Save it as `test/unit/workflows/test_dynamic_select_editor_repro.py` and run it with `PYTHONPATH=lib pytest test/unit/workflows/test_dynamic_select_editor_repro.py -s`. All three tests pass on `dev`, which shows the current behaviour.

```python
import os

import pytest

from galaxy import model
from galaxy.app_unittest_utils.tools_support import UsesTools
from galaxy.exceptions import RequestParameterInvalidException
from galaxy.tools.parameters.workflow_utils import ConnectedValue, workflow_building_modes
from galaxy.util import bunch
from galaxy.util.unittest import TestCase
from galaxy.workflow import modules
from galaxy.workflow.refactor.execute import WorkflowRefactorExecutor
from galaxy.workflow.refactor.schema import ExtractInputAction

TOOLS = os.path.join(os.path.dirname(__file__), "..", "..", "functional", "tools")


class Toolbox:
    def __init__(self, tools):
        self.tools = tools

    def get_tool(self, tool_id, tool_version=None, exact=False, tool_uuid=None):
        return self.tools.get(tool_id)

    def get_section_for_tool(self, tool):
        return (None, None)

    def materialize_tool(self, tool, *, reason):
        return tool


class TestDynamicSelectEditor(TestCase, UsesTools):
    def setUp(self):
        self.setup_app()
        tools = {}
        for name in ["column_param", "column_param_list", "select_from_dataset"]:
            tool = self._init_tool_for_path(os.path.join(TOOLS, f"{name}.xml"))
            tools[tool.id] = tool
        self.app._toolbox = Toolbox(tools)
        history = model.History()
        self.app.model.context.add(history)
        self.app.model.context.commit()
        self.trans = bunch.Bunch(
            app=self.app, history=history, get_history=lambda: history,
            get_current_user_roles=lambda: [], workflow_building_mode=workflow_building_modes.ENABLED,
            webapp=bunch.Bunch(name="galaxy"), user=None, user_is_admin=False,
            url_builder=None, galaxy_session=None, _short_term_cache={},
        )

    def tearDown(self):
        self.tear_down_app()

    def _module(self, tool_id):
        return modules.module_factory.from_dict(self.trans, {"type": "tool", "tool_id": tool_id})

    def _config_form_inputs(self, tool_id, connected_data_input=None):
        connections = [bunch.Bunch(input_name=connected_data_input)] if connected_data_input else []
        form = self._module(tool_id).get_config_form(step=bunch.Bunch(input_connections=connections))
        return {i["name"]: i for i in form["inputs"]}

    def test_editor_config_form_has_no_options(self):
        for tool_id, connected, name in [
            ("column_param", "input1", "col"),
            ("column_param", "input1", "col_names"),  # use_header_names="true"
            ("column_param", None, "col"),            # data input not connected
            ("column_param_list", "input1", "col"),   # multiple="true"
            ("select_from_dataset", "single", "select_single"),
        ]:
            field = self._config_form_inputs(tool_id, connected)[name]
            assert field["options"] == []

    def _extract_input(self, tool_id, input_name):
        module = self._module(tool_id)
        module.state.inputs[input_name] = ConnectedValue()  # the ↔ toggle
        step_input = {i["name"]: i for i in module.get_all_inputs(connectable_only=True)}[input_name]
        assert step_input["input_type"] == "parameter" and step_input["optional"] is False
        executor = WorkflowRefactorExecutor.__new__(WorkflowRefactorExecutor)
        executor._new_input_positions = []
        executor._find_step = lambda ref: {"id": 0}
        executor._step_with_module = lambda order_index, execution: bunch.Bunch(module=module)
        action = ExtractInputAction(action_type="extract_input", input={"order_index": 0, "input_name": input_name})
        with pytest.raises(RequestParameterInvalidException) as exc:
            executor._apply_extract_input(action, None)
        return str(exc.value)

    def test_extract_input_single_column(self):
        assert self._extract_input("column_param", "col") == "Invalid input type parameter encountered"

    def test_extract_input_multiple_column(self):
        assert self._extract_input("column_param_list", "col") == "Cannot extract input for multi-input inputs"
```

Output with a `print` of each field and of `step_input` added:

```text
column_param col connected=True data_column multiple=False options=[] textable=True
column_param col_names connected=True data_column multiple=False options=[] textable=True
column_param col connected=False data_column multiple=False options=[] textable=True
column_param_list col connected=True data_column multiple=True options=[] textable=True
select_from_dataset select_single connected=True select multiple=False options=[] textable=True
editor step input: {'name': 'col', 'label': 'Column to Use', 'multiple': False, 'input_type': 'parameter', 'optional': False, 'type': 'data_column'}
extract_input: Invalid input type parameter encountered
editor step input: {'name': 'col', 'label': 'Columns to use', 'multiple': True, 'input_type': 'parameter', 'optional': False, 'type': 'data_column'}
extract_input: Cannot extract input for multi-input inputs
```

</details>

<details><summary>Where it happens</summary>

Text box:

- [`ToolModule.get_config_form`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/lib/galaxy/workflow/modules.py#L2922-L2927) serializes the tool with `workflow_building_mode=True`. There is no dataset, so dynamic options are empty.
- [`FormTool.vue`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/client/src/components/Workflow/Editor/Forms/FormTool.vue#L163-L165) sets `is_workflow` when `options.length === 0`. [`FormElement.vue`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/client/src/components/Form/FormElement.vue#L405-L434) then renders `FormText`, or `FormOptionalText` for an optional `select`. The placeholder is blank outside the run form ([`computedPlaceholder`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/client/src/components/Form/FormElement.vue#L108-L118)).
- `FormText` switches to a textarea for `multiple` and joins list values with newlines.
- The server sends `textable`, but it's true for every select in building mode ([`is_runtime_context`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/lib/galaxy/tools/parameters/basic.py#L137-L148)). So it can't tell a dataset-driven select from a static one, and it doesn't name the input the options would come from.

Connecting:

- [`InputParameterTerminal.effectiveType`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/client/src/components/Workflow/Editor/modules/terminals.ts#L558-L605) maps `select` → `text` and `data_column` → `integer`. `acceptsMultipleValues` follows the tool input's `multiple`.

Failing fix:

- A parameter toggled with ↔ is a `ConnectedValue`, so [`get_all_inputs(connectable_only=True)`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/lib/galaxy/workflow/modules.py#L2809-L2871) lists it as an editor step input with `input_type: "parameter"`.
- [`getDisconnectedInputs`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/client/src/components/Workflow/Editor/modules/linting.ts#L32-L56) flags it when it's required and unconnected. It sets `autofix: !inputTerminal.multiple`, and `InputParameterTerminal` always sets `multiple = false`, so the fix is always offered.
- [`_apply_extract_input`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/lib/galaxy/workflow/refactor/execute.py#L283-L324) rejects `multiple` inputs. For the others, it passes `input_type` (`"parameter"`) as the new input's type, and [`_apply_add_input`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/lib/galaxy/workflow/refactor/execute.py#L200-L236) rejects that type.
- `RefactorConfirmationModal` dry-runs the whole action list first. One failing action therefore shows "Reworking workflow failed..." and applies nothing.

</details>

## Context

This is the editor half of a problem whose run-form half is filed separately (companion issue, to be filed). That issue restores the client's handling of the existing `textable` flag, which is enough for the run form; the editor needs more, because `textable` is true for every select in building mode.

- 🎯 #14304 (multi-valued column shown as a newline list) is one row of the table above.
- 🎯 #21083 (header-name column mid-workflow) and 🎯 #21099 (a `data_column` input node) have the same cause.
- A follow-up to 🔀 #23802 and 🔀 #23992. With those merged, there is now a correctly typed parameter for every single-valued and multi-valued case to connect.
- 🎯 #10989 lists "pre-catch more problems prior to extracting disconnected inputs" as an open item.
- 🔀 #24107 (open) is a recent example of a targeted Best Practices section.

## Proposed Approach

The server says why options are missing, in a new `options_unavailable` field on the tool form JSON (reason `data_ref_runtime`, naming the data input). The editor shows that reason on the existing text field ("Columns come from *Input 1* when the workflow runs. Type a column number, or connect a workflow parameter."), with a **Connect a workflow parameter** action. That action and the existing Best Practices fix both use `extract_input`, extended to tool parameter inputs. It inserts a labelled integer or text parameter (multiple when the tool input is) and connects it.

<details><summary>Approach details</summary>

- **Server reason.** Set `options_unavailable` only for options that depend on a `data_ref` or `from_dataset`, never for static selects. The editor only needs the reason and the name of the data input; the run form could later use the same field to replace its generic hint.
- **Field.** Put the message in `FormText`'s placeholder and help, plus one action link. A new form element isn't needed, but `computedPlaceholder` must stop blanking an explicit placeholder outside the run form. The message can also mention the per-field "set at runtime" toggle, which already exists.
- **`extract_input` for parameters.**
  - For `input_type == "parameter"`, choose the new input's type from the tool input's `type`. Share one table with `_apply_extract_untyped_parameter`: `select`/`genomebuild` → `text`, `integer`, `float`, `text`, and new `data_column` → `integer`.
  - Add `multiple` to `AddInputAction` and pass it through, removing the `multiple` guard for parameter inputs. Data inputs keep it.
  - Default the label to the tool input's label.
- **Action.** If the field isn't already connectable, the action toggles ↔, then sends `extract_input`. One refactor request, one undo step.
- **Lint.** With the server fixed, the existing disconnected-input fix works as is. Until then, set `autofix` to false for parameter inputs whose type can't be mapped, so "fix all" can't fail on them.
- **Optional.** Add a Best Practices item for required dataset-driven selects that have no value and are neither set at runtime nor connected, using the same action. Follow the #24107 pattern.
- **Tests.** The reproduction above becomes the red tests for `extract_input`. Add a client test for the field message, and lint tests for `select` and `data_column` parameter inputs.

</details>

## Alternative Approaches

The client could guess the reason itself (empty `options` plus `is_dynamic`) or reuse `textable`. The fix could write legacy `${name}` values through `extract_untyped_parameter`, or simply stop offering it. We prefer one server-reported reason, shared with the run form, plus a typed `extract_input`, because the alternatives either duplicate logic the run form also needs, depend on legacy syntax, or leave the author with no shortcut.

<details><summary>Alternatives In Detail</summary>

### Alternative: Detect it in the client

<details><summary>Description</summary>

#### Details

Treat `options.length === 0 && is_dynamic` as "options come from a dataset". Alternatively, read `textable`.

#### Why the proposed approach is preferred

`textable` is true for every select in building mode, so it can't tell dataset-driven from static. Neither signal says which data input the options depend on. The run form needs the same classification, and the companion issue shows the client's existing guess there misses cases. One server field serves both forms.

</details>

### Alternative: Extract via `extract_untyped_parameter`

<details><summary>Description</summary>

#### Details

Write `${name}` into the tool state and run the existing untyped-parameter extraction, which already maps tool types to parameter types.

#### Why the proposed approach is preferred

`extract_untyped_parameter` takes a legacy `${name}` workflow parameter (which the Best Practices panel itself flags as a problem) and turns it into a real input. Using it here would mean writing that legacy syntax into the tool state as an intermediate step. Its type table also has no `data_column` entry, and its new input is always single-valued. Its type mapping is worth sharing, though.

</details>

### Alternative: Only stop offering the broken fix

<details><summary>Description</summary>

#### Details

Set `autofix: false` for parameter inputs in `getDisconnectedInputs`.

#### Why the proposed approach is preferred

This is the smallest change, and it stops "fix all" from failing. But it takes away the one shortcut the editor already has for this situation. It is still a reasonable first step if the server change is delayed.

</details>

### Alternative: Reuse `FormSelectOrText` (#24055)

<details><summary>Description</summary>

#### Details

Render dataset-driven selects with the select-or-text element proposed in #24055.

#### Why the proposed approach is preferred

That element needs a list of options to choose from, and the editor has none here. It would fit better in the run form, once options load.

</details>

</details>
