# Test challenges review — #24798

Profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md), Claude Opus 5.5, medium effort. Reviewed commit `5abbfd9d5a6`. Context: #23888. Full detail and test plan: [test_challenges_debrief.md](test_challenges_debrief.md).

Verdict: the unit coverage is thorough, but nearly all of it runs on the disk-shaped raw dict (`get_tool_source`), never on the model-validated, dumped dicts that API-created tools actually load. A scratch probe confirmed that the model → dump (all three policies) → parser → parameter-model boundary holds today for `reference_data` (single, multiple, filter; user and admin classes). Nothing would go red if it drifted. No P1s.

### P2 1: No test crosses the model → dump → parser boundary for `reference_data`

`test_reference_data_maps_to_a_select_carrying_its_table` checks only `to_internal()`, which #23888 calls non-load-bearing. It passes a `filter` but asserts nothing about it, and `to_internal()` drops it. Replace it with a boundary test. Validate with `UserToolSource`/`YamlToolSource`, then dump with `by_alias=True` (full), `exclude_unset=True` and `exclude_none=True`. Load each dump through `galaxy.tool_util.parser.yaml.YamlToolSource` and `input_models_for_tool_source`. Assert the parsed model equals `to_internal()` and that the input source's dynamic options carry the `data_meta` filter. Cover single, `multiple`+`filter`, and `optional`.

### P2 2: User-creation API path runs only single, non-optional, unfiltered

`test_run_with_reference_data` is the only end-to-end run through `create_unprivileged_tool` (full dump) and persisted reload. `multiple: true` runs only from disk, in the framework test of `gx_reference_data_multiple_user.yml`. `optional` and `filter` never run end to end. `TOOL_WITH_REFERENCE_DATA` also nearly duplicates `gx_reference_data_user.yml`. Instead, load both fixtures through `UserToolSource` and parametrize the API run test over them, and add an optional-with-nothing-selected case. This reuses the fixtures and gives the disk/user-API parity check #23888 asks for.

### P2 3: Tool request API (`validated_state` → `runtimeify`) path untested end to end

The new `runtimeify` branch in `convert.py` and the `job_runtime` model in `SelectParameterModel` run only in the unit evaluator, with a hand-set `job.tool_state`. Add a run through `tool_request_raw`, as the mapped-over tests in the same file already do, and assert the output content.

### P2 4: Denied-access API test asserts only a 400

`test_reference_data_needs_a_table_admins_opened_to_user_tools` would pass on any 400. Assert that the error names `reference`, and that `build_unprivileged_tool` offers no options for the closed table. With those checks in place, the unit tests `test_user_tool_is_offered_nothing_from_a_table_admins_have_not_opened` and `test_user_tool_cannot_submit_a_value_from_a_closed_table` become redundant and can go. Also move the `/refs not in` path-leak assertion from `test_renders_as_a_select_offering_the_table_entries` into that API build check.

### P2 5: Admin `GalaxyTool` and `filter` have no API coverage

`test_admin_installed_tool_can_read_any_table` loads a raw dict, so it skips the admin `exclude_unset` dump and dynamic-tool creation. Rewrite it at API level: admin `create_tool` of a `GalaxyTool` on closed `testalpha`, run it, assert the output. The filter is user-facing form behaviour and has only unit coverage. Add an API test: upload a dataset with dbkey `mm10`, build the user tool with it, assert only `mm10_value` is offered, and assert that submitting `hg19_value` is rejected.

### P3 1: Runtime trust check is never reached through the evaluator

I ran `test_job_fails_when_admins_close_the_table_after_it_was_submitted` with `validated_state` False and True. Both fail earlier, in `from_json` (`requires a value, but no legal values defined`), not at the new `setup_for_reference_data` "not available to user-defined tools" check. That check and "not configured" are reached only by `test_resolving_a_path_enforces_the_allowlist_and_the_entry`, which calls the callback directly. Parametrize the closed-after-submit test over `validated_state`. Then either call out the runtime check as deliberate defense-in-depth or drop those direct-callback cases.

### P3 2: Eager `setup_for_reference_data` forces unrelated test churn

`test_runtime.py`'s `Bunch` gains `tool_source=Bunch(trusted=False)` and `has_data_table=False` only because `UserToolEvaluator` now builds the callback for every user tool. Building it lazily, or only when a `reference_data` input exists, would leave that test untouched.

### P3 3: Spec accepts `reference: null` at runtime for a non-optional multiple

`gx_reference_data_multiple_user.job_runtime_valid` accepts `null`, via `optional_if_needed(..., self.optional or self.multiple)`. Confirm this matches the `gx_select` multiple convention; if not, move the case to `job_runtime_invalid`.

Kept as-is: the `test_tool_data.py` trust-boundary tests (default closed, merge order + reload, Tool Shed can't open), the evaluator matrix tests, path rewrite, no-path tables, load-time rejections, and the new `parameter_specification.yml` entries. No E2E needed, since the form renders a plain select.
