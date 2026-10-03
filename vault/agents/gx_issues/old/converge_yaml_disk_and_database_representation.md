# Converge disk and database-backed Galaxy YAML tools on one validated representation

Agent-to-agent umbrella issue draft, prepared by Codex on 2026-10-02 at the user's request. Queue only; not posted to GitHub.

## Direction from the user
After requesting focused drafts for the YAML grouping loader bug and unknown dataset-output fields, the user asked whether those point to a bigger disk/database representation gap and wants a bigger convergence effort. They state the only on-disk YAML tools are in the repository and are willing to move them toward the database representation.

Prefer converting experimental in-repository fixtures and retiring their alternate syntax over carrying two permanent YAML dialects. Repository inspection below supports a small functional-fixture migration. It does not independently establish the absence of third-party experimental tools or historical stored job snapshots.

## Problem: storage path changes the accepted language and sometimes the meaning
Both routes use galaxy.tool_util.parser.yaml.YamlToolSource, but do not supply the same validated representation:
- get_tool_source loads .yml via ordered_load and directly constructs the parser.
- build_yaml_tool_source does safe_load and directly constructs the parser for stored raw source.
- API representation payloads validate against galaxy.tool_util_models.UserToolSource or YamlToolSource, then dump a dict.
- Admin DynamicToolManager.create_tool(src="from_path") uses artifact_class to read a raw mapping, stores it, and loads it without the representation payload's model validation.
- ToolBox.dynamic_tool_to_tool reads DynamicTool.value and directly constructs the parser.
- tool_payload_to_tool, the user runtime-model endpoint, and YAML linting have additional parser construction sites.
- lift_user_tool_source handles schema drift in selected response paths, but is not a general canonical execution-loading boundary.

As a result, one parser supports historical disk shapes while authoring models advertise shapes that it cannot consume. API model_dump options differ too (admin exclude_unset=True, user full dump, lint exclude_none=True). "Just validate the file" will not fix incorrect parser interpretation or dump-dependent semantics.

## Reproduced evidence
Reviewed and exercised model/parser/helpers at #23877 head b4740908f881f524610313d925d644727a092be2. These are local parser/model checks, not end-to-end Galaxy server tests.

### 1. Functional disk fixture inventory
All 24 .yml tool files under test/functional/tools (including parameters/) were loaded and passed through the matching database authoring model:
- 15 class: GalaxyTool, 9 class: GalaxyUserTool.
- 22 validate successfully, 2 fail.
- simple_constructs.yml: numeric version; checked; select display; repeat blocks; conditional when instead of whens; dataset output missing explicit type.
- collection_creates_pair_y.yml: numeric version and static collection elements unsupported by the incoming model.

The second fixture's elements form is not evidence that the current parser really implements static collection elements. Inspect and execute it. Prefer canonical discovery if that expresses the same paired output faithfully; do not preserve an unimplemented feature just because a fixture writes it.

Also audit .json path imports: lib/galaxy_test/base/data/minimal_tool_no_id.json contains a GalaxyTool Cheetah command and no shell_command. test_dynamic_tool_from_path imports it. It is outside the 24 .yml count and must be converted or intentionally handled.

### 2. Models promise groupings that production cannot load
YamlGalaxyToolParameter accepts repeat/section with parameters: children.
input_models_for_tool_source(Parser({"inputs": [model.model_dump(exclude_none=True)]})) raises:
- repeat: KeyError 'blocks'
- section: UnknownParameterTypeError, unknown type section.

### 3. Boolean defaults disagree
For {"name": "flag", "type": "boolean", "value": True}:
- authoring model root.to_internal().value == True
- production input_models_for_tool_source over its dumped mapping yields value == False.
The shared input-source factory reads checked, while the YAML model advertises value.
This establishes that model conversion tests can pass while production semantics differ.

### 4. Model serialization changes optionality
For each of configfile_user_defined.yml and parameters/gx_select_multiple_one_default_user.yml, comparing input_models_for_tool_source on raw YAML vs UserToolSource.model_validate(raw).model_dump(by_alias=True) changes parameters[0].optional from True to False.
For the 22 valid fixtures, exclude_unset=True avoided these observed input-model mismatches. This is diagnostic evidence, not a proposed blanket fix: select one explicit canonical default policy and verify execution, including omitted vs null values.

### 5. Model-accepted output type cannot be parsed
An admin GalaxyTool with outputs: [{name: out, type: text}] validates through the incoming model, but parser.parse_outputs(None) raises "Unknown output_type [text] encountered."
Assess scalar-output authoring support explicitly. Either make it executable with meaningful output semantics or stop advertising it. This umbrella need not expand into a new scalar-output feature if narrowing the model is correct.

### 6. Unknown admin dataset-output fields disappear
IncomingToolOutputDataset accepts format_souce and drops it in model_dump; IncomingUserToolOutputDataset rejects it. Incoming collection outputs are already extra="forbid".
See the focused child draft.

## Proposed contract
A Galaxy YAML tool has one canonical validated source representation per declared class. Storage location does not define another dialect.

    raw file / API mapping / path import
        -> class-aware validation and normalization
        -> canonical source definition
        -> tool loading, parameter models, linting, runtime hints
        -> stored canonical representation and equivalent reload

Use current database authoring models as the starting point, but repair their loader/default mismatches before routing every input through them. Keep normalizers in one place. Consider a typed model-backed ToolSource/InputSource adapter so the same canonical model drives loading and parameter conversion; avoid a second dictionary interpretation that contradicts to_internal().
Do not globally validate every YamlInputSource as a complete tool: workflow parameter inputs also use it.

Intended invariants:
- Every construct exposed by the current YAML authoring schema can be loaded and executed, or is removed from that schema with a clear unsupported-feature error.
- Equivalent definition loaded from disk, created as a database tool, and reloaded after persistence has equal parameter/default and output semantics.
- model_dump/revalidation is stable; omission vs null vs explicit default has one documented interpretation.
- New authoring rejects unsupported and misspelled fields instead of dropping them.
- Canonical YAML uses parameters:, whens:, boolean value:, string version, explicit output type, and the chosen collection output representation.
- XML-specific historical syntax does not become a second public YAML spelling.

## Retain intentional class differences
GalaxyTool is trusted/admin-managed and may use capabilities that GalaxyUserTool deliberately disallows. Keep class-specific validation, access checks, container requirements, tool-provided metadata restrictions, and user-tool template/path constraints.
Align storage shapes and semantics within each class; do not make disk and database convergence widen user-tool privileges.

Commands should converge on shell_command plus JavaScript configfiles. The current models require shell_command; base_command/arguments and Cheetah command are disk-only parser surfaces. With the user's fixture migration preference, remove those experimental whole-tool dialects if no remaining supported caller needs them. Inventory raw .json imports and historical rows first. Add modeled trusted-only fields only for a demonstrated capability we choose to keep, not wholesale XML parity.

## Concrete implementation slices
1. Establish the cross-boundary regression matrix before changing loaders. Cover groupings, defaults, Boolean value, omitted/null fields, output types and unknown output keys.
2. Repair model -> loader semantics (sections/repeats, Boolean defaults, optionality). This includes the focused grouping child; retain that child as an independently implementable task.
3. Convert the two legacy .yml fixtures plus raw path-import fixtures; test their outputs rather than preserving legacy spellings by default.
4. Introduce one class-aware validated source construction path. Route disk, raw-source factory, admin from_path creation, inline/payload loading and new database writes through it. Evaluate stored-row loading separately under an explicit historical-read policy.
5. Make current authoring strict throughout; incorporate the dataset-output child. Remove unsupported scalar-output claims or implement the already-promised contract.
6. Prove disk/database execution and persisted reload parity; refresh authoring docs, generated schema and PR #23877 so "file flavor" ceases to be a separate language.

These can be reviewable commits/PRs under one umbrella. Do not spawn overlapping implementations for the child drafts and this umbrella.

## Historical database rows and job snapshots
The user's migration tolerance concerns in-repository disk definitions. It does not by itself authorize losing stored user tools, rerun reproducibility, or historical raw-source snapshots.
Inventory persisted representations and current schema-drift handling. If legacy forms actually need support, isolate a historical-read adapter with visible diagnostics and canonical output. Do not accept those forms for new disk/API authoring indefinitely.
Avoid silently deleting unknown keys that might be meaningful. Existing lift_user_tool_source behavior needs an explicit assessment before reuse in execution.
Separate authoring representation normalization from tool-profile gates for actual runtime behavior. A new profile alone will not close this storage-boundary gap.

## Acceptance tests
- All intentional executable in-tree YAML tools validate against their matching canonical model; negative authoring fixtures are tested as rejected fixtures separately.
- Parameter conversion through production loading agrees with authoring-model conversion on structure, defaults and requiredness.
- Execute one declared definition through disk, admin representation creation, admin from_path import, database reload, and applicable user creation/reload. Compare files, collection structures, formats/metadata and input defaults; identity differences such as UUID are expected.
- Nested grouping execution, conditional branch selection, Boolean true/false defaults, omitted/null text/select values.
- Invalid definitions fail before database row creation or toolbox registration, with source path and field location where available.
- Strict output field validation, canonical discovery semantics, and explicit scalar-output support decision.
- Stored raw source round-trip and rerun/async-request loading remain correct.
- Existing class trust restrictions and XML/CWL loading are unchanged by this YAML-specific refactor.
- Runtime hints/schema describe values the production loader actually supplies.

## Related focused drafts
- yaml_grouping_model_loader_mismatch.md
- reject_unknown_yaml_dataset_output_fields.md
The type_source and workflow/rename drafts are independent runtime repairs; do not pull all of them into the source-representation refactor.
#23444 remains the output-reference grammar/resolver issue; this umbrella creates the consistent loading boundary that its validation needs.
#23380 concerns collection output field parity; check current implementation rather than implementing stale issue text.

## Source pointers
https://github.com/galaxyproject/galaxy/pull/23877
https://github.com/galaxyproject/galaxy/issues/23444
https://github.com/galaxyproject/galaxy/issues/23380
- lib/galaxy/tool_util/parser/factory.py: get_tool_source, build_yaml_tool_source.
- lib/galaxy/tool_util/parser/yaml.py: YamlToolSource, YamlInputSource.
- lib/galaxy/tool_util_models/_models.py and yaml_parameters.py.
- lib/galaxy/tool_util_models/tool_outputs.py and dynamic_tool_models.py.
- lib/galaxy/managers/tools.py: create_tool, create_unprivileged_tool, tool_payload_to_tool.
- lib/galaxy/managers/executables.py: artifact_class.
- lib/galaxy/tools/__init__.py: dynamic_tool_to_tool.
- lib/galaxy/webapps/galaxy/api/dynamic_tools.py: response lifting and runtime_model.
- lib/galaxy/tool_util/parameters/factory.py: XML-oriented checked/default interpretation.
- lib/galaxy/tool_util/lint.py: lint_user_tool_source.
- test/unit/tool_util/test_yaml_parameters.py, lib/galaxy_test/api/test_tools.py, functional YAML fixtures.
