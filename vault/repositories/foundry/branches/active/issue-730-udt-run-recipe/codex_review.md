# Codex review debrief

Acted on both findings (commit 9fea5a6c). Serving an empty directory leaves Galaxy's built-in collection tools (`__BUILD_LIST__`, `__APPLY_RULES__`, ...) out of the toolbox, confirmed in planemo 0.75.47 `_all_tool_paths`/`TOOL_CONF_TEMPLATE`. The recipe now says so, names `--extra_tools` as an untested workaround, and says to record `not-run` until it is verified. The data-table check now accepts a value supplied by the select's `add_value` filter (Galaxy `AdditionalValueFilter`).

Not acted on: none. The `--extra_tools` workaround was not run end to end. That is left for John or a later run.

<details><summary>Full review</summary>

Verdict: close to mergeable. Codex claims verified against planemo 0.75.47/master and Galaxy: KeyError site, `enable_beta_tool_formats` default, `test_key`, top-level-only `load_shed_repos`, `--tool_data_table`/`--tool_data_path`, `user_tool_execute` without admin bypass, public `GET /api/tool_data/{name}`, `POST /api/users/{id}/api_key`.

1. Real bug: planemo's tool_conf holds only `upload.xml` plus distro tools for tool ids in the served target, so an empty-dir serve lacks `__*__` collection tools, and shed-tools cannot install them.
2. Edge case: `add_value` filters append choices after the table rows, so a value missing from the table can still be valid.

</details>
