# Pick Value Module — E2E Test Plan

## Approach

Incremental tests, each building on the previous. Use existing Selenium/Playwright
E2E infrastructure in `lib/galaxy_test/selenium/test_workflow_editor.py`. Tests
go from simple (module exists in UI) to complex (full conditional workflow execution).

All tests added to `TestWorkflowEditor` class. Use `@selenium_test` decorator.
All tests must work with both Selenium and Playwright backends — no `@selenium_only`.

---

## Test 1: Add pick_value from palette

**Goal:** Module appears in palette and creates a node.

```python
@selenium_test
def test_pick_value_add_from_palette(self):
    self.workflow_create_new(annotation="pick value test")
    self.workflow_editor_add_input(item_name="pick_value")
    editor = self.components.workflow_editor
    editor.node._(label="Pick Value").wait_for_present()
```

**Validates:** Palette entry, module registration, node rendering, icon.

---

## Test 2: Mode selector in form panel

**Goal:** Clicking the node shows the mode dropdown, changing mode persists to saved workflow.

```python
@selenium_test
def test_pick_value_mode_selection(self):
    self.workflow_create_new(annotation="pick value mode test")
    self.workflow_editor_add_input(item_name="pick_value")
    editor = self.components.workflow_editor
    node = editor.node._(label="Pick Value")
    node.wait_for_and_click()
    # Change mode via vue-multiselect: click input, type label, ENTER
    mode_input = self.find_element_by_selector(
        "div.ui-form-element[id='form-element-mode'] input[type='text']"
    )
    mode_input.click()
    mode_input.send_keys("All non-null")
    self.send_enter(mode_input)
    self.sleep_for(self.wait_types.UX_RENDER)
    # Save and verify mode persisted
    self.assert_workflow_has_changes_and_save()
    workflow = self._download_current_workflow()
    pick_step = [s for s in workflow["steps"].values() if s["type"] == "pick_value"][0]
    tool_state = json.loads(pick_step["tool_state"])
    assert tool_state["mode"] == "all_non_null"
```

**Validates:** Form rendering, mode persistence, save round-trip.

---

## Test 3: Input terminals present

**Goal:** Node shows at least 2 input terminals + 1 output terminal.

```python
@selenium_test
def test_pick_value_terminals(self):
    self.workflow_create_new(annotation="pick value terminals test")
    self.workflow_editor_add_input(item_name="pick_value")
    editor = self.components.workflow_editor
    node = editor.node._(label="Pick Value")
    node.input_terminal(name="input_0").wait_for_present()
    node.input_terminal(name="input_1").wait_for_present()
    node.output_terminal(name="output").wait_for_present()
```

**Validates:** `get_all_inputs()` and `get_all_outputs()` via build_module.

---

## Test 4: Connections to pick_value inputs

**Goal:** Can connect tool outputs to pick_value input terminals.

```python
@selenium_test
def test_pick_value_connect_inputs(self):
    self.workflow_create_new(annotation="pick value connections test")
    self.workflow_editor_add_input(item_name="data_input")
    editor = self.components.workflow_editor
    editor.label_input.wait_for_and_send_keys("input_data")
    self.tool_open("cat")
    editor.label_input.wait_for_and_send_keys("branch_a")
    self.workflow_editor_add_input(item_name="pick_value")
    editor.label_input.wait_for_and_send_keys("pick")
    self.components.workflow_editor.tool_bar.auto_layout.wait_for_and_click()
    self.sleep_for(self.wait_types.UX_RENDER)
    self.workflow_editor_connect("input_data#output", "branch_a#input1")
    self.workflow_editor_connect("branch_a#out_file1", "pick#input_0")
    self.assert_connected("branch_a#out_file1", "pick#input_0")
```

**Validates:** Terminal connection mechanics, connector rendering.

---

## Test 5: Grow-on-connect (dynamic terminal creation)

**Goal:** Connecting to the last empty terminal creates a new one.

```python
@selenium_test
def test_pick_value_grow_on_connect(self):
    # Load a workflow with pick_value + 2 tool branches via YAML
    name = self.open_in_workflow_editor("""
class: GalaxyWorkflow
inputs:
  input_data: data
steps:
  branch_a:
    tool_id: cat1
    in:
      input1: input_data
  branch_b:
    tool_id: cat1
    in:
      input1: input_data
  pick:
    type: pick_value
    state:
      mode: first_non_null
    in:
      input_0: branch_a/out_file1
      input_1: branch_b/out_file1
""")
    editor = self.components.workflow_editor
    pick_node = editor.node._(label="pick")
    # With 2 connections, there should be a 3rd empty terminal (input_2)
    pick_node.input_terminal(name="input_0").wait_for_present()
    pick_node.input_terminal(name="input_1").wait_for_present()
    pick_node.input_terminal(name="input_2").wait_for_present()
```

**Validates:** grow-on-connect watcher, build_module round-trip for terminal updates.

---

## Test 6: Pick_value in conditional workflow (save + reload)

**Goal:** Full conditional workflow with pick_value saves and reloads correctly.

```python
@selenium_test
def test_pick_value_conditional_workflow_roundtrip(self):
    yaml_content = """
class: GalaxyWorkflow
inputs:
  input_data: data
steps:
  branch_a:
    tool_id: cat1
    in:
      input1: input_data
    when: $(true)
  branch_b:
    tool_id: cat1
    in:
      input1: input_data
    when: $(false)
  pick:
    type: pick_value
    state:
      mode: first_non_null
    in:
      input_0: branch_a/out_file1
      input_1: branch_b/out_file1
"""
    name = self.open_in_workflow_editor(yaml_content)
    editor = self.components.workflow_editor
    pick_node = editor.node._(label="pick")
    pick_node.wait_for_present()
    # Verify connections survived import
    self.assert_connected("branch_a#out_file1", "pick#input_0")
    self.assert_connected("branch_b#out_file1", "pick#input_1")
    # Verify output terminal
    pick_node.output_terminal(name="output").wait_for_present()
    # Download and verify structure
    workflow = self._download_current_workflow()
    pick_step = [s for s in workflow["steps"].values() if s["type"] == "pick_value"][0]
    tool_state = json.loads(pick_step["tool_state"])
    assert tool_state["mode"] == "first_non_null"
    assert len(pick_step["input_connections"]) == 2
```

**Validates:** gxformat2 import, editor rendering, native format export, full round-trip.

---

## Test 7: Output type changes with mode

**Goal:** Switching mode between scalar and collection changes the output terminal type.

```python
@selenium_test
def test_pick_value_output_type_changes_with_mode(self):
    name = self.open_in_workflow_editor("""
class: GalaxyWorkflow
inputs:
  input_data: data
steps:
  branch_a:
    tool_id: cat1
    in:
      input1: input_data
  pick:
    type: pick_value
    state:
      mode: first_non_null
    in:
      input_0: branch_a/out_file1
""")
    editor = self.components.workflow_editor
    pick_node = editor.node._(label="pick")
    pick_node.wait_for_and_click()
    # Change mode to all_non_null (output becomes collection)
    mode_input = self.find_element_by_selector(
        "div.ui-form-element[id='form-element-mode'] input[type='text']"
    )
    mode_input.click()
    mode_input.send_keys("All non-null")
    self.send_enter(mode_input)
    self.sleep_for(self.wait_types.UX_RENDER)
    # Save and verify output type changed
    self.assert_workflow_has_changes_and_save()
    workflow = self._download_current_workflow()
    pick_step = [s for s in workflow["steps"].values() if s["type"] == "pick_value"][0]
    tool_state = json.loads(pick_step["tool_state"])
    assert tool_state["mode"] == "all_non_null"
```

**Validates:** Dynamic output type switching, build_module re-fetch on mode change.

---

## Implementation Order

| # | Test | Depends on | Complexity |
|---|------|-----------|------------|
| 1 | Add from palette | — | Low |
| 2 | Mode selection | 1 | Low |
| 3 | Terminals present | 1 | Low |
| 4 | Connect inputs | 3 | Medium |
| 5 | Grow-on-connect | 4 | Medium |
| 6 | Conditional roundtrip | 5 | Medium |
| 7 | Output type changes | 2 | Medium |

Tests 1-3 are independent and can be implemented first. Tests 4-7 build on earlier
tests and exercise increasingly complex interactions.

## Notes

- All tests work with both Selenium and Playwright backends.
- Drag-and-drop (`workflow_editor_connect`) works in Playwright via JS event simulation in `has_playwright_driver.py`.
- vue-multiselect interaction: click the input, type the option label, press ENTER. Same pattern as `test_collection_edit.py` datatype selection. No action_chains needed.
- The `open_in_workflow_editor` pattern (YAML upload + open) avoids manual node creation and is more reliable for complex workflows.
- `_download_current_workflow()` is the primary verification mechanism for saved state.

## Resolved Questions

### 1. Does `workflow_editor_add_input(item_name="pick_value")` work?

**Yes.** The selector chain:
- `navigates_galaxy.py:1411` calls `editor.inputs.input(id=item_name).wait_for_and_click()`
- `navigation.yml:953` defines `input: ".workflow-input-button[data-id='${id}']"`
- `InputPanel.vue:24` renders `<button :data-id="input.id ?? input.moduleId" class="workflow-input-button">`
- pick_value palette entry has `moduleId: "pick_value"` and no custom `id`, so `data-id="pick_value"`

The selector `.workflow-input-button[data-id='pick_value']` matches.

### 2. How to interact with the mode `<select>` dropdown in E2E?

`FormElement` with `type="select"` renders `FormSelection` which uses
`vue-multiselect`. Works with both Selenium and Playwright using the click + type
+ ENTER pattern (same as `test_collection_edit.py` datatype selection):

```python
# Find the multiselect input inside the mode form element
mode_input = self.find_element_by_selector(
    "div.ui-form-element[id='form-element-mode'] input[type='text']"
)
mode_input.click()
mode_input.send_keys("All non-null")
self.send_enter(mode_input)
```

Playwright's `send_keys()` focuses the element, positions cursor at end, and
types — matching Selenium behavior. The vue-multiselect filters options as you
type, and ENTER selects the filtered result. No action_chains needed.

### 3. Should E2E tests also verify execution?

**No — keep E2E tests focused on editor interactions.** The 9 API tests in
`test_workflows.py` already comprehensively cover all execution modes and edge
cases (all 4 modes, error paths, ordering, collection output). E2E execution
tests would be slow, fragile, and redundant. The roundtrip test (Test 6) already
validates that the workflow structure survives save/reload, which is the editor's
responsibility.
