# Codex review: issue_23980_static_restriction_default

An independent Codex review (`codex exec -s read-only`) ran on `9fd083720a7...55b74d41f40`. Its brief held only the #23980 goals. It returned 1 finding, which I confirmed and fixed in `2552f2bddd8`. No security findings.

Acted on:
- **P2 `_is_default_option`: an empty-string default never preselects.** The `bool(default_value and ...)` guard meant `restrictions: [{value: a}, {value: "", label: Empty}]` with `default: ""` showed and submitted `a`, while a run with no value supplied used `""`. The check now compares against `None`, which is safe because an absent default arrives as `None` (`default_default_value`). The earlier normal review raised the same point and I had declined it for parity with 21015; with two independent reviewers flagging it, I changed course. Test: an `empty_text` input added to `test_value_restriction_static_default_selected` (red: `'a' == ''`). All 7 `test_value_restriction*` API tests pass, `test/unit/workflows` passes (173 passed, 2 skipped), and lint is clean.

Not acted on: none.

Side effect for 21015: its `default_values` block (`[default] if default else []`) kept the truthiness guard. When resolving the `restrict_options` conflict, keep this branch's `_is_default_option`.

<details>
<summary>Full Codex output</summary>

```json
{
  "coverage": {
    "files_reviewed": [
      "lib/galaxy/workflow/modules.py",
      "lib/galaxy/workflow/workflow_parameter_input_definitions.py",
      "lib/galaxy/tools/parameters/basic.py",
      "lib/galaxy/tools/parameters/options.py",
      "lib/galaxy/tools/parameters/populate_model.py",
      "lib/galaxy/tool_util/parser/interface.py",
      "lib/galaxy/tool_util/parser/yaml.py",
      "lib/galaxy/managers/workflows.py",
      "lib/galaxy/util/__init__.py",
      "lib/galaxy_test/api/test_workflows.py",
      "lib/galaxy_test/selenium/test_workflow_run.py",
      "test/unit/workflows/test_modules.py",
      "test/unit/workflows/workflow_support.py",
      "test/functional/tools/multi_select.xml",
      "client/src/components/Form/Elements/FormSelect.vue",
      "client/src/components/Form/Elements/FormSelectMany/FormSelectMany.vue",
      "client/src/components/Workflow/Run/WorkflowRunInputStep.vue",
      "client/src/components/Workflow/Run/WorkflowRunFormSimple.vue",
      "client/src/components/Workflow/Run/model.js"
    ],
    "notes": "All changed hunks and relevant surrounding paths reviewed. Backend defaults verified directly; API and Selenium suites were inspected but not executed."
  },
  "findings": [
    {
      "severity": "P2",
      "category": "correctness",
      "file": "lib/galaxy/workflow/modules.py",
      "line": 1344,
      "title": "Empty-string defaults still select the first allowed value",
      "detail": "The truthiness check in `bool(default_value and value == default_value)` prevents an allowed empty-string option from being selected. Consequently, `SelectToolParameter.get_initial_value()` falls back to the first option for required inputs, leaving this case of the reported bug unfixed. Compare against absence (`None`) rather than truthiness.",
      "failure_scenario": "A text input with `restrictions: [a, {value: '', label: Empty}]` and `default: ''` produces no selected option and runtime value `a`, so the run form preselects and submits `a` instead of the configured empty string. Verified directly through `InputParameterModule.from_workflow_step()` and `get_runtime_inputs()`.",
      "confidence": "certain"
    }
  ]
}
```

</details>
