(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Opus 5.5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

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

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24323_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_24323_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24323_review_0) is based on the reviewed commit `306cec00874`. It moves the PR's duplicate-choice collapse into a named `SelectToolParameter.get_display_options` method, so the workflow `restrictOnConnections` run form gets the same one-choice-per-value behavior as the tool form. It adds an API test covering both payloads, backed by a new test data table, and replaces a unit test that never reached the new guard. It also renames one test and splits another. All unit tests in `test_data_table_select_options.py` (16) pass, as do the renamed reload test, the new API test and the new tool's framework test.

- [`ad9e3c9c5e3`](https://github.com/jmchilton/galaxy/commit/ad9e3c9c5e3) Collapse table choices for restricted workflow parameter inputs. Adds `get_display_options` (guarded on `DynamicOptions` so drill-down selects don't break) and uses it from `to_dict` and `InputParameterModule.restrict_options`, with a red-to-green unit test.
- [`23706d89da7`](https://github.com/jmchilton/galaxy/commit/23706d89da7) Test collapse is scoped to data table selects. Replaces `test_static_dropdown_is_unchanged` with a `from_parameter` select whose duplicate values must survive; a temporary mutation confirmed it fails without the guard.
- [`7cc4b59f0d5`](https://github.com/jmchilton/galaxy/commit/7cc4b59f0d5) Rename reload test to match kept duplicate rows. Renames it to `test_reload_matches_other_processes_with_duplicate_values`.
- [`842a72f3786`](https://github.com/jmchilton/galaxy/commit/842a72f3786) Split alias and warning checks from dropdown collapse test. Moves the alias and first-match warning assertions into `test_table_dropdown_hidden_choices_stay_valid` without dropping any.
- [`8c179de4aac`](https://github.com/jmchilton/galaxy/commit/8c179de4aac) API test for collapsed duplicate data table choices. Adds the `test_duplicate_values` table, the `select_from_duplicate_value_table` tool and a workflow API test that checks the tool build and run-form options.

</details>

</details>

### P2 1: Restricted workflow parameter inputs still list duplicate table values (implementation verified)

`InputParameterModule.restrict_options` (`lib/galaxy/workflow/modules.py`) builds the run-form choices for a text input with `restrictOnConnections` by calling `input.get_options()` directly, so it skips the collapse this PR adds to `SelectToolParameter.to_dict`. Since duplicate rows now survive merging, a table-backed select with two `hg38` rows shows two `hg38` choices on the workflow run form for the connected parameter input. On `release_26.1` with #24003, only one row survived, so this path regresses.

<details><summary>Evidence</summary>

A unit test driving `restrict_options` with a single connection to a table-backed select, against `306cec00874`, returned `Human old`, `Human current` and `Human alternate`, all valued `hg38`, followed by `Mouse`.

</details>

Move the collapse into a named `SelectToolParameter.get_display_options(trans, other_values)` method and call it from both `to_dict` and the `restrict_options` callback.

<details><summary>Details</summary>

Guard the helper with `isinstance(self.options, dynamic_options.DynamicOptions)`, not `self.options`. `DrillDownSelectToolParameter.options` is a plain list, so `self.options.tool_data_table_name` raises `AttributeError` once the helper is reachable from `restrict_options`. Inputs that aren't `SelectToolParameter` keep calling `get_options`. From reading the code, subworkflow connections reach the same callback through `get_runtime_inputs` -> `restrict_options`, so they should get the collapse too; that path isn't tested. Review branch commit `ad9e3c9c5e3` adds `test_workflow_restricted_options_collapse_table_choices` (red on `306cec00874`, green after).

</details>

Fixed in review branch commit [`ad9e3c9c5e3`](https://github.com/jmchilton/galaxy/commit/ad9e3c9c5e3).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 2: No API-level test that tool and workflow payloads collapse duplicate choices (implementation verified)

The PR changes what the tool build and workflow run APIs return for table-backed selects, but the collapse is only asserted through `SelectToolParameter.to_dict` in a unit test. Nothing tests the contract users actually see.

Add a small test table with duplicate values and a tool that reads it. Assert that both `tools/{id}/build` and a `restrictOnConnections` workflow run download return one choice per value.

<details><summary>Details</summary>

Review branch commit `8c179de4aac` adds:

- `test/functional/tool-data/duplicate_values.loc`;
- a new `test_duplicate_values` table in `sample_tool_data_tables.xml`, with no existing loc files edited;
- the `select_from_duplicate_value_table` tool;
- `TestWorkflowsApi::test_value_restriction_collapses_duplicate_table_values`.

The API test and the new tool's framework test both pass locally on the review branch, and the tool validates against the XSD. The API test was not run against the unfixed head.

</details>

Fixed in review branch commit [`8c179de4aac`](https://github.com/jmchilton/galaxy/commit/8c179de4aac).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 1: `test_static_dropdown_is_unchanged` never reaches the new table guard (implementation verified)

The test asserts that XML static option parsing keeps the last duplicate. That behavior comes from the existing parser. Static selects have no `tool_data_table_name`, so the new collapse branch never runs, and the test would still pass with the guard removed.

Replace it with a dynamic source that isn't a table and really produces duplicate values (`from_parameter`), and assert that both choices survive.

<details><summary>Details</summary>

Review branch commit `23706d89da7` replaces it with `test_non_table_dropdown_keeps_duplicate_values`. To confirm it tests the guard, the `tool_data_table_name` condition was temporarily removed: the test failed (one choice instead of two), then passed again once the condition was restored.

</details>

Fixed in review branch commit [`23706d89da7`](https://github.com/jmchilton/galaxy/commit/23706d89da7).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: Reload test name describes the old dedup behavior (implementation verified)

`test_data_manager_reload.py::test_reload_resolves_duplicate_values_like_other_processes` now asserts that both rows are kept. "Resolves duplicate values" describes the #24003 dedup. Rename it to `test_reload_matches_other_processes_with_duplicate_values` (commit `7cc4b59f0d5`).

Fixed in review branch commit [`7cc4b59f0d5`](https://github.com/jmchilton/galaxy/commit/7cc4b59f0d5).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: `test_table_dropdown_collapses_after_filters` checks too much per case (implementation verified)

Each of the six parametrized cases runs a reload loop and asserts the collapsed options, the raw count, the table rows, label aliases and the first-match warning. A failure is hard to attribute. Split the alias and warning checks into a separate test that uses the same filter cases.

<details><summary>Details</summary>

Review branch commit `842a72f3786` splits it into `test_table_dropdown_collapses_after_filters` and `test_table_dropdown_hidden_choices_stay_valid`. They share the filter constants and a `_reload_cases` helper. Every original assertion, including the `multiple` and reload variants, is kept.

</details>

Fixed in review branch commit [`842a72f3786`](https://github.com/jmchilton/galaxy/commit/842a72f3786).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>
