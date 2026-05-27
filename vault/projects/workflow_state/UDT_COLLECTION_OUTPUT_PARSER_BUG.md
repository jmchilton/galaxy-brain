# UDT Collection-Output Parser Bug

**Surfaced:** 2026-05-23 while writing `ok_udt_collection_output.gxwf.yml` for [[UDT_CONNECTION_VALIDATION_FIXTURES]].
**Status:** blocker for the fixture; UDT collection-output path otherwise unusable in workflows.

## Symptom

A UDT output declared per the `UserToolSource` pydantic schema:

```yaml
outputs:
  - name: outs
    type: collection
    structure:
      collection_type: list
      discover_datasets:
        - discover_via: pattern
          pattern: __name_and_ext__
          directory: outs
```

passes `UserToolSource.model_validate(...)` but `parse_tool(YamlToolSource(...))` produces a `ToolOutputCollection` with `structure.collection_type=None` and `structure.discover_datasets=[]`. Downstream, the connection graph treats the output as untyped and skips any connection consuming it.

## Root cause

`lib/galaxy/tool_util/parser/yaml.py:_parse_output_collection` reads:

```python
collection_type = output_dict.get("collection_type", None)
collection_type_source = output_dict.get("type_source", None)
structured_like = output_dict.get("structured_like", None)
...
dataset_collector_descriptions = dataset_collector_descriptions_from_output_dict(output_dict)
```

— directly off the top-level output dict. Designed for the admin-tool YAML shape (`class: GalaxyTool`, see `test/functional/tools/collection_creates_pair_y.yml`) where these fields are flat. UDT YAML schema nests them under `structure:` (`IncomingToolOutputCollection.structure: ToolOutputCollectionStructure`). The parser never unwraps.

Empirical confirmation:

```
$ python -c "from galaxy.tool_util.parser.yaml import YamlToolSource; from galaxy.tool_util.model_factory import parse_tool
rep = {..., 'outputs': [{'name': 'outs', 'type': 'collection',
  'structure': {'collection_type': 'list', 'discover_datasets': [...]}}]}
print(parse_tool(YamlToolSource(rep)).outputs)"
# → ToolOutputCollection(structure=ToolOutputCollectionStructure(collection_type=None, ..., discover_datasets=[]))
```

vs. flat form:

```
# 'outputs': [{'name': 'outs', 'type': 'collection',
#   'collection_type': 'list', 'discover_datasets': {...}}]
# → ToolOutputCollection(structure=ToolOutputCollectionStructure(collection_type='list', ..., discover_datasets=[FilePattern...]))
# but UserToolSource.model_validate rejects this form: "outputs.0.collection.structure: Field required"
```

## Impact

- Any UDT producing a collection output is unusable in connection-validated workflows.
- The connection-validation gap parent plan ([[USER_DEFINED_TOOL_STEP_VALIDATION]] §5.6) assumes "the connection graph just works" once `_resolve_tool_step` returns a `ParsedTool`. False for collection outputs.
- Likely also affects `state-validate` on workflows whose UDT step state references the missing output (cross-step `format_source: <UDT_collection_output>` chains).
- Blocks `ok_udt_collection_output.gxwf.yml` and `fail_udt_dataset_to_collection_consumer.gxwf.yml`'s converse-pair from [[UDT_CONNECTION_VALIDATION_FIXTURES]].

## Options

### Option A — Parser unwraps `structure:` (superseded)

Modify `_parse_output_collection` to read both shapes:

```python
structure_dict = output_dict.get("structure") if isinstance(output_dict.get("structure"), dict) else {}
collection_type = structure_dict.get("collection_type") or output_dict.get("collection_type")
collection_type_source = structure_dict.get("type_source") or structure_dict.get("collection_type_source") or output_dict.get("type_source")
structured_like = structure_dict.get("structured_like") or output_dict.get("structured_like")
```

And extend `dataset_collector_descriptions_from_output_dict` (or wrap its call) to merge `structure.discover_datasets` into the output dict it reads.

Pros: zero downstream churn, both admin and UDT shapes work, fixes the bug at its source.
Cons: parser absorbs schema-shape drift; a third shape (say `output.structure.collection.type`) would require another patch. Two valid authoring shapes for the same concept persist forever.

### Option B — UDT schema accepts flat form

Loosen `IncomingToolOutputCollection` to validate either nested-structure or flat. Reject pydantic-side after parser already handles both, or move the unwrap into a `model_validator`.

Pros: parser stays as-is.
Cons: pydantic surface gets more complex, two valid shapes for the same authoring concept, doc churn.

### Option C — Parser owns admin shape, UDT runtime owns user-tool shape

Make `_parse_output_collection` branch on whether the source class is `GalaxyUserTool` and read accordingly. Or split into `_parse_user_tool_output_collection`.

Pros: explicit, each shape has one canonical reader.
Cons: parser learns about class semantics; two near-identical code paths.

### Option D — Converge the pydantic model to flat Shape A (chosen)

Delete `ToolOutputCollectionStructure` from `tool_util_models/tool_outputs.py` and hoist its fields onto `GenericToolOutputCollection`. Lift pre-convergence rows that still nest under `structure:` (call them Shape B) via a `model_validator(mode="before")` on the pydantic model and via a sibling lift at the top of `YamlToolSource._parse_output_collection` (the YAML parser path bypasses pydantic — see `Toolbox.dynamic_tool_to_tool`). Both call sites share one `lift_legacy_collection_structure` helper so the semantics stay in lockstep. Parser also accepts `collection_type_source` as a sibling of the legacy XML-style `type_source`.

Pros: one canonical authoring shape (flat). UDT pydantic surface matches the published `ToolSourceSchema.json`. Legacy data still validates, silently. Single helper means future edge cases get fixed in one place.
Cons: the in-tree dataclass `ToolOutputCollectionStructure` (`parser/output_objects.py`) stays — runtime code still does `output.structure.collection_type` in `execute.py`, `actions/__init__.py`, `workflow/modules.py`, `model/dataset_collections/structure.py`. `ToolOutputCollection.to_model()` flattens at the conversion boundary. Larger blast radius than Option A — touches the model, the parser, and regenerated client schemas (`api-client/src/schema/schema.ts`, `tool_shed/webapp/frontend/src/schema/schema.ts`, `ToolSourceSchema.json`).

## Recommendation

**Option D, shipped.** Lift helper lives in `tool_util_models/tool_outputs.py` as `lift_legacy_collection_structure`; the pydantic `model_validator` and the parser both call it. Tests landed in `test/unit/tool_util/test_parsing.py` (parser-side: alias + legacy-lift) and `test/unit/tool_util_models/test_user_tool_source_response.py` (model-side: legacy lift + hybrid-None safety + Shape A direct).

Original Option A was the minimum-blast-radius patch and would have unblocked the fixture, but left two authoring shapes coexisting forever. Option D pays the convergence cost once.

## Open questions

All closed:

- ~~Data output flat-vs-nested?~~ Not an issue — no `structure:` wrapper on either side.
- ~~`type_source` vs `collection_type_source` normalization?~~ Parser now reads either; alias locked by `test_yaml_parser_accepts_collection_type_source_alias`.
- ~~Round-trip Pydantic gate + parse_tool?~~ Covered by `test_legacy_structure_wrapper_lifted_silently` (model side) and `test_yaml_parser_lifts_legacy_structure_wrapper` (parser side).
