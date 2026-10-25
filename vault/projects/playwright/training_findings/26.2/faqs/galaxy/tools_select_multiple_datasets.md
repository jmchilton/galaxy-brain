# faqs/galaxy/tools_select_multiple_datasets.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `93b8866b6bd`, `faq_server.sh main`. Replay: `tools_select_multiple_datasets.gxui.sh` (passes fresh).

- Step 2 is stale (`select-multiple-datasets-ctrl-click`): the dataset list stays open and each click adds a dataset as a tag; no Ctrl/COMMAND. The FAQ should also say the field becomes a batch input: one job per dataset (the form says so under the field).
- Coverage was missing: added `tool_form_fill` list support (switches to Multiple datasets), nav `parameter_data_input_multiple`, and `test_tool_form_fill_multiple_datasets_runs_one_job_each` (red without the mode click). gxui `tool-fill '{"input1": [1, 2]}'`.
