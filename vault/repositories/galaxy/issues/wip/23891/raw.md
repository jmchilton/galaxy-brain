# `format_source` / `metadata_source` resolve Galaxy's internal input keys

_Drafted by an AI assistant (Claude) on jmchilton's behalf — not personally authored._

## Summary

`format_source` and `metadata_source` are documented as naming a tool input, using its `|`-qualified path (`cond|input1`, `queries_0|input1`) and, for a collection, an optional element selector (`coll['forward']`). At runtime, though, they are looked up in the dicts Galaxy builds while creating a job. Those dicts also hold keys that are artifacts of how inputs get expanded. Any of those keys works as a reference:

| Tool declares | Reference that resolves | Why the key exists |
|---|---|---|
| `<param name="input" type="data" multiple="true">` | `input1`, `input2`, … | one key per selected dataset |
| `<param name="coll" type="data_collection">` | `coll1`, `coll2`, … | one key per collection element |
| `<param name="input" type="data"><conversion name="input_bai" …/>` | `input_bai` (or `input_bai1`, … for `multiple`) | the implicitly converted dataset |
| `<param name="input" type="data" multiple="true">` given a collection | `input['forward']` | the collection is recorded under the param's own name |

None of these forms is documented, and no tool under `test/functional/tools` uses them. Because they work, though, a tool author can find one by trial and error and ship it. From then on the shape of the job-creation dicts is effectively a tool-facing API.

## Impact

- **Locks in internals.** Renumbering the `name1…N` keys, changing how conversions are stored, or changing how collections passed to a `multiple` data parameter are recorded would silently change output formats for any tool that has picked up one of these forms.
- **Ordinal semantics nobody chose.** `input2` means "the second dataset in the order Galaxy expanded the selection". For a collection that is element order, which a tool author doesn't control.
- **Lint can't tell legitimate from accidental use.** A linter that resolves references the way runtime does has to either accept these keys, endorsing them, or error on references that work. An output-reference linter change in progress errors on them deliberately.

Current exposure is nil. A scan of tools-iuc, bgruening/galaxytools and tools-devteam (3218 tool XMLs, 351 `format_source`/`structured_like` references) found no reference that uses any of these forms. Tightening now costs nothing.

## Where the keys come from

Line numbers against `origin/dev` @ `90eca92b007`.

**`lib/galaxy/tools/actions/__init__.py`, `_collect_input_datasets` visitor**

- `:235-242`: a `multiple` data param stores each dataset under `prefixed_name + str(i + 1)`, as well as the first under `prefixed_name`. Each gets a legacy alias too (`set_legacy_alias`).
- `:250`: the conversions of a multiple param are stored as `<conversion_name><i + 1>`.
- `:283`: a single param's conversion is stored as `input_datasets[prefix + conversion_name]`.
- `:351`: every element of a `data_collection` param is stored as `prefixed_name + str(i + 1)`.

**`lib/galaxy/tools/actions/__init__.py:377`, `collect_input_dataset_collections`**

- `:395`: when a `DataToolParameter` receives a collection, the collection is appended to `input_dataset_collections[prefixed_name]`. That is why a selector on a `multiple` data param resolves.

## Where references are resolved against them

- **`format_source` at job creation:** `actions/__init__.py:1308` calls `resolve_format_source(format_source, input_datasets, input_dataset_collections, …)`. `lib/galaxy/job_execution/output_format.py:38` is a plain membership test (`if format_source in input_datasets`), then `:48-55` parse a selector and look it up in `input_dataset_collections`. No check ties the key back to a declared parameter.
- **`metadata_source` at job creation:** `actions/__init__.py:640-646` does `inp_data.get(metadata_source)` on the same dict.
- **Discovered collection elements:** `lib/galaxy/job_execution/output_collect.py:215-227` resolves `format_source` against the job's recorded input associations. `metadata_source` goes through `MetadataSourceProvider(self.input_datasets)` (`:352`). `_record_input_datasets` (`actions/__init__.py:1095`) stores every key of `inp_data` as an association name, so the same internal keys are valid there.

The keys themselves are load-bearing. They become `JobToInputDatasetAssociation` names, which the job API reports and discovered-output resolution reads. The fix belongs at the reference layer, not in the recording.

## Suggested direction

Resolve output references against the tool's declared inputs first, then look up the runtime value:

1. Parse the reference into a parameter path plus an optional selector.
2. Accept it only if the path names a declared `data` / `data_collection` parameter (qualified, plus the existing innermost-conditional legacy alias). Accept a selector only on a `data_collection` parameter.
3. Then fetch the dataset or collection from the job dicts by that canonical key.

Issue #23444 already proposes a resolver over the parsed parameter model for nested output references; this would be the runtime half of it. A profile gate (old behaviour below some 26.x profile) would make the change risk-free for existing tools, though the scan above suggests nothing needs it.

## Not verified

- No running-Galaxy reproduction yet. Everything above comes from reading the code at `90eca92b007`. A minimal check would be a test tool with `<param name="input" type="data" multiple="true"/>` and `<data name="out" format_source="input2"/>`, run with two inputs of different formats, asserting that `out` takes the second input's format.
- Whether `structured_like` (which goes through `collection_prototype` over a `LegacyUnprefixedDict` of collections) can be pointed at an internal key the same way.
- Other consumers of these dicts that accept tool-authored names, such as `<actions>` / `from_param` metadata options.
