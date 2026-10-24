# faqs/galaxy/datatypes_understanding_datatypes.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `3dfeb7f18a2`. Used by metabolomics/gc_ms_with_xcms and
metabolomics/gcms. Replay: `datatypes_understanding_datatypes.gxui.sh`.

- `understanding-datatypes-accepted-formats` (main): with **Sort** open in an empty history, the
  input says "No datasets with tabular elements available"; the datatypes show only after clicking
  **accepted formats** under the input (26.1 too). The empty history isn't needed.

Galaxy: no E2E test opened that toggle. Added `tool_form.parameter_data_formats_button` and
`parameter_data_format` selectors, `tool_form_accepted_formats`, and
`test_data_parameter_accepted_formats` (3dfeb7f18a2; Playwright and Selenium pass, not run red since
the helper is new). gxui: `tool-accepted-formats PARAM`.
