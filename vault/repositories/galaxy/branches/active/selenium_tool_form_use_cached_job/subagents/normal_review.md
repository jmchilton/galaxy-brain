# Normal review

Verdict approve, no bugs. Acted on: generalized helper to `tool_form_set_switch(parameter, value)` (so `parameter_switch_label` isn't single-use) with `tool_form_set_use_cached_job` delegating, plus post-click `is_selected()` assert. Re-ran green on Playwright.

Not acted on:
- Delegating `RunsToolTests._set_boolean_value` to the new helper: changes JS-click behavior existing tests rely on; follow-up.
- Hand-rolled `is_selected()`+click in test_workflow_editor.py (513, 568, 636), test_workflow_rerun.py (116, 189): possible later consumers, out of scope.
- Generator-unpacking readability: preference.

<details><summary>Full review</summary>

Approve. Flakiness low: `reuse_input.txt` uniquely matches hid 1 (hid 2 is "Concatenate datasets on data 1"); waits correct; API lookups after hid-ok waits. Assertion strict and red without switch. Nits: (1) generalize helper over parameter; (2) optional post-click assert; (3) generator-unpacking a bit clever; (4) hardcoded hids fine in managed history. No security findings.
</details>
