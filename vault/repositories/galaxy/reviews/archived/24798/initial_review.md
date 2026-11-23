# Initial review: #24798 "Add reference_data input for YAML tools"

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Claude Opus 5.5, medium effort
- Reviewed commit: `5abbfd9d5a6` (5 commits on `origin/dev`)
- Context: reviewed against #23888 (YAML authoring models vs loader dialect split), as requested.
- Method: I read the code; nothing was run (the worktree has no `.venv`). Every finding below comes from reading, not from a reproduction.

## Verdict

The design is sound and reuses the right pieces. `reference_data` is turned into an XML `<options from_data_table>` element plus a `data_meta` filter (`YamlReferenceDataOptions`), so the form, the filtering, data-bundle handling and the job cache all come from the existing `from_data_table` select machinery instead of being reimplemented. Access is checked both on the form and when the job runs. The refactor commits are clean.

Against #23888, the new type adds **no new dump-policy drift**: `filter: None`, `multiple: False` and `optional: False` read the same under full dump, `exclude_unset` and `exclude_none`. But two things are missing:

- The tests skip the cross-path contract harness that the #23888 slices already landed.
- `filter` is read from the raw dict in several places, with the authoring model and the loader behaving differently on bad input.

No P1s.

## #23888 evaluation

| Question | Finding |
|---|---|
| Model vs parser field reads | `table`, `multiple` and `optional` agree. `to_internal()` and `factory._from_input_source_galaxy` build the same `SelectParameterModel` (name, optional, multiple, `ReferenceDataConfig(table)`, label/help). Nothing tests that they agree, though. |
| `filter.from_input` / `filter.on_metadata` | Only in the raw dict. `ReferenceDataConfig` and `to_internal()` drop the filter. Disk tools aren't validated, so a malformed filter raises `KeyError`, and extra filter keys (which the model rejects) are silently ignored. A typo in `from_input` passes both sides and silently turns off filtering (P2 2). |
| Dump policies | No new drift. `filter: null` from a full `model_dump` is read with `.get("filter")` → falsy in both `yaml.py` and `basic.py`. Omitted `optional` defaults to False in both `CanonicalYamlInputSource` and the model. |
| Tests across the model→loader boundary | Partly. `test_yaml_parameters.py` checks only `to_internal()`, the pattern #23888 criticizes. `test_reference_data.py` feeds raw JSON through the parser with no model dump. The API test `test_run_with_reference_data` does cross the user path (full dump). Nothing compares the paths with each other (P2 1). |
| Disk / admin `GalaxyTool` API / `GalaxyUserTool` | Disk `GalaxyUserTool`: covered by the framework fixtures. API `GalaxyUserTool`: covered by one inline API test. Admin `GalaxyTool` API creation (the `exclude_unset` dump, and the path that may read every table): **untested**. Disk `GalaxyTool`: only the unit test with a raw dict. |
| Easier or harder for unification | Mostly neutral, slightly harder: `filter` exists only as raw dict → synthesized XML, so a future model-backed `InputSource` can't rebuild form behavior from the canonical model (P3 1). Easy to fix here. |
| Reuse vs duplication | Good reuse of `from_data_table` / `DataMetaFilter`. Small duplication in the runtime list/single adaptation and in the access check (P3 3). |

## P2 1: Use the existing #23888 contract harness instead of a one-off API test

`lib/galaxy_test/api/test_user_tool_contract.py` already parametrizes each canonical fixture across three load paths: toolbox disk YAML, API user tool from YAML, and API user tool from JSON (`_parameter_load_paths`). It also runs each through every `tool_input_format` (flat, nested, request). That's the parity matrix #23888 asked for, and `reference_data` is a new canonical parameter type that should sit in it.

What the PR adds instead:

- A disk fixture (`test/functional/tools/parameters/gx_reference_data_user.yml`).
- A separate inline `TOOL_WITH_REFERENCE_DATA` dict in `test_unprivileged_tools.py` that runs one input format through the user API only.

As a result, the request format, which goes through `validated_tool_state` → `runtimeify` → `adapt_reference_data`, and the legacy flat format, which goes through `to_cwl` → `resolve_reference_data`, aren't both compared across load paths.

Suggested fix:

- Add `gx_reference_data_user.json` and `gx_reference_data_multiple_user.json` twins under `lib/galaxy_test/base/data/user_tools/`.
- Add a `test_reference_data_contract` (single and multiple) using `_parameter_load_paths(...)` with `tool_input_format`. It should assert the `build()` shape (type `select`, options `hg19_value`/`mm10_value`, `optional`) and the job's runtime JSON (`class`, `path`, `source`, `metadata`).
- Then drop `TOOL_WITH_REFERENCE_DATA` / `test_run_with_reference_data`, or reduce it to the closed-table case.
- Strengthen `test_reference_data_needs_a_table_admins_opened_to_user_tools` to assert the error message, not just a 400.
- Optionally cover admin `GalaxyTool` creation via the API, the one path with the `exclude_unset` dump policy and full table access.

## P2 2: `filter.from_input` is never checked; a typo silently disables filtering

`YamlReferenceDataFilter.from_input` accepts any string, and nothing on the loader side checks it either. `ReferenceDataToolParameter.__init__` checks that `on_metadata` is a column of the table, but not that `from_input` names a `data`/`data_collection` input.

At runtime `DataMetaFilter.filter_options` catches the `KeyError` (no such input) or `ValueError` (not a data input), logs a warning, and returns **all** entries unfiltered (`dynamic_options.py`, the `_get_ref_data` try/except). So `from_input: read` instead of `reads` validates, loads and runs, but offers every genome in the table. That's the "model accepts, loader means something else" pattern from #23888, introduced fresh. Per the review focus, it's input that should be rejected rather than kept alive.

Suggested fix:

- Reject unknown or non-data `from_input` when the tool is built. Check it against the tool's inputs, as is already done for `on_metadata`, and raise `ParameterValueError`.
- Add a tool-level `model_validator` on the YAML tool models (precedent: `tool_source.py:239`) so the API rejects it during validation too.
- One unit test for each side.
- Nesting (a `from_input` that points out of a section or repeat) can be left to #23444, but a plain top-level typo should fail here.

## P3 1: `reference_data` fields are read from the raw dict in four places; carry `filter` in the canonical model

The same definition is read by:

1. `YamlReferenceDataParameter.to_internal()`
2. `factory._from_input_source_galaxy` (`input_source.get("table")`, `get_bool("multiple")`)
3. `CanonicalYamlInputSource.parse_dynamic_options` (`input_dict["table"]`, `.get("filter")`)
4. `ReferenceDataToolParameter.__init__` (`input_source.get("table")`, `input_source.get("filter")`, `filter_def["on_metadata"]`)

`ReferenceDataConfig` holds only `table`, so the filter exists only as a raw dict that becomes synthesized XML.

Suggested fix:

- Have `CanonicalYamlInputSource.parse_dynamic_options` validate once (`YamlReferenceDataParameter.model_validate(self.input_dict)`, or at least `YamlReferenceDataFilter.model_validate(...)`). That gives disk tools the same errors as the API: `KeyError` → `ValidationError`, and extra keys are rejected instead of ignored.
- Build `YamlReferenceDataOptions` from the validated model.
- Optionally add `filter` to `ReferenceDataConfig`, so `basic.py` and the factory read table and filter from one object.

This makes `reference_data` the first parameter that loads through the canonical model, i.e. the "model-backed `InputSource` adapter" in #23888 slice 2. It moves unification forward instead of adding another reader to migrate later. Fine to treat as a follow-up under #23888 if the author prefers.

## P3 2: XML guard can be bypassed, and the factory accepts what the loader rejects

`ReferenceDataToolParameter.__init__` treats "has `table` and has dynamic options" as meaning "is a YAML tool". For XML, `XmlInputSource.parse_dynamic_options()` returns options whenever an `<options>` child exists. So `<param type="reference_data" table="A"><options from_data_table="B"/></param>` passes:

- The form offers table B.
- `ReferenceDataConfig` records A.
- The non-user evaluator passes the bare value string.

`test_xml_tools_cannot_declare_reference_data` only covers the case without `<options>`.

Separately, `factory._from_input_source_galaxy` builds a `reference_data` model for any input source, XML included. So tool_util-side consumers (linting, Tool Shed, workflow state validation) accept an XML tool that Galaxy then refuses to load.

XML tools are trusted, so this is a consistency problem, not a security one. The PR description says "XML tools can't declare the input".

Suggested fix: use an explicit predicate in both places, e.g. `isinstance(input_source.parse_dynamic_options(), YamlReferenceDataOptions)` or a small `InputSource` capability flag. Extend the XML test with an `<options>` child.

## P3 3: Small duplications in the runtime adaptation and the access check

- **List/single adaptation.** `runtimeify` (`convert.py`) and `UserToolEvaluator`'s legacy `resolve_reference_data` (`evaluation.py`) each repeat the same `if multiple and isinstance(value, list): [adapt(...).model_dump(by_alias=True) ...] else adapt(...)` branch. Move it into one helper next to `setup_for_reference_data` in `runtime.py`, e.g. return a callback that takes `(config, multiple, value)` and returns the dumped JSON.
- **Access rule.** The rule "untrusted needs `user_accessible`" is written twice, from two different trust sources: `input_source.trusted` in `ReferenceDataToolParameter.get_options`, and `tool_source.trusted` in `adapt_reference_data`. A `ToolDataTable.readable_by(trusted: bool)` method, or similar, would keep the form and job checks from drifting.

## P3 4: Consider a dedicated parameter model instead of `SelectParameterModel.reference_data`

`reference_data` becomes `parameter_type: gx_select` with `options=None` plus an optional `reference_data` field, and that field changes the `job_runtime` shape from `str` to `ReferenceDataInternalJson`. Every consumer that switches on `parameter_type` has to remember the extra branch:

- `runtimeify`
- the `pydantic_template` `job_runtime` arm
- the regenerated Tool Shed schema
- gxformat2 / workflow-state consumers

A distinct model (e.g. `ReferenceDataParameterModel` / `gx_reference_data`, still rendered as `select` on the form) would make that explicit and type-checked. Reusing select does get request and workflow validation for free, so this is a narrow-typing question for the author, not a requirement.

## Notes (not findings)

- Commits 1–3 (`trusted` property, deferred `data_meta` column resolution, `user_accessible`) are reasonable standalone refactors. The deferred `column_spec_to_index` is safe: the `tool_data_table` property refreshes `columns` lazily before filtering.
- `optional_if_needed(..., self.optional or self.multiple)` at `job_runtime` matches how multiple selects already behave (they're optional by default).
- Imports are at module top level throughout; the existing in-function `runtimeify` import in `evaluation.py` predates this PR.
- Job-cache matching on value, not persisting `{table, value, path}`, and option C are explicitly out of scope per the PR description, so they aren't raised here.
- Security observations went to the private report path given to the coordinator.
