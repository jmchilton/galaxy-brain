# Learning Galaxy follow-up — PR #25023

Reviewed commit: `ff96b8bb47c49cd0886b04747bc1825bc8e25601`. Profile `learning_galaxy`, Claude Opus 5.5, effort medium.

## Stale research vs. the pre-PR baseline

No semantic conflicts found. One stale citation:

- `vault/research/Component - Galaxy Pulsar Runner Code Sharing.md` (Channel 4 paragraph) cites `lib/galaxy/jobs/command_factory.py:212-213` for the command that runs `remote_tool_eval.py` from `$GALAXY_LIB`. On the `release_26.2` merge base (`4d02c778c4c7`) those commands are the `REMOTE_TOOL_EVAL_*` constants at `:43-49`, used by `__handle_remote_command_line_building` at `:241-249`. The note's description (Pulsar picks between the `$GALAXY_LIB` source form and the `galaxy-remote-tool-eval` package form) is still right.

Line drift in `Component - Pulsar Input Staging.md` (`__prepare_job` `:568` is now `:587`, `PulsarComputeEnvironment` `:1401` is now `:1433`) is ordinary drift, not a conflict.

## Post-merge activities (if #25023 merges)

- `Component - Pulsar Input Staging.md`:
  - Step 4 (client inputs): under `tool_evaluation_strategy: remote`, deferred inputs are skipped from `ClientInput`s and materialized by the remote evaluator, not substituted by `materialized_objects`.
  - Step 2 / "Who chooses remote paths" table: under remote evaluation Galaxy still chooses the paths through `PulsarComputeEnvironment`, but records them in `metadata/outputs_new/compute_environment.json` and the command is built on the node. `rewrite_parameters` is forced on and `remote_metadata: true` is required.
  - Step 3: `input_metadata_rewrite` now takes `(dataset, metadata_name, metadata_file)`.
  - Step 5: `ClientJobDescription` also carries `Tool.job_directory_files` (expression tool scripts/inputs) as job-directory and config files, and the whole tool directory when a remote-evaluation tool has no `<required_files>`.
- `Component - Galaxy Pulsar Runner Code Sharing.md`, Channel 4: remote evaluation no longer rebuilds an object store on the node or receives `object_store_conf.json`; it reads `compute_environment.json`. Still needs a matching Galaxy runtime, and REST/embedded Pulsar destinations need `PYTHONPATH=$GALAXY_LIB` for expression tools until Pulsar forwards `preserve_galaxy_python_environment`.
- `Component - Tool Citations and External Metadata Fetch.md`: the `remote_tool_eval.py:71` citation for `biotools_metadata_source = None` shifts with the `ToolApp` changes; refresh the line.
- Pending research requests to fold this in when written: `vault/agents/gx_research/todo/tool_evaluation_compute_environment.md` (`RemoteComputeEnvironment`, the id-keyed path map, new `input_metadata_rewrite` signature, wrapper accessors now routed through the environment) and `vault/agents/gx_research/todo/job_preparation_and_job_script.md` (remote-evaluation files in `prepare()`, `remote_tool_eval && { ... }` guard, `remote_command_line.txt` read in `finish()`).
- Branch record `vault/repositories/galaxy/branches/active/issue_25040_collection_paths_rewrite_26_2/`: #25023 rewrites `DatasetFilenameWrapper.all_metadata_files` and `DatasetCollectionWrapper.element_identifiers_extensions_paths_and_metadata_files` to go through the compute environment; reconcile with that branch's fix.
