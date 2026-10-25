# faqs/galaxy/tools_select_collection.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `3121f76bffb`, `faq_server.sh main`. Replay: `tools_select_collection.gxui.sh` (passes fresh).

- FAQ correct: data inputs show Single dataset / Multiple datasets / Dataset collection; picking the list maps cat1 over it.
- Coverage: `test_tool_form_fill_maps_over_collection` and `tool_set_value(..., expected_type="data_collection")` tests.
