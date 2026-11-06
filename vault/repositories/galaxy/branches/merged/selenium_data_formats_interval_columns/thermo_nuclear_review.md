# Thermo-nuclear review

No code changes: no structural regression or code-judo move found at head `222a113f31d`. Diff is ~80 lines: two `navigates_galaxy.py` helpers, four navigation.yml selectors, two `data-description` hooks, two tests.

## Not acted on
- `edit_dataset_attribute_fields` is a generic field walk that returns `(name, label, value)` but this test only reads name/value. Settled: keep the signature, the gxui verb on `galaxy_ui_driver` uses labels. A NamedTuple would read better but would mean changing that caller.
- Raw `By.CSS_SELECTOR` inside that helper: element-relative lookups over arbitrary field types. navigation.yml child components would only add indirection.
- `navigates_galaxy.py` was already far past 1k lines before this branch; adding about 37 lines doesn't change that. Splitting it is out of scope.
- `edit_dataset_set_metadata_select` is a one-line wrapper over `select_set_value`. It earns its place by owning the component lookup, the same as the other `edit_dataset_*` helpers.

<details><summary>Full review</summary>

- Selectors: the formats button and items use `data-description` hooks rather than generated uid prefixes. `metadata_select` and `attribute_field` follow the existing `[aria-labelledby="dataset-attributes-heading"]` scoping.
- The vue change only adds attributes, with no branching or behavior change. Reformatting the `<li>` is the linter's line-length wrap.
- Tests: no sleeps; exact equality assertions; setup through populators. No duplicated helpers. `tool_form_accepted_formats` matches the `tool_form_*` pattern.
</details>
