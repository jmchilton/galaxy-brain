# Thermo-nuclear review: selenium_apply_rules_nest_menus

**Coordinator:** I made no code changes. Head is still `3948673005b`. The branch has no structural regressions. Every structural finding is either already settled, or a refactor of existing rule-builder helpers that's too big for a coverage-only PR on a release branch. Those are recorded below as dev follow-ups. I didn't rerun E2E because nothing changed. The polish and codex steps last saw it green under Playwright and Selenium at this head.

Not acted on:
- **Rule-builder editor abstraction (the big "code judo" move)**: dev follow-up. Have `rule_builder_rule_editor` yield a small editor object (e.g. `column_selector(index=0)`), or go data-driven. Either way, the 13 near-identical menu → editor → `.rule-column-selector` → `select_set_value` bodies collapse. That also removes the `"add-column-basename"` literal the new helper repeats for the context manager and the target. It also ends the two-idiom split: the new helper uses a SmartTarget, the 12 siblings use `editor_element.find_element`. On release_26.2 it would rewrite 12 existing helpers.
- **`rule_editor_column_selector` assumes one selector per editor**: record for that follow-up. The name sounds generic, but `.rule-edit-${rule_type} .rule-column-selector` only resolves to one element for single-column rules. Concatenate, swap, and split index `[0]`/`[1]`. Moving the siblings onto it would need an indexed form or a rename. Fine for basename today.
- **`navigates_galaxy.py` size (3416 lines)**: it was already far over 1k before this branch, which adds +22. The `rule_builder_*` cluster would make a natural mixin to extract in dev. `test_tool_form.py` ends at 816, under 1k.
- **Shared open → select input → edit rules test helper**: still declined, with no new reason. The normal review, test challenges, and polish all declined it (2-3 callers, and it touches `_tool_apply_with_source` in a coverage-only PR).
- **`history_wait_for_new_collection`**: locked byte-identical to `jmchilton/selenium_collection_build_convert`. Its edge cases are in `subagents/normal_review.md`; nothing new.
- **Test does three phases (build via menus, check output, map-over hint)**: kept. The last phase is a cheap downstream check that the output really is a usable `list:list`, and earlier reviews kept it on purpose.

<details>
<summary>Full review</summary>

## Scope

`git diff origin/release_26.2...HEAD`, 4 files, +64:
- `navigation.yml` and `schema.ts`: `rule_builder.rule_editor_column_selector`, with yml and TS kept in sync.
- `navigates_galaxy.py`: `history_wait_for_new_collection(after_hid)` and `rule_builder_add_column_basename(column_label, screenshot_name=None)`.
- `test_tool_form.py`: `test_run_apply_rules_nest_from_menus`.

## Approval bar

- Structural regression: none. Additive helpers sit beside their siblings, and no existing flow gains a branch.
- Spaghetti growth: none. No new conditionals in shared paths.
- File size: no file crosses 1k because of this PR (see above).
- Wrappers, casts, optionality: none added. `dict[str, Any]` on the wait matches what the API returns, and a TypedDict for one caller would be over-engineering.
- Canonical reuse: checked, and it holds.
  - `create_list_in_history(...).json()["output_collections"][0]` is the selenium idiom (`test_workflow_run_inputs.py:28`, `test_history_panel_collections.py:82`), and the populator has no helper that returns the HDCA dict directly.
  - `rule_builder_show_and_get_source_as_json`, `rule_builder_set_mapping`, `tool_form_wait_for_batch_info`, and `get_history_collection_details` are all existing helpers.
  - `rule_builder_rule_editor` is still needed even though the new helper ignores the yielded element, because its exit clicks `rule_editor_ok`.

## Findings

### 1. Missed simplification, outside this PR's proportion (record)
The rule-builder helper family is the code-quality hotspot. 13 methods repeat the same open-menu → open-editor → find `.rule-column-selector` → `select_set_value` → screenshot shape. Concatenate and swap even re-query the selectors between picks. The new helper is a clean member of the family. The polish step's switch to a navigation target makes it slightly better than its siblings, and also slightly different from them.

The move that deletes complexity is to give the editor context a typed handle, e.g. `with self.rule_builder_rule_editor("add-column-basename") as editor: editor.select_column(column_label)`. The rule type is then stated once, the yielded raw element goes away, and every sibling shrinks to its specific inputs. Taken further, single-column rules (sort, basename, regex column) become one parameterized helper. This belongs in dev, together with moving the siblings onto the target.

### 2. Target shape assumption (record)
`rule_editor_column_selector` has a generic name over a selector that matches N elements for multi-column editors. SmartTarget waits resolve to the first match, so it would silently pick column 1 for concatenate, swap, or split. Address it with the follow-up above, either as `rule_editor_column_selector(rule_type, index)` via `:nth-of-type` or as a scoped editor component.

### 3. Duplicated rule-type literal in the new helper (no action)
`"add-column-basename"` appears in both the context manager and the target. It's a symptom of finding 1. A local variable would be a cosmetic nit that costs two E2E reruns and a force-push, so finding 1 is the place to fix it.

### 4. Test structure (no action)
Setup goes through the populator. The UI does only the menu-driven part. Assertions pin the rule source JSON (rules and mapping), the outer and inner identifiers, and the exact map-over hint. Waits are SmartTarget or `_wait_on`, with no sleeps. The duplicated Apply rules entry sequence was declined three times before, for the reasons above.

### 5. `history_wait_for_new_collection` (no action)
It's correct as reviewed in `subagents/normal_review.md` and locked by the byte-identical constraint.

</details>
