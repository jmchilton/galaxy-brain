# Normal review: selenium_apply_rules_nest_menus

**Coordinator:** acted on (1) exact batch hint and (2) inner identifiers; green under Playwright and Selenium, head `8ec9fa777b9`. Skipped the optional open-rule-builder helper: 2-3 callers, borderline, and it would touch existing tests in a coverage-only PR.

Small, clean branch (+51 lines, head `ca42822f93e`). Two things to act on, both in the test and both making assertions stronger: (1) the batch hint check should match the exact string the way its siblings do (`"one job per list"` wait plus `==`), not `startswith`; (2) the nested collection check should also cover the inner element identifiers, which is where the basename column actually shows up. Optionally, pull the shared open → select input → open rule builder steps out of `_tool_apply_with_source` into a helper this test can call too. `rule_builder_add_column_basename` matches its siblings. `history_wait_for_new_collection` works but has two small edge cases. They're noted only, because it has to stay byte-identical to the copy on `selenium_collection_build_convert`.

Not worth acting on:
- **`history_wait_for_new_collection` edge cases**: noted only, because it must stay byte-identical with `jmchilton/selenium_collection_build_convert`. If it changes, change it on both branches.
- **Basename is a no-op on `s1`/`s2`**: those identifiers have no `/`, so the new column B just equals A. The test is about driving the rule builder from its menus, not about basename itself, which `rules_dsl` tests cover. Using identifiers with `/` would also run into identifier validation. Leave as is.
- **`get_history_collection_details` called without `wait=False`**: siblings pass `wait=False`. This only adds a redundant history wait, so it's harmless.
- **No `screenshot_name` passed to the new helper**: same optional-arg pattern as `rule_builder_sort` and the other siblings, so nothing to change.
- **Imports and comments**: no new imports and no unnecessary comments.

<details>
<summary>Full review</summary>

## Scope

- `lib/galaxy/selenium/navigates_galaxy.py`: adds `history_wait_for_new_collection(after_hid)` and `rule_builder_add_column_basename(column_label, screenshot_name=None)`.
- `lib/galaxy_test/selenium/test_tool_form.py`: adds `test_run_apply_rules_nest_from_menus`.

## Findings

### 1. Batch hint assertion is weaker than its siblings (act)
`test_tool_form.py:601-602`:
```python
hint = self.tool_form_wait_for_batch_info("input", "mapped over")
assert hint.startswith("The supplied input will be mapped over this tool"), hint
```
Sibling tests (`test_tool_form.py:301-302`, `:322-323`) wait on the unit text and assert the whole string. In `FormData.vue` (~line 1296), `mapOverUnit` adds `: one job per <unit>`. For a `list:list` going into `__SORTLIST__` (input `collection_type="list,list:paired"`), the expected unit is `list`, exactly as in `test_rerun_dataset_collection_element`. As written, `startswith` also passes if the unit disappears, i.e. a `.`-terminated hint with no `: one job per ...`. That map-over-unit rendering is what the recent hint work added and is worth pinning here.
Suggested fix:
```python
hint = self.tool_form_wait_for_batch_info("input", "one job per list")
assert hint == "The supplied input will be mapped over this tool: one job per list."
```
The coordinator should confirm the unit under both backends. `tool_set_value` selects the value differently from `tool_form_select_data`, but `map_over_type` comes from the server option, so it should be the same.

### 2. Nested structure is checked only at the outer level (act)
`test_tool_form.py:594-596` checks `collection_type == "list:list"` and the outer identifiers `["s1", "s2"]`. The column created from the menu (B, from basename) only appears as the **inner** identifiers. If the mapping put the wrong column at the inner level, these assertions would still pass. Add:
```python
assert [[i["element_identifier"] for i in e["object"]["elements"]] for e in nested["elements"]] == [["s1"], ["s2"]]
```
(`framework.py:1253` reads nested details the same way, via `element["object"]["elements"]`.)

### 3. Duplicated Apply rules entry sequence (optional)
`test_tool_form.py:582-586` repeats `_tool_open_apply_rules()` → `tool_set_value("input", f"{hid}:", expected_type="data_collection")` → `tool_parameter_edit_rules()` → `rule_builder._.wait_for_visible()`, which `_tool_apply_with_source` (`:788-797`) and `_apply_rules_and_check` (`:771-774`) already do. A small `_tool_open_apply_rules_builder(hid=None)` helper, used by `_tool_apply_with_source` and the new test, would remove the duplication. With only 2-3 call sites it's borderline. Do it only if the coordinator wants this branch to leave a reusable helper behind.

### 4. `rule_builder_add_column_basename`: consistent (no action)
Same shape as `rule_builder_sort` and `rule_builder_add_regex_*`: `menu_button_column` (basename is in the Column menu, `RuleCollectionBuilder.vue:66`), the `rule_builder_rule_editor("add-column-basename")` context, `.rule-column-selector` plus `select_set_value`, and an optional `screenshot_if`. The placement next to `rule_builder_add_value` makes sense. Untyped args match the siblings.

### 5. `history_wait_for_new_collection`: sound enough, edge cases (flag only, do not change)
`navigates_galaxy.py:687-698`.
- Correct: `history_contents()` with the default `datasets_only=True` calls `histories/{id}/contents`, which returns datasets **and** collections, so the `history_content_type` filter works. `_wait_on` polls on any falsy result, so `None` keeps polling. The default `JOB_COMPLETION` wait is right for a tool run.
- Using a dynamic hid instead of a hardcoded one (as in `_apply_rules_and_check`'s `output_hid`) is justified. Apply rules may create hidden HDA copies, so the output hid isn't obvious.
- Edge cases: (a) if the current history isn't in the user's list, `history_contents()` returns `{}`. Iterating it then gives nothing, so it just keeps polling, which is fine. (b) `collections[-1]` assumes the contents endpoint returns hid-ascending order, which is its default. Neither causes a failure today.
- Must stay byte-identical with `jmchilton/selenium_collection_build_convert`. The debrief says `git merge-tree` is clean.

### 6. Test structure
- `@managed_history` plus `create_list_in_history(..., wait=True)` setup is good.
- The debrief's red check (replacing the basename call with `pass` fails) shows the menu-driven column is required.
- Ending with a map-over hint on `__SORTLIST__` is a useful downstream check that the nested output can be used as a `list:list`.

### Typing
`dict[str, Any]` on the new wait is fine. A TypedDict for history contents items would be over-engineering for one call site.

</details>
