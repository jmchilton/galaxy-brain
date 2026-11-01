### P2 1: Restricted workflow parameter inputs still list duplicate table values (implementation verified)

`InputParameterModule.restrict_options` (`lib/galaxy/workflow/modules.py`) builds the run-form choices for a text input with `restrictOnConnections` by calling `input.get_options()` directly, so it skips the collapse this PR adds to `SelectToolParameter.to_dict`. Since duplicate rows now survive merging, a table-backed select with two `hg38` rows shows two `hg38` choices on the workflow run form for the connected parameter input. On `release_26.1` with #24003, only one row survived, so this path regresses.

<details><summary>Evidence</summary>

A unit test driving `restrict_options` with a single connection to a table-backed select, against `306cec00874`, returned `Human old`, `Human current` and `Human alternate`, all valued `hg38`, followed by `Mouse`.

</details>

Move the collapse into a named `SelectToolParameter.get_display_options(trans, other_values)` method and call it from both `to_dict` and the `restrict_options` callback.

<details><summary>Details</summary>

Guard the helper with `isinstance(self.options, dynamic_options.DynamicOptions)`, not `self.options`. `DrillDownSelectToolParameter.options` is a plain list, so `self.options.tool_data_table_name` raises `AttributeError` once the helper is reachable from `restrict_options`. Inputs that aren't `SelectToolParameter` keep calling `get_options`. From reading the code, subworkflow connections reach the same callback through `get_runtime_inputs` -> `restrict_options`, so they should get the collapse too; that path isn't tested. Review branch commit `ad9e3c9c5e3` adds `test_workflow_restricted_options_collapse_table_choices` (red on `306cec00874`, green after).

</details>

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

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 1: `test_static_dropdown_is_unchanged` never reaches the new table guard (implementation verified)

The test asserts that XML static option parsing keeps the last duplicate. That behavior comes from the existing parser. Static selects have no `tool_data_table_name`, so the new collapse branch never runs, and the test would still pass with the guard removed.

Replace it with a dynamic source that isn't a table and really produces duplicate values (`from_parameter`), and assert that both choices survive.

<details><summary>Details</summary>

Review branch commit `23706d89da7` replaces it with `test_non_table_dropdown_keeps_duplicate_values`. To confirm it tests the guard, the `tool_data_table_name` condition was temporarily removed: the test failed (one choice instead of two), then passed again once the condition was restored.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: Reload test name describes the old dedup behavior (implementation verified)

`test_data_manager_reload.py::test_reload_resolves_duplicate_values_like_other_processes` now asserts that both rows are kept. "Resolves duplicate values" describes the #24003 dedup. Rename it to `test_reload_matches_other_processes_with_duplicate_values` (commit `7cc4b59f0d5`).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: `test_table_dropdown_collapses_after_filters` checks too much per case (implementation verified)

Each of the six parametrized cases runs a reload loop and asserts the collapsed options, the raw count, the table rows, label aliases and the first-match warning. A failure is hard to attribute. Split the alias and warning checks into a separate test that uses the same filter cases.

<details><summary>Details</summary>

Review branch commit `842a72f3786` splits it into `test_table_dropdown_collapses_after_filters` and `test_table_dropdown_hidden_choices_stay_valid`. They share the filter constants and a `_reload_cases` helper. Every original assertion, including the `multiple` and reload variants, is kept.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>
