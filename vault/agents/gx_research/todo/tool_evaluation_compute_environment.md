# Component - Tool Evaluation and Compute Environment

How a job's command line is built from a tool: `ToolEvaluator` / `PartialToolEvaluator` / `RemoteToolEvaluator`, the `ComputeEnvironment` abstraction (`job_execution/compute_environment.py`: `SimpleComputeEnvironment`, `SharedComputeEnvironment`, the Pulsar and Kubernetes/coexecution subclasses) and the path-rewrite hooks it exposes (`input_path_rewrite`, `output_path_rewrite`, `input_extra_files_rewrite`, `output_extra_files_rewrite`, metadata and unstructured rewrites), plus the `tools/wrappers.py` dataset wrappers (`DatasetFilenameWrapper`, collection wrappers) and `tools/runtime.py` helpers that call those hooks lazily during template evaluation. Cover the `None`-means-no-rewrite convention and which callers fall back to local paths, materialization of deferred datasets, and how YAML-tool paths and data-manager bundle paths go through the same hooks. Leave out Pulsar staging itself (covered by `Component - Pulsar Input Staging`) and tool parsing.

## Why

Fixing Pulsar `default_file_action: none` extra-files crashes required tracing the wrapper-to-compute-environment hook contract by reading code; no note covers it, and `Component - Pulsar Input Staging` only describes the Pulsar side.

## Requested by

- vault/repositories/galaxy/branches/abandoned/issue_24600_pulsar_none_extra_files_25.1/brain_research.md: needed the contract for the path-rewrite hooks and which wrapper callers tolerate `None`.
- vault/repositories/galaxy/branches/active/issue_25040_collection_paths_rewrite_26_2/brain_research.md: needed which tool-facing path accessors (`DatasetCollectionWrapper.all_paths`/`all_metadata_files`/`serialize`, `wrapped_json.py` `data_style` helpers, `DatasetFilenameWrapper.all_metadata_files`) honor the compute-environment hooks and which read model paths directly; also the remote (sessionless) tool-evaluation path of `DatasetCollection.element_identifiers_extensions_paths_and_metadata_files`.
- vault/repositories/galaxy/reviews/active/25023: needed `RemoteComputeEnvironment`, the `compute_environment.json` path map, the new `input_metadata_rewrite(dataset, metadata_name, metadata_file)` signature, and `RemoteToolEvaluator` without an object store.
- vault/repositories/galaxy/branches/active/tool_security_review_spec/brain_research.md: needs the rest of `ToolEvaluator` too (`build_param_dict`, `wrap_values`, `__sanitize_param_dict`, how input wrappers, collection element identifiers, dataset metadata and tags reach the Cheetah namespace), plus how to build real model objects and run `ToolEvaluator.build()` outside a full job; a security review of templates and per-job input checking hooks in exactly there. Please widen the note's scope to cover `param_dict` construction and sanitization.
