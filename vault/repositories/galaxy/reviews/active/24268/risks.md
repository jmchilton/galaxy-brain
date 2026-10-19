Profile: gx_risk_assessment, via claude-opus-5-5 at low effort. Reviewed commit a6772eccffe8b68e47c0f757d582c782f7fc2805.

Risks are minimal - this client-only swap of Bootstrap radios for GRadio/GRadioGroup, plus small styling and test-selector updates, doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- No API, workflow, or tool-format changes; the visible differences are small (radio size, focus ring, grey checked-button fill, legend spacing).
- New public surface in `@galaxyproject/ui`: a `legendClass` prop on GRadioGroup and a `--color-grey-250` token. Both are additive, but once downstream code uses them, removing them is a breaking change for consumers of the package.
- `FilterMenuBoolean` now keeps a local copy of the selected value and syncs it from `filters` through a watcher. Getting this wrong could make the shown filter drift from the applied one; reverting is easy.
- Selenium selectors changed (`select_import_dir_item` now uses `data-test-id`, plus a new `installed_only` xpath). Downstream test code that relied on the old `for=` selector would need updating.

</details>

<details><summary>Risk Review Advice</summary>

Check that the new `legendClass` prop and the grey-250 token belong in the shared UI package API, or whether the existing spacing and tokens would do. Make sure the `FilterMenuBoolean` local-state/watcher pattern resets correctly when filters are cleared or changed from the text box. Everything else can be reverted cheaply.

</details>
