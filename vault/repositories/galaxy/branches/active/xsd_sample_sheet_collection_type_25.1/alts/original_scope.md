# original_scope

`xsd_sample_sheet_collection_type_25.1_alt_original_scope` at `7ccd03c658d` (pushed to `jmchilton`).

It contains the shellcheck-clean CI script refactor, the XSD `sample_sheet` fix with core-tool lint coverage, and the XSD docs sentence.

The parent branch adds two commits on top:
- `c7bf3b5e22f` lints the XSD at its real path and fails fast.
- `5d35c8c7db3` fixes the `convert_sample_sheet.xml` typo, a duplicate `sample_sheet` that should be `sample_sheet:record`.
