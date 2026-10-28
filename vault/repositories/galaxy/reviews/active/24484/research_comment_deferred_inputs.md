FYI research, not a review finding: why deferred inputs falling back to path staging is correct, even though it looks backwards.

**What happens.** Before the runner builds client inputs, `ToolEvaluator._materialize_objects` materializes every deferred input on the handler. It runs unattached (`materializer_factory(False, transient_directory=<job dir>/inputs, ...)`), so the result is a new, never-flushed `Dataset()` whose `external_filename` is in the job working directory. `get_input_paths(materialized_objects)` puts that transient instance in place of the job's recorded input, so `dataset_id` is `None` and `_client_inputs` gives it no URL. Pulsar then fetches it through the job files API by path. If the dataset has metadata files, they're regenerated as `MetadataTempFile`s, so `_metadata_file_with_path` finds no `MetadataFile` id and they fall back to path staging too.

**Why it looks wrong.** Deferred inputs are the ones least likely to be on Galaxy already. A PR that removes the "pull to Galaxy first" hop could be expected to remove it for them as well, either by signing a URL for the deferred dataset's id or by handing Pulsar the source URI.

**Why it's right:**

1. **The id would be wrong.** The deferred HDA in `job.input_datasets` has a real `Dataset.id`, and the staging manager would accept a URL signed for it. But that dataset has no bytes in the object store; the bytes the tool reads belong to the transient dataset, which has no id. Taking the id from the materialized wrapper rather than from `job.input_datasets` is what makes this correct.
2. **Pulsar can't materialize.** Deferred sources can be `gxfiles://` or other file-source URIs that need user context, vault secrets and Galaxy's file-source plugins. Materialization also checks hashes and regenerates metadata. All of that has to happen in Galaxy.
3. **No surprise replacement datasets.** The `get_replacement_dataset` reuse in `model/deferred.py` could return a different stored dataset, one the manager would reject as "not an input of this job". It only runs in attached mode, and job evaluation is always unattached, so that can't happen here.
4. **Already-materialized inputs are unaffected.** A dataset materialized in place earlier is no longer `DEFERRED`, so `_materialize_objects` skips it. It keeps its store identity and gets a signed URL normally.

**Consequences worth documenting:**

- **Shared disk is still needed for the job directory.** "No shared disk" for this option really means no shared object store cache. For deferred inputs, as for outputs and tool files, the web worker answering Pulsar still has to see the handler's job working directory.
- **Coverage is unit-only.** Only the unit test `test_materialized_inputs_keep_path_staging` covers this, with a mocked `dataset_id=None`. An integration case in `test_pulsar_object_staging.py` with a real deferred input would lock it in.
- **The older action doesn't handle deferred inputs either.** For a materialized input, `object_store_ref` carries `dataset_id=None` and `object_store_id=None`, so `remote_object_store_copy` can't stage it at all.

***Posted by agent [gx_reviews](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_reviews/AGENTS.md) using model Claude Opus 5.5 on John's behalf.***
