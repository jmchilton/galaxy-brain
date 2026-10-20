# output_collection_type_prefix — declare an output collection type as "input type + extra list level"

Prepared 2026-10-20 from the review of galaxyproject/galaxy#24190 (Matthias Bernt, "[26.0] Fix "Nest collection" tool mangling list:paired inputs"). Review record: `vault/repositories/galaxy/reviews/active/24190/`. Code refs below are from PR head `a6d7e445d63` plus John's fix branch `jmchilton:pr_24190_review_0` (`6f36ac97004`); re-check against `dev` (`2cca8565861` at time of writing) before filing.

Feature request / tool-spec extension for `dev`, not a 26.0 fix.

## Problem

Tool XML can declare an output collection's type in only three ways (`lib/galaxy/tool_util/parser/xml.py:491`, `output_objects.py:420`):

- fixed `type="list:list"`
- `type_source="input"`: copy the connected input's type unchanged
- `type_from_rules="rules"`: Apply Rules only

None of them can say "the input's type with one list level added in front". `__NEST__` (`lib/galaxy/tools/nest_collection.xml`) needs exactly that: wrapping each element of a `list:X` in a singleton list gives `list:list:X`. Today it declares a fixed `type="list:list"`, which is only right for a flat `list`.

Consequences once #24190 lets `list:paired` match Nest directly instead of mapping over its pairs:

- Runtime (`NestTool.produce_outputs`) creates `list:list:paired`, but the declared type is still `list:list`.
- Workflow editor: `ToolModule.get_all_outputs()` (`lib/galaxy/workflow/modules.py:~2202`) sends `collection_type="list:list"`; client `OutputCollectionTerminal` (`client/src/components/Workflow/Editor/modules/terminals.ts:~787`) uses it as-is. Downstream steps that want pairs get wrong connection and map-over info. The PR introduces this mismatch: before it, the editor's map-over view agreed with the (wrong) runtime.
- Mapped-run structure: `tool_output_to_structure()` (`lib/galaxy/model/dataset_collections/structure.py:~200`) precomputes the wrong outer type when Nest is mapped over a `list:list:paired`. The 26.0 fix branch patches this with a Nest-only Python hook (`Tool.output_collection_type()` overridden by `NestTool`, called from `ExecutionTracker._mapped_output_structure` in `lib/galaxy/tools/execute.py`). That hook is invisible to the editor and is the thing this issue should replace.

## Why not a dedicated list:paired Nest tool

Considered: split Nest into "Nest list" (`list` → `list:list`) and "Nest list of pairs" (`list:paired` → `list:list:paired`), each with a fixed type. It fixes the editor for pairs with no new syntax, but doesn't scale: `list:record`, `list:paired_or_unpaired`, `list:list`, and every other `list:X` would each need its own tool. (John, 2026-10-20.) The general need is input-dependent output type; it deserves a declarative spelling.

## Proposed syntax

Extend `type_source` with a prefix modifier (attribute name is an open question):

```xml
<collection name="output" format_source="input" type_source="input" type_prefix="list" label="${on_string} (nested)"/>
```

Meaning: output collection type = `type_prefix` + `:` + (resolved type of `type_source`). For Nest:

| input | output |
| --- | --- |
| `list` | `list:list` |
| `list:paired` | `list:list:paired` |
| `list:record` | `list:list:record` |
| `list:paired_or_unpaired` | `list:list:paired_or_unpaired` |
| `list:list` | `list:list:list` |

Existing helpers already compose collection types, so no new type algebra is needed:

- server: `CollectionTypeDescription.multiply()` / `map_over_collection_type()` in `lib/galaxy/model/dataset_collections/type_description.py:~190`
- client: `CollectionTypeDescription.append()` in `client/src/components/Workflow/Editor/modules/collectionTypeDescription.ts:~89`

Validation: `type_prefix` only allowed together with `type_source` (parser error otherwise, alongside the existing `collection_type`/`collection_type_source` exclusivity check in `ToolOutputCollectionStructure.__init__`). Result must pass the collection-type regex in `type_description.py:16`. `sample_sheet` types are restricted by that regex (`sample_sheet:list:…` isn't valid), so decide whether prefixing a sample_sheet input is rejected or converts (`_sample_sheet_to_list_collection_type` exists in `lib/galaxy/model/dataset_collections/types/sample_sheet_workbook.py`).

## Touch points

1. Parser/model: new `collection_type_prefix` field on `ToolOutputCollectionStructure` (`lib/galaxy/tool_util/parser/output_objects.py`), parse in `xml.py` and `yaml.py`, include in `to_dict`/`from_dict`.
2. Spec: `galaxy.xsd` attribute next to `type_source` (~line 6511) with docs; pydantic model `lib/galaxy/tool_util_models/tool_outputs.py:~119` (`collection_type_source` lives there).
3. Runtime: `tool_output_to_structure()` and wherever the output collection is created for non-mapped runs apply the prefix. Delete the Nest-only `Tool.output_collection_type()` hook from the 26.0 branch once merged forward, and have `NestTool` take its inner type from the declared structure instead of `nest_collection_type()`.
4. Workflow server: `get_all_outputs()` passes `collection_type_prefix` to the client.
5. Client: `OutputCollectionTerminal` applies the prefix after `getCollectionTypeFromInput()`; also the fallback `ANY_COLLECTION_TYPE_DESCRIPTION` path. Check `terminals.ts:~1049` where `collection_type_source` is copied for terminal sources.
6. Tool profile: probably gate the attribute on a new tool profile version for third-party tools (Nest is a Galaxy-internal tool, so it can just use it).
7. Nest input: needs to accept the `list:X` types above. No wildcard exists in input `collection_type` (enumerate types, or that's a second feature: `list:*`/prefix matching on inputs). Enumerating keeps scope small.

## Open questions

- Attribute name: `type_prefix`? `type_wrap`? Something that reads with `type_source`.
- Bare `paired` input: legacy Nest wraps forward/reverse separately → `list:list`; the prefix rule gives `list:paired`. Options: new Nest version where `paired` → `list:paired` (rule stays uniform; 1.0.0 keeps legacy behaviour), or keep `paired` special. The 26.0 branch (commit `a919345e2f8`) restores bare `paired` with the legacy behaviour.
- Is Nest the only consumer? Survey of `lib/galaxy/tools/*.xml` found no other collection-op tool needing it (all use fixed `type` or plain `type_source`). Check IUC/tools-iuc for tools that hard-code `list:list` but would want this. IWC: only `workflows/microbiome/single-sample-binning/single-sample-binning.ga` uses `__NEST__`, on a flat `list` (unaffected).
- Should the same modifier exist for `structured_like`?
- Input wildcard (`list:*`) in scope or separate issue?

## Tests

- Parser unit tests: attribute parsed, exclusivity/validation errors.
- API tests (`lib/galaxy_test/api/test_tools.py`): Nest on `list`, `list:paired`, `list:record`, `list:paired_or_unpaired`, empty `list:paired`, mapped over `list:list:paired`. The 26.0 branch adds `test_nest_empty_list_of_pairs` and `test_nest_map_over_list_of_lists_of_pairs`; extend those.
- Workflow API test: `get_all_outputs`/step outputs report the prefixed type after connecting a `list:paired`.
- Client vitest for `OutputCollectionTerminal` with a prefix, including map-over of the prefixed output downstream.
- Nest XML `<tests>` for the new input types.
