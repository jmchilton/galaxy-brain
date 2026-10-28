# Polish E2E tests: workflow_editor_selector_escaping (round 2)

**Top-line:** In `0199d579296` I extracted `_wait_for_single_invocation`, because the new run test added a third copy of the wait → list → get invocation chain. Nothing else needed polish: neither new test has raw selectors or sleeps, and neither needs a screenshot.

Head is now `0199d579296`, which is 5 commits on top of `9699ec45644`.

## Change

`TestWorkflowRun._wait_for_single_invocation(history_id) -> dict[str, Any]` replaces this chain:

```python
wait_for_history_workflows(history_id, expected_invocation_count=1)
history_invocations(history_id)[0]["id"]
get_invocation(...)
```

It is used in three tests:
- `test_execution_with_input_label_needing_css_escape`, the new test;
- `test_execution_with_multiple_integer_parameter`;
- `test_execution_with_multiple_text_parameter`.

Details:
- **No existing helper.** `populators.py` has no "wait and return the single invocation" helper.
- **Kept on the test class, not `RunsWorkflows`.** It has one consuming file, which is the same stance as `css_attribute_value` and `_saved_step_connections_by_label`.
- **Left alone:** the `history_invocations(history_id)[0]` sites in `test_execution_with_custom_invocation_report`, `test_execution_with_images_in_report` and `_setup_simple_invocation_for_export_testing`. They use the summary dict, not the full invocation.
- **Import.** I added `Any` to the module-top `typing` import.

## Checked, no change
- **Raw selectors.** There are none in either test. The editor test goes through `workflow_editor_*`, and the run test goes through `workflow_run_*`.
- **navigation.yml.** The branch changes only the `connector_for` / `connector_invalid_for` targets. No new targets are needed.
- **Sleeps.** There are none in either test or in the changed helpers. The run test avoids `workflow_run_and_submit`'s `sleep_for(UX_TRANSITION)` by waiting on the API.
- **Shared abstractions.**
  - `css_attribute_value` is the single escape point.
  - `_saved_step_connections_by_label` covers the editor-side duplication.
- **Screenshots: not added.** Neither component relies on these tests alone: `test_workflow_run.py` has 45 `screenshot(` calls, and `test_workflow_editor.py` has 42. Both tests are selector-escaping regressions, so a screenshot would add nothing.

## Not acted on
- **`sleep_for(UX_RENDER)` in sibling `test_reconnecting_nodes`, and the `sleep_for` calls in older run tests.** These are outside the branch diff, as in round 1.

## Tests run (one at a time, Galaxy 8095 / Vite 5195)

| Test (`TestWorkflowRun`) | Playwright | Selenium |
|---|---|---|
| `test_execution_with_input_label_needing_css_escape` | passed, 37s | passed, 41s |
| `test_execution_with_multiple_integer_parameter` | passed, 29s | passed, 35s |
| `test_execution_with_multiple_text_parameter` | passed, 19s | passed, 27s |

Lint on `test_workflow_run.py` is clean: `uvx ruff@0.17.0 check`, `black --check`, and the `.pre-commit-config.yaml.sample` hooks (black, ruff, flake8, prettier, etc.) all pass.

I stopped the servers by port PID afterwards.
