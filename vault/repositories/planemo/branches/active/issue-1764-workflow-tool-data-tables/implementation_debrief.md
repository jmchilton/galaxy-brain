# Implementation debrief

Verified the issue's claims on `origin/master` `5ff07fa8` and Galaxy `dev`, then trimmed scope to docs plus one INFO line.

- `planemo/galaxy/config.py`: `_find_tool_data_table` prints `Using tool data table config <path>` when it auto-discovers a conf (not for `--tool_data_table`).
- `docs/writing_how_do_i.rst`: `.loc` recipe gets a `test_loc_data` label and a paragraph on workflow use, search dirs, `.sample` fallback, engine scope, `--tool_data_table`.
- `docs/best_practices_workflows.rst`: one-line link under Tests.
- `tests/test_galaxy_config.py`: workflow runnable + `test-data/tool_data_table_conf.xml.test` (and a `.sample` beside the workflow) → `.test` returned and printed. Red on base at the print assertion.

Skipped from the issue, with reasons in the [issue notes](../../../issues/wip/1764/index.md): searched-path logging, misnamed-file warning, missing-entry hint, container mounts.

Checks: `make lint` green; `PLANEMO_SKIP_GALAXY_TESTS=1 pytest tests/test_galaxy_config.py` 51 passed; the 3 Galaxy-install tests in that file fail locally (`common_startup.sh` env), CI runs them. Sphinx build: no warnings in touched files, `:ref:` resolves.
