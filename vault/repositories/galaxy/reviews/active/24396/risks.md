Profile: gx_risk_assessment, Opus 5.5, low effort, reviewed `770965bef62` against `origin/release_26.1`.

The main one-way risk is that this fixes a new admin-facing contract on a release branch: the order of `tool_data_table_config_path` now sets data table precedence, the shed file can be placed explicitly in that list, and same-value rows from different sources are kept instead of the first one winning. Admin configs and IDC/CVMFS deployments will come to rely on this.

<details><summary>Risk Details</summary>

- Precedence semantics become documented config behavior: earlier files win, the shed file loads last unless listed, symlinked/equivalent paths load once at the first position. Changing this later would silently change which reference rows tools resolve.
- `merge_tool_data_table` no longer drops a row whose `value` is already registered. Only identical rows are skipped now. Tables merged from several sources can hold several rows with the same `value`, and `get_field`/`get_entry`-style lookups that assume unique values may return a different row or show duplicates in tool selects.
- An explicitly set `shed_tool_data_table_config` that is missing is now an error at startup and reload. Only the default path is optional. Existing deployments with a configured but missing file may fail to start after a minor-release upgrade.
- Reload is rebuilt around full config sources: every path-triggered reload re-parses all source XML files, and there is new change-detection state (`_loaded_config_definitions`). Live tables are swapped in place through `existing.__class__`/`__dict__` assignment, which is fragile if anything holds a reference that depends on the old type (Refgenie and tabular).
- Shed registration now stages, validates, writes XML, reloads, then broadcasts per-table `reload_tool_data_tables` control tasks and updates watchers. Other processes depend on these new messages, so in a mixed-version rolling restart the order can briefly disagree between processes.
- Watchers now also watch every non-transient `.loc` directory referenced by any table, recursively. On large reference mounts (CVMFS, IDC) this can add many watched directories and inotify load.
- `to_xml_file` switched `abspath` to `realpath`, so writes now go to the symlink target.
- Only two-way: changing order requires a restart, and the old two-argument path (`config_filename`) remains for non-app callers.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should confirm that keeping same-value rows from different sources is intended for a release branch. It reverses the earlier "first value wins" dedup and may surface duplicate genome builds in tool selects. Check also whether the new hard error for a missing explicitly configured shed file is acceptable for a point release.

Look closely at `_reload_from_config_sources` (the in-place `__class__`/`__dict__` swap, and the cost of re-parsing all sources on every `.loc` change) and at the recursive watcher expansion against large mounted reference data. Someone running a multi-process deployment (usegalaxy.*) should sanity-check the new control-task broadcast during installs and data-manager runs.

</details>
