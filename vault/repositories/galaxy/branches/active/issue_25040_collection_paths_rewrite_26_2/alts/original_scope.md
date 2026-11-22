# Alt: original scope

Branch [`issue_25040_collection_paths_rewrite_26_2_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/issue_25040_collection_paths_rewrite_26_2_alt_original_scope) at `d525f5da834`, base `release_26.2`.

The branch as first hardened, before the scope evaluation's expansion. It routes collection `all_paths` / `all_metadata_files` / `serialize()` / `data_style="paths"` and single-dataset `all_metadata_files` through the compute environment, caches metadata paths per wrapper, and deletes the model property.

Differences from the parent:

- `get_all_staging_paths(include_collection_name=True)` still prefixes the collection name at every nesting level (`input1/sample1/input1/forward.bam`).
- `all_metadata_files` asks for `input_metadata_rewrite` on output wrappers too.
- The integration test is `test/integration/test_pulsar_embedded_rewrite_parameters.py`, the same path as one added by draft PR #25021.
