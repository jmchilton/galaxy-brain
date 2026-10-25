# faqs/galaxy/tools_logs.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `3121f76bffb`, `faq_server.sh main`. Replay: `tools_logs.gxui.sh` (passes fresh; Filter1 writes stdout).

- `job-execution-details-2`: the section is **Job Execution Details**, and stdout/stderr are shown inline (**Tool Standard Output** / **Tool Standard Error**), not as links. Button is **Dataset Details**.
- Coverage: none. Added `test_dataset_details_tool_logs` (`9caa20b8267`, job_properties stdout/stderr). gxui: `dataset-logs HID`.
