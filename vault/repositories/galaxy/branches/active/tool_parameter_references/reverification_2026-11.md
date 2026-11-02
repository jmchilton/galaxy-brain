Run via Opus at low effort against dev 269efa7af5b.

Doc: `doc/source/dev/tool_parameter_references.md` at worktree HEAD `8f2b0ef6f08` (rebased onto dev `269efa7af5b`). Line numbers below are doc lines; code refs are `path:line` in the same worktree. "Pre-base" means the change merged before the 2026-10-05 verification base `245a9103f73`, so the claim was already stale then.

## Stale or wrong

### 1. `type_source` resolution (lines 122, 280-288)

- **Doc:** the table cell says "Conditionals: mapped only" and "Unmapped, a path into a conditional raises `AttributeError`". The prose (lines 280-288) says the reference "must first be a key in the legacy alias dict... `|` segments are walked down `tool.inputs`... a bare alias such as `input1` passes the key check but then walks to `None`... a real parameter name ending in `_<digit>` gets mangled".
- **Dev:**
  - Unmapped lookup is an exact `dict.get` on `input_collection_parameters`, a plain dict keyed by qualified `prefixed_name` (`lib/galaxy/tools/actions/__init__.py:403-406`, `:1230-1241`). It no longer walks `tool.inputs`.
  - Sections, conditionals, repeats (`rep_0|input_collect`) and `_<digit>` names all work.
  - A name that matches nothing raises "has type_source '…', which does not name a collection input" when the job runs (`:1231-1234`).
  - A bare legacy alias of a nested collection input fails **tool load at any profile** with `ToolLoadError` "…which must be qualified as 'cond|input_collect'" (`lib/galaxy/tools/__init__.py:1856-1860`, helper `lib/galaxy/tools/parameters/__init__.py:353-368`).
  - The mapped path is unchanged (`lib/galaxy/tools/execute.py:584-603`): conditionals work and repeats don't.
  - Evidence: fixtures `test/functional/tools/collection_type_source_{conditional,section_repeat,digit_name}.xml`; `test_bare_type_source_alias_fails_to_load` / `test_qualified_type_source_loads` (`test/unit/app/tools/test_tool_deserialization.py:422,437`); `lib/galaxy_test/workflow/collection_type_source_conditional_mapped.gxwf*.yml`.
- **Changed by:** #23890 (7bd1dcbd27d, merged 2026-10-04, pre-base; fixes #23886).
- **Proposed table row:** `type_source` | ✓ | ✓ | unmapped only | A bare legacy alias of a nested input fails tool load; mapped over, repeats are unreachable.
- **Proposed prose:** "Without mapping, the reference is looked up by exact qualified key among the collection inputs recorded while visiting the job's inputs. Sections, conditionals, repeats (`queries_0|coll`) and names ending in `_<digit>` all work, and an unmatched name fails when the job runs. A bare legacy alias of a nested collection input (`input_collect` for `cond|input_collect`) is rejected at tool load, at every profile, with the qualified name. When mapped over, it is resolved like `structured_like`, so conditionals work and repeats do not."

### 2. "Output attributes not checked against declared inputs" (lines 88-89, 142, 601-602)

- **Doc:** "YAML output attributes such as `format_source` are not checked against the declared inputs" and "None of these names are checked against the declared inputs, whether by the pydantic models or by the linters… A typo shows up only when the job runs."
- **Dev:** `Tool.parse_outputs` is shared by XML and YAML tools (`lib/galaxy/tools/__init__.py:1851-1860`). A YAML `collection_type_source`/`type_source` that is a bare legacy alias therefore fails load. The other attributes, and typos in all of them, are still unchecked for YAML.
- **Changed by:** #23890 (pre-base).
- **Proposed line 601-602:** "Apart from a load-time rejection of a bare legacy alias in `collection_type_source`, none of these names are checked against the declared inputs, by the pydantic models or by the linters (the output linters are XML-only). A typo shows up only when the job runs."

### 3. `OutputsFormatSourceReference` linter (lines 146, 237-238; also 142)

- **Doc:** line 146 says "(no repeat awareness)". Lines 237-238 say "warns when an unqualified name matches a nested parameter. It does not model repeats, so a name inside a repeat counts as top level and passes." Line 142 says output attributes are "checked by linters".
- **Dev:** `_InputReferences` (`lib/galaxy/tool_util/linters/output.py:315-370`) keys inputs as runtime does: qualified paths plus `name_N|` repeat segments (normalized to `_0`), and a legacy alias that drops only the innermost conditional or section. `_check_format_source_reference` (`:381-418`):
  - warns on a legacy alias, naming the qualified path;
  - **errors** on a legacy alias in a `<collection>` with `discover_datasets` (`:397-405`);
  - errors on any reference matching no input, which covers pipe paths and repeat-nested names missing `name_N|` (`:406-409`, `:499`);
  - accepts one element selector only on a collection input (`:410-416`);
  - also lints `<data>` nested in `<collection>` (`:287-292`).
  - `metadata_source`, `type_source` and `default_identifier_source` are not linted.
- **Changed by:** #23919 (e395ae0d83c, f96f448d879, 35157461b86; merged after the base).
- **Proposed line 237-238:** "The `OutputsFormatSourceReference` linter mirrors the runtime keys, repeats included. It warns on a legacy alias with the qualified name, and errors on a legacy alias in a discovered collection, on a reference matching no input (including a repeat-nested name without `queries_N|`), and on an element selector on a non-collection input. `metadata_source` is not linted."
- **Proposed line 146 XML cell:** "`OutputsFormatSourceReference`, `OutputsStructuredLikeReference` (repeat-aware; `metadata_source`/`type_source` not linted)".

### 4. `OutputsStructuredLikeReference` linter (lines 270-271)

- **Doc:** "The `OutputsStructuredLikeReference` linter warns on unqualified nested names."
- **Dev:** `_check_structured_like_reference` (`lib/galaxy/tool_util/linters/output.py:421-450`) checks both the mapped and unmapped paths:
  - It warns only when profile < 26.0 and a bare name matches a one-level legacy alias.
  - It **errors** in four cases: a bare name nested deeper than one level; any bare nested name at profile ≥ 26.0; a reference whose every match is inside a repeat ("cannot be resolved when mapping over"); and a non-data target.
- **Changed by:** #23919 (4634154aa27, f96f448d879).
- **Proposed:** "The `OutputsStructuredLikeReference` linter requires a reference that resolves both with and without mapping. It warns on a one-level legacy alias below profile 26.0. It errors on deeper bare names, on any bare nested name from 26.0, on paths into repeats and on non-data inputs."

### 5. YAML groupings and the file-flavor/modelled split (lines 66-67, 140, 401-411, 441-449, 502-511)

- **Doc:** "modelled tools can load only conditionals, file-flavor tools conditionals and repeats, and neither can load sections". File flavor: "`class` is optional… This is the shape `simple_constructs.yml` uses: repeats nest under `blocks:`". There is a `{warning}` that sections are unknown and a modelled repeat fails with `KeyError: 'blocks'`. The running example "cannot currently be loaded", and as file flavor it "has to drop `adv`" and use `blocks:`.
- **Dev:** two independent axes now exist.
  - **Dialect, chosen by `class`:**
    - `YamlToolSource.is_yaml_origin()` is true for `class: GalaxyTool`/`GalaxyUserTool` (`lib/galaxy/tool_util/parser/yaml.py:103-104`) and selects `CanonicalYamlPageSource` (`:225-229`).
    - `CanonicalYamlInputSource` (`:662-693`) loads `type: section` and nests repeat and section children under `parameters:`. It also reads Boolean `value` and treats omitted `optional` as false.
    - Classless YAML keeps the legacy `YamlInputSource` (`:569-655`): repeats under `blocks:`, no sections.
  - **Validation, chosen by load path (unchanged):** disk files are loaded raw (`lib/galaxy/tool_util/parser/factory.py:95-99`); API tools go through the pydantic models.
  - `test/functional/tools/simple_constructs.yml` declares `class: GalaxyTool` and now uses `parameters:` for its repeat (line 74). No classless YAML tool remains under `test/functional/tools`.
  - The doc's own running example (doc lines 452-499) passes `UserToolSource` validation. Through `YamlToolSource`, it now yields a parameter bundle `input:gx_data, adv:gx_section, cond:gx_conditional, queries:gx_repeat`. This was checked by script against the worktree `lib`.
  - Load and execution are tested by `test_repeat_contract` / `test_section_contract` (`lib/galaxy_test/api/test_user_tool_contract.py:57,80`) on three load paths: disk, API YAML and API JSON.
- **Changed by:** #24365 (ddd50d41789; merged 2026-10-28).
- **Proposed:**
  - Line 66-67: "**Canonical** and **legacy** YAML dialects: a tool that declares `class: GalaxyTool` or `GalaxyUserTool` is read with `parameters:` for repeats and sections; a classless `.yml` is read with the older `blocks:` dialect. Separately, API-posted tools are validated by pydantic models and disk files are not."
  - Line 140 cell: "class-declaring: sections, conditionals, repeats (`parameters:`); classless: conditionals and repeats (`blocks:`), no sections".
  - Lines 401-402: "Class-declaring YAML tools support all three groupings; classless files support conditionals and repeats only."
  - Lines 407-411: drop "repeats nest under `blocks:`" from the `simple_constructs.yml` sentence. Say instead that classless files use `blocks:` and no in-tree fixture uses it.
  - Delete the `{warning}` at 444-449 and "cannot currently be loaded" at 441-442.
  - Replace 502-511 with: "A classless file would have to drop `adv` and nest the repeat under `blocks:`."

### 6. JavaScript section shape (lines 538-539)

- **Doc:** "A section would be an object (`inputs.adv.size`…), but sections do not load today."
- **Dev:** sections load, and `$(inputs.group)` renders as `{"count": 2, "flag": null}` across legacy, 21.01 and request submissions (`test_section_contract`, `test_user_tool_contract.py:80-97`).
- **Changed by:** #24365.
- **Proposed:** "A section is an object: `inputs.adv.size`."

### 7. YAML verification note (lines 515-521)

- **Doc:** "`test_repeat_of_data` and `test_section_recurses`… establish model conversion, not loading through `YamlToolSource`"; "`_from_input_source_galaxy` rejects an unknown leaf type such as `section`"; "Unverified: add a parser/loading regression test".
- **Dev:** `CanonicalYamlInputSource.parse_input_type` returns `"section"` before the leaf factory is reached (`yaml.py:679-682`). The loading regression now exists: `lib/galaxy_test/api/test_user_tool_contract.py:57-97`.
- **Changed by:** #24365.
- **Proposed:**
  - **Tested:** `test_repeat_contract` and `test_section_contract` load class-declaring repeat and section tools from disk, API YAML and API JSON, and assert form defaults and `$(inputs)` output.
  - **Source-inspected:** classless files still read `blocks:` and have no `section` type (`YamlInputSource`).

### 8. Legacy-API JavaScript runtime shape (lines 557-558, 572-573)

- **Doc:** "Jobs without a stored tool state… fall back to the deprecated `to_cwl` conversion. Whether that produces the same shape is unverified."
- **Dev:**
  - The legacy path strips `__index__` and `__current_case__` before `to_cwl` (`lib/galaxy/tools/evaluation.py:130-136, 1186-1199`; c16d347ec08).
  - The contract tests are parametrized by `tool_input_format` (legacy/21.01/request, `lib/galaxy_test/api/conftest.py:149`). They assert identical `$(inputs)` JSON for repeat, section and conditional (`test_user_tool_contract.py:57-129`).
  - Remaining difference: under 21.01, a repeat's `min` instance must be supplied (`:66`).
- **Changed by:** #24365.
- **Proposed:** "Jobs without a stored tool state (legacy `/api/tools`) fall back to the deprecated `to_cwl` conversion after dropping `__index__`/`__current_case__`. For class-declaring conditional, repeat and section tools, the contract tests assert the same `inputs` shape across all three submission formats."

### 9. NEW: YAML test inputs silently drop section values (lines 79-89, 622-628)

- **Doc:** test inputs are "flattened to `input`, `cond|sel`, `cond|input1`, `queries_0|input2`…". Sections are not mentioned, which matched the old "sections don't load" state.
- **Dev:** `_flatten_parameter` has branches for `gx_conditional` and `gx_repeat` only (`lib/galaxy/tool_util/parser/yaml.py:352-395`). A section falls through to the leaf branch as one key, `adv` → `{'size': 3}`, which test-case processing then discards.
  - Reproduced by script with the doc's running example (module confirmed loaded from the worktree `lib`). `parse_tool_test_descriptions` gives flat inputs `cond|input1, cond|sel, input, queries_0|input2` and request `adv: {}`, with or without `adv: {size: 3}` in the test. No error is raised and the section keeps its defaults.
  - The section contract fixture `gx_user_section.yml` has no `tests:`, so nothing catches this.
- **Changed by:** pre-existing parser gap; reachable since #24365 made sections load.
- **Proposed silent-trap bullet (79-89):** "A YAML tool test's section values (`adv: {size: 3}`) are dropped; the section keeps its defaults ([Test Inputs](#test-inputs))."
- **Proposed Test Inputs bullet:** "Section values in tests are not flattened and are silently dropped (`_flatten_parameter` has no section branch)." Also add a gap row (see the gaps table below).

### 10. Rename PJA bare-name matching (lines 941, 1104-1106)

- **Doc:** "bare names match by suffix", and "If nothing matches exactly, the first pipe path whose text ends with the bare name is used… a raw string suffix match, so `#{input1}` can also match `cond|xinput1`."
- **Dev:** the fallback is `input_name.endswith(f"|{input_file_var}")` (`lib/galaxy/job_execution/actions/post.py:246-250`), which matches on a path-segment boundary.
  - `#{input1}` matches `cond|input1` and not `cond|xinput1`.
  - A dotted multi-segment name such as `#{cond.input}` matches `outer|cond|input` and not `outer|xcond|input`.
  - Resolution is a single `re.sub` pass, so an unmatched reference renders empty (`post.py:22, 274`).
  - Pinned by `test_rename_input_references` (`test/unit/job_execution/test_post_job_actions.py:7-52`) and `test_run_rename_ignores_partial_input_segments[_on_mapped_collection]` (`lib/galaxy_test/api/test_workflows.py:10054-10061`).
- **Changed by:** #23918 (1e417c464e5; fixes #23896). #23943 (50890cc4099, single pass, fixes #23900) changes no existing doc claim, because the doc never described the leftover-literal bug.
- **Proposed line 941 cell:** "Data inputs only; repeat syntax `#{queries_0.input2}`; a bare or partial name matches a trailing path segment".
- **Proposed 1104-1106:** "If nothing matches exactly, the first input whose pipe path ends in `|` plus the converted name is used, so `#{input1}` finds `cond|input1` (but not `cond|xinput1`) and `#{cond.input1}` finds `outer|cond|input1`. A reference that matches nothing renders as empty text."

### 11. Editor `when`-input detection (lines 1051-1053)

- **Doc:** "the editor and the tool-upgrade refactor… use a plain substring test on the expression text (`when.includes(name)` / `"inputs.<name>" in when`)."
- **Dev:**
  - The editor tokenizes the expression: `expressionReferencesInput` / `analyzeInputReferences` (`client/src/components/Workflow/Editor/modules/whenExpression.ts:185,262`), used at `client/src/stores/workflowStepStore.ts:492,504`. Since #24107 it also adds ports for unconnected gate names and lints them.
  - Only the refactor still does the substring test (`lib/galaxy/workflow/refactor/execute.py:625`).
- **Changed by:** c7a1722bc96 (2026-08-21, pre-base). #24107 (c13dd4dced9, 0182bda10c5) came after the base.
- **Proposed:** "The editor parses the `when` expression to find which `inputs.<name>` paths it reads (and lints names nothing is connected to). The tool-upgrade refactor still decides with a substring test (`"inputs.<name>" in when`)."

## Open-work links

- **#23884 / PR #24524** (open, branch `upgrade_advice_structured_like`): lines 270-272.
  - Note: "[#23884] / [#24524] move this advice to profile 26.0, where bare names stop resolving when mapped over."
  - The PR also adds 26.1/26.2 profile advice. The doc names no other upgrade advice, so nothing else changes.
- **#23891** (branch `issue_23891_output_reference_resolver`; newest commit f7b5ad8f098 gates errors at **27.0**, `lib/galaxy/tool_util/parser/output_references.py:61` on that branch): lines 86-89, 120, 142, 146, 225-227, 229-238, 601-602.
  - Note at 225-227: "[#23891] proposes resolving `format_source`/`metadata_source` against declared inputs at tool load, so internal keys (`input2`, `coll2`, conversion names) and a numbered key shadowing a legacy alias no longer resolve; load errors gated at profile 27.0."
  - Note at 146/237: "[#23891] also lints `metadata_source`."
  - The branch also moves `type_source` onto the shared resolver (46962a8e7b1), which would supersede finding 1's load check wording.
- **#23902** (branch `issue_23902_qualified_output_references`): lines 60-61, 86-87, 120, 214-234, 588.
  - Note at 214: "[#23902] proposes that from a new profile an unqualified `format_source`/`metadata_source` that matches only through the legacy alias fails tool load, and runtime stops using the alias."
  - Note at 588: "(…until [#23902])".
  - **Conflict:** that branch uses one gate, `profile_allows_legacy_output_references` (`< 26.2`, `output_references.py:72-76` on the branch). The gate covers both alias rejection and failing load on an unresolvable reference. It sits on an older #23891 commit (c92d54b6b81). #23891's current head moved the unresolvable-reference load error to 27.0 (`OUTPUT_REFERENCE_STRICT_PROFILE`, f7b5ad8f098). Rebased as is, #23902 would bring that error back to 26.2. Pick one profile before writing either inline note.
- **#23888** (branch `yaml_tool_model_validation_26.1`): #24365 closed the boolean, optional-text, repeat and section rows. What remains: disk `GalaxyTool` files unvalidated, scalar outputs, and unknown output keys silently dropped. Lines affected:
  - 66-67 (validation axis);
  - 407-411 (disk `class: GalaxyTool` would be validated against the model, and `simple_constructs.yml`'s `when:` mapping converted by 0cb046f8a66);
  - 417-418 ("on `GalaxyTool` outputs they are accepted and then dropped" becomes rejected, 57b4efe8a93);
  - 642-643 (`default_identifier_source`: "`GalaxyTool` drops it" becomes rejected);
  - 1130 gap row.
  - Note: "[#23888] proposes validating class-declaring disk YAML against the authoring model and rejecting unknown output keys."
- **#23895:** lines 922, 979-980, 996-1000, 1134.
  - Note at 979-980: "[#23895] Under `fill_defaults` import, a connection into a nested repeat fails with a 500 (`KeyError`). A connection into a repeat under a section or conditional imports, but the job then runs without that input."
- **#23981:** lines 941, 1102-1106.
  - Note: "[#23981] `#{name }` with padding and no `| op` renders empty."
  - Its fix must flip the pinned case `("#{ a }", {"a": "x"}, "")` in `test/unit/job_execution/test_post_job_actions.py:46`.
- **#23444:** lines 3-5 (intro) and 41-44 (At a Glance).
  - Note: "[#23444] tracks settling one canonical nested reference syntax; this reference is groundwork for it."
  - No factual claim changes.

## Verification gaps table

| Doc row | Status on dev 269efa7af5b |
| --- | --- |
| Repeat-indexed `default_identifier_source` | **Open.** There is no new test, and `default_identifier_source` appears only in `identifier_source.xml` / `test_tools.py:3343` (top-level inputs). The lookup is still an exact `collections.get` (`lib/galaxy/tools/execute.py:628-646`). |
| Modelled YAML groupings | **Closed** by #24365: `test_repeat_contract`, `test_section_contract` (`lib/galaxy_test/api/test_user_tool_contract.py:57,80`) on disk/API-YAML/API-JSON. Remove the compatibility warning (finding 5). The classless dialect still has no section type. |
| Legacy YAML runtime state | **Closed for class-declaring tools.** The same contract tests run legacy/21.01/request and assert identical `$(inputs)` JSON for repeat/section/conditional, with group keys stripped by c16d347ec08. **Open for classless tools**, which have no fixture. |
| Cheetah command with JavaScript configfiles | **Open.** The configfile contract (`test_user_tool_contract.py:132-155`) uses `shell_command` only. `parse_command` still returns `command:` for any YAML (`yaml.py:159-160`). |
| Job resources through `/api/jobs` | **Open.** `GalaxyInteractorApi.run_tool` still appends flat `__job_resource|…` keys after building the request (`lib/galaxy/tool_util/verify/interactor.py:992-995`). The new `test/integration/test_workflow_import_job_resources.py` covers workflow import, not request submission. |
| Workflow repeat augmentation | **Open, now characterized** by #23895 (500 for nested repeat; silent drop under section/conditional). There is no test in code, and the `# TODO: untest branch` remains (`lib/galaxy/workflow/modules.py:3101`). |
| *(new)* YAML test section inputs | **Open.** The section values are dropped (finding 9). Needs a parser regression test asserting `adv|size` reaches the flat inputs and request. |

## Checked, still true

- `LegacyUnprefixedDict`: real key beats alias; alias = `prefix + name` (innermost section/conditional dropped), set at job creation — `lib/galaxy/tools/parameters/wrapped.py:44-70`, `lib/galaxy/tools/actions/__init__.py:294-295`.
- `multiple="true"` creates numbered keys `name1, name2…` — `lib/galaxy/tools/actions/__init__.py:280-287`.
- `metadata_source` at job creation uses `inp_data.get` (alias-aware) — `lib/galaxy/tools/actions/__init__.py:673-679`.
- Late `format_source` for `expression.json` uses a plain dict of job associations — `lib/galaxy/tools/evaluation.py:378-393`.
- `structured_like` unmapped via `collection_prototype` on the alias dict — `lib/galaxy/tool_util/parser/output_objects.py:468-471`, `lib/galaxy/tools/actions/__init__.py:595,718`.
- `structured_like` mapped: pipe walk, bare-name recursion only < 26.0, no repeats — `lib/galaxy/tools/execute.py:584-603`.
- `default_identifier_source` exact key, no alias — `lib/galaxy/tools/execute.py:628-646`.
- `18_01_consider_structured_like` still says 18.01; advisor tops out at 24.2 — `lib/galaxy/tool_util/upgrade/upgrade_codes.json:28-31`, `lib/galaxy/tool_util/upgrade/__init__.py:155-156,277`.
- Tool test gates: legacy bare names ≤ 24.1, validation ≥ 24.2, so 24.1.x gets neither — `lib/galaxy/tool_util/verify/parse.py:68,278`; "Invalid parameter name found" — `lib/galaxy/tool_util/parameters/case.py:82`.
- YAML default profile 24.2 — `lib/galaxy/tool_util/parser/yaml.py:401-405`; `collection_type_source` or `type_source` both accepted — `:294`.
- YAML output linters are XML-only (`xml_tree` guard) — `lib/galaxy/tool_util/linters/output.py:268-270,282-284`.
- Disk `.yml` loaded raw, no model validation — `lib/galaxy/tool_util/parser/factory.py:95-99`.
- Class-declaring conditionals still accept a `when:` mapping as well as `whens:` (inherited) — `lib/galaxy/tool_util/parser/yaml.py:619-636`.
- UDT evaluator: `runtimeify` with validated state, else `to_cwl` — `lib/galaxy/tools/evaluation.py:1155-1199`.
- Legacy API `input_format` must be `legacy`/`21.01`, else 400 — `lib/galaxy/webapps/galaxy/services/tools.py:399-401`.
- Tool form: `enable_tool_requests` default true; posts `strict: true` via `buildNestedState` — `lib/galaxy/config/schemas/config_schema.yml:4354-4356`, `client/src/components/Tool/ToolForm.vue:425`, `client/src/components/Tool/submit/submitAsync.ts:9`.
- Request API rejects `"5"` for `gx_int` — `lib/galaxy_test/api/test_tool_execution.py:26-31`.
- `when`: `${inputs.when}` rewritten — `lib/galaxy/workflow/modules.py:484-486`; nested `|` connections skipped from `extra_step_state` — `:3283-3286`. The "26.2" at doc 936/1048 is Galaxy **release** 26.2 (73caef00c18 is on `release_26.2`, not 26.1), not a tool profile; consider saying "since Galaxy 26.2".
- Refactor `when` detection is still a substring test — `lib/galaxy/workflow/refactor/execute.py:625`.
- `augment_tool_state_for_input_connections` looks up repeats in root `tool.inputs` only — `lib/galaxy/workflow/modules.py:3080-3106`.
- gxformat2 bumped 0.27.0 → 0.29.1. In 0.29.1, `in:` keys are still copied verbatim (no `/` translation; `normalized/_conversion.py` `_build_input_connections`), and `$link` paths still use `|` for dicts and `_i` for list items (`model.py` `setup_connected_values`). The diff between the two versions is typing-only for those functions.
- Rename regex `#\{([^}]*)\}`; `replacement_params` applied only after `#{}` in `newname` — `lib/galaxy/job_execution/actions/post.py:22,276-278`.
- Cited tests/paths exist: `test_default_identifier_source_map_over` (`lib/galaxy_test/api/test_tools.py:3343`), `test_repeat_of_data`/`test_section_recurses` (`test/unit/tool_util/test_yaml_parameters.py:261,278`), `test_multi_run_in_repeat` (`lib/galaxy_test/api/test_tool_execute.py:311`), `test_multidata_param` (`:29`), `test_multi_run_in_repeat_mismatch` (`:349`), `test_multirun_on_multiple_inputs_unlinked` (`:480`), `test_multirun_non_data_parameter` (`lib/galaxy_test/api/test_tools.py:2751`), `test_hdca_rejected_for_single_data_param_in_conditional` (`:3089`), `test_create_job_with_conditional_name_digit_suffix` (`lib/galaxy_test/api/test_jobs.py:738`), `test_legacy_features_fail_validation_with_24_2` / `test_nested_conditional_duplicate_short_names_are_distinct_when_qualified` (`test/unit/tool_util/test_parameter_test_cases.py:170,467`), `test_nested_key_to_path` (`test/unit/app/tools/test_parameter_parsing.py:16`), `test_inputs_to_steps` (`lib/galaxy_test/api/test_workflows_from_yaml.py:71`), `identifier_source.xml`, `configfile_user_defined.yml`, `simple_constructs.yml`, `GalaxyInteractorApi.run_tool` (`interactor.py:917`), `tool_input_format` (`conftest.py:149-151`).
- `user_defined_tools_authoring.md` is absent from the tree but generated by `doc/Makefile:19,52`, so the link at doc line 420 is fine.
- Galaxy imports Format2 through `gxformat2.python_to_workflow` — `lib/galaxy/managers/workflows.py:20,857,888`; still exported in gxformat2 0.29.1 (`converter.py:54`).

Not re-inspected, only checked for relevant commits since the base (none found): Cheetah/`TreeDict` fallback, `change_format`, output `<filter>` and `<actions>`, dependent parameters, legacy API grouping/bookkeeping rules, Tool Form build/rerun, invocation and subworkflow `parameters`, refactor API. The Parameter Names in Responses table (doc 903-908) was not re-run. Pydantic moved to 2.14 since the base (73df91728f6, 5daad696899), which could change request-API error `loc` strings.
