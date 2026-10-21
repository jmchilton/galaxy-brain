# Re-scope normal review

The re-scope code is correct: nothing in it needs changing. All four rule types match the client's editor classes. Passing the SmartTarget to `select_set_value` behaves the same as passing the element did. No dead bindings or imports are left. Two things in the branch record need fixing: `index.md` "Scope" still says "One commit" and doesn't mention the four migrated helpers, and the link in `alts/original_scope.md` to `../earlier_drafts/1/scope_evaluation.md` is broken until re-harden moves `scope_evaluation.md` there. If re-harden doesn't move it, point the link at `../scope_evaluation.md`.

Not acting on:

- **Hoisted `column_selector` in `rule_builder_remove_columns`.** It isn't resolved "once". `select_set_value` turns the SmartTarget into its selector string and calls `wait_for_selector` on every call, so each label still gets a fresh lookup, the same as the old per-iteration `find_element`. Inlining it like the other three helpers would only be cosmetic.
- **The page-wide selector vs. the old editor-scoped lookup.** `RuleComponent` renders with `v-if="ruleType == displayRuleType"`, so only the open editor exists in the DOM. Its class is type-specific (`rule-edit-` + `ruleType.replace(/_/g, "-")`). Each of these editors holds exactly one `ColumnSelector`. The CSS selector therefore matches the same single node.
- **concatenate / split / swap helpers still use `find_elements(...)[i]`.** They have two column selectors each. Moving them would need an indexed target, which is out of scope for this re-scope and was correctly left out.
- **Other raw `By` lookups in the regex, filter-count and value helpers** (radios, regex input, number input). They could become navigation targets later. That would be wider scope.

<details>
<summary>Full review</summary>

### Scope reviewed
`git show e53da3ac568`, plus `git diff origin/release_26.2...HEAD` (navigation.yml, schema.ts, navigates_galaxy.py, test_tool_form.py).

### rule_type correctness
`client/src/components/RuleBuilder/RuleComponent.vue:32` builds the class as `"rule-edit-" + ruleType.replace(/_/g, "-")`. In `RuleCollectionBuilder.vue`:
- `rule-type="sort"` (l.56) gives `.rule-edit-sort`, matching `rule_type="sort"`.
- `rule-type="add_column_regex"` (l.117) gives `.rule-edit-add-column-regex`, matching both regex helpers.
- `rule-type="remove_columns"` (l.191) gives `.rule-edit-remove-columns`, matching.
- `add_column_basename` gives `.rule-edit-add-column-basename`, matching the commit 1 helper.

Each of these editors holds exactly one `<ColumnSelector>`. For remove_columns, `multiple=true` but `ordered` is unset, so the first `v-if` branch renders one `.rule-column-selector` that wraps a `SelectBasic`.

### select_set_value with the SmartTarget
`navigates_galaxy.py:3123`: `hasattr(x, "selector")` holds for a SmartTarget (`__getattr__` delegates to the Target), so the formatted CSS string goes to `wait_for_selector`, which waits for presence. The old code passed a WebElement found by `find_element` inside the visible editor. The editor is already visible when the `rule_builder_rule_editor` context yields, so the presence wait returns right away. After that, the same container element reaches the multiselect trigger and input logic. `multiple=True` in remove_columns resolves again on each iteration, as before, so stale-element risk is unchanged or lower.

### Leftovers / imports
- `rule_builder_sort` and `rule_builder_remove_columns` dropped their `as editor_element` / `as filter_editor_element` bindings.
- Both regex helpers keep `editor_element` and still use it for the radio, regex and number/replacement inputs.
- `By` is still used throughout the file.
- `black --check` passes. The new lines are 119 chars, under Galaxy's 120.

### Coverage
`test_uploads.py` example 3 calls `add_regex_groups` and `remove_columns(["D"])`. Example 4 calls `remove_columns` with 5 labels (exercising the `multiple=True` loop), `sort` and `add_regex_replacement`. The coordinator ran both, plus the new test, under Playwright and Selenium, and all passed. That covers every migrated helper. No tests were weakened.

### Abstraction / consistency
The re-scope moves every single-`ColumnSelector` rule helper onto `rule_builder.rule_editor_column_selector`, so the new target is no longer used by just one helper. The remaining raw `.rule-column-selector` lookups are the two-selector editors (concatenate, split, swap), where a single-match target doesn't fit. The commit message is clear.

### Branch record
- `index.md` Scope: "One commit: ..." is stale after the re-scope. It should say there are two commits and that the second moves sort, add_regex_groups, add_regex_replacement and remove_columns onto `rule_editor_column_selector`.
- `alts/original_scope.md` links `../earlier_drafts/1/scope_evaluation.md`, which doesn't exist yet. `scope_evaluation.md` is currently at the branch root.
- Alt branch `selenium_apply_rules_nest_menus_alt_original_scope` at `3948673005b` is confirmed on the `jmchilton` remote.

No security concerns.
</details>
