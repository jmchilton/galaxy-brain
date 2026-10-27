# planemo#1764 — Document and surface tool_data_table_conf.xml.test discovery for workflow tests

[Issue](https://github.com/galaxyproject/planemo/issues/1764)

Agent-filed. Claims verified against `origin/master` `5ff07fa8` and Galaxy `dev`: `_find_tool_data_table` (`planemo/galaxy/config.py`) applies to workflow runnables; Galaxy expands `${__HERE__}` per file and merges same-name tables.

Corrections to the issue: the `.sample` fallback searches only the runnable dir and cwd (not `test-data`); discovery only runs when Planemo starts Galaxy itself (`local_galaxy_config`), not for `docker_galaxy` or external Galaxy.

Addressed by branch [`issue-1764-workflow-tool-data-tables`](../../../branches/active/issue-1764-workflow-tool-data-tables/index.md).

## Scope decisions

- Docs: done — extend the `.loc` recipe, link from workflow best practices.
- INFO line naming the auto-loaded conf: done.
- Logging searched paths when nothing found: skipped — prints on every test run with no data tables.
- Warning about a misnamed `tool_data_table_conf.xml`: skipped — narrow; docs plus the INFO line cover it.
- Missing-entry hint: out of scope; that error comes from Galaxy parameter validation.

## Follow-ups (unverified)

- Container jobs: `${__HERE__}` paths under the workflow's `test-data` may not be mounted for shed tools (their `$tool_directory` is elsewhere). Not checked.
