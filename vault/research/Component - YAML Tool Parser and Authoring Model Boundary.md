---
type: research
subtype: component
tags:
  - research/component
  - galaxy/tools
  - galaxy/tools/yaml
  - galaxy/api
  - galaxy/testing
component: "YAML Tool Parser and Authoring Model Boundary"
galaxy_areas: [tools, api, testing]
status: draft
created: 2026-10-30
revised: 2026-10-30
revision: 1
ai_generated: true
summary: "Every site that builds the YAML tool parser from a dict, which Pydantic model and model_dump policy gates each, the user-tool trust gate, and YAML dialects"
sources:
  - "vault/agents/gx_research/archive/yaml_tool_parser_authoring_boundary.md"
related_notes:
  - "[[Component - User-Defined Tool Source Validation]]"
  - "[[Component - User-Defined Tools]]"
  - "[[Component - YAML Tool Runtime]]"
  - "[[Component - Dynamic Tool Manager and Toolbox Lifecycle]]"
  - "[[Component - Tool Linters]]"
  - "[[Component - Tool Citations and External Metadata Fetch]]"
  - "[[Component - Workflow Import]]"
---

# YAML Tool Parser and Authoring Model Boundary

Galaxy has two `YamlToolSource` classes with the same name:

- **The parser.** `galaxy.tool_util.parser.yaml.YamlToolSource` (`lib/galaxy/tool_util/parser/yaml.py:79`) wraps a plain dict and implements the `ToolSource` interface. Every YAML tool Galaxy loads, from disk or from the database, is read through it.
- **The authoring model.** `galaxy.tool_util_models.YamlToolSource` (`lib/galaxy/tool_util_models/_models.py:566`) is the Pydantic model for admin `class: GalaxyTool` tools. Its sibling `UserToolSource` (`:503`) covers `class: GalaxyUserTool`.

The parser never validates against either model. Validation happens before the parser is built, and only on some paths. This note maps every place a dict becomes a parser, which model and `model_dump` policy (if any) sits in front of it, and what the parser itself enforces for user-defined tools.

Verified against Galaxy `origin/dev` @ `65e6daff2334c8cfd4971682eecfb87f38a224be`. All `file:line` references are at that SHA. On `release_26.1` the boundary is the same, except that the models live in `lib/galaxy/tool_util_models/__init__.py` rather than `_models.py`. These are dev-only: `runtime_environment_variables`, `parse_creator`/`parse_funding`, the user-tool requirement checks in `parse_requirements`, and `materialize_tool`.

What the authoring models accept field by field (narrow `yaml_parameters.py`, the #22615 semantic validators, the JSON Schema, the MCP surface) is in [[Component - User-Defined Tool Source Validation]]. Out of scope here: parameter-model internals and runtime state (`Tool.yaml_origin` defaults, `strictify`, job state), which are in [[Component - YAML Tool Runtime]] and [[Component - User-Defined Tools]].

## Construction sites

Every non-test `YamlToolSource(` parser construction at this SHA:

| # | Site | Dict comes from | Model gate before the parser | Dump fed to the parser |
|---|---|---|---|---|
| 1 | `get_tool_source(config_file=...)`, `parser/factory.py:62-99` (`.yml` branch at `:96-99`) | `ordered_load` of a file on disk | none | raw file |
| 2 | `build_yaml_tool_source`, `parser/factory.py:51-52`, used through `TOOL_SOURCE_FACTORIES` when `tool_source_class` and `raw_tool_source` are both given (`:82-84`) | `safe_load` of an earlier parser's `to_string()` | none here; whatever gated the original parser | `json.dumps(root_dict)` (`yaml.py:419-421`) |
| 3 | `tool_payload_to_tool`, `managers/tools.py:66-69` | `POST /api/unprivileged_tools/build` (`api/dynamic_tools.py:178-198`) | `UserToolSource` (payload) | `model_dump(by_alias=True)` |
| 4 | `runtime_model`, `api/dynamic_tools.py:200-214` (handler at `:208`) | `POST /api/unprivileged_tools/runtime_model` | `UserToolSource` (payload) | `model_dump(by_alias=True)` |
| 5 | `dynamic_tool_to_tool`, `tools/__init__.py:855-890` (parser at `:871`) | a stored `DynamicTool.value` row | `GalaxyUserTool`: `lift_user_tool_source`. `GalaxyTool`: none | user rows: `lifted.model_dump(by_alias=True)` (`:607`). Admin rows: the stored dict as is |
| 6 | `lint_user_tool_source`, `tool_util/lint.py:338-356` (parser at `:350`) | a validated `UserToolSource` | `UserToolSource` | `model_dump(by_alias=True, exclude_none=True)` |

The request named `from_path` as living in `api/dynamic_tools.py`. It doesn't. The `YamlToolSource(root_dict=...)` call there is the `runtime_model` endpoint (row 4). `from_path` is handled in `DynamicToolManager.create_tool` (`managers/tools.py:149-152`). It calls `artifact_class` (`managers/executables.py:14-46`), which `yaml.safe_load`s the file, and stores that raw dict as the row's `value`. The parser for a `from_path` tool is therefore built at row 5, from an unvalidated admin row.

### Who reaches each site

- **Row 1, disk.** Toolbox loading goes through `ToolBox.get_expanded_tool_source` (`tools/__init__.py:767-786`). A `.yml` file is only routed to the YAML parser when `enable_beta_formats` is true. The toolbox passes `enable_beta_tool_formats`; with it off, the file goes down the XML branch (`factory.py:91-93`). Other callers are the tool shed validator (`tool_shed/tools/tool_validator.py:82`), the source-store populator (`tools/source_store/populator.py:856`), `galaxy-tool-util` scripts and the test utilities (`tool_util/unittest_utils/`). Planemo and `galaxy-tool-util lint` also load disk files this way. No linter validates a disk YAML tool against the authoring models: no module under `tool_util/linters/` references `DynamicToolSources`, `UserToolSource` or the `YamlToolSource` model.
- **Row 2, raw source.** `Tool.to_raw_tool_source()` (`tool_util/abstract_tool.py:139-147`) serializes the live parser so that work can be redone elsewhere. Consumers: `create_tool_from_representation` (`tools/__init__.py:531-539`), Celery job tasks (`celery/tasks.py`, fed from `tools/execute.py:403-422`), Pulsar remote evaluation (`tools/remote_tool_eval.py:113-115`), tool-request queueing and encoding (`webapps/galaxy/services/jobs.py:288`, `services/base.py:200-204`), and the tool source store (`tools/__init__.py:832`, `tools/cached_toolbox.py:1543`). The string always comes from a parser Galaxy already built, so for a user tool it is the lifted dump from row 5, and the class key survives the round trip.
- **Row 5, stored rows.** Rows are written by `create_tool` (admin, `public=True`) and `create_unprivileged_tool` (user, `public=False`). See the next section. They are read through `create_dynamic_tool` → `load_dynamic_tool` (admin, cached), `get_unprivileged_tool` (user, per request) and `tool_for_job`. The lifecycle is in [[Component - Dynamic Tool Manager and Toolbox Lifecycle]]. `dynamic_tool_to_tool` also writes `name = "dynamic tool <uuid>"` into the row's dict when it has no `name` (`:865-866`).

### Test-only constructions

These construct the parser directly: `test_parsing.py:1007, 1043, 1075`, `test_user_tool_parser_trust.py`, `test_container_shape_lint.py`, `test_tool_linters.py:3834`, `test/unit/app/tools/test_tool_render_output_label.py`, `test_runtime_environment.py` and `test_metadata.py:325`. The last one dumps a `UserToolSource` first. `test_user_tool_source_validation.py:155` constructs the Pydantic `YamlToolSource` model, not the parser.

## Where documents are written, and with which dump

The `model_dump` policy decides which keys the parser sees, and the parser's defaults fill in the rest. The policies differ by path:

| Path | Model | Stored or passed dict |
|---|---|---|
| `POST /api/dynamic_tools`, `src: representation` (admin), plus admin workflow-embedded tools (`workflow/modules.py:2723-2728`) | `DynamicToolSources`. `GalaxyUserTool` is refused at `managers/tools.py:162-166`, so the model is effectively the `YamlToolSource` model | `model_dump(by_alias=True, exclude_unset=True)` (`:154`): only the keys the author set |
| `POST /api/dynamic_tools`, `src: from_path` (admin) | none | raw `yaml.safe_load` |
| `POST /api/unprivileged_tools`, MCP/agent `create_user_tool` (`agents/operations.py:1040-1041`), user workflow-embedded tools (`workflow/modules.py:2714-2722`) | `UserToolSource`, plus `lint_user_tool_source` and `_validate_tool_templates` | `model_dump(by_alias=True)` (`managers/tools.py:216`): every default materialized, in `_canonical_order` |
| Stored user row on load | `lift_user_tool_source` | `model_dump(by_alias=True)` |
| Lint of a user tool | `UserToolSource` | `model_dump(by_alias=True, exclude_none=True)` |
| `GET /api/tools/{id}/raw_tool_source` for a user tool (`api/tools.py:1007-1030`) | `lift_user_tool_source` | `model_dump_json(by_alias=True, exclude_defaults=True, exclude_unset=True)`. Display only, never parsed |

Consequences:

- **Admin and user rows hold different shapes for the same tool.** An admin `GalaxyTool` row keeps only what was written, so canonical parser defaults apply to omitted keys. A user row stores every key, so what is stored is what is parsed.
- **The lint view drops nulls; the stored view keeps them.** For a canonical Boolean, `CanonicalYamlInputSource.parse_boolean_default` (`yaml.py:675-677`) returns `None` only for an explicit `value: null`. The stored dump keeps that null, while the lint dump omits the key, so the lint parser reads `False`. No linter currently depends on Boolean defaults.
- **`normalize_items`** (`_models.py:265-270`) turns dict-of-dicts `inputs`/`outputs` into lists before validation. Rows written through a model always hold lists. Disk files and `from_path` rows are not normalized.

## What validates where

### Authoring models (`lib/galaxy/tool_util_models/`)

- `_DynamicToolSourceBase` (`_models.py:159-323`) has `extra="forbid"`, the `id`/`name`/`version` constraints, `_check_input_refs` and `_check_output_claims`. Its `outputs` field is `DynamicToolOutputs` (`:97-106`), a list of the full `IncomingToolOutput` union.
- `UserToolSourceAuthoringView` (`:382-500`) and `UserToolSource` (`:503-563`) require `container` and `version`, refuse container requirements, narrow `outputs` to `UserToolOutputs` (`:87-95`, dataset and collection only) and `help` to Markdown, and pin dump order.
- The `YamlToolSource` model (`:566-576`) adds `runtime_environment_variables` and an optional `container`.
- `DynamicToolSources` (`:579`) discriminates on `class`.

The full validator inventory is in [[Component - User-Defined Tool Source Validation]] §2.

### `lift_user_tool_source` for stored user rows (`_models.py:709-747`)

Stored rows are not migrated when the schema tightens, so a user row is revalidated each time it is read:

1. Validate against `UserToolSource`. On success, return `("ok", model, [])`.
2. Otherwise, on a deep copy, drop input validators the parameter type no longer accepts (`_drop_unsupported_validators` and `_drop_parameter_validators`, `:663-695`; for example, `expression` on text) and relabel `restructuredtext`/`plain_text` help as Markdown (`_help_as_markdown`, `:698-706`). If that validates, return `"lifted"`.
3. If every remaining error is `extra_forbidden`, strip those paths and revalidate. On success, return `"lifted"` with the dropped paths.
4. Otherwise, return `("invalid", original_dict, summary)`.

Three consumers:

| Consumer | On `lifted` | On `invalid` |
|---|---|---|
| `_lift_stored_user_tool` (`tools/__init__.py:588-607`), called from `dynamic_tool_to_tool` | logs a warning and parses the lifted dump; `UserDefinedTool.dropped_representation_fields` records the drops (`:876-877`) | raises `ToolMissingException` naming the errors, and the tool does not load |
| `UnprivilegedToolResponse` (`api/dynamic_tools.py:70-102`) | returns the model; `X-Galaxy-Deprecated-Fields` / `Warning` headers | returns the raw dict; `X-Galaxy-Schema-Errors` header |
| `raw_tool_source` (`api/tools.py:1007-1030`) | the same headers | returns the stored JSON as is |

Stored admin `GalaxyTool` rows have no equivalent step. They go straight into the parser, so the parser's leniency is their only contract.

### The parser trust gate (`lib/galaxy/tool_util/parser/yaml.py`)

For user-defined tools, the parser enforces restrictions of its own, independently of the models. `_trusted` is `parse_class() != "GalaxyUserTool"` (`:89-91`). Gates for an untrusted source:

| Gate | Where | Raises |
|---|---|---|
| Root keys must be in `USER_TOOL_ROOT_KEYS`, derived from `UserToolSource.model_fields` aliases (`:70`) | `__init__` (`:82-87`), so at construction | `UntrustedToolSourceError` (`ValueError` subclass, `:75-76`) |
| Input dicts may not carry `TRUSTED_ONLY_INPUT_KEYS` (`dynamic_options`, `:72`) | `YamlInputSource.__init__` (`:569-575`), lazily as input sources are walked, nested ones included | `UntrustedToolSourceError` |
| Validators may not be unsafe types | `parse_validators` → `parse_dict_validators(..., trusted=False)` (`parser/parameter_validators.py:45-52`) | `UnsafeValidatorConfiguredInUntrustedContext` |
| Requirements must be a list of mappings without `type: container` | `parse_requirements` (`:196-206`, dev only) | `ParseException` |
| No tool-provided metadata | `allows_tool_provided_metadata` (`:100-101`) is true only for `class` None or `GalaxyTool` | (policy) |
| No custom tool module | `parse_tool_module` always returns `None` (`:109-113`) | (policy) |

`create_tool_from_source` then instantiates `UserDefinedTool` for `GalaxyUserTool` (`tools/__init__.py:509-510`). Because the root-key list is derived from the model, adding a field to `UserToolSource` admits it at the parser too. Parser-only root keys, which only admin and disk YAML can use, are `command`, `base_command`, `arguments`, `runtime_version`, `interpreter`, `expression`, `tool_type`, `entry_points`, `containers`, `credentials`, `icon`, `creator`, `funding`, `sanitize`, `display_interface`, `require_login`, `python_template_version` and (outside `UserToolSource`) `runtime_environment_variables`. Tests: `test/unit/tool_util/test_user_tool_parser_trust.py` and `test/unit/app/tools/test_runtime_environment.py`.

The admin `YamlToolSource` model forbids most of these keys too (`extra="forbid"`). An admin can only use `command`, `credentials` and the rest through disk files or `from_path`.

## Canonical vs legacy YAML dialect

`is_yaml_origin()` (`yaml.py:103-104`) is true when `class` is `GalaxyTool` or `GalaxyUserTool`. `parse_input_pages` (`:225-229`) then wraps inputs in `CanonicalYamlPageSource`; otherwise it uses `YamlPageSource`. `Tool.yaml_origin` (`tools/__init__.py:1336-1339`) exposes the same flag to the runtime default-filling code.

| | Legacy (`YamlInputSource`, class-less dict) | Canonical (`CanonicalYamlInputSource`, `:657-693`) |
|---|---|---|
| Omitted `optional` | `default_optional` (text inference via `text_input_is_optional`) | `False` |
| Boolean default | `checked` (`InputSource.parse_boolean_default`, `interface.py:563-570`) | `value`; omitted means `False`, explicit `null` means `None` |
| Repeat children | `blocks` (`yaml.py:610-612`) | `parameters` |
| `section` | not a grouping type | supported, with `parameters` |
| Conditional cases | `when:` mapping or `whens:` list (`:619-636`) | the same (inherited) |

Dialect is chosen by `class`, not by path. A disk file with `class: GalaxyTool` is canonical even though nothing validated it. A class-less dict gets the legacy reading. At this SHA the only production legacy consumer is the workflow parameter module, which builds an input dict with `checked` and calls `get_input_source(..., trusted=False)` (`workflow/modules.py:1842-1846`), plus class-less unit-test dicts such as `test_parsing.py:1007`. No `test/functional/tools` YAML tool lacks `class:`.

## Incoming vs internal output models (`tool_util_models/tool_outputs.py`)

| Model | Role | `extra` |
|---|---|---|
| `IncomingToolOutputDataset` (`:205-239`) | admin `GalaxyTool` model dataset output | default (ignore): unknown keys are dropped silently and are gone after `model_dump` |
| `IncomingToolOutputCollection` (`:327-354`) | admin collection output | `forbid` |
| `IncomingToolOutputText/Integer/Float/Boolean` (`:717-746`) | admin scalar outputs | default (ignore) |
| `IncomingUserToolOutputDataset` (`:372-…`) | user dataset output (adds label limits, safe `from_work_dir`) | `forbid` |
| `IncomingUserToolOutputCollection` (`:557-…`) | user collection output | `forbid` (inherited config) |
| `DatasetCollectionDescription` (`:62-65`) | `discover_datasets` entries | `forbid` |
| `ToolOutputDataset` / `ToolOutputCollection` / `ToolOutputText`… (`:202`, `:321-324`, `:695-712`) | internal: `name`/`hidden` required; the collection adds `collection_type_from_rules` | default |

The unions are `IncomingToolOutput` (`:749-757`, used by the admin model), `IncomingUserToolOutput` (`:758-759`, used by `UserToolSource`) and `ToolOutput` (`:760-763`, used by `ParsedTool` and the parser's `to_model()`).

Two boundary mismatches follow from this table:

- The admin model accepts scalar outputs, and `DynamicToolOutputs` documents them, but `parse_outputs` (`yaml.py:250-277`) only builds `data` and `collection` and raises `Unknown output_type [...]` for anything else.
- A typo in an admin dataset output key (for example `format_souce`) is dropped without an error, while the same typo is rejected on user outputs and on any collection output.

Both are tracked in `vault/repositories/galaxy/issues/wip/23888/` (the umbrella and `reject_unknown_yaml_dataset_output_fields.md`).

`lift_legacy_collection_structure` (`:242-261`) flattens the old `structure:` wrapper. It runs both as the collection models' before-validator and inside the parser's `_parse_output_collection` (`yaml.py:283-287`), because admin rows and disk files bypass the model. The parser also accepts the XML spelling `type_source` alongside `collection_type_source` (`:292-294`).

## In-tree YAML fixtures

Disk YAML tools in `test/functional/tools/` and `parameters/` all set `class:` (16 `GalaxyTool` files and 16 `GalaxyUserTool` files). `test/unit/tool_util/test_user_tool_source_fixtures.py` validates every one against `DynamicToolSources`, except `_LEGACY_FIXTURES` (`:22-29`):

| Fixture | Constructs the models reject | Consumers |
|---|---|---|
| `simple_constructs.yml` (`simple_constructs_y`) | numeric `version: 1.0`, select `display`, conditional `when:` mapping, dict-form output without `type` | `sample_tool_conf.xml:379` framework test; `test_parameter_test_cases.py:345`; `test_tool_serialization_roundtrip.py`; `test_upgrade_advice.py:19` (the non-XML refusal case); inline copies in `test_tool_linters.py:3358` and `test_tool_deserialization.py:73`; `test_tools.py:964` API test; `test/integration/test_pulsar_embedded.py:139` |
| `collection_creates_pair_y.yml` | numeric `version`, static collection `elements:` | `sample_tool_conf.xml:223` framework test; `test_parsing.py:980-985` |

The `_LEGACY_FIXTURES` comment still lists `checked` and `blocks`, but `simple_constructs.yml` now uses `value:` and repeat `parameters:` (canonical). `collection_creates_pair_y.yml` relies on `elements:`, which the YAML parser never reads (see `research_issues/collection-creates-pair-y-static-elements.md`).

Two other raw fixtures skip the models through the admin API:

- `lib/galaxy_test/base/data/minimal_tool_no_id.json` is a `GalaxyTool` with a Cheetah `command:`. It is loaded through `from_path` in `test_dynamic_tool_from_path` (`lib/galaxy_test/api/test_tools.py:2517-2531`).
- `MINIMAL_TOOL` / `MINIMAL_TOOL_NO_ID` (`test_tools.py:42-58`) use canonical `shell_command` with dict-form outputs and go through the representation path.

## In-flight changes (not on dev at this SHA)

The `yaml_tool_model_validation_26.1` branch (`vault/repositories/galaxy/branches/active/yaml_tool_model_validation_26.1/`) proposes validating against the authoring models inside the parser's `__init__`, converting the legacy fixtures, and making admin dataset outputs strict. With that change, stored `GalaxyTool` rows (row 5, no lift) would fail loudly instead of loading leniently. The umbrella is Galaxy issue #23888. The boolean-default/canonical-dialect slice (#24365) is already on dev as `CanonicalYaml*`.

## Gotchas

- Two classes share the name `YamlToolSource`. Check the import (`tool_util.parser.yaml` vs `tool_util_models`) before reading a call site.
- Parser exceptions from rows 3-5 are not schema errors. `UntrustedToolSourceError` is a `ValueError` raised at construction, and `ParseException` comes from inside `parse_*`. The admin create API turns any non-`MessageException` into a 400 (`api/dynamic_tools.py:248-256`).
- Dict-form `inputs:` work only through the models. `parse_input_pages` iterates `root_dict["inputs"]` as a list, so a disk file or `from_path` row with dict-form inputs fails to load. See `research_issues/yaml-parser-dict-form-inputs-unsupported.md`.
- YAML `citations` are validated by the models but never loaded by the parser ([[Component - Tool Citations and External Metadata Fetch]]).
- Lint (`lint_user_tool_source`) sees an `exclude_none` dump, not the stored dump. Linter coverage is in [[Component - Tool Linters]].
