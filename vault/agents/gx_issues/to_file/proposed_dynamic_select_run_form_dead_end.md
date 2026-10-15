# Column parameters show "No options available." until their dataset finishes, so tools and workflows can't be queued on it

Since 23.1, a required column parameter whose dataset is still uploading, queued or running shows "No options available." instead of a text field, so neither the tool form nor the workflow run form can be submitted until that dataset finishes.

| Dataset the column reads from | `dev` | 23.0 and earlier |
| --- | --- | --- |
| `ok`, column metadata set | Column select | Column select |
| `new` / `queued` / `running` | **No options available.** Run is blocked by "Please provide a value for this option." | Text field; Galaxy accepts the typed column |
| Same, column saved in the workflow (run form) | Collapsed preview submits the saved column, but **Edit** clears it and shows **No options available.** Only **Undo** brings it back | **Edit** clears it to an empty text field |
| Output of an earlier step in the same workflow (run form) | Text field | Text field |

The server still does its half: for a not-ready dataset it sends no options, sets `textable: true`, and accepts a typed column. The form ignores `textable`. Once the dataset turns `ok`, the form refetches and the select fills in, but until then a user can't queue work on data that is still arriving. Queuing that work was the point of 🎯 #3758.

The `dev` column is reproduced below: the server payload in a unit test, the rendering in component tests on `FormElement` (mounted with run-form props; the tool form takes the same `FormElement` branch, read from code). The "Run is blocked" message and the 23.0 column are read from code (`validateInputs`, and the 23.0 `TextSelect` path described below). Nothing was run in a browser.

To check by hand: upload a file with its type set explicitly to `tabular`, and while it is still uploading or queued, open **Group** (`Grouping1`) and select it. **Group by column** shows "No options available." and **Run Tool** won't submit. The same happens in a workflow's run form when the dataset picked for the input feeding the column isn't ready.

<details><summary>Server reproduction: no options, <code>textable: true</code>, typed column accepted</summary>

On `dev` [`36fe2ce8428`](https://github.com/galaxyproject/galaxy/commit/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac), save as `test/unit/app/tools/test_column_not_ready_repro.py` and run `PYTHONPATH=lib pytest test/unit/app/tools/test_column_not_ready_repro.py -s`. Both tests pass. They document the server contract the client no longer uses.

```python
from galaxy import model
from galaxy.app_unittest_utils.tools_support import datatypes_registry
from galaxy.util import bunch
from .util import BaseParameterTestCase


class TestColumnNotReady(BaseParameterTestCase):
    def setUp(self):
        super().setUp()
        self.trans = bunch.Bunch(
            app=self.app,
            get_history=lambda: None,
            get_current_user_roles=lambda: [],
            workflow_building_mode=False,
            webapp=bunch.Bunch(name="galaxy"),
            security=self.app.security,
        )
        self.param = self._parameter_for(xml='<param name="col" type="data_column" data_ref="input_tsv"/>')
        self.param.ref_input = bunch.Bunch(formats=[datatypes_registry.get_datatype_by_extension("tabular")])

    def _hda(self, state, columns=None):
        hist = model.History()
        self.app.model.context.add(hist)
        hda = hist.add_dataset(
            model.HistoryDatasetAssociation(extension="tabular", create_dataset=True, sa_session=self.app.model.context)
        )
        hda.state = state
        if columns:
            hda.metadata.columns = columns
            hda.metadata.column_types = ["str"] * columns
        return hda

    def _field(self, hda):
        d = self.param.to_dict(self.trans, {"input_tsv": hda})
        return d["options"], d["textable"]

    def test_ok_dataset_control(self):
        options, textable = self._field(self._hda("ok", columns=3))
        assert [o[1] for o in options] == ["1", "2", "3"]
        assert textable is False

    def test_not_ready_dataset(self):
        for state in ("queued", "running", "new"):
            hda = self._hda(state)
            options, textable = self._field(hda)
            print(state, options, textable, self.param.from_json("2", self.trans, {"input_tsv": hda}))
            assert options == []
            assert textable is True
            assert self.param.from_json("2", self.trans, {"input_tsv": hda}) == "2"
```

```text
queued [] True 2
running [] True 2
new [] True 2
```

</details>

<details><summary>Client reproduction: <code>FormElement</code> renders no field for that payload</summary>

Save as `client/src/components/Form/FormElementTextable.test.js` and run with `vitest run`. The first three tests fail on `dev`. The control passes.

```js
import { getLocalVue } from "@tests/vitest/helpers";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import FormElement from "./FormElement.vue";

const localVue = getLocalVue();

function mountColumn(value, attributes) {
    return mount(FormElement, {
        props: { id: "column", type: "data_column", value, workflowRun: true, attributes },
        global: localVue,
    });
}

describe("data_column whose dataset is not ready", () => {
    it("renders a usable text field", () => {
        const wrapper = mountColumn(null, { options: [], textable: true, optional: false });
        expect(wrapper.findAll("input").length).toBeGreaterThan(0);
    });

    it("shows an existing value", () => {
        const wrapper = mountColumn("2", { options: [], textable: true, optional: false });
        const input = wrapper.find("input");
        expect(input.exists() && input.element.value).toBe("2");
    });

    it("leaves a usable field after Edit on a saved column", async () => {
        // Attributes the run form's model.js adds for a value saved in the workflow.
        const wrapper = mountColumn("2", {
            options: [],
            textable: true,
            optional: false,
            collapsible_value: "2",
            collapsible_preview: true,
            text_value: "2",
            default_value: null,
        });
        expect(wrapper.find(".ui-form-preview").text()).toBe("2");
        await wrapper.find("[data-collapsible]").trigger("click");
        expect(wrapper.emitted("input").at(-1)[0]).toBeNull();
        expect(wrapper.findAll("input").length).toBeGreaterThan(0);
    });

    it("control: an input fed by an upstream step already gets a text field", () => {
        const wrapper = mountColumn(null, { options: [], is_workflow: true, optional: false });
        expect(wrapper.findAll("input").length).toBeGreaterThan(0);
    });
});
```

On `dev`, the failing cases render only the text `No options available.`, with no `<input>`. The Edit case fails at its last assertion: the preview shows the saved `2`, and **Edit** emits `null` (the run form's `default_value` when there are no options) before the empty select appears.

</details>

<details><summary>Where the text fallback went</summary>

- 🔀 #5702 fixed 🎯 #3758 with a combined select/text control, `TextSelect`. Its rule, as of 23.0 in `client/src/mvc/ui/ui-misc.js`, was `this.textmode = input_def.textable && (!Array.isArray(data) || data.length === 0);`. 🔀 #6251 then limited `textable` to runtime contexts through `is_runtime_context`, so data tables that are actually empty show a message instead of a text box (🎯 #6249).
- 🔀 #16010 (`108a91438ad`, "Switch over all simple select fields", first released in 23.1) sent `data_column`, `genomebuild`, `group_tag` and `select` to the new `FormSelection` ahead of the legacy `FormParameter`, so `TextSelect` was no longer reached for them. 🔀 #16578 ([`f74e47367a8`](https://github.com/galaxyproject/galaxy/commit/f74e47367a805c7426643bbe8c9ad6c2cb98d310), 23.2) then deleted the unused legacy select code.
- [`FormElement.vue`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/client/src/components/Form/FormElement.vue) on `dev` switches a select to text only on `is_workflow`. Otherwise it renders `FormSelection`, and `FormSelect` shows "No options available." whenever the list is empty. `is_workflow` is set only by the workflow editor and by the run form's `model.js`, from step connections and workflow-parameter links. Neither looks at dataset state.
- The server half is still there. [`SelectToolParameter.to_dict`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/lib/galaxy/tools/parameters/basic.py) sets `textable` from `is_runtime_context`, which is true when any dataset in the tool's state isn't `ok` or needs implicit conversion. `populate_model.py` still sets `textable = True` on `ImplicitConversionRequired`, with the comment "This hack leads client to display a text field". `WorkflowRunDefaultStep.vue` copies `textable` on refetch, but nothing in `client/src` renders from it.
- `ColumnListParameter.get_options` returns nothing when a conversion would be needed, so a dataset that needs implicit conversion should hit the same path. This case was read from code and not reproduced.

</details>

## Context

A regression of 🎯 #3758, which 🔀 #5702 fixed and 🔀 #6251 refined. The client half was lost in 🔀 #16010. Inside a workflow, connecting an integer workflow parameter to the column avoids the form entirely, and 🔀 #23802 extends that to multiple columns. That only helps workflows the author has already rewired.
<!-- Companion issues, link once filed: dynamic selects in the workflow editor (explain + expose as a parameter); readable failure when a typed tool-step value is invalid at scheduling. -->

## Proposed Approach

Restore the 23.0 rule in `FormElement`: when a select-like parameter arrives with `textable` set and no options, render the text control already used for `is_workflow`, with a one-line hint that options will appear once the input dataset is ready. The server already sends the flag and accepts the value, so this is a client-only fix that covers both the tool form and the workflow run form.

<details><summary>Approach details</summary>

- Gate on `textable && options empty`, never on `textable` alone. The initial run-form payload is built in `USE_HISTORY` mode, where `is_runtime_context` returns true for every select, so `textable` is true even for selects that do have options.
- Expect the 23.0 side effects back. `is_runtime_context` looks at every dataset in the tool's state, so while any input is not ready, a select that is really empty also becomes a text box. And in the run form, a column whose input has no dataset picked yet shows a text field until the first refetch replaces it with a select.
- A one-line probe (OR-ing `attrs.textable && !attrs.options?.length` into the `is_workflow` test of the `FormText` condition) turns the client reproduction above green. `FormElement.test.js` still passes with it. A real fix also needs the hint, the optional variant (`FormOptionalText`), and multiple columns, where the text field takes a newline-separated list.
- Keep the typed value when the dataset finishes and the refetch switches the control back to a select. The legacy control did this in `ff874dc4e4f`.
- The server accepts the typed column without checking it against the data, as it did before 23.1. What happens when it turns out wrong is a separate problem.
- Tests: the failing component cases above, plus a `WorkflowRunDefaultStep` case where a refetch flips `textable` and fills `options`.

</details>

## Alternative Approaches

The server could instead send a structured reason why options are missing, such as "dataset not ready", "conversion needed" or "connected to an earlier step", so the form can explain each case. That would also suit the workflow editor, which shows these parameters as unexplained text boxes. It adds API surface, though, and the run-form dead end doesn't need it. It can be layered on later. Prefilling placeholder columns on the server was tried and reverted in 2018. Inferring readiness in the client would duplicate `is_runtime_context`.

<details><summary>Alternatives in detail</summary>

### Alternative: structured `options_unavailable` reason

<details><summary>Description</summary>

#### Details

When a dynamic select has no options, `to_dict` adds something like `options_unavailable: {reason, data_ref}`, with reasons such as `data_ref_not_ready`, `data_ref_needs_conversion`, `data_ref_runtime` and `no_options`. The form renders a text field with a reason-specific message, and the workflow editor can reuse it.

#### Why the proposed approach is preferred

It needs a schema addition and client typing, and its main payoff is in the editor. Restoring `textable` handling fixes the regression with the contract that already exists. A reason field can replace the generic hint later without changing which fields become text boxes.

</details>

### Alternative: prefill columns server-side while the dataset isn't ready

<details><summary>Description</summary>

#### Details

🔀 #5680 offered columns 1 to 999 when column metadata was missing.

#### Why the proposed approach is preferred

It was reverted the next day in `db47c876ee6`, part of 🔀 #5702, in favor of the text fallback. It presents invented options as real.

</details>

### Alternative: infer readiness in the client

<details><summary>Description</summary>

#### Details

Extend the `model.js` / `FormTool.vue` heuristics, which currently use step connections, to look at the selected dataset's state.

#### Why the proposed approach is preferred

The server already computes this, including implicit conversion, which the client can't see. A second copy of the rule would drift.

</details>

</details>
