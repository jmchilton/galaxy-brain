Run via gpt-6.1-sol at none effort.

# Codex review debrief

Codex raised one finding. I refuted it and made no code changes. On the first run Codex's sandbox (`bwrap: loopback: Failed RTM_NEWADDR`) couldn't execute shell commands, so it read nothing. I reran it with the diff, the surrounding Galaxy code (`pulsar.py`, `compute_environment.py`, `wrappers.py`), the pinned Pulsar `path_mapper.py`/`action_mapper.py`, and the dev callers (`runtime.py`, `_bundle_path_rewrite`) passed on stdin.

Not acted on:
- **P2 "Preserve the local compute environment's extra-files path" (likely): REFUTED.** Codex suggested falling back to `local_path_config.{input,output}_extra_files_rewrite` instead of `dataset.extra_files_path`.
  - Inputs: `SharedComputeEnvironment.input_path_rewrite` is `str(job_io.get_input_path(dataset))`. Pulsar jobs have no input rewriter; only the `TaskPathRewriter` for split tasks rewrites inputs, and none of the job dataset path rewriters in `job_execution/datasets.py` do. So the local path is `dataset.get_file_name()`, and the extra-files directory beside it is `dataset.extra_files_path`. Codex's "materialized" scenario doesn't apply: a materialized input is a different `DatasetInstance` whose own `get_file_name()`/`extra_files_path` already point at the materialized copy.
  - Outputs (only with `outputs_to_working_directory: true`): when Pulsar returns `None`, the primary output path already falls back to `dataset.get_file_name()` and ignores the local false path. That fallback is in `wrappers.py` `DatasetFilenameWrapper.__init__` (line 415: `false_path` set only if the rewrite is truthy) and `__str__` (lines 491-494). Using the local mapping for extra files alone would put them in the job working directory while the primary goes to the object store. Matching the primary path is the consistent choice. The `none` + `outputs_to_working_directory` combination is a pre-existing quirk of the primary path. It's recorded in the implementation debrief, not fixed here.

<details><summary>Full Codex output</summary>

```json
{
  "coverage": {
    "files_reviewed": [
      "lib/galaxy/jobs/runners/pulsar.py",
      "lib/galaxy/job_execution/compute_environment.py",
      "lib/galaxy/tools/wrappers.py",
      "pulsar/client/path_mapper.py",
      "pulsar/client/action_mapper.py",
      "test/integration/embedded_pulsar_none_local_metadata_job_conf.yml",
      "test/integration/test_pulsar_embedded_none_local_metadata.py",
      "test/unit/app/jobs/test_pulsar_compute_environment.py",
      "lib/galaxy/tools/runtime.py"
    ],
    "notes": "Reviewed all supplied code, including dev excerpts. No commands or tests were run; review was limited to stdin."
  },
  "findings": [
    {
      "severity": "P2",
      "category": "correctness",
      "file": "lib/galaxy/jobs/runners/pulsar.py",
      "line": 1209,
      "title": "Preserve the local compute environment's extra-files path when Pulsar does not rewrite it",
      "detail": "A None result from PathMapper means the path passed to it remains unchanged. That path can already have been rewritten by local_path_config, as input_path_rewrite and output_path_rewrite explicitly allow. Returning dataset.extra_files_path discards that local mapping. The existing local_path_config.input_extra_files_rewrite/output_extra_files_rewrite abstractions already resolve these paths, but neither fallback uses them. The unit fake always returns None for local rewrites, hiding this case.",
      "failure_scenario": "The local compute environment maps an input to /shared/materialized/dataset_1.dat, with extra files at /shared/materialized/dataset_1_files, while dataset.extra_files_path is /store/dataset_1_files. With default_file_action='none', Pulsar's mapper returns None for the materialized path. The new hook returns /store/dataset_1_files, so a command using $input.extra_files_path reads the original location instead of the materialized extra files and fails if that location is unavailable.",
      "confidence": "likely"
    }
  ]
}
```

</details>
