**Title:** Collection `all_paths`, `serialize()` and `all_metadata_files` hand tools Galaxy-side paths instead of the job's compute-side paths

Under a compute environment that rewrites input paths, such as Pulsar with `rewrite_parameters: true`, `$collection.all_paths`, `$collection.serialize()`, `$collection.all_metadata_files`, `<inputs data_style="paths"/>` config files, and single-dataset `all_metadata_files` / `serialize()` metadata files skip the rewrite and give the tool Galaxy's object store paths.

One job on an embedded Pulsar destination with `rewrite_parameters: true` and `default_file_action: copy`, `dev` at `91c8ec88e0e`. The tool echoes each accessor. The job ran in `<db>/pulsar_staging/2/working`, and Pulsar staged every input, metadata files included, into `<db>/pulsar_staging/2/inputs/`:

| Tool sees | Accessor | Path the tool got |
|---|---|---|
| ✅ | `#for $e in $input1#` → `$e` | `<db>/pulsar_staging/2/inputs/dataset_41091258….dat` |
| ❌ | `$input1.all_paths` | `<db>/objects/4/1/0/dataset_41091258….dat` |
| ❌ | `$input1.serialize()` → `source_path` | `<db>/objects/4/1/0/dataset_41091258….dat` |
| ❌ | `<inputs data_style="paths"/>` → `input1` | `<db>/objects/4/1/0/dataset_41091258….dat` |
| ✅ | `$e.metadata.bam_index` | `<db>/pulsar_staging/2/inputs/metadata_metadata_473a46c0….dat` |
| ❌ | `$input1.all_metadata_files` | `<db>/objects/_metadata_files/4/7/3/metadata_473a46c0….dat` |
| ❌ | `$input1.serialize()` → `metadata_files` | `<db>/objects/_metadata_files/4/7/3/metadata_473a46c0….dat` |
| ✅ | `$single` / `$single.serialize()` → `source_path` | `<db>/pulsar_staging/2/inputs/dataset_671b8414….dat` |
| ✅ | `$single.metadata.bam_index` | `<db>/pulsar_staging/2/inputs/metadata_metadata_e286202e….dat` |
| ❌ | `$single.all_metadata_files` / `$single.serialize()` → `metadata_files` | `<db>/objects/_metadata_files/e/2/8/metadata_e286202e….dat` |
| ✅ | `<inputs data_style="paths"/>` → `single` | `<db>/pulsar_staging/2/inputs/dataset_671b8414….dat` |

✅ the compute-side (staged) path; ❌ the Galaxy-side path. `<db>` is the test Galaxy's `database/` directory.

Embedded Pulsar shares a host with Galaxy, so the ❌ paths still exist and the job succeeds. It reads Galaxy's copy instead of the staged copy. On a Pulsar host without Galaxy's filesystem those paths are missing. Under any compute environment whose `input_path_rewrite` points at a transformed copy of the input, the tool reads the untransformed original. Tools in this repository already rely on these accessors: `tools/data_export/export_remote.xml` builds its file list from `$infiles.serialize()` and `$incollection.serialize()`.

<details><summary>Full tool output</summary>

```
ALL_PATHS: <db>/objects/4/1/0/dataset_41091258-4afd-4b66-970b-21632afdd0d5.dat <db>/objects/7/f/6/dataset_7f687228-dfec-4bf5-8268-e90c2fec79a1.dat
FOR_LOOP: <db>/pulsar_staging/2/inputs/dataset_41091258-4afd-4b66-970b-21632afdd0d5.dat <db>/pulsar_staging/2/inputs/dataset_7f687228-dfec-4bf5-8268-e90c2fec79a1.dat
COLL_ALL_METADATA_FILES: <db>/objects/_metadata_files/4/7/3/metadata_473a46c0-f243-405e-ba43-70c59c33d3cb.dat <db>/objects/_metadata_files/a/b/9/metadata_ab9228b1-0867-4eee-9e6e-e8dd714d3c6d.dat
COLL_FOR_METADATA_PARAM: <db>/pulsar_staging/2/inputs/metadata_metadata_473a46c0-f243-405e-ba43-70c59c33d3cb.dat <db>/pulsar_staging/2/inputs/metadata_metadata_ab9228b1-0867-4eee-9e6e-e8dd714d3c6d.dat
COLL_SERIALIZE_SOURCE: <db>/objects/4/1/0/dataset_41091258-4afd-4b66-970b-21632afdd0d5.dat <db>/objects/7/f/6/dataset_7f687228-dfec-4bf5-8268-e90c2fec79a1.dat
COLL_SERIALIZE_METADATA: <db>/objects/_metadata_files/4/7/3/metadata_473a46c0-f243-405e-ba43-70c59c33d3cb.dat <db>/objects/_metadata_files/a/b/9/metadata_ab9228b1-0867-4eee-9e6e-e8dd714d3c6d.dat
SINGLE: <db>/pulsar_staging/2/inputs/dataset_671b8414-a243-4d9b-8abd-b5cbfb866fca.dat
SINGLE_METADATA_PARAM: <db>/pulsar_staging/2/inputs/metadata_metadata_e286202e-c93e-4a5e-b8ba-cc8a16ce3b6c.dat
SINGLE_ALL_METADATA_FILES: <db>/objects/_metadata_files/e/2/8/metadata_e286202e-c93e-4a5e-b8ba-cc8a16ce3b6c.dat
SINGLE_SERIALIZE_SOURCE: <db>/pulsar_staging/2/inputs/dataset_671b8414-a243-4d9b-8abd-b5cbfb866fca.dat
SINGLE_SERIALIZE_METADATA: <db>/objects/_metadata_files/e/2/8/metadata_e286202e-c93e-4a5e-b8ba-cc8a16ce3b6c.dat
JSON_PATHS_CONFIGFILE: {"input1": ["<db>/objects/4/1/0/dataset_41091258-4afd-4b66-970b-21632afdd0d5.dat", "<db>/objects/7/f/6/dataset_7f687228-dfec-4bf5-8268-e90c2fec79a1.dat"], "single": "<db>/pulsar_staging/2/inputs/dataset_671b8414-a243-4d9b-8abd-b5cbfb866fca.dat"}
JOB_DIRECTORY: <db>/pulsar_staging/2/working
```

</details>

## Why

`$input`, `#for $e in $collection`, and `$input.metadata.<file param>` render through `DatasetFilenameWrapper`, which asks the job's compute environment for the path (`compute_environment.input_path_rewrite` / `input_metadata_rewrite`). The accessors above read paths straight from the model. With `rewrite_parameters: true`, Galaxy leaves path rewriting to the compute environment, and the Pulsar client skips its textual rewrite of the command line and config files (`rewrite_paths = not rewrite_parameters`). Nothing rewrites these paths afterwards.

<details><summary>Code pointers (dev @ 91c8ec88e0e)</summary>

- Rewritten: [`lib/galaxy/tools/wrappers.py#L419-L428`](https://github.com/galaxyproject/galaxy/blob/91c8ec88e0e1c8ff98e7f1ae9096e2a02caf0d7c/lib/galaxy/tools/wrappers.py#L419-L428), where `DatasetFilenameWrapper` sets `false_path` from `compute_environment.input_path_rewrite`. [`#L335-L338`](https://github.com/galaxyproject/galaxy/blob/91c8ec88e0e1c8ff98e7f1ae9096e2a02caf0d7c/lib/galaxy/tools/wrappers.py#L335-L338): `MetadataWrapper` file params go through `input_metadata_rewrite`.
- Bypass, collections: [`DatasetCollectionWrapper.all_paths` / `all_metadata_files` / `element_identifiers_extensions_paths_and_metadata_files`, `wrappers.py#L775-L796`](https://github.com/galaxyproject/galaxy/blob/91c8ec88e0e1c8ff98e7f1ae9096e2a02caf0d7c/lib/galaxy/tools/wrappers.py#L775-L796) read [`DatasetCollection.element_identifiers_extensions_paths_and_metadata_files`, `lib/galaxy/model/__init__.py#L8323-L8352`](https://github.com/galaxyproject/galaxy/blob/91c8ec88e0e1c8ff98e7f1ae9096e2a02caf0d7c/lib/galaxy/model/__init__.py#L8323-L8352), which calls `Dataset.get_file_name()` and `get_metadata_file_paths_and_extensions()` directly.
- Bypass, JSON: [`data_collection_input_to_path` / `data_collection_input_to_staging_path_and_source_path`, `lib/galaxy/tools/parameters/wrapped_json.py#L43-L72`](https://github.com/galaxyproject/galaxy/blob/91c8ec88e0e1c8ff98e7f1ae9096e2a02caf0d7c/lib/galaxy/tools/parameters/wrapped_json.py#L43-L72) back `DatasetCollectionWrapper.serialize()` and `<inputs data_style="paths"|"staging_path_and_source_path"/>` for collection params ([`#L146-L150`](https://github.com/galaxyproject/galaxy/blob/91c8ec88e0e1c8ff98e7f1ae9096e2a02caf0d7c/lib/galaxy/tools/parameters/wrapped_json.py#L144-L151)).
- Bypass, single dataset metadata files: [`DatasetFilenameWrapper.all_metadata_files`, `wrappers.py#L476-L481`](https://github.com/galaxyproject/galaxy/blob/91c8ec88e0e1c8ff98e7f1ae9096e2a02caf0d7c/lib/galaxy/tools/wrappers.py#L476-L481) calls `get_metadata_file_paths_and_extensions()` ([`model/__init__.py#L6069-L6078`](https://github.com/galaxyproject/galaxy/blob/91c8ec88e0e1c8ff98e7f1ae9096e2a02caf0d7c/lib/galaxy/model/__init__.py#L6069-L6078)), which feeds `metadata_files` in `serialize()` ([`wrapped_json.py#L75-L88`](https://github.com/galaxyproject/galaxy/blob/91c8ec88e0e1c8ff98e7f1ae9096e2a02caf0d7c/lib/galaxy/tools/parameters/wrapped_json.py#L75-L88)). The dataset's own `source_path` is fine because it renders the wrapper.
- No textual rewrite: [`lib/galaxy/jobs/runners/pulsar.py#L473`](https://github.com/galaxyproject/galaxy/blob/91c8ec88e0e1c8ff98e7f1ae9096e2a02caf0d7c/lib/galaxy/jobs/runners/pulsar.py#L473), [`#L605-L609`](https://github.com/galaxyproject/galaxy/blob/91c8ec88e0e1c8ff98e7f1ae9096e2a02caf0d7c/lib/galaxy/jobs/runners/pulsar.py#L605-L609), [`#L677`](https://github.com/galaxyproject/galaxy/blob/91c8ec88e0e1c8ff98e7f1ae9096e2a02caf0d7c/lib/galaxy/jobs/runners/pulsar.py#L677).

</details>

## Reproduction

Run the tool below on a `list:bam` collection plus one `bam` dataset, on a destination that uses the job config below. Pulsar stages the inputs. Compare `ALL_PATHS` with `FOR_LOOP`, and each `*_ALL_METADATA_FILES` / `*_SERIALIZE_METADATA` line with the matching `*_METADATA_PARAM` line.

<details><summary>Tool XML</summary>

```xml
<tool id="collection_paths_echo" name="collection_paths_echo" version="0.1.0" profile="24.0">
    <command><![CDATA[
echo 'ALL_PATHS:#for $p in $input1.all_paths# $p#end for#' > '$out' &&
echo 'FOR_LOOP:#for $e in $input1# $e#end for#' >> '$out' &&
echo 'COLL_ALL_METADATA_FILES:#for $mfs in $input1.all_metadata_files##for $mf in $mfs# $mf[1]#end for##end for#' >> '$out' &&
echo 'COLL_FOR_METADATA_PARAM:#for $e in $input1# $e.metadata.bam_index#end for#' >> '$out' &&
echo 'COLL_SERIALIZE_SOURCE:#for $s in $input1.serialize()# $s["source_path"]#end for#' >> '$out' &&
echo 'COLL_SERIALIZE_METADATA:#for $s in $input1.serialize()##for $m in $s["metadata_files"]# $m["source_path"]#end for##end for#' >> '$out' &&
echo 'SINGLE: $single' >> '$out' &&
echo 'SINGLE_METADATA_PARAM: $single.metadata.bam_index' >> '$out' &&
echo 'SINGLE_ALL_METADATA_FILES:#for $mf in $single.all_metadata_files# $mf[1]#end for#' >> '$out' &&
#set $single_serialized = $single.serialize()
echo 'SINGLE_SERIALIZE_SOURCE: $single_serialized["source_path"]' >> '$out' &&
echo 'SINGLE_SERIALIZE_METADATA:#for $m in $single_serialized["metadata_files"]# $m["source_path"]#end for#' >> '$out' &&
printf 'JSON_PATHS_CONFIGFILE: ' >> '$out' &&
cat '$json_paths' >> '$out' &&
echo '' >> '$out' &&
echo "JOB_DIRECTORY: \$(pwd)" >> '$out'
    ]]></command>
    <configfiles>
        <inputs name="json_paths" data_style="paths" />
    </configfiles>
    <inputs>
        <param name="input1" type="data_collection" collection_type="list" format="bam" />
        <param name="single" type="data" format="bam" />
    </inputs>
    <outputs>
        <data name="out" format="txt" />
    </outputs>
</tool>
```

</details>

<details><summary>Job config (plus <code>object_store_store_by: uuid</code>, <code>outputs_to_working_directory: false</code>)</summary>

```yaml
runners:
  local:
    load: galaxy.jobs.runners.local:LocalJobRunner
  pulsar_embed:
    load: galaxy.jobs.runners.pulsar:PulsarEmbeddedJobRunner
    pulsar_app_config:
      tool_dependency_dir: none
      conda_auto_init: false
      conda_auto_install: false
execution:
  default: pulsar_embed
  environments:
    local:
      runner: local
    pulsar_embed:
      runner: pulsar_embed
      default_file_action: copy
      rewrite_parameters: true
tools:
- id: __DATA_FETCH__
  environment: local
```

</details>

As an integration test, the run above uses `PulsarEmbeddedJobRunner`, uploads `test-data/1.bam` twice as a list and once as a dataset, then asserts that each accessor matches its per-element counterpart. On `dev` it fails on all six pairs: `all_paths`, collection `serialize()` `source_path`, collection `all_metadata_files`, collection `serialize()` `metadata_files`, single `all_metadata_files`, single `serialize()` `metadata_files`.

With `rewrite_parameters: false` on the same embedded setup, every path stays Galaxy-side, `$input` and `#for` included, so that mode makes no useful comparison here.

## Context

Bug discovered while reviewing 🔀 #23986 (Crypt4GH-encrypted datasets). That PR decrypts inputs for a job through `input_path_rewrite`, so a tool that reads a collection through `all_paths` or `serialize()` gets the ciphertext path instead of the decrypted copy. Bug related to 🎯 #25012: the mirror image, where Galaxy-side code (`load_contents`) reads the rewritten compute-side path.

## Proposed Approach

Make every tool-facing path accessor ask the job's compute environment for its paths, for every job, not only Pulsar ones. The collection accessors would build their tuples from the per-element `DatasetFilenameWrapper`s the collection wrapper already constructs. Those wrappers carry `false_path`, and their `metadata` wrapper applies `input_metadata_rewrite`. `DatasetFilenameWrapper.all_metadata_files` would route each metadata file through `compute_environment.input_metadata_rewrite`. The JSON helpers then pick up the fix for free. The model property `DatasetCollection.element_identifiers_extensions_paths_and_metadata_files` stays Galaxy-side for callers that need Galaxy paths.

<details><summary>Approach in detail</summary>

- `DatasetCollectionWrapper.element_identifiers_extensions_paths_and_metadata_files` (and so `all_paths`, `all_metadata_files`, `get_all_staging_paths`, `serialize`) iterates the element wrappers in collection order, flattening nested collections, and yields `(identifiers, ext, str(element_wrapper), element_wrapper.all_metadata_files)`. This drops the single batched query the model property uses, so large-collection performance needs a check.
- `DatasetFilenameWrapper.all_metadata_files` keeps `(file_ext, path)` and maps `path` through `compute_environment.input_metadata_rewrite(dataset, path)` when the environment returns a rewrite.
- Add the repro above as an embedded Pulsar integration test (`rewrite_parameters: true`, `default_file_action: copy`), plus a unit test with a stub compute environment that rewrites every path, so the local runner covers it too.

</details>

## Alternative Approaches

One alternative exposes both views explicitly, with separate Galaxy-side and compute-side path accessors. Another rewrites these paths after rendering, as Pulsar's textual rewrite does when `rewrite_parameters` is off. Routing through the compute environment is preferred because `$input` already works that way, and these accessors are only ever rendered into the job, where the compute-side path is the only correct one.

<details><summary>Alternatives In Detail</summary>

### Alternative: Separate Galaxy-side and compute-side accessors

<details><summary>Description</summary>

#### Details

Keep `all_paths` as is and add `all_compute_paths` (and matching `serialize(..., compute_paths=True)`), or make the tuple carry both.

#### Why the proposed approach is preferred

Tools never have a use for the Galaxy-side path inside a job, and existing tools such as `export_remote` would stay broken until each one opts in. Two names for "the path" also invite this bug again.

</details>

### Alternative: Rewrite after rendering

<details><summary>Description</summary>

#### Details

Post-process the rendered command line and config files, mapping each known Galaxy input path to its compute-side path, as the Pulsar client does without `rewrite_parameters`.

#### Why the proposed approach is preferred

Textual substitution is what `rewrite_parameters` exists to avoid. It misses paths a tool builds or encodes, and it can't express rewrites that aren't one-to-one string swaps, such as a decrypted copy that only exists for this job.

</details>

</details>
