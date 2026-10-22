# Initial review: workflow_editor_selector_escaping

**Top-line:** The branch is correct and in scope. There are no bugs in the diff as written. I acted on one item: node-label escaping. Step labels are free text, and `workflow_editor_node` is in the same helper chain, so it belongs here.
- `ea7bfc87e47` renames the test's downstream step from `downstream_cat` to `cat's downstream`. Red on Playwright: `[node-label='cat's downstream'] [input-name='input1']` timed out.
- `949ab6faf13` passes `css_attribute_value(node_ref)` in `workflow_editor_node`. Green on both backends.

Head is now `949ab6faf13`, four commits on parent `9699ec45644`.

## Not acted on

- **Direct `editor.node._(label=...)` calls in `test_workflow_editor.py`** (~30 sites). All use literal, quote-free labels. Escaping them belongs in the helper path, not at each call.
- **Moving `css_attribute_value` into `lib/galaxy/navigation`.** It has only one module of callers today, and no other ad-hoc selector escaping exists to consolidate. The grep found nothing besides the removed `|` replace. Move it when a second consumer shows up.
- **Newlines and control characters (`\a `).** Editor labels are single-line inputs. Not worth the extra code now.
- **`data-output-name` / XPath `output_data_row` targets.** These are not reached through the connection helpers, and XPath quoting has different rules. Out of scope, as the implementer noted.
- **Test name** still says "subworkflow terminal labels" though it now covers a step label too. I kept it so the branch records and references stay stable. Renaming is an optional nit.

<details>
<summary>Full review</summary>

### Verdict
Approve with one in-scope addition (done). The diff is small and well targeted. It reuses the existing helper choke point, `workflow_editor_node_and_terminal`, instead of escaping in `SelectorTemplate`, which would be wrong for XPath and `#id` targets.

### Correctness
- **`css_attribute_value`:** CSS strings in single quotes need only `\` and `'` escaped, plus newlines, which are not relevant here. The order is backslash first, then quote, which is correct. No existing helper exists: a grep of `lib/galaxy/selenium` and `lib/galaxy/navigation` for `cssescape`/`css_escape`/`escape` found only `send_escape`.
- **Substitution:** `SelectorTemplate.selector` uses one `string.Template.substitute` pass, so a `$` in an escaped value is not reinterpreted. `${_}` composes the already-substituted node selector, so the escaped label carries through to child targets.
- **Escaped name returned by `workflow_editor_node_and_terminal`:** every caller passes it only as `name=` into `[input-name='…']`/`[output-name='…']` targets. Those callers are connect, try_connect, destroy_connection, the assert_* helpers, `source_sink_terminal_elements`, and `assert_node_output_is` (test file line ~2269). None uses it for display or API comparison, and the docstring now says it is escaped.
- **Connector `[id='…']`:** `connector_for` and `connector_invalid_for` are used only in `navigates_galaxy.py`. The client references only types in `schema.ts`. Attribute-equals on `id` matches the same element as `#id` and drops the old `\|` escape. It passed on both backends in the implementer's run and in my re-runs.
- **Node label:** `Node.vue` sets `:node-label="title"`, which is `step.label || step.name`. A quote in either broke the selector. The fix applies only to the label branch, since the int `id` branch is a numeric `#wf-node-step-N`.

### Test
- It reads clearly and reuses `open_in_workflow_editor`, `assert_workflow_has_changes_and_save` and `_saved_steps_with_connections`. It covers both string and tuple refs, connect, destroy and save round-trips.
- The implementer's red runs fail at the selector-parse step, not in setup, which is the right evidence. My added step label fails at the first `workflow_editor_connect` to the downstream input.
- The comment is short and accurate.

### Style
- No buried imports.
- The docstrings are one line each.
- `uvx ruff@0.17.0 check` and the pre-commit hooks (black, ruff, flake8, etc.) pass on the new commits.

### Tests run (one at a time, Galaxy 8095 / Vite 5195)
- Playwright:
  - `test_subworkflow_terminal_labels_needing_css_escapes`: red before `949ab6faf13`, green after.
  - Passed: `test_reconnecting_nodes`, `test_change_datatype_in_subworkflow`, `test_editor_embed_workflow`, `test_refused_connection_and_removed_step`.
- Selenium: `test_subworkflow_terminal_labels_needing_css_escapes` and `test_reconnecting_nodes` passed.
- Unit: `test/unit/selenium/test_smart_components.py`, 54 passed.

</details>
