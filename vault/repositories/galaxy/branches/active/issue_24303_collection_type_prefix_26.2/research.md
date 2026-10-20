# Research — #24303 `type_prefix` on `release_26.2` (`e2649e52818`)

Four subagents (parsing/spec, tool runtime, workflow server+editor, collection_semantics docs). Condensed; file:line against the worktree.

## Premise on 26.2

- `nest_collection.xml:16-19`: input `list,paired`, output fixed `type="list:list"`. #24190 (`list,list:paired`, open vs `release_26.0`) and the review branch `pr_24190_review_0` (Nest-only `Tool.output_collection_type()` hook, `nest_collection_type()`, `get_collection()` DCE fix) are **not** here.
- NestTool (`tools/__init__.py:4456-4485`) reads `incoming["input"]`; mapped → DCE, `.collection` is the parent (bug fixed on review branch).

## Parsing / spec

- `ToolOutputCollectionStructure` `tool_util/parser/output_objects.py:422-505`; validation 446-462; `to_dict`/`from_dict` 475-498 (`from_dict` hard-indexes — new key must use `.get()`; read from job metadata at `job_execution/output_collect.py:377`); `ToolOutputCollection.to_model()` 380-395.
- XML `parser/xml.py:494-521` (+ legacy `<output type="collection">` remap 559-564); YAML `parser/yaml.py:268-308` (both `type_source`/`collection_type_source`).
- XSD `galaxy.xsd`: `OutputCollection` `type_source` 6761-6768; `Output` `collection_type_source` 6802-6809; `CollectionType` pattern 8807-8814; profile changelog 13-89 (newest `### 26.2`).
- Pydantic `tool_util_models/tool_outputs.py:264-324` (`GenericToolOutputCollection.collection_type_source` 291; XML-only `collection_type_from_rules` on `ToolOutputCollection` is the precedent for a parser-only field). Generated schema: `make update-client-api-schema`.
- tool_util-side type check: `tool_util_models/_base.py:20-29` `_check_collection_type` (lenient on sample_sheet). Strict `COLLECTION_TYPE_REGEX` is in `galaxy.model` (not importable from tool_util).
- Linters `tool_util/linters/output.py`: `OutputsCollectionType` (134-142) warns when `type` missing even with `type_source`; no type_source linter; registry list in `test/unit/tool_util/test_tool_linters.py` ~3480-3560.
- Load-time `type_source` check `tools/__init__.py:1843-1847`.
- Profile: `VERSION_MAJOR="26.2"`; gating idiom `Version(profile) >= Version("26.2")` (`parser/util.py:86`). Nest has no profile.

## Tool runtime

- Non-mapped: `tools/actions/__init__.py:1215-1238` `create_collection` — explicit type wins; else declared; else `type_source` via `can_map_over` (declared type) **before** direct match, else HDCA's own type. Static `known_outputs` assert `structure.collection_type` (721-722).
- Mapped precompute: `model/dataset_collections/structure.py:197-226` `tool_output_to_structure` (only caller `tools/execute.py:649-661` `_mapped_output_structure`); type_source = sliced leaf subcollection type (concrete, user/workflow-picked).
- Query: `model/dataset_collections/query.py` (`direct_match` 58-67, `can_map_over` 69-81, ranked by dimension).
- `type_description.py`: `multiply()` 252-254, `validate()` 259-262, `COLLECTION_TYPE_REGEX` 38-40 (`list:sample_sheet` invalid); `_sample_sheet_to_list_collection_type` `types/sample_sheet_workbook.py:620-635`.
- Job finish (`output_collect.py`, builder) uses runtime `collection.collection_type` — no prefix logic needed there.
- Other `type_source` DB-op tools (filter_*, harmonize, merge, relabel, sort, tag) resolve through `create_collection`; harmonize output2 / apply_rules / convert_sample_sheet pass explicit types.

## Workflow server

- `workflow/modules.py:2909-2955` `get_all_outputs` sends `collection_type_source` (2929) — add `collection_type_prefix`.
- `managers/workflows.py:1764-1789` `_resolve_collection_type` (subworkflow-only server-side resolution): upstream type copied, then map-over prepended — prefix goes between. Possible existing over-prepend bug (unverified).
- Tests: `test_workflows.py:2370-2410` (`test_export_editor_collection_type_source`, `..._subworkflow_collection_type_source`), `test_workflow_build_module.py`.

## Workflow editor

- `terminals.ts:807-885` `OutputCollectionTerminal` / `getCollectionTypeFromInput` (first-declared-wins, returns declared match; `any` → connected type); `terminalFactory` 1070-1076; `workflowStepStore.ts:49-54` `CollectionOutput` type.
- `collectionTypeDescription.ts:113-121` `append()` (ANY absorbs → unconnected fallback stays ANY).
- Tests: `terminals.test.ts` ("resolves collection type source" 962-976); fixture `test-data/parameter_steps.json` step "17" `filter_failed` (821-880) to copy.

## collection_semantics

- Source `lib/galaxy/model/dataset_collections/types/collection_semantics.yml`; generator `types/semantics.py` (`PYTHONPATH=lib python lib/galaxy/model/dataset_collections/types/semantics.py`) writes `doc/source/dev/collection_semantics.md`.
- `tests:` keys: `tool_runtime.{api_test,tool}`, `workflow_runtime.{api_test,framework_test}`, `workflow_editor` (exact `it()` text in `terminals.test.ts`). Validated by `test/unit/data/model/test_collection_semantics.py`.
- No section on output collection type derivation exists — add one (e.g. "Output Collection Types") before "Type Compatibility Algebra". No output binding for "element passed through" (Nest) — may need a new binding or prose.
- Framework workflow tests `lib/galaxy_test/workflow/*.gxwf.yml` + `-tests.yml` (`test_framework_workflows.py`); template `collection_type_source_conditional_mapped.gxwf.yml`. `__NEST__` already registered in `sample_tool_conf.xml:395`.
- Test tool template: `test/functional/tools/collection_type_source_map_over.xml`.
