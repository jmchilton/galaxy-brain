# faqs/galaxy/tools_change_version.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `3121f76bffb`, `faq_server.sh main` (now loads Galaxy's `multiple_versions` 0.1/0.2 test tools). Replay: `tools_change_version.gxui.sh` (passes fresh).

- FAQ correct: the cubes icon ("Select Versions") at the top right lists "Switch to 0.1".
- Coverage: `test_rerun_with_non_latest_version`/`_run_multiple_version_test_tool`; steps pulled into `tool_form_select_version` (`00e0b665ce1`). gxui: `tool-version VERSION`.
- gxui gotcha: `gxui call` passes quotes literally — `call select_dropdown_item "Switch to 0.1"`, not `'"..."'`.
