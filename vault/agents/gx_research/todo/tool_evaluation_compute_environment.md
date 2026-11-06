# Component - Tool Evaluation and Compute Environment

How a job's command line is built from a tool: `ToolEvaluator` / `PartialToolEvaluator` / `RemoteToolEvaluator`, the `ComputeEnvironment` abstraction (`job_execution/compute_environment.py`: `SimpleComputeEnvironment`, `SharedComputeEnvironment`, the Pulsar and Kubernetes/coexecution subclasses) and the path-rewrite hooks it exposes (`input_path_rewrite`, `output_path_rewrite`, `input_extra_files_rewrite`, `output_extra_files_rewrite`, metadata and unstructured rewrites), plus the `tools/wrappers.py` dataset wrappers (`DatasetFilenameWrapper`, collection wrappers) and `tools/runtime.py` helpers that call those hooks lazily during template evaluation. Cover the `None`-means-no-rewrite convention and which callers fall back to local paths, materialization of deferred datasets, and how YAML-tool paths and data-manager bundle paths go through the same hooks. Leave out Pulsar staging itself (covered by `Component - Pulsar Input Staging`) and tool parsing.

## Why

Fixing Pulsar `default_file_action: none` extra-files crashes required tracing the wrapper-to-compute-environment hook contract by reading code; no note covers it, and `Component - Pulsar Input Staging` only describes the Pulsar side.

## Requested by

- vault/repositories/galaxy/branches/abandoned/issue_24600_pulsar_none_extra_files_25.1/brain_research.md: needed the contract for the path-rewrite hooks and which wrapper callers tolerate `None`.
