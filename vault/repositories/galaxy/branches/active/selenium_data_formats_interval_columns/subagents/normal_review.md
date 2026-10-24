# Normal review

Acted on: replaced fragile `button[id^="form-data-formats-"] ~ * li` / id-prefix selectors with `data-description="accepted formats button"` / `"accepted format"` on `FormDataExtensions.vue` (button + both popover and collapse `<li>`s); client rebuilt, fixup squashed into the tool form commit. Not acted on: the rest - signatures and helpers kept.

## Not acted on
- `edit_dataset_attribute_fields` returning labels: unused by this branch's test but consumed by the gxui verb on `galaxy_ui_driver`; signature kept.
- `By.CSS_SELECTOR` lookups inside `edit_dataset_attribute_fields`: generic per-field walk over arbitrary field types; navigation.yml child components would add little. Acceptable.
- Interval test checks UI state and API metadata - fine, not redundant (save path vs. reload render).

<details><summary>Full review</summary>

- Reuse: `edit_dataset_set_metadata_select` reuses `select_set_value`; `tool_form_accepted_formats` follows `tool_form_*` helpers and `parameter_*` selector naming. Good.
- Selectors: `metadata_select` / `attribute_field` scoped under existing `[aria-labelledby="dataset-attributes-heading"]` pattern, consistent with `name_input` etc. Formats selectors relied on generated uid prefix and sibling-structure (`~ * li`); now data-description.
- Comments: one-line docstrings; yaml comment one line. OK.
- Imports: `By` already at module top. OK.
- Typing: `list[tuple[str, str, str]]` fine; a NamedTuple would read better but would change gxui consumer; left.
- Tests: no comment_lines assertion (known bug, out of scope). Interval test red without Save.
</details>
