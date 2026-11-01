Profile: gx_risk_assessment · Model: Opus 5.5 · Effort: low · Reviewed commit: `306cec00874`

Mostly a two-way door that restores pre-#24003 merge semantics, but on a release branch it changes observable behavior admins and tools may now depend on: merged data tables again hold multiple rows per `value`, and table-backed select payloads (tool form/build, workflow editor/run APIs) now dedupe options by submitted value.

<details><summary>Risk Details</summary>

- Data tables merged from several configs (local + CVMFS/IDC) again contain multiple rows sharing a `value`; anything iterating `get_fields()`/`get_named_fields_list()` (tool templates, data managers, admin data-table API) sees more rows than under #24003.
- Which row "wins" for a shared value now depends on config load order everywhere (`get_field` first-match, display label first-match); reordering `tool_data_table_config_path` entries silently changes resolved paths.
- Select `to_dict` output for `from_data_table` options drops later options with duplicate values after filters; clients or scripts counting/matching options by label will see fewer entries, and the label shown is the first-loaded row's, not necessarily the one a later path lookup would pick if filters differ at execution.
- Dedup applies only in `to_dict`; validation and `get_options` still see raw rows, so UI and backend option lists can diverge (intended, but a source of future confusion/bugs).
- `get_field` switching from last-match to first-match changes the data-table field API result for tables with distinct rows sharing a value, independent of the merge change.
- Backport to `release_26.1` reverses a behavior shipped by #24003; deployments that relied on #24003's error-logging/drop of conflicting rows lose that signal.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should confirm the first-match precedence (merge order, `get_field`, display dedup) is consistent with how #24003 resolves paths at job time, so the label a user picks and the path a job uses come from the same row under the same filters. Check that no client code (tool form, workflow editor, run form) relies on option count or index positions from the serialized payload.

Also weigh whether reverting the conflicting-row log message on a release branch is acceptable for admins who used it to spot local/IDC overlaps; a debug/info log on value collisions would be cheap to keep.

</details>
