# Implementation debrief: workflow_editor_selector_escaping

STATUS: READY for hardening. No open decisions. Stacked on `workflow_editor_connection_helpers` @ `9699ec45644` (base `release_26.2` @ `7febcc1d683`); head `a9b5055cbf2`; +57/−6 across 3 files.

## Final branch

1. `cdab7a9eb2c` Test editor connections on subworkflow terminals needing CSS escapes.
   - `test_subworkflow_terminal_labels_needing_css_escapes` builds a subworkflow step whose inner input label is `it's an input` and whose inner output label is `it's a \ output`.
   - It connects `outer_input` into the subworkflow and the subworkflow into `downstream_cat`, asserts both, and saves. It checks the saved connections through `_saved_steps_with_connections`. Then it destroys the input connection, asserts it is gone and the other is still there, saves, and checks again.
   - The sink uses a `"label#terminal"` string ref and the output uses a tuple ref, so both ref shapes are covered.
2. `a9b5055cbf2` CSS-escape workflow editor terminal names and connector ids.
   - New module-level `css_attribute_value(value)` in `navigates_galaxy.py` escapes `\` → `\\`, then `'` → `\'`.
   - `workflow_editor_node_and_terminal` returns the escaped terminal name.
   - `workflow_editor_source_sink_terminal_ids` escapes the DOM ids with it. The `|`-only `replace` is gone, not chained: inside a quoted attribute value `|` needs no escape, and escaping `\|` again would match a literal backslash.
   - `navigation.yml` `connector_for` / `connector_invalid_for`: `#connection-…` → `[id='connection-…']`.

## Choices

- **No existing helper to reuse.** Neither `lib/galaxy/selenium` nor `lib/galaxy/navigation` has a CSS escape.
- **The escape is in the NavigatesGalaxy helpers, not the SmartComponent/SelectorTemplate layer.** That layer substitutes into every target, including XPath ones such as `output_data_row`, which have different quoting rules, and `#id` targets. A global escape would be wrong for those.
- **Why `workflow_editor_node_and_terminal`:** it is the one place every terminal name passes through. That covers connect, try_connect, destroy_connection, all the `assert_*` helpers, and `assert_node_output_is` in the test file. Every caller uses the returned name only as a `name=` kwarg for an `[input-name='…']` / `[output-name='…']` target. The docstring now says the name is CSS-escaped. A grep of all `galaxy_ui_driver*` worktrees found no outside callers of `node_and_terminal` or `source_sink_terminal_ids`.
- **Connector ids are escaped separately** in `_terminal_ids`. They come from `get_attribute("id")` and are never escaped twice.
- **The DOM matches the selectors.** `NodeInput.vue` / `NodeOutput.vue` build `id` from `node-${stepId}-input|output-${name}` and set `input-name` / `output-name` to the raw name. `WorkflowEdges.vue` `id()` builds `connection-node-…-input-${name}-node-…-output-${name}`, which is `connection-${sink_id}-${source_id}`.
- **Public names and call shapes are unchanged.**

## Red / green

- **Red 1** (test only, on parent code, Playwright): `Page.wait_for_selector: Unexpected token "" while parsing css selector "[node-label='nested'] [input-name='it's an input']". Did you mean to CSS.escape it?`. It failed in the first `workflow_editor_connect`.
- **Red 2** (only the terminal-name escape applied, connector still `#id`, Playwright): `Unexpected token ""s an input-node-0-output-output"" while parsing css selector "#connection-node-1-input-it's an input-node-0-output-output"`. This failed at `workflow_editor_assert_connected`, so the `[id='…']` switch has red evidence of its own.
- **Green:** passes on Playwright (59s) and Selenium (68s). The API assertions confirm the labels round-trip as `it's an input` / `it's a \ output`.

## Tests run (one at a time, Galaxy 8095 / Vite 5195)

Playwright, all passed:
- `test_refused_connection_and_removed_step`
- `test_connect_unlabelled_steps_by_order_index`
- `test_reconnecting_nodes`
- `test_existing_connections`
- `test_simple_mapping_connections` (`assert_input_mapped`)
- `test_change_datatype_in_subworkflow` (subworkflow connect/assert)
- `test_editor_embed_workflow` (`setup_subworkflow` connect/assert)
- `test_multiple_integer_parameter_connections` and `test_editor_create_conditional_step` (both `assert_connection_invalid`)

`test_change_datatype` (`assert_connection_invalid`):
- Fails on Playwright with a timeout on the `#pja__out_file1__ChangeDatatypeAction__newtype-container .multiselect__select` click inside `workflow_editor_change_output_datatype`. That is before any connection helper runs.
- The same failure reproduces with the parent's `navigates_galaxy.py` / `navigation.yml` restored, so it is pre-existing.
- It passes on Selenium with this branch.

Selenium: the new test passed, and so did `test_change_datatype`.

Unit tests: `test/unit/selenium/test_smart_components.py` 54 passed; `test/unit/selenium/test_has_driver.py` 388 passed, 1 skipped. There are no other navigation unit tests.

Lint: `uvx ruff@0.17.0 check`, black, and the `.pre-commit-config.yaml.sample` hooks all pass on both commits. Standalone mypy on `navigates_galaxy.py` gives the same error count as the parent (635, all pre-existing config noise).

## Not done

- **`[node-label='${label}']`** breaks the same way when a step label contains `'`. `workflow_editor_node` could pass `css_attribute_value(label)` in one line. This was out of the stated scope (terminal names and connector ids), and no test covers it yet.
- **The `data-output-name` targets** (`workflow_output_toggle*`) and the XPath `output_data_row` stay unescaped. They are not reached through the connection helpers.
- **Caveat on `#` in string refs:** a `#` inside a node label is ambiguous in `"label#terminal"` form, because `split("#", 1)` splits at the first `#`. Use tuple refs for such labels. Not redesigned.
- **Characters the escape doesn't handle:** newlines and other control characters in labels.
- **The Playwright `test_change_datatype` multiselect timeout** predates this branch and is not investigated here.
