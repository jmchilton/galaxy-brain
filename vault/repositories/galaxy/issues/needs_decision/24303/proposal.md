# Tool XML can't declare an output collection type as "the input's type plus one list level"

A tool output collection can't declare its type as "the input's collection type with a `list` level added in front", so tools like Nest have to declare a fixed type that is wrong for every input except a flat `list`.

Nest (`__NEST__`) wraps each element of its input in a singleton list. Once #24190 lets a `list:paired` match Nest directly instead of mapping over its pairs, the type Nest declares and the type it actually creates disagree:

| Nest input | Declared type (`nest_collection.xml`) | Created at runtime |
| --- | --- | --- |
| `list` | `list:list` | `list:list` ✅ |
| `list:paired` | `list:list` | `list:list:paired` ❌ |
| `list:list:paired` (maps over the outer `list`) | `list:list:list` (precomputed) | needs `list:list:list:paired` ❌ |

❌ marks a declared type that disagrees with the collection the job creates.

The declared type isn't only documentation. `ToolModule.get_all_outputs()` sends it to the workflow editor ([`modules.py:2928`](https://github.com/galaxyproject/galaxy/blob/2cca856586195c591a2534104ec878a3fc9afe05/lib/galaxy/workflow/modules.py#L2928)), and the client's `OutputCollectionTerminal` uses a fixed `collection_type` as-is ([`terminals.ts:817`](https://github.com/galaxyproject/galaxy/blob/2cca856586195c591a2534104ec878a3fc9afe05/client/src/components/Workflow/Editor/modules/terminals.ts#L817)). So the editor tells authors Nest on a `list:paired` gives a `list:list`, and a downstream step that consumes pairs gets the wrong connection and map-over information. `tool_output_to_structure()` uses the same declaration to precompute the outer collection when Nest is mapped over ([`structure.py:205`](https://github.com/galaxyproject/galaxy/blob/2cca856586195c591a2534104ec878a3fc9afe05/lib/galaxy/model/dataset_collections/structure.py#L205)), which gives the wrong outer type in the last row.

Today the only choices are:

- a fixed `type="..."`, right for one input type only;
- `type_source="input"`, which copies the input's type unchanged;
- `type_from_rules`, for Apply Rules only.

Nest isn't alone. Convert sample sheet (`sample_sheet:X` → `list:X`) declares `type_source="input"` with the comment "type_source is a lie, we don't have a way to encode the transform that is actually happening" ([`convert_sample_sheet.xml:19`](https://github.com/galaxyproject/galaxy/blob/2cca856586195c591a2534104ec878a3fc9afe05/lib/galaxy/tools/convert_sample_sheet.xml#L19)).

The outcome wanted: a tool can declare an output type as the input's type with one list level added, and the workflow editor, mapped-output precomputation and collection creation all see the same type.

<details><summary>How the table was produced</summary>

Runtime and precomputed types come from a focused reproduction on the #24190 head (`a6d7e445d63`). It runs the real `NestTool.produce_outputs`, XML output parsing, collection query matching and `tool_output_to_structure()`, with a stub output sink that applies the same explicit-type-or-XML fallback as `OutputCollections.create_collection`. It is not a full server or browser run.

```
XML output type: list:list
Nest list (0 elements): list:list
Nest list:paired (1 elements): list:list:paired
Predicted mapped output type for list:list:paired input: list:list:list
Expected actual mapped structure: list:list:list:paired
```

The mapped row was confirmed end to end by the API test `test_nest_map_over_list_of_lists_of_pairs` on 🌿 [`pr_24190_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24190_review_0). It failed with an outer `list:list:list` until a Nest-specific Python hook overrode the type (see Alternatives).

The editor consequences follow from the code linked above. They were not observed in a browser.

</details>

## Context

A follow-up to 🔀 #24190, which stops Nest from splitting `list:paired` inputs into their forward/reverse datasets. Review fixes are on 🌿 [`pr_24190_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24190_review_0) (not yet in the PR). They fix runtime and mapped execution with a Nest-only Python hook, but leave the editor advertising `list:list`, because there is no declarative way to say what Nest produces. That fix targets `release_26.0`. This issue is the `dev` feature that would replace the hook.

## Proposed Approach

Add a modifier to `type_source`, for example `type_prefix="list"`, which makes the output type `type_prefix + ":" + resolved type of type_source`. Nest would declare `<collection name="output" format_source="input" type_source="input" type_prefix="list"/>`. The parser model, XSD, pydantic tool models, mapped-output precomputation, collection creation, `get_all_outputs()` and the client terminal all carry or apply the prefix. Existing helpers already compose collection types on both sides, so no new type algebra is needed.

<details><summary>Syntax and semantics</summary>

```xml
<collection name="output" format_source="input" type_source="input" type_prefix="list" label="${on_string} (nested)"/>
```

The prefix applies to whatever `type_source` resolves to, so it applies per accepted input type. Any extra outer levels on the connected collection become map-over:

| Nest accepts | Connected | Output |
| --- | --- | --- |
| `list,list:paired` | `list` | `list:list` |
| `list,list:paired` | `list:paired` | `list:list:paired` |
| `list,list:paired` | `list:list:paired` | `list:list:paired` per element, mapped over the outer `list` |
| `list,list:paired` | `list:record` | rejected, as today |

`list:record`, `list:paired_or_unpaired`, `list:list` and similar get the prefixed type only if Nest lists them as accepted input types. Input `collection_type` has no wildcard today.

The runtime and the editor resolve `type_source` differently today, and the prefix would inherit both differences:

- **Direct match.** The runtime uses the connected collection's own type ([`actions/__init__.py:1232`](https://github.com/galaxyproject/galaxy/blob/2cca856586195c591a2534104ec878a3fc9afe05/lib/galaxy/tools/actions/__init__.py#L1232): `can_map_over` is false, so it falls back to the HDCA type). The editor uses the matched declared type ([`terminals.ts:864`](https://github.com/galaxyproject/galaxy/blob/2cca856586195c591a2534104ec878a3fc9afe05/client/src/components/Workflow/Editor/modules/terminals.ts#L864)). They agree only when the two are equal. A `list:paired` connected to a `list:paired_or_unpaired` input becomes `list:list:paired` at runtime but `list:list:paired_or_unpaired` in the editor. A `sample_sheet` connected to a `list` input becomes an invalid `list:sample_sheet` at runtime.
- **Map-over is checked before direct match.** The runtime returns the first accepted type the connection can map over, highest rank first ([`query.py:69`](https://github.com/galaxyproject/galaxy/blob/2cca856586195c591a2534104ec878a3fc9afe05/lib/galaxy/model/dataset_collections/query.py#L69)). The editor takes the first declared type that accepts the connection or that it can map over. If Nest accepted `list,list:list`, a directly matched `list:list` would resolve to `list` on both sides and give `list:list`, not `list:list:list`.

The prefix should apply to one resolved type that both sides share: the direct match when there is one, otherwise the mapped-over declared type.

Validation:

- `type_prefix` is allowed only with `type_source`. Raise a parser error otherwise, next to the existing `type`/`type_source` exclusivity check ([`output_objects.py:446`](https://github.com/galaxyproject/galaxy/blob/2cca856586195c591a2534104ec878a3fc9afe05/lib/galaxy/tool_util/parser/output_objects.py#L446)).
- The result must match `COLLECTION_TYPE_REGEX` ([`type_description.py:38`](https://github.com/galaxyproject/galaxy/blob/2cca856586195c591a2534104ec878a3fc9afe05/lib/galaxy/model/dataset_collections/type_description.py#L38)). `sample_sheet:…` is only valid at the outermost level, so `list:sample_sheet` is invalid. Either reject a sample_sheet input or convert it first (`_sample_sheet_to_list_collection_type`, [`sample_sheet_workbook.py:620`](https://github.com/galaxyproject/galaxy/blob/2cca856586195c591a2534104ec878a3fc9afe05/lib/galaxy/model/dataset_collections/types/sample_sheet_workbook.py#L620)).

Existing helpers:

- Server: `CollectionTypeDescription.multiply()` ([`type_description.py:252`](https://github.com/galaxyproject/galaxy/blob/2cca856586195c591a2534104ec878a3fc9afe05/lib/galaxy/model/dataset_collections/type_description.py#L252)).
- Client: `CollectionTypeDescription.append()` ([`collectionTypeDescription.ts:113`](https://github.com/galaxyproject/galaxy/blob/2cca856586195c591a2534104ec878a3fc9afe05/client/src/components/Workflow/Editor/modules/collectionTypeDescription.ts#L113)).

</details>

<details><summary>Touch points</summary>

1. Parser model: a new `collection_type_prefix` on `ToolOutputCollectionStructure`, including `to_dict`/`from_dict` ([`output_objects.py:425`](https://github.com/galaxyproject/galaxy/blob/2cca856586195c591a2534104ec878a3fc9afe05/lib/galaxy/tool_util/parser/output_objects.py#L425)). Parse it in `xml.py` ([`:500`](https://github.com/galaxyproject/galaxy/blob/2cca856586195c591a2534104ec878a3fc9afe05/lib/galaxy/tool_util/parser/xml.py#L500)) and `yaml.py` ([`:283`](https://github.com/galaxyproject/galaxy/blob/2cca856586195c591a2534104ec878a3fc9afe05/lib/galaxy/tool_util/parser/yaml.py#L283)). The YAML parser accepts both the `type_source` and `collection_type_source` spellings, so the prefix needs both spellings too.
2. Spec: `galaxy.xsd` attribute and docs next to `type_source` ([`:6777`](https://github.com/galaxyproject/galaxy/blob/2cca856586195c591a2534104ec878a3fc9afe05/lib/galaxy/tool_util/xsd/galaxy.xsd#L6777)), plus the pydantic model next to `collection_type_source` ([`tool_outputs.py:291`](https://github.com/galaxyproject/galaxy/blob/2cca856586195c591a2534104ec878a3fc9afe05/lib/galaxy/tool_util_models/tool_outputs.py#L291)).
3. Runtime, non-mapped: apply the prefix where `create_collection` resolves `type_source` ([`actions/__init__.py:1221`](https://github.com/galaxyproject/galaxy/blob/2cca856586195c591a2534104ec878a3fc9afe05/lib/galaxy/tools/actions/__init__.py#L1221)). A generic tool goes through this path. Nest passes an explicit type from `produce_outputs`, and should take it from the declared structure.
4. Runtime, mapped: apply the prefix in `tool_output_to_structure()` ([`structure.py:214`](https://github.com/galaxyproject/galaxy/blob/2cca856586195c591a2534104ec878a3fc9afe05/lib/galaxy/model/dataset_collections/structure.py#L214)). Once merged forward, delete the Nest-only `Tool.output_collection_type()` hook from 🌿 `pr_24190_review_0`.
5. Workflow server: `get_all_outputs()` sends `collection_type_prefix` ([`modules.py:2929`](https://github.com/galaxyproject/galaxy/blob/2cca856586195c591a2534104ec878a3fc9afe05/lib/galaxy/workflow/modules.py#L2929)).
6. Client: `OutputCollectionTerminal` applies the prefix to the result of `getCollectionTypeFromInput()` ([`terminals.ts:824`](https://github.com/galaxyproject/galaxy/blob/2cca856586195c591a2534104ec878a3fc9afe05/client/src/components/Workflow/Editor/modules/terminals.ts#L824)), and `terminalFactory` copies it through ([`:1075`](https://github.com/galaxyproject/galaxy/blob/2cca856586195c591a2534104ec878a3fc9afe05/client/src/components/Workflow/Editor/modules/terminals.ts#L1075)). Decide what the unconnected `ANY_COLLECTION_TYPE_DESCRIPTION` fallback should be.
7. Tool profile: gate the attribute on a new profile for third-party tools. Nest is internal and can use it directly.
8. Nest input: list each accepted `list:X` type explicitly. A wildcard would be a separate feature.

</details>

<details><summary>Tests</summary>

- Parser unit tests: the attribute parses, and a missing `type_source` or an invalid result raises an error.
- API tests (`lib/galaxy_test/api/test_tools.py`): Nest on `list`, `list:paired`, an empty `list:paired`, and mapped over `list:list:paired`. Extend the `test_nest_empty_list_of_pairs` and `test_nest_map_over_list_of_lists_of_pairs` tests from 🌿 `pr_24190_review_0`. Add a generic test tool that uses `type_prefix` through the non-mapped `create_collection` path.
- Workflow API test: after connecting a `list:paired`, the step outputs report the prefixed type.
- Client vitest: `OutputCollectionTerminal` with a prefix, including map-over of the prefixed output downstream.
- Nest XML `<tests>` for each newly accepted input type.

</details>

<details><summary>Open questions</summary>

- Attribute name: `type_prefix`, `type_wrap`, or something else that reads well next to `type_source`?
- Bare `paired` input: legacy Nest wraps forward and reverse separately and gives `list:list`, but the prefix rule gives `list:paired`. Either a new Nest version adopts the uniform rule while 1.0.0 keeps the legacy behaviour, or `paired` stays a special case.
- Which `list:X` types should Nest accept? Is an input wildcard (`list:*`) in scope?
- Should `structured_like` get the same modifier?
- Other consumers: Convert sample sheet needs a transform (`sample_sheet:X` → `list:X`), not a prefix. Should one design cover both? No other tool in `lib/galaxy/tools/*.xml` needs a prefix. tools-iuc hasn't been surveyed. In IWC, only `single-sample-binning.ga` uses `__NEST__`, on a flat `list`, so it's unaffected.

</details>

## Alternative Approaches

A Python hook on the tool class fixes runtime and mapped execution, but the workflow editor never sees it. Per-type Nest tools fix the editor without new syntax, but need one tool per `list:X`. A general type expression language would also cover Convert sample sheet, but both server and client would have to evaluate it. A one-attribute prefix modifier covers Nest, reuses existing type helpers, and reaches every consumer through the same structure object.

<details><summary>Alternatives In Detail</summary>

### Alternative: Python `output_collection_type()` hook

<details><summary>Description</summary>

#### Details

This is what 🌿 `pr_24190_review_0` does on the release branch. `Tool.output_collection_type()` is overridden by `NestTool` and called from `ExecutionTracker._mapped_output_structure`, which passes the result to `tool_output_to_structure(collection_type=...)`.

#### Why the proposed approach is preferred

The hook runs only on the server during execution. `get_all_outputs()` and the client terminal read the declared structure, so the editor still shows `list:list`. Making the hook visible to the editor would mean evaluating Python per tool when building the editor, and third-party XML tools couldn't use it.

</details>

### Alternative: separate Nest tools per input type

<details><summary>Description</summary>

#### Details

Split Nest into "Nest list" (`list` → `list:list`) and "Nest list of pairs" (`list:paired` → `list:list:paired`), each with a fixed `type`.

#### Why the proposed approach is preferred

It fixes the editor for pairs with no new syntax, but `list:record`, `list:paired_or_unpaired`, `list:list` and every other `list:X` would each need its own tool. That makes the tool panel bigger and leaves the general need unmet.

</details>

### Alternative: templated type expression

<details><summary>Description</summary>

#### Details

Allow an expression in `type`, for example `type="list:${input.collection_type}"`, or a small expression language for type arithmetic.

#### Why the proposed approach is preferred

It is more general, but both the server and the client would have to parse and evaluate it, and validate it statically for linting. Of the known cases, only Convert sample sheet needs more than a prefix, and its transform could get its own attribute later.

</details>

</details>
