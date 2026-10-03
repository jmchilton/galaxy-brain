Title: Collection output `type_source` crashes for inputs in conditionals and for names ending in `_<digit>`

_Posted by an AI assistant (Claude) on jmchilton's behalf — not personally authored._

A collection output's `type_source` crashes job creation with an `AttributeError` when it points into a conditional or at an input whose name ends in `_<digit>`.

| Tool declares | `type_source` | Result on `dev` |
|---|---|---|
| `data_collection` input `input_collect` at top level | `input_collect` | ✅ works |
| `input_collect` inside `<conditional name="cond">` | `cond\|input_collect` | ❌ `'Conditional' object has no attribute 'inputs'` |
| `input_collect` inside `<conditional name="cond">` | `input_collect` (legacy bare alias) | ❌ `'NoneType' object has no attribute '_history_query'` |
| `data_collection` input `reads_1` at top level | `reads_1` | ❌ `'NoneType' object has no attribute '_history_query'` |

The user sees `Error executing tool with id '…'` with an internal Python error and no mention of the output or the reference. Mapping over `cond|input_collect` doesn't help: Galaxy builds the implicit output collection, then every job fails with the same error, leaving a collection stuck in `failed` and, in a workflow, failing the invocation. `cond|input_collect` is the qualified form that the XSD docs and linter tell authors to use for `structured_like`, so the obvious spelling is the one that crashes.

<details><summary>Reproduce</summary>

Add the tool to `test/functional/tools/sample_tool_conf.xml` and run `pytest test/functional/test_toolbox_pytest.py -k collection_type_source_conditional -m tool`:

```xml
<tool id="collection_type_source_conditional" name="collection_type_source_conditional" version="0.1.0">
  <command>
    mkdir output;
    #for $key in $cond.input_collect.keys()#
    cat "$cond.input_collect[$key]" > output/"$key";
    #end for#
  </command>
  <inputs>
    <conditional name="cond">
      <param name="sel" type="select">
        <option value="a">a</option>
      </param>
      <when value="a">
        <param name="input_collect" type="data_collection" />
      </when>
    </conditional>
  </inputs>
  <outputs>
    <collection name="list_output" type_source="cond|input_collect" format="txt">
      <discover_datasets pattern="__name__" directory="output" visible="true" />
    </collection>
  </outputs>
  <tests>
    <test>
      <conditional name="cond">
        <param name="sel" value="a" />
        <param name="input_collect">
          <collection type="list">
            <element name="samp1" value="simple_line.txt" />
          </collection>
        </param>
      </conditional>
      <output_collection name="list_output" type="list" count="1" />
    </test>
  </tests>
</tool>
```

For the other rows, change `type_source` to `input_collect`, or rename the top-level input to `reads_1` and use `type_source="reads_1"`.

Mapped: copy the tool as `collection_type_source_conditional_mapped`, give the param `collection_type="list"`, and map a `list:list` over it with a framework workflow test (`lib/galaxy_test/workflow/`):

```yaml
class: GalaxyWorkflow
inputs:
  input1:
    type: collection
    collection_type: list:list
outputs:
  wf_output:
    outputSource: tool_step/list_output
steps:
  tool_step:
    tool_id: collection_type_source_conditional_mapped
    state:
      cond:
        sel: a
    in:
      cond|input_collect: input1
```

The invocation fails with `Failed to create 1 job(s) for workflow step 2: Error executing tool with id '…': 'Conditional' object has no attribute 'inputs'`.

Run on `dev` @ `4f78c5014e8`.

</details>

<details><summary>Why it happens</summary>

`OutputCollections.create_collection` (`lib/galaxy/tools/actions/__init__.py`) first checks that the reference is a key of `input_collections`, a `LegacyUnprefixedDict` that also accepts the legacy unqualified alias. Then it walks `tool.inputs` by string to find the `DataCollectionToolParameter`:

```python
for group in collection_type_source.split("|"):
    values = group.split("_")
    if values[-1].isdigit():
        key = "_".join(values[0:-1])   # assumes a repeat index
    else:
        key = group
    if isinstance(data_param, dict):
        data_param = data_param.get(key)
    else:
        data_param = data_param.inputs.get(key)
```

- `Conditional` keeps its children in `cases[...].inputs`, so it has no `.inputs`.
- A trailing `_<digits>` is stripped from every segment, even when that segment isn't a repeat, so `reads_1` is looked up as `reads`.
- A bare alias passes the key check but isn't a top-level key in `tool.inputs`.

This walk runs for every job, mapped or not. When mapped over, `sliced_input_collection_structure` (`lib/galaxy/tools/execute.py`) resolves `type_source` a second time, with different rules, to build the implicit output collection. That pass handles conditionals, so the collection is created before the per-job walk crashes.

</details>

No tool in tools-iuc, bgruening/galaxytools or tools-devteam uses `type_source`, so nothing published is broken today. It's still worth fixing: these are valid references, the error doesn't name the output, and the qualified form is the one tool authors are told to use elsewhere.

## Context

Bug discovered while working on 🔀 #23877, whose draft reference docs describe this walk. Related to 🎯 #23444, which asks for one shared resolver for nested references in output sources.

## Proposed Approach

Stop searching for the parameter after the fact. `collect_input_dataset_collections` already finds every collection input with `tool.visit_inputs`, which follows the active conditional case and knows each `DataCollectionToolParameter`. It builds the exact keys and legacy aliases that `type_source` is checked against. Record the parameter there in a parallel `LegacyUnprefixedDict`, pass it to `OutputCollections`, and replace the string walk with a lookup. If the lookup misses, raise an error naming the output and the `type_source` value. Add the three failing tools above, plus a section, a repeat and a mapped case, as tests.

## Alternative Approaches

We could keep the walk and teach it about grouping types, or wait for the #23444 resolver. Fixing the walk adds a third copy of input-tree traversal (next to `visit_input_values` and `sliced_input_collection_structure`) that can drift from the keys `input_collections` actually holds. The #23444 resolver is the long-term answer, but it's a larger design question. Recording the parameter reuses the traversal that already ran and fixes the crash now.

<details><summary>Alternatives In Detail</summary>

### Alternative: Make the `tool.inputs` walk aware of grouping types

<details><summary>Description</summary>

#### Details

Descend into a section or repeat via `.inputs`, strip `_N` only when the current group is a `Repeat`, and for a `Conditional` pick the active case from the job's parameters (`self.incoming`).

#### Why the proposed approach is preferred

It re-implements, by string parsing, what `visit_input_values` already does structurally, and it has to reproduce the legacy alias rules separately. Recording the parameter during the existing visit can't disagree with the key check, because both come from the same pass.

</details>

### Alternative: Wait for the shared resolver in #23444

<details><summary>Description</summary>

#### Details

Resolve `type_source` with the nested-reference resolver #23444 proposes for all output sources, so that mapped and unmapped resolution agree.

#### Why the proposed approach is preferred

The crash happens today on valid references, and the fix is small. Its tests carry over to the shared resolver unchanged.

</details>

</details>
