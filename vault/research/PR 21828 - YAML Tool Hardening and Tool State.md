---
type: research
subtype: pr
tags:
  - research/pr
  - galaxy/tools
  - galaxy/tools/yaml
  - galaxy/tools/runtime
  - galaxy/tools/testing
  - galaxy/collections
  - galaxy/models
github_pr: 21828
github_repo: galaxyproject/galaxy
component: Tool State / YAML Tools
related_prs:
  - 17393
  - 18641
  - 18758
  - 19434
  - 20935
status: draft
created: 2026-04-28
revised: 2026-04-28
revision: 3
ai_generated: true
summary: "Typed Pydantic collection runtime models, Job.tool_state column, YAML test case JSON validation, collection inputs for YAML tools"
sources:
  - "https://github.com/galaxyproject/galaxy/pull/21828"
related_notes:
  - "[[Component - YAML Tool Runtime]]"
  - "[[Component - Tool State Specification]]"
  - "[[Component - Tool State Dynamic Models]]"
  - "[[Component - Collection Models]]"
  - "[[Component - Collection Tool Execution Semantics]]"
  - "[[Component - Collections in Tool XML Tests]]"
  - "[[Component - Tool Testing Infrastructure]]"
  - "[[Dependency - Pydantic Discriminated Unions]]"
  - "[[Dependency - Pydantic Dynamic Models]]"
  - "[[PR 18641 - Parameter Model Improvements Research]]"
  - "[[PR 18758 - Tool Execution Typing and Decomposition]]"
  - "[[PR 19377 - Collection Types and Wizard UI]]"
  - "[[PR 19434 - User Defined Tools]]"
  - "[[PR 20935 - Tool Request API]]"
  - "[[PR 21842 - Tool Execution Migrated to api jobs]]"
  - "[[Problem - YAML Tool Post-Hoc State Divergence]]"
---

# PR #21828: Various YAML Tool Hardening and Progress toward Tool State Goals

**Author**: jmchilton
**Repo**: galaxyproject/galaxy
**State**: MERGED
**Created**: 2026-02-11
**Merged**: 2026-02-13 (commit `a7086d72c4`)
**Parent**: extracted from #17393 (structured tool state umbrella)
**Labels**: kind/bug, kind/enhancement, area/tool-framework

## Summary

Drops the next slice of the structured-tool-state work into `dev`: precise Pydantic models for collection runtime payloads, a `Job.tool_state` column with validated state persisted at execution time, and a `runtimeify` path that supersedes the legacy `to_cwl` conversion. Also hardens YAML tools — collection inputs and outputs, JSON-shaped test cases validated against parameter models, and a serialization roundtrip guard.

## Changes

### Typed collection runtime models — `lib/galaxy/tool_util_models/parameters.py`

Replaces untyped `Dict[str, DataInternalJson]` collection representations with a Pydantic hierarchy. Live line numbers at SHA `651f9538c7`:

- `DataCollectionElementInternalJson` (line 799) — extends `DataInternalJson` with `element_identifier` and optional `columns`.
- `DataCollectionInternalJsonBase` (line 807) — base with `class` (alias of `class_`), `name`, `collection_type`, `tags`, optional metadata (`column_definitions`, `fields`, `has_single_item`, `columns`).
- `DataCollectionPairedElements` (line 823) — exactly `forward` and `reverse`, both typed `DataCollectionElementInternalJson`.
- Leaf models: `DataCollectionPairedRuntime` (828), `DataCollectionListRuntime` (835), `DataCollectionSampleSheetRuntime` (842), `DataCollectionRecordRuntime` (849), `DataCollectionPairedOrUnpairedRuntime` (861).
- Nested models: `DataCollectionNestedListRuntime` (868, with `must_be_nested_list_like` validator at 873), `DataCollectionNestedRecordRuntime` (896, validator at 901) — recursive element unions.
- `_LEAF_COLLECTION_MODELS` dict (930-936) — single source of truth for leaf routing.
- `build_collection_model_for_type()` (939-976) — LRU-cached factory; recurses on `:`-split, uses `list_type(inner_model)` for list-like outers (`list`, `sample_sheet`) and `dict_type(str, inner_model)` for record-like outers; emits `create_model()` model with `Literal[collection_type]` and narrowed `elements`. Returns `None` for unknown leaves or unknown nested segments.
- `_collection_type_discriminator` (979) — returns the full `collection_type` string, used for comma-separated subset unions.
- `collection_runtime_discriminator` (990) — full routing function for the canonical discriminated union.
- `CollectionRuntimeDiscriminated: Type` (1027-1041) — `Annotated[Union[...], Discriminator(collection_runtime_discriminator)]` with seven `Tag(...)`-annotated branches.

`DataCollectionParameterModel._runtime_model_for_collection_type` (line 1410) handles single types, comma-separated unions (subset discriminator), and unknown-type fallbacks to the full discriminated union.

### Collection-to-runtime conversion — `lib/galaxy/tools/runtime.py` (new, +271)

Live line numbers at SHA `651f9538c7`:

| Symbol | Line |
| --- | --- |
| `is_list_like(collection_type)` | 42 |
| `setup_for_runtimeify(...)` | 52 (returns `(hda_references, adapt_dataset, adapt_collection)`) |
| nested `adapt_dataset` | 81 |
| nested `adapt_collection` | 116 |
| `_adapt_from_hdca` | 146 |
| `_adapt_from_dce` | 161 |
| `collection_to_runtime` | 182 |
| `_validate_collection_runtime_dict` | 195 |
| `_build_collection_runtime_dict` | 208 |
| `_element_to_runtime` | 263 |

Pipeline:
1. `setup_for_runtimeify()` — builds HDA/HDCA/DCE lookup dicts from job inputs, returns `adapt_dataset` and `adapt_collection` callbacks (DCE lookup added for subcollection mapping).
2. `_build_collection_runtime_dict()` — recursively converts `DatasetCollection` -> raw dict, distinguishing list-like (array elements) from record-like (object elements) via `is_list_like()`.
3. `_validate_collection_runtime_dict()` — validates the raw dict via `build_collection_model_for_type()`, falling back to nested-list / nested-record models when the factory returns `None`.
4. Special metadata preserved: `column_definitions` (sample_sheet), `fields` (record), `has_single_item` (paired_or_unpaired), `columns` (sample_sheet elements).

### Job tool state persistence

- `Job.tool_state` — `lib/galaxy/model/__init__.py:1641`. Column type `JSON().with_variant(JSONB, "postgresql")`, nullable. Read/written at `:1808` (`Job.copy_from`) and `:2277` (export attrs).
- Alembic migration: `lib/galaxy/model/migrations/alembic/versions_gxy/566b691307a5_persist_validated_job_internal_tool_.py`. File contains `revision = "566b691307a5"` (line 25), `down_revision = "9930b68c85af"` (line 26). Migration also alters `tool_request.history_id` to NOT NULL and adds `tool_source.source_class`. **PR body's `b4d6191307a5` is wrong; truth is `566b691307a5`.**
- `ExecutionSlice` — `lib/galaxy/tools/execute.py:366`, attribute `validated_param_combination` set at `:370`/`:382`. Constructed at `:755`, `:827`, `:867`. Consumed at `lib/galaxy/tools/__init__.py:258-259`.
- `UserToolEvaluator.build_param_dict()` — `lib/galaxy/tools/evaluation.py:1074-1124`. The runtimeify branch (`if validated_tool_state is not None:`) is at `:1089`; `runtimeify` imported from `galaxy.tool_util.parameters.convert` and `setup_for_runtimeify` from `galaxy.tools.runtime`. DCE-aware input-collection map built at `:1094-1099`. Else branch at `:1116` falls back to `galaxy.workflow.modules.to_cwl` with a `log.info(...)` deprecation message. The base `ToolEvaluator.build_param_dict` (`:241`) accepts the same `validated_tool_state` kwarg but does not implement the runtimeify branch — dispatch into the user-tool override is via virtual call from `_compute_environment_setup` (`:212-229`).

### YAML tool enhancements — `lib/galaxy/tool_util/parser/yaml.py`

- Collection inputs (`data_collection`) wired through the YAML parser, including `dce` source type for subcollection mapping and comma-separated `collection_type` (e.g. `list,paired`). `__parse_test_inputs` (`:368-379`) detects `class: Collection` shaped inputs and stuffs them into `attributes.collection`.
- `value_state_representation` set to `"test_case_json"` at `_parse_test` line 430. Test inputs are flattened from structured JSON to the pipe-delimited format the existing test framework consumes (flatten loop near `:340-342`).
- Minimum profile bumped to **24.2** at `parse_profile` (`:348-349`): `return self.root_dict.get("profile") or "24.2"`.
- `to_string` (`:363-365`) now `json.dumps(self.root_dict, ...)` without mutating `self.root_dict` — covered by `test_tool_serialization_roundtrip.py`.
- Improved error handling when test requests are unavailable (verify-side changes in `verify/parse.py` and `verify/interactor.py`).
- **Caveat**: PR body claims YAML tools now produce output collections, but at HEAD `_parse_test` still hard-codes `test_dict["output_collections"] = []` (line 423) with a `TODO: implement output collections for YAML tools.` comment. Output-collection support for YAML tools is partial.

### State representation enum

Adds `job_runtime` and `test_case_json` with full `parameter_specification.yml` coverage for all scalar types and collection types.

## State flow (post-PR)

1. Tool receives request state.
2. Request validated and converted to internal state.
3. Internal state persisted on `Job.tool_state`.
4. Internal state converted to runtime state with resolved paths/locations.
5. Runtime state serialized for tool evaluation.

This is the `runtimeify` path. Legacy `to_cwl` remains as fallback when `Job.tool_state` is absent.

## Changes since PR (post-merge follow-ups)

Range: `a7086d72c4..origin/dev`.

`lib/galaxy/tools/runtime.py`
- `0acc3c4c9a` Fix mypy errors in runtime.py: add type annotations.
- `43f62aca4b` Fix mypy errors: union type for Annotated, DatasetInstance in dict.
- `bab77ba32d` Model DCE in batch params, fix runtime adapt_dataset, migrate tests.
- `77056952bd` Model map_over_type and DCE in tool parameter schema.
- `345efca3e5` Fix type annotation issues reported by mypy 1.20.0.

`lib/galaxy/tool_util_models/parameters.py`
- `2d8759ac60` / `04d5ce2cc0` / `3f2d870b69` — DCE handling and dereference validation.
- `bab77ba32d` — DCE in batch params.
- `77056952bd` — model `map_over_type` and DCE in tool parameter schema.
- `6699a3dfe8` — enrich tool parameter JSON Schema with Galaxy metadata via model methods.
- `8a7dbba8ce` / `9148b48554` / `661bf5ba08` — JSON Schema keywords and color/length/in_range/regex validators; fix generation bugs.
- `bc7080c38d` — accept `format` alias on Data/DataCollection parameter models.
- `33f829fb33` — silence PydanticJsonSchemaWarning on recursive collection element union.
- `ec5cfe6cce` — narrow YAML tool parameter schema for UserToolSource (companion #22507).

`lib/galaxy/tool_util/parser/yaml.py`
- `d3c37a26e1` / `0151cb50d8` / `bc32fa1c71` — credential test definitions; TypeAdapter for credential validation.
- `ec5cfe6cce` — narrow YAML schema (companion to model-side change).

`lib/galaxy/tools/evaluation.py`
- `3347dbbe13` — fix `tool.parameters` initialization.
- `9a3fc2afcd` — enforce file source access during dataset materialization.

`lib/galaxy/model/migrations/alembic/versions_gxy/566b691307a5_persist_validated_job_internal_tool_.py`
- No commits modify the migration file since merge — schema is stable.

## File-path migration table

| PR path | Current path | Notes |
| --- | --- | --- |
| `lib/galaxy/tools/runtime.py` | unchanged | new file, still at original path |
| `lib/galaxy/tool_util_models/parameters.py` | unchanged | grew but still here |
| `lib/galaxy/model/migrations/alembic/versions_gxy/566b691307a5_persist_validated_job_internal_tool_.py` | unchanged | |
| `test/functional/tools/.claude/commands/convert-to-yaml.md` | unchanged | |
| `test/functional/tools/CLAUDE.md` | unchanged | |

No moves or renames in scope of this PR's contributions since merge.

## Tests

### Unit — `test/unit/tool_util/test_runtime.py` (+275), `test/unit/app/tools/test_runtime.py` (+245)

- E2E collection-to-runtime: paired, list, record, sample_sheet, paired_or_unpaired, nested `list:paired`, deeply nested `list:list:paired`.
- Invalid structure detection: paired missing `reverse`.
- Dynamic model factory: leaf type routing, unknown type returns `None`, correct/wrong inner types, wrong `collection_type` literal, depth mismatch, JSON schema precision, LRU caching.
- Record-based dynamic models: `record:paired` accept/reject, empty-dict elements.
- Unknown nested segments: `list:unknown_type`, `record:unknown`, `list:list:unknown` all return `None`.

### Parameter specification — `test/unit/tool_util/parameter_specification.yml` (+2095/-37)

- `job_runtime_valid` / `job_runtime_invalid` for every scalar type (int, boolean, float, text, select, genomebuild, directory_uri, hidden, drill_down).
- `job_runtime` specs for structural types (conditionals, repeats, sections).
- Cross-type discrimination: list rejects paired data, paired rejects list data.
- Comma-separated unions: `list:paired,list:list` and `list,list:paired` with valid/invalid cases.
- Collection runtime specs for all leaf types plus nested types.

### Functional tools — `test/functional/tools/parameters/`

- 14 collection-type tool definitions (all leaf types, nested types, comma-separated unions).
- 4 scalar/YAML user-tool definitions (`gx_boolean_user`, `gx_data_user`, `gx_data_multiple_user`, `gx_select_multiple_one_default_user`).
- All registered in `sample_tool_conf.xml`.

### Serialization roundtrip — `test/unit/app/tools/test_tool_serialization_roundtrip.py` (+51)

YAML tool source survives `to_string()` -> re-parse without alteration.

## Unresolved questions

- `to_cwl` deprecation timeline — log message says "may work differently in the future"; no removal planned in this PR or HEAD.
- 24.2 minimum-profile bump — what happens to YAML tools with no `profile` set or with an older `profile`? Default is now 24.2 regardless; legacy older-profile YAML tools may load differently or fail validation against the tightened schema (#22507 follow-up).
- Why did the PR body say `b4d6191307a5` while the actual revision id is `566b691307a5`? Likely a paste from an earlier rebase of the umbrella branch.
- `column_definitions` and `fields` are typed `Optional[List[Dict[str, Any]]]` at the model layer — pass-through, not structurally validated. Was deliberate or pending follow-up?
- Output collections for YAML tools — PR body claims support, but `_parse_test` still hard-codes `output_collections = []` with a `TODO`. Is this fully wired anywhere else, or pending follow-up?
- Post-merge schema-hardening (#22507 / `ec5cfe6cce`) further narrows the YAML schema for `UserToolSource`. Does it intersect this PR's loosenings (collection inputs, `dce`) or constrain orthogonal fields?

## Notes

- The PR is a sub-extract of the umbrella structured-tool-state branch (#17393); reviewing in isolation per @mvdbeek's preference. Author flagged `parameter_specification.yml` and `runtime.py` / `evaluation.py` as the highest-leverage review targets.
- The Pydantic dynamic-model machinery here is the same shape described in [[Component - Tool State Dynamic Models]] and [[Dependency - Pydantic Dynamic Models]] — `create_model()` with `Literal[...]` discriminators — extended to recursive collection types.
- This lands the runtime side of the contract that [[PR 20935 - Tool Request API]] introduced on the request side: persisted, Pydantic-validated state at every lifecycle stage.
- Adds two of the 12 state representations tracked in [[Component - Tool State Specification]] (`job_runtime`, `test_case_json`).
- YAML tool collection input support and the `dce` source type are the structural prerequisites for [[PR 19434 - User Defined Tools]] handling collections end-to-end.
- The `test/functional/tools/CLAUDE.md` (+391) and `test/functional/tools/.claude/commands/convert-to-yaml.md` (+332) additions are agent-facing instructions for converting XML test tools to YAML — not user-facing docs. (`convert-to-yaml.md` lives under `.claude/commands/`, i.e. the slash-command form, not at the top of `test/functional/tools/`.)
