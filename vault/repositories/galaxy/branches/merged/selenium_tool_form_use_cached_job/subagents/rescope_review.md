# Re-scope review

Verdict approve, no bugs. Acted on: inlined one-line `_toggle_workflow_run_boolean` wrapper into its two call sites (rerun tests green on Playwright).

Not acted on:
- Workflow run booleans with non-markdown help render `FormBoolean :no-label` (empty label); centre click could miss. Not hit by current callers; fix only if it fails.
- `test_workflow_editor.py` 513/568/636 hand-rolled checkbox toggles: follow-up, node-form switches need checking first.

<details><summary>Full review</summary>

All `_set_boolean_value` callers go via `_detect_param_type`=="boolean" (single checkbox); value normalization unchanged. Tool and workflow run forms both render `FormBoolean` (BFormCheckbox switch), so `.custom-control-label` exists everywhere incl. optional/conditional/section/repeat. Collapsed sections: `_detect_param_type` waits for visible first, label click waits visible; stricter than old JS click. Post-click assert: native label click toggles synchronously; low race risk. Nits as above. No security findings.
</details>
