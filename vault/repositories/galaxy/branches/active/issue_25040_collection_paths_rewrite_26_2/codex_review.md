# Codex review

Run via gpt-6.2-sol at none effort (as Codex reported). Reviewed head `64d66d54ec3`; the round-2 performance commit (`d0a2d77b062`, cached flattened rows) landed afterwards and was covered by the thermo-nuclear review instead.

Acted on neither finding. Codex's bubblewrap sandbox can't start inside this agent's sandbox, so Codex got the commit list, the full diff, the full HEAD versions of `wrappers.py`, `wrapped_json.py`, `compute_environment.py` and `export_remote.xml`, and excerpts of `pulsar.py`, `evaluation.py` and the model on stdin. It couldn't search the rest of the repository.

1. **Tuples instead of lists for element identifiers in detached (remote tool evaluation) rows: refuted as a regression.** For normal jobs the old model property sliced a SQLAlchemy `Row` (`row[:-3]`), which gives a tuple; I checked this in the scratchpad. Only the sessionless remote-evaluation branch gave lists, via `dataset_elements_and_identifiers()`. The branch now gives tuples everywhere, so a template sees the same type in a remote evaluation as in a normal job. JSON output is unchanged.
2. **`$input.metadata.<name>` and `all_metadata_files` resolve and rewrite the same file separately (P3, reuse): not acted on.** No wrong output: both call the same `_job_metadata_path` with the same Galaxy path, and Pulsar keys `path_rewrites_input_metadata` by that path, so the file is staged once. Sharing a per-file resolver between `MetadataWrapper` and the bulk accessor would add structure to save one path-mapper call per file. #25023 is also rewriting `MetadataWrapper` with a new `input_metadata_rewrite` signature.

<details>

```json
{
  "coverage": {
    "files_reviewed": [
      "lib/galaxy/datatypes/registry.py",
      "lib/galaxy/job_execution/compute_environment.py",
      "lib/galaxy/job_execution/setup.py",
      "lib/galaxy/jobs/runners/pulsar.py",
      "lib/galaxy/model/__init__.py",
      "lib/galaxy/model/metadata.py",
      "lib/galaxy/tools/evaluation.py",
      "lib/galaxy/tools/parameters/wrapped_json.py",
      "lib/galaxy/tools/wrappers.py",
      "test/functional/tools/collection_input_paths.xml",
      "test/functional/tools/sample_tool_conf.xml",
      "test/integration/test_pulsar_embedded_rewrite_parameters_input_paths.py",
      "test/integration/test_remote_files.py",
      "test/unit/app/tools/test_wrappers.py",
      "test/unit/data/test_galaxy_mapping.py",
      "tools/data_export/export_remote.py",
      "tools/data_export/export_remote.xml"
    ],
    "notes": "Reviewed the supplied diff and HEAD source, with selected surrounding code from release_26.2. Unprovided HEAD context could not be inspected locally because the sandbox failed to start. Tests were not run."
  },
  "findings": [
    {
      "severity": "P2",
      "category": "api-contract",
      "file": "lib/galaxy/tools/wrappers.py",
      "line": 819,
      "title": "Detached collection rows change identifier sequences from lists to tuples",
      "detail": "The old sessionless branch returned `_identifiers` from `DatasetCollection.dataset_elements_and_identifiers()`, which builds lists. The replacement passes the tuple produced by `_dataset_elements_with_identifiers()` directly into the public row accessor and into `serialize()`. The baseline tests convert identifiers to lists before comparing them, masking the change.",
      "failure_scenario": "During remote tool evaluation of a detached `list:paired` collection, a Cheetah template that checks whether `$input.serialize()[0]['element_identifier'] == ['sample1', 'forward']` used to take the matching branch. It now skips it because the value is `('sample1', 'forward')`. JSON encoding still produces an array, so JSON-only tests miss the regression.",
      "confidence": "certain"
    },
    {
      "severity": "P3",
      "category": "reuse",
      "file": "lib/galaxy/tools/wrappers.py",
      "line": 502,
      "title": "Named and bulk metadata access resolve and rewrite the same file independently",
      "detail": "`MetadataWrapper.__getattr__` resolves a file parameter and calls `_job_metadata_path` at line 348. `_job_metadata_files` resolves the same file through the model getter and calls the same helper again. The caches sit above these separate lookup paths, so neither accessor can reuse the other's result. A shared per-file resolver would let both accessors reuse the lookup and rewrite.",
      "failure_scenario": "The new Pulsar integration tool renders `$single.metadata.bam_index` and then reads `$single.all_metadata_files` for the same BAM wrapper. Galaxy resolves the BAI filename twice and Pulsar runs the path mapper twice. Pulsar deduplicates the eventual transfer by source path, so the failure is redundant lookup and rewrite work.",
      "confidence": "certain"
    }
  ]
}
```

</details>
