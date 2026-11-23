### P2 1: reference_data skips the #23888 user tool contract harness (implementation verified)

`lib/galaxy_test/api/test_user_tool_contract.py` already runs each canonical fixture through three load paths: toolbox disk YAML, API user tool from YAML, and API user tool from JSON (`_parameter_load_paths`). It also runs each through every `tool_input_format` (legacy, 21.01, request). That's the parity matrix #23888 asked for. The PR covers the new type with a disk fixture plus a separate inline `TOOL_WITH_REFERENCE_DATA` dict that runs one legacy-format request through the user API. So `multiple` never runs through user creation and reload, and the request format (`validated_tool_state` → `runtimeify` → `adapt_reference_data`) never runs end to end.

<details><summary>Details</summary>

The coverage this misses: user creation does a full `model_dump(by_alias=True)`, then the persisted row is reloaded. The request format exercises the new `runtimeify` branch and `SelectParameterModel.reference_data`'s `job_runtime` model, which until now ran only in the unit evaluator with a hand-set `job.tool_state`.

</details>

Add `gx_reference_data_user.json` and `gx_reference_data_multiple_user.json` twins under `lib/galaxy_test/base/data/user_tools/`. Add contract tests that assert the build shape and the job's output for every load path and input format. `TOOL_WITH_REFERENCE_DATA` / `test_run_with_reference_data` are then redundant and could go. The review branch leaves them in place.

<details><summary>Details</summary>

The review branch adds `test_reference_data_contract` (options `hg19_value`/`hg18_value`/`mm10_value`, `optional` false, output `ReferenceData mm10_path mm10_path test_fasta_indexes mm10_value mm10 mm10_name`) and `test_reference_data_multiple_contract` (output `hg19_value:hg19 mm10_value:mm10`). Each one runs 9 cases, and all 18 pass.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 2: Closed-table tests check less than their names claim (implementation verified)

`test_reference_data_needs_a_table_admins_opened_to_user_tools` asserts only a `400`, so any 400 would pass it. It doesn't check that the form offers nothing from the closed table. `test_job_fails_when_admins_close_the_table_after_it_was_submitted` runs only the legacy `job_parameters` mode, and any `ParameterValueError` passes it. In both modes the job actually fails in `from_json` ("requires a value, but no legal values defined"), before the job-time `user_accessible` check in `setup_for_reference_data` is reached. That job-time check is fine as defense in depth; the test should just say which check fires.

In the API test, assert that `build_unprivileged_tool` offers no options for the closed table and that the 400 names the parameter. Parametrize the closed-after-submit test over `validated_state` and match "no legal values".

<details><summary>Details</summary>

Once the API test checks the build, the unit tests `test_user_tool_is_offered_nothing_from_a_table_admins_have_not_opened` and `test_user_tool_cannot_submit_a_value_from_a_closed_table` mostly duplicate it. The review branch keeps them.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 3: reference_data is read from the raw dict three more times instead of through its authoring model (implementation verified)

`YamlReferenceDataParameter` and its `to_internal()` are written but not load-bearing, which is the gap #23888 describes, opened fresh for a new type. Three loader layers each re-read the dict:

- `CanonicalYamlInputSource.parse_dynamic_options` reads `input_dict["table"]` / `.get("filter")`.
- The factory's `reference_data` branch builds its own `SelectParameterModel`, a second copy of `to_internal()`.
- `ReferenceDataToolParameter.__init__` reads `table`/`filter` and indexes `filter_def["on_metadata"]`.

Disk tools aren't model-validated, so they diverge from the API on bad input:

- A filter missing `on_metadata` raises `KeyError`.
- Extra filter keys, which the model rejects, are silently ignored on disk.

No test checks that the factory's output equals `to_internal()`, so the two can drift.

<details><summary>Evidence</summary>

Reproduced on `5abbfd9d5a6`: a disk tool with `filter: {from_input: reads, on_metadata: dbkey, bogus: 1}` loads without error.

</details>

Validate the input once on the input source and have every reader use the model. Add a parity test across tool classes and dump policies. This makes `reference_data` the first parameter that loads through the canonical model (the "model-backed `InputSource` adapter" of #23888 slice 2) instead of another reader to migrate later. Generalizing that seam to other types, and carrying `filter` in `ReferenceDataConfig`, belongs to #23888's follow-up, not this PR.

<details><summary>Details</summary>

What the review branch changes:

- **Loader.** `InputSource.parse_reference_data()` returns `None` by default. `CanonicalYamlInputSource` returns `YamlReferenceDataParameter.model_validate(self.input_dict)`. `parse_dynamic_options` builds `YamlReferenceDataOptions` from `model.table` / `model.filter`.
- **Factory.** It returns `model.to_internal()`.
- **`ReferenceDataToolParameter`.** It reads `model.table` / `model.filter.on_metadata`.

New tests:

- `test_reference_data_loads_like_its_authoring_model` covers {single+label, multiple+optional, filter} × {`GalaxyUserTool`, `GalaxyTool`} × {full, `exclude_unset`, `exclude_none`} dumps. It asserts that the parsed parameter model equals `to_internal()` and that the `data_meta` filter element is present.
- `test_malformed_filter_is_rejected_when_loading` checks that disk tools now raise `ValidationError`.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort, [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort, and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 1: XML guard can be bypassed, and the parameter model factory accepts XML reference_data (implementation verified)

`ReferenceDataToolParameter` treats "has `table` and has dynamic options" as meaning "is a YAML tool". `XmlInputSource.parse_dynamic_options()` returns options whenever an `<options>` child exists, so an XML param slips through: `<param type="reference_data" table="closed_refs"><options from_data_table="open_refs"/></param>`. The form then offers `open_refs`, while `ReferenceDataConfig` records `closed_refs`. Separately, the factory builds a `reference_data` model for any input source, so tool_util consumers (linting, Tool Shed, workflow state) accept an XML tool that Galaxy then refuses to load. That contradicts the PR's "XML tools can't declare the input".

<details><summary>Evidence</summary>

On `5abbfd9d5a6`:

- `ToolParameter.build` of the XML above returns a `ReferenceDataToolParameter` with `reference_data.table == "closed_refs"` and `options.tool_data_table_name == "open_refs"`.
- `input_models_for_tool_source` of an XML tool with a bare `reference_data` param returns `SelectParameterModel(reference_data=ReferenceDataConfig(table='A'))`.

</details>

Make both places use an explicit YAML predicate, and extend `test_xml_tools_cannot_declare_reference_data` with an `<options>` child. On the review branch, both `basic.py` and the factory guard on `input_source.parse_reference_data() is None`. The factory raises `ParameterDefinitionError`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: `filter.from_input` isn't validated by the tool models (implementation verified)

`YamlReferenceDataFilter.from_input` accepts any string, so an API-created tool passes validation and lint with any value.

- **Unknown or later-declared input.** The tool loader rejects it only when the tool is loaded, with a bare `AssertionError` ("Could not find dependency 'read' of parameter 'reference'").
- **Non-data input**, e.g. a `text` param. The tool loads, and `DataMetaFilter` catches the `ValueError` and offers every table entry, so filtering silently turns off.

Per #23888, the model should reject what the loader won't honor.

<details><summary>Evidence</summary>

On `5abbfd9d5a6`:

- `UserToolSource.model_validate` accepts `from_input: read` when the data input is named `reads`. The disk load of the same tool fails with the assertion above.
- With `from_input` naming a `text` input, `get_options` returns `['hg38', 'mm10']` for a `mm10` value.

</details>

Add a tool-level model validator that requires `from_input` to name a `data` or `data_collection` input declared before it, in the same or an enclosing parameter list. That matches the loader's `ExpressionContext` scoping. A precedent is `_check_input_refs` in `tool_util_models/_models.py`.

<details><summary>Details</summary>

The review branch adds `_check_reference_data_filters` / `_reference_data_filter_errors` on `_DynamicToolSourceBase`, so it applies to both `UserToolSource` and `YamlToolSource`. New tests:

- the unknown, declared-after and not-data cases, which must fail;
- an enclosing-scope `data_collection` case, which must pass.

Disk tools aren't model-validated as a whole, so a non-data `from_input` on disk still behaves like XML `data_meta` does today. Routing disk tools through the models is #23888's scope.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: Runtime list/single dumping and the table access rule are each written twice (implementation verified)

`runtimeify` (`convert.py`) and the legacy `resolve_reference_data` visitor (`evaluation.py`) each repeat the same `if multiple and isinstance(value, list): [...] else adapt(...)` block. The rule "untrusted needs `user_accessible`" is also written twice: once in `ReferenceDataToolParameter.get_options` and once in `setup_for_reference_data`, from two different trust sources. Either pair can drift. The legacy branch still matters, because new jobs from the legacy `/api/tools` path reach it.

Move the list/single handling into one helper and the access rule into one `ToolDataTable` method. On the review branch these are `reference_data_runtime_json()` in `convert.py`, called from both sites, and `ToolDataTable.readable_by(trusted)`, used by both the form check and the job-time check.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 4: Admin `GalaxyTool` API path and `filter` have no API coverage (implementation verified)

`test_admin_installed_tool_can_read_any_table` loads a raw dict, so it skips admin `create_tool`, the `exclude_unset` dump and dynamic tool loading. That's the one path that may read tables closed to user tools. The `filter` is user-facing form behavior with only unit coverage.

Add an API test where an admin creates a `GalaxyTool` on the closed `testalpha` table, runs it and checks the output. The review branch adds `test_admin_yaml_tool_reads_a_table_closed_to_user_tools`, which passes. A filter API test is not on the branch:

1. Upload a dataset with dbkey `mm10`.
2. Build with it selected and assert that only `mm10_value` is offered.
3. Submit `hg19_value` and assert it's rejected.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 5: reference_data is a nullable mode on `SelectParameterModel`

`reference_data: ReferenceDataConfig | None` turns "select backed by a table" into an optional mode that only the YAML dialect sets. When it's set, the `job_runtime` shape changes from `str` to `ReferenceDataInternalJson`. Every consumer that switches on `parameter_type` has to remember the extra branch: `runtimeify`, the `pydantic_template` `job_runtime` arm, the generated schemas, and gxformat2/workflow-state consumers. XML `from_data_table` selects express the same idea but carry no table in their model. Once tools and workflows are written against `gx_select` + `reference_data`, this becomes a one-way door.

Settle this before merge. One option is a distinct model (e.g. `gx_reference_data`, still rendered as a select). The other is a field that names what it is (e.g. `data_table`) and that the factory also sets for XML `from_data_table` selects. Reusing select does get request and workflow validation for free, so this is the author's call, not a requirement.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort.

</details>
