# Pick Value Module — E2E Test Plan: PJAs

## Context

The existing E2E tests (Tests 1-7 in `PICK_VALUES_E2E_PLAN.md`) cover editor interactions — palette, mode, terminals, connections, roundtrip. **None cover PJA configuration.** The PJA debrief identifies this gap.

## Test File

`lib/galaxy_test/selenium/test_workflow_editor.py`, added after existing Test 7 (`test_pick_value_output_type_changes_with_mode`).

---

## Resolved: UI Interaction Pattern

The pick_value PJA UI uses the same `FormOutput` component as tool steps. The output card
(`Configure Output: 'output'`) starts **collapsed by default** — must click
`editor.configure_output(output="output")` to expand before interacting with PJA controls.
Once expanded, the same navigation selectors work (`editor.change_datatype`,
`editor.rename_output`, `editor.add_tags_button`, etc.).

## Resolved: Backend PJA Serialization Bug

The workflow download/export API only serialized `post_job_actions` for `ToolModule` instances
(inside `isinstance(module, ToolModule)` blocks in `workflows.py`). PickValueModule PJAs were
saved to the DB but never appeared in the downloaded workflow dict.

**Fix:** Added `PickValueModule` checks in both the editor build path and export path in
`lib/galaxy/managers/workflows.py`. Extracted `_step_pja_dict(step)` helper to deduplicate the
4 identical PJA serialization blocks (2 ToolModule + 2 PickValueModule).

---

## Test 8: `test_pick_value_change_datatype_pja` ✅ PASSING

**Goal:** Configure change_datatype PJA on pick_value, verify it persists to saved workflow.

```python
@selenium_test
def test_pick_value_change_datatype_pja(self):
    self.open_in_workflow_editor("""
class: GalaxyWorkflow
inputs:
  input_data: data
steps:
  branch_a:
    tool_id: cat
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
    editor.configure_output(output="output").wait_for_and_click()
    editor.change_datatype.wait_for_and_click()
    editor.select_datatype_text_search.wait_for_and_send_keys("bam")
    editor.select_datatype(datatype="bam").wait_for_and_click()
    self.sleep_for(self.wait_types.UX_RENDER)
    self.assert_workflow_has_changes_and_save()
    workflow = self._download_current_workflow()
    pick_step = [s for s in workflow["steps"].values() if s["type"] == "pick_value"][0]
    pjas = pick_step["post_job_actions"]
    assert "ChangeDatatypeActionoutput" in pjas
    assert pjas["ChangeDatatypeActionoutput"]["action_arguments"]["newtype"] == "bam"
```

**Validates:** FormOutput card expand, change_datatype PJA round-trip, backend serialization.

---

## Test 9: `test_pick_value_rename_pja` ✅ PASSING

**Goal:** Configure rename PJA on pick_value, verify persistence.

**Note:** `set_text_element` uses Selenium-specific `Keys.CONTROL`/`Keys.COMMAND` that Playwright
sends as raw unicode. Use `wait_for_and_clear_and_send_keys` instead for Playwright compatibility.

```python
@selenium_test
def test_pick_value_rename_pja(self):
    # Same workflow setup as Test 8
    ...
    pick_node.wait_for_and_click()
    editor.configure_output(output="output").wait_for_and_click()
    editor.rename_output.wait_for_and_clear_and_send_keys("my_picked_output")
    self.sleep_for(self.wait_types.UX_RENDER)
    self.assert_workflow_has_changes_and_save()
    workflow = self._download_current_workflow()
    pick_step = [s for s in workflow["steps"].values() if s["type"] == "pick_value"][0]
    pjas = pick_step["post_job_actions"]
    assert "RenameDatasetActionoutput" in pjas
    assert pjas["RenameDatasetActionoutput"]["action_arguments"]["newname"] == "my_picked_output"
```

---

## Test 10: `test_pick_value_add_tags_pja` ✅ PASSING

**Goal:** Configure add_tags PJA on pick_value.

**Note:** `Keys.ENTER`/`Keys.ESCAPE` concatenated into a string are sent as raw unicode by
Playwright's `send_keys`. Use `self.send_enter(element)` and `self.send_escape(element)` instead.

```python
@selenium_test
def test_pick_value_add_tags_pja(self):
    ...
    pick_node.wait_for_and_click()
    editor.configure_output(output="output").wait_for_and_click()
    editor.add_tags_button.wait_for_and_click()
    tag_input = editor.add_tags_input.wait_for_visible()
    tag_input.send_keys("#picktag")
    self.send_enter(tag_input)
    self.send_escape(tag_input)
    self.sleep_for(self.wait_types.UX_RENDER)
    self.assert_workflow_has_changes_and_save()
    workflow = self._download_current_workflow()
    pick_step = [s for s in workflow["steps"].values() if s["type"] == "pick_value"][0]
    pjas = pick_step["post_job_actions"]
    assert "TagDatasetActionoutput" in pjas
    assert "picktag" in pjas["TagDatasetActionoutput"]["action_arguments"]["tags"]
```

---

## Test 11: `test_pick_value_multi_pja`

**Goal:** Configure multiple PJAs simultaneously (change_datatype + rename + tag), verify all persist.

```python
@selenium_test
def test_pick_value_multi_pja(self):
    ...
    pick_node.wait_for_and_click()
    editor.configure_output(output="output").wait_for_and_click()
    # Change datatype
    editor.change_datatype.wait_for_and_click()
    editor.select_datatype_text_search.wait_for_and_send_keys("txt")
    editor.select_datatype(datatype="txt").wait_for_and_click()
    # Rename
    self.set_text_element(editor.rename_output, "combined_result")
    # Add tag
    editor.add_tags_button.wait_for_and_click()
    editor.add_tags_input.wait_for_and_send_keys("#multi" + Keys.ENTER + Keys.ESCAPE)
    self.sleep_for(self.wait_types.UX_RENDER)
    self.assert_workflow_has_changes_and_save()
    workflow = self._download_current_workflow()
    pick_step = [s for s in workflow["steps"].values() if s["type"] == "pick_value"][0]
    pjas = pick_step["post_job_actions"]
    assert len(pjas) == 3
    assert "ChangeDatatypeActionoutput" in pjas
    assert "RenameDatasetActionoutput" in pjas
    assert "TagDatasetActionoutput" in pjas
```

---

## Test 12: `test_pick_value_pja_roundtrip_yaml_import`

**Goal:** Import a workflow with PJAs already configured on pick_value (via gxformat2 YAML), verify they survive re-save.

```python
@selenium_test
def test_pick_value_pja_roundtrip_yaml_import(self):
    self.open_in_workflow_editor("""
class: GalaxyWorkflow
inputs:
  input_data: data
steps:
  branch_a:
    tool_id: cat
    in:
      input1: input_data
  pick:
    type: pick_value
    state:
      mode: first_non_null
    in:
      input_0: branch_a/out_file1
    out:
      output:
        change_datatype: txt
        rename: "imported_rename"
        add_tags:
          - importtag
""")
    editor = self.components.workflow_editor
    pick_node = editor.node._(label="pick")
    pick_node.wait_for_and_click()
    # Don't change anything — just verify PJAs survive the import+save cycle
    self.assert_workflow_has_changes_and_save()
    workflow = self._download_current_workflow()
    pick_step = [s for s in workflow["steps"].values() if s["type"] == "pick_value"][0]
    pjas = pick_step["post_job_actions"]
    assert pjas["ChangeDatatypeActionoutput"]["action_arguments"]["newtype"] == "txt"
    assert pjas["RenameDatasetActionoutput"]["action_arguments"]["newname"] == "imported_rename"
    assert "importtag" in pjas["TagDatasetActionoutput"]["action_arguments"]["tags"]
```

**Validates:** gxformat2 converter `transform_pick_value` PJA handling, editor state hydration from imported PJAs.

---

## Implementation Order

| # | Test | Status | Complexity |
|---|------|--------|------------|
| 8 | Change datatype PJA | ✅ Done | Medium |
| 9 | Rename PJA | ✅ Done | Low |
| 10 | Add tags PJA | ✅ Done | Low |
| 11 | Multi PJA | Todo | Low |
| 12 | YAML import roundtrip | Todo | Medium |

Tests 9-11 are mechanical — same pattern as 8 with different PJA controls. Test 12 tests the gxformat2 import path.
