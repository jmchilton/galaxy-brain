Run via Claude Sonnet 5.5 at high effort.

- [x] What does the user see when it fails? An exception in an accessor fails Cheetah command evaluation, so the job errors before running and the admin sees the traceback in the handler log; the only new user-facing check is the existing "element identifier is too long" assertion.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes, mostly behavior (paths, staging layout, rewrites via a Pulsar-like compute environment, plus an embedded Pulsar integration test); only the "computed/loaded once" tests count calls.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes, `a1cc1499005` "Baseline tests for collection and dataset wrapper path accessors" is the first commit.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

<details>
<summary>Evidence</summary>

**Failure modes.** The changed accessors (`all_paths`, `all_metadata_files`, `serialize()`, `data_style="paths"` config output, `get_all_staging_paths`) are evaluated while building the job command line and config files. A raised exception there fails tool evaluation, so the job goes to an error state before launch, with the traceback in the job handler log. Rewrites now go through `compute_environment.input_metadata_rewrite`, so the visible change when it works is that paths match what `$input.metadata.<name>` and `#for $e in $collection` render. `get_all_staging_paths` keeps the existing `assert max_len >= 1, "Could not stage element, element identifier is too long"` for `include_collection_name`.

**Unrelated changes.** Removing `DatasetCollection.element_identifiers_extensions_paths_and_metadata_files` from `model/__init__.py` (and its use in `test_galaxy_mapping.py`) is part of the change: the wrapper now builds these rows from its elements. `sample_tool_conf.xml` and `collection_input_paths.xml` register the new functional tool. No generated files.

**Tests.** Added in `test/unit/app/tools/test_wrappers.py`: path accessors, no collection, repeated identifiers, staging with collection name, dataset metadata accessors, a `StagingComputeEnvironment` that stages inputs and metadata under `/job/inputs`, output metadata not rewritten, and metadata loaded/rewritten once. Also `test_pulsar_embedded_rewrite_parameters_input_paths.py` and `test_export_remote_tool_nested_collection_with_collection_name`. The "once" tests are implementation-coupled by design (they guard the caching).

**Baseline commits.** Order is `a1cc1499005` (baseline tests, unit only), `459ec221701` (nested `include_collection_name` fix with its integration test), then the refactors and the fix. The baseline commit holds the unit tests that pass before the change. The nested-name fix has its own test in its own commit.

**Comments and docstrings read.** `_job_metadata_path` docstring, `all_metadata_files` docstring, the `_job_metadata_files` cache and "Only inputs are staged" comments, the `_DatasetRow` docstrings, the `element_identifiers` parallel-list comment, the `_dataset_rows` cache comment, the `get_all_staging_paths` comments, the `_metadata_files_to_staging_path_and_source_path` docstring, and the test and module docstrings/comments. All describe current behavior or its reason. The one comment closest to history is "Identifiers are shortened by the name's length even though the name is its own path segment; kept so existing staging layouts don't change." It records a deliberate compatibility constraint, not a past bug, so it is not archeology and the last checklist item is N/A.
</details>
