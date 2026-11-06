# Normal review

I made two changes, each folded into the commit it belongs to:

- `collection_edit_convert` now uses the existing `select_set_value` multiselect setter instead of hand-rolling click, type and Enter. I dropped the `converter_select_search` selector from `navigation.yml` and `schema.ts`.
- I added type hints to the five new helpers.

Head moved from `8ebe71ac0e3` to `ac99f219a65`. Playwright and Selenium both pass 5/5. The branch still merges cleanly with `selenium_history_datatype_citations`.

## Not acted on

- **Builder selectors stay under `list_wizard`.** `remove_extensions` and `element_name`/`element_name_input` target the shared `CollectionCreator` / `ListCollectionCreator`, so `collection_builders.selectors` would be the more accurate home. But gxui `verbs.py` on `galaxy_ui_driver` reads `list_wizard.element_name` directly, so a move would cause restack churn.
- **`collection_edit_change_datatype` keeps its manual multiselect steps.** They are the existing test steps moved over unchanged, and they open the dropdown through `data_value` rather than the caret.
- **`change_dbkey_value_and_click_submit` was not promoted to `NavigatesGalaxy`.** It is the datatype helper's sibling, but nothing else uses it, and it sits in the test the citations branch edits.
- **Product bug, not fixed here.** In `SuitableConvertersTab.vue`, `:disabled="selectedConverter == {}"` is always false, so Convert is never disabled. This branch is test-only on a release branch, so it is worth its own small fix or issue.
- **Minor.** The two new builder tests duplicate upload and identifier boilerplate, which matches the file's style. The convert test clicks the Convert tab before the helper clicks it again, which is harmless. `schema.ts` has no `list_wizard` interface, so the new builder selectors aren't added there; that matches the existing gap.

<details>
<summary>Full review</summary>

**Reuse**
- `history_panel_collection_edit` uses `history_panel_item_component(hid).edit_button`. `content_item.edit_button` was already declared in `schema.ts` but missing from `navigation.yml`, so adding it to the yml makes the two consistent. Removing `collection_menu_edit_attributes`, which clicked the first `.edit-btn` in the panel, is safe: `git grep` finds no other users.
- `collection_builder_rename_element` follows the `history_panel_rename` pattern (click the label, `aggressive_clear`, type, Enter). This is fine; the two are too small to share code.
- `collection_edit_convert` hand-rolled a vue-multiselect selection even though `select_set_value` already does this and has about 15 callers. Fixed. Its `UX_RENDER` pause before Enter also narrows a race: Enter could fire before the converter options load, and because the Convert button is never disabled, it would then run with nothing selected.

**Consistency**
- The `navigation.yml` and `schema.ts` changes for `edit_collection_attributes` match.
- The `remove_extensions` comment explains the hidden switch input, which is not obvious from the selector.

**Both backends**
- `:has()` in `converter_select` works under both Selenium and Playwright Chrome.
- `select_set_value` reaches the select through component `.selector`, XPath and `find_element`. All of those already run under the Playwright adapter for the rule builder tests.

**Tests**
- The assertions are strong: exact element identifiers for both builder tests, and `file_ext == ["tabular"]` on the converted elements.
- The converted collection is found through the API (a collection with `hid > 3`) instead of guessing its hid. That is fine under `@managed_history`.
- No tests were weakened or removed.

**Docstrings**: all one line, with no rationale paragraphs.

**Imports**: no new imports.

</details>
