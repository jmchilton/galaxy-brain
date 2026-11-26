# Component - Legacy Upload Tool and Bundled Data Source Tools

Cover the `upload1` tool end to end: `tools/data_source/upload.xml` (the `<command>` that walks the job's output datasets, the `<upload_dataset>` repeat and its hidden parameters, `file_sources.json` configfile), `UploadToolAction` and `upload_common.py` (how the paramfile is built from the request), `MinimalJobWrapper.__prepare_upload_paramfile` and the `param_dict["paramfile"]` special case in `ToolEvaluator.build_param_dict`, how `tools/data_source/upload.py` consumes the paramfile and the trailing `dataset_id:files_path:file_name` arguments, and every other `upload1` special case in the library (`GALAXY_LIB_TOOLS_UNVERSIONED`, `old_id in ("upload1", "__DATA_FETCH__")` branches, library upload, `calculate_dataset_hash`, job-cache and tour/staging callers). Then say how `upload1` differs from `__DATA_FETCH__` ([[Component - Data Fetch]] covers only the latter) and which tests exercise it. Add the other bundled tool families: `tools/data_source/*.xml` (data source tools and their `data_source.py` / `genbank.py` helpers, `tool_type="data_source"`), `lib/galaxy/tools/*.xml` model tools, and how `tool_conf.xml.sample` selects stock tools. Leave out `__DATA_FETCH__` internals and the upload client code.

## Why

Reworking the stock `upload1` command to avoid reflective output lookup meant reading `upload.xml`, `upload.py`, the action and the jobs special cases by hand; no note covers the legacy upload tool, and the data fetch note stops at `__DATA_FETCH__`.

## Requested by

- vault/repositories/galaxy/branches/active/stock_tools_review_clean/brain_research.md: needs the `upload1` command, paramfile and output-argument contract before changing how the command lists output datasets, and which callers and tests depend on it.
