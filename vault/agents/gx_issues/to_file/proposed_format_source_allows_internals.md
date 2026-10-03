Title: `format_source` resolves Galaxy's internal input keys (`input2`, `coll2`, conversion names), not just declared inputs

_Posted by an AI assistant (Claude) on jmchilton's behalf — not personally authored._

`format_source` resolves against keys Galaxy creates only while expanding inputs (`input2`, `coll2`, conversion names), and one of those keys silently shadows a declared input.

✅ intended, 😬 works but shouldn't, ❌ wrong, ⚠️ misleading.

| Tool declares                                                                          | `format_source`    | Runtime on `dev` (output `format="txt"` fallback)                      | Linter on `dev`                                     |
| -------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------- | --------------------------------------------------- |
| `<param name="input" type="data" multiple="true">` given `[fasta, bed]`                | `input2`           | 😬 resolves → `bed` (second selected dataset)                           | ✅ ERROR: does not match any input parameter         |
| same param, given a `paired` collection (forward=`bed`, reverse=`fasta`)               | `input['forward']` | 😬 resolves → `bed`                                                     | ✅ ERROR: does not match any input parameter         |
| same param, given a `paired` collection                                                | `input2`           | 😬 resolves → `fasta` (the reverse element)                             | ✅ ERROR                                             |
| `<param name="coll" type="data_collection">` given `list[fasta, bed]`                  | `coll2`            | 😬 resolves → `bed` (second element)                                    | ✅ ERROR                                             |
| `<param name="input1" format="fasta"><conversion name="input1_table" type="tabular"/>` | `input1_table`     | 😬 resolves → `tabular` (the converted dataset)                         | ✅ ERROR                                             |
| multiple `input` given `[fasta]`, plus `cond\|input1` given `bed`                      | `input1`           | ❌ resolves → `fasta`, **`input`'s first dataset**, not `cond\|input1` | ⚠️ WARNING: "Use the qualified name `cond\|input1`" |

The last row is a silent wrong answer, not just an undocumented spelling. `input1` is a legacy alias for `cond|input1`, and the linter treats it that way and suggests qualifying it. But at runtime the numbered key that `multiple="true"` creates for `input` wins the lookup, so the output gets the wrong input's format.

The linter column isn't a safeguard either. It errors on every bracket selector, including the documented `input_collection['forward']` in Galaxy's own `output_format_collection.xml`, and it skips any reference containing `|` without checking it. Runtime and linter disagree in both directions.

The other rows mean the layout of the job-creation dicts is a tool-facing API. An ordinal like `input2` means "the second dataset in the order Galaxy expanded the selection", which for a collection is element order, a choice no tool author made. Renumbering those keys, or changing how conversions or collections given to a `multiple` data parameter are stored, would silently change output formats for any tool that has found one of these forms by trial and error.

Fixing this costs almost nothing today. None of these forms is documented, no tool under `test/functional/tools` uses one, and a scan of 3145 tool XMLs in tools-iuc, bgruening/galaxytools and tools-devteam found none of them among 502 `format_source`/`metadata_source`/`structured_like` references.

<details><summary>Reproduce (API test against test tools)</summary>

Test tools (added to `test/functional/tools/sample_tool_conf.xml`); every output declares `format="txt"`, so `txt` means "not resolved":

```xml
<tool id="fs_internal_multiple" name="fs_internal_multiple" version="0.1.0" profile="26.0">
  <command>echo a > '$out_param'; echo a > '$out_second'; echo a > '$out_selector'</command>
  <inputs>
    <param name="input" type="data" multiple="true" format="data" />
  </inputs>
  <outputs>
    <data name="out_param" format="txt" format_source="input" />
    <data name="out_second" format="txt" format_source="input2" />
    <data name="out_selector" format="txt" format_source="input['forward']" />
  </outputs>
</tool>

<tool id="fs_internal_conversion" name="fs_internal_conversion" version="0.1.0" profile="26.0">
  <command>cat '$input1_table' > '$out_converted'</command>
  <inputs>
    <param name="input1" type="data" format="fasta">
      <conversion name="input1_table" type="tabular" />
    </param>
  </inputs>
  <outputs>
    <data name="out_converted" format="txt" format_source="input1_table" />
  </outputs>
</tool>

<tool id="fs_internal_collection" name="fs_internal_collection" version="0.1.0" profile="26.0">
  <command>echo a > '$out_coll'; echo a > '$out_element2'</command>
  <inputs>
    <param name="coll" type="data_collection" collection_type="list" />
  </inputs>
  <outputs>
    <data name="out_coll" format="txt" format_source="coll" />
    <data name="out_element2" format="txt" format_source="coll2" />
  </outputs>
</tool>

<tool id="fs_internal_collision" name="fs_internal_collision" version="0.1.0" profile="26.0">
  <command>echo a > '$out_alias'; echo a > '$out_qualified'</command>
  <inputs>
    <param name="input" type="data" multiple="true" format="data" />
    <conditional name="cond">
      <param name="sel" type="select"><option value="a">a</option></param>
      <when value="a"><param name="input1" type="data" format="data" /></when>
    </conditional>
  </inputs>
  <outputs>
    <data name="out_alias" format="txt" format_source="input1" />
    <data name="out_qualified" format="txt" format_source="cond|input1" />
  </outputs>
</tool>
```

Run through the tool API with a `fasta` and a `bed` dataset (paired: forward=`bed`, reverse=`fasta`; list: `[fasta, bed]`), each output's extension:

```
multiple[fasta,bed]                        out_param=fasta  out_second=bed    out_selector=txt
multiple <- paired(forward=bed,reverse=fasta)  out_param=bed  out_second=fasta  out_selector=bed
conversion(fasta->tabular)                 out_converted=tabular
collection list[fasta,bed]                 out_coll=fasta   out_element2=bed
collision input=[fasta], cond|input1=bed   out_alias=fasta  out_qualified=bed
```

Linting the same tools reports `ERROR (OutputsFormatSourceReference): Output 'out_second' references format_source='input2' which does not match any input parameter.`, the same for `input['forward']`, `input1_table` and `coll2`, and `WARNING (OutputsFormatSourceReference): Output 'out_alias' uses unqualified format_source='input1'. Use the qualified name 'cond|input1'.`

</details>

<details><summary>Where the keys come from and where they're resolved (dev @ 537915642fa)</summary>

**Keys**, in `lib/galaxy/tools/actions/__init__.py`:
- `_collect_input_datasets` (`:159`):
  - a `multiple` data parameter stores each dataset as `prefixed_name + str(i + 1)`, alongside the parameter name itself, each with a legacy alias (`:239-245`)
  - its conversions are stored as `<conversion_name><i + 1>` (`:250`)
  - a single parameter's conversion is stored as `prefix + conversion_name` (`:283`)
  - each element of a `data_collection` is stored as `prefixed_name + str(i + 1)` (`:351`)
- `collect_input_dataset_collections` (`:377`): a collection given to a `DataToolParameter` is recorded under the parameter's own name (`:395`), which is why a selector on a `multiple` data parameter resolves.

**Resolution:**
- `format_source`: `determine_output_format` calls `resolve_format_source` (`:1305`). `lib/galaxy/job_execution/output_format.py:38` is a plain `if format_source in input_datasets`, then a selector is parsed and looked up in the collections dict. Nothing ties the key back to a declared parameter.
- `metadata_source`: `inp_data.get(metadata_source)` on the same dict (`actions/__init__.py:643`). Same lookup, not exercised at runtime here.
- Linter: `_check_unqualified_reference` (`tool_util/linters/output.py:291`) returns early for any value containing `|` and compares the rest against declared `<param>` names verbatim, so `coll['forward']` never matches `coll`.
- Discovered collection elements: `job_execution/output_collect.py:215-227` resolves `format_source` against the job's recorded input associations, and `MetadataSourceProvider(self.input_datasets)` (`:352`) does the same for metadata. `_record_input_datasets` (`actions/__init__.py:1095`) records every key of `inp_data`, so the internal keys are valid there too.

The keys themselves are load-bearing. They become `JobToInputDatasetAssociation` names, which the job API reports and discovered-output resolution reads. The fix belongs at the reference layer, not in how inputs are recorded.

</details>

## Context

Related to 🎯 #23444, which asks to settle the nested output-reference syntax and centralize parsing and resolution so runtime, linting and model validation stop diverging. This issue is a concrete, reproduced instance of that divergence for XML tools, and the runtime half of the fix. The XML linter check (`OutputsFormatSourceReference`, from 🔀 #22432 and 🔀 #23459) flags these keys only because it matches names verbatim. 🔀 #23877 documents the numbered-key collision with legacy aliases. Draft 🔀 #11803 (2021) tried to avoid the collision by renaming the numbered keys and stalled over changing how job inputs are recorded.

## Proposed Approach

Resolve output references against the tool's declared inputs first, and only then fetch the runtime value by that parameter's canonical key: parse the reference into a parameter path plus an optional selector, accept it only if the path names a declared `data`/`data_collection` parameter (qualified, or the existing innermost-conditional legacy alias), and accept a selector only on a `data_collection` parameter. Share that resolver with the linter, so they can't disagree again.

<details><summary>Proposed Approach In Detail</summary>

- **One resolver.** Build it over the parsed parameter tree, as #23444 proposes, and call it from `resolve_format_source`, the `metadata_source` lookup at job creation, discovered-output resolution and `OutputsFormatSourceReference`.
- **Legacy aliases win over expansion keys.** A bare name that is a declared parameter's legacy alias resolves to that parameter, which fixes the collision row.
- **Fail early, behind a profile.** No published tool uses an internal key, so restricting the lookup needs no gate. Erroring on an unresolvable reference does: some published tools already reference nothing (galaxytools `rpy_statistics_collection/pca.xml` has `format_source="input"` with no such parameter, tools-iuc `ncbi_fcs_gx` has `metadata_source="mode.input"`) and silently fall back today. Log a warning for all profiles and make it a tool-load error from the next profile.
- **Recording unchanged.** `JobToInputDatasetAssociation` names and the `name1…N` keys stay as they are. Only what references may name changes. A declared top-level `input1` next to a multiple `input` (the #11803 case) still overwrites one entry in the dict itself. A reference fix can't repair that, but the shared resolver can lint it.
- **Tests:**
  - red-to-green API tests built from the tools above: `input2`, `coll2`, `input1_table` and `input['forward']` rejected; the collision resolves to `cond|input1`
  - red-to-green linter test: `output_format_collection.xml` lints clean
  - existing `format_source_in_conditional`, `collection_format_source_discover` and `output_format_collection` tests stay green.

</details>

## Alternative Approaches

Documenting the keys would lock in internals, and renaming them would break recorded job inputs. Leaving it to the linter fixes nothing at runtime. Resolving against declared inputs is the only option that makes the linter and the runtime agree without changing what jobs record.

<details><summary>Alternatives In Detail</summary>

### Alternative: Document the internal keys as supported

<details><summary>Description</summary>

#### Details

Declare `name<N>`, conversion names and selectors on `multiple` data parameters as supported reference forms, and relax the linter to match.

#### Why the proposed approach is preferred

It turns expansion order into a public contract that tool authors can't control, and it still leaves the collision row resolving to the wrong input.

</details>

### Alternative: Rename the internal keys so they can't be guessed

<details><summary>Description</summary>

#### Details

Store expansion keys under a reserved form (e.g. `input#2`) that no declared parameter can collide with.

#### Why the proposed approach is preferred

Draft #11803 tried this (`input.1`) and stalled on the objection that it makes job inputs recorded inconsistently. The keys are `JobToInputDatasetAssociation` names, which the job API exposes and discovered-output resolution reads. Renaming them changes stored and reported data, while resolving references by declared parameter changes nothing persisted.

</details>

### Alternative: Rely on the linter

<details><summary>Description</summary>

#### Details

The linter already errors on these forms, so leave the runtime alone.

#### Why the proposed approach is preferred

Linting is advisory and many tools are never linted against current Galaxy. The linter only rejects these forms because it matches names verbatim, which also makes it reject documented selectors. The collision case only gets a warning, and the warning implies the runtime will pick `cond|input1` when it doesn't.

</details>

</details>
