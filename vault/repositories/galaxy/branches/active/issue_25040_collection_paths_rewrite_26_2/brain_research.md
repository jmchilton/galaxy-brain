```yaml
documents:
  - path: vault/repositories/galaxy/reviews/active/23986/collection_paths_repro/test_collection_paths_pulsar.py
    why: Ready-made embedded Pulsar integration test (rewrite_parameters true, default_file_action copy) asserting each accessor equals its per-element counterpart; plus the echo tool XML and job conf next to it.
    load_when: Writing the integration test; also read collection_paths_echo.xml and embedded_pulsar_rewrite_parameters_job_conf.yml in the same directory.
  - path: vault/repositories/galaxy/reviews/active/23986/initial_review.md
    why: P2 1 is the original finding, with the crypt4gh motivation (protected inputs decrypted via input_path_rewrite) and the suggested fix shape; the fix unblocks it.
    load_when: Reviewing, or checking the fix against the crypt4gh use case.
  - path: vault/research/Component - Pulsar Input Staging.md
    why: Explains rewrite_parameters true vs false, which wrapper calls hit PathMapper, and how input_metadata_rewrite entries become staged INPUT_METADATA_PATH inputs.
    load_when: Reasoning about what the compute-environment hooks return under Pulsar and why nothing rewrites the bypassing paths afterwards.
  - path: vault/research/Component - Tool XML Collection Commands.md
    why: Documents the tool-author view of DatasetCollectionWrapper (all_paths, paths_as_file, element iteration); says nothing about compute-environment rewrites.
    load_when: Checking accessor semantics and ordering, or updating docs.
  - path: vault/research/Component - Collection Models.md
    why: DatasetCollection model facets, including the nested-collection attribute query behind element_identifiers_extensions_paths_and_metadata_files that the fix stops using for tool-facing paths.
    load_when: Checking element ordering and flattening parity between the model property and wrapper iteration, and the performance note about the dropped batched query.
  - path: vault/research/Component - Collection Tool Execution Semantics.md
    why: Collection mapping and nested-collection semantics at tool runtime; has an all_paths example.
    load_when: Handling nested, list:paired and paired_or_unpaired elements when flattening through element wrappers.
  - path: vault/repositories/galaxy/reviews/active/24818/learning_galaxy.md
    why: Traces `$input.metadata.<name>` through MetadataWrapper to input_metadata_rewrite and secondary_files_json, the pattern all_metadata_files should follow.
    load_when: Implementing the metadata-file rewrite in DatasetFilenameWrapper.all_metadata_files.
  - path: vault/repositories/galaxy/branches/abandoned/issue_24600_pulsar_none_extra_files_25.1/scope_evaluation.md
    why: Prior check of the sibling compute-environment hooks; documents that hooks may return None meaning no rewrite and which callers tolerate it.
    load_when: Deciding how to handle a None return from input_metadata_rewrite.
  - path: vault/research/Component - YAML Tool Runtime.md
    why: YAML tools call input_path_rewrite directly or fall back to get_file_name() when there is no compute environment; a sibling consumer of the same hooks.
    load_when: Checking that YAML tool paths are unaffected or already correct.
research_requests:
  - vault/agents/gx_research/todo/tool_evaluation_compute_environment.md
  - vault/agents/gx_research/todo/dataset_metadata_files.md
```
