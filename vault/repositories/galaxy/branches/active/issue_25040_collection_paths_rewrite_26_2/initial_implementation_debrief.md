# Initial implementation debrief

Fixes [#25040](https://github.com/galaxyproject/galaxy/issues/25040). Base `release_26.2` (`4cc69d30122`), head `7a484fe459a`. 7 files, +331/−60.

```
created /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/issue_25040_collection_paths_rewrite_26_2/differential-review/snapshots/20261122T151615Z-implementation-7a484fe459a6.json
  implementation @ 7a484fe459a6 vs origin/release_26.2 (merge-base 4cc69d30122e)
  first snapshot: 3 commits, 7 files, 14 hunks
```

## Commits

1. `Baseline tests for collection and dataset wrapper path accessors`: unit tests pinning `all_paths`, `all_metadata_files`, `serialize()` and `data_style="paths"` output without a rewriting compute environment. Green on the base.
2. `Route collection and metadata file path accessors through the compute environment`: the fix, plus the rewriting unit tests, framework tool `collection_input_paths`, and the embedded Pulsar integration test.
3. `Leave metadata files alone when collection accessors need only paths`: review follow-up. Also deletes the now-unused model property.

## What changed

- `DatasetCollectionWrapper` builds `all_paths`, `all_metadata_files`, `get_all_staging_paths` and the `element_identifiers_extensions_paths_and_metadata_files` rows from the per-element `DatasetFilenameWrapper`s it already holds (`_dataset_elements_with_identifiers`, which flattens nested collections in element order). Paths are `str(element)`, so they carry `false_path` from `input_path_rewrite`. `serialize()` and `<inputs data_style="paths"|"staging_path_and_source_path"/>` pick this up through `wrapped_json.py` unchanged.
- `DatasetFilenameWrapper.all_metadata_files` maps each path through `input_metadata_rewrite` using a new `_job_metadata_path` helper, which `MetadataWrapper` now shares. This also fixes single-dataset `serialize()["metadata_files"]`.
- `all_paths` / `get_all_staging_paths` don't touch metadata, so Pulsar isn't asked to stage metadata files a paths-only tool never reads.
- Deleted `DatasetCollection.element_identifiers_extensions_paths_and_metadata_files` (model) and its `test_galaxy_mapping` assertion. It had no other caller, and its name was the bug.

## Testing

- Unit: `test/unit/app/tools/test_wrappers.py` 40 pass. The 2 `*_follow_compute_environment` tests fail on the base code. `test/unit/app/tools/` + `test_galaxy_mapping.py`: 1053 passed.
- Integration: `test/integration/test_pulsar_embedded_rewrite_parameters.py` (embedded Pulsar, `rewrite_parameters: true`, `default_file_action: copy`) passes; on the base code it fails at `ALL_PATHS` with an object-store path vs the `pulsar_staging/.../inputs/` path.
- Framework: `collection_input_paths`, `export_remote`, `inputs_as_json_with_paths`, `inputs_as_json_with_staging_paths`, `tool_provided_metadata_8` pass.

## Decisions

- Base `release_26.2`: the bug is on every supported release; the fix changes widely used tool accessors, so it targets the newest release.
- Element identifiers come from the collection wrapper's own element map, not `DatasetFilenameWrapper.element_identifier`, so job-cache `consumes_identifiers` behavior is unchanged.
- Intended behavior changes (all now matching what `#for $e in $collection` renders): output collection accessors use `output_path_rewrite`, LDDA elements are included, an unmaterialized deferred element renders its URI.
- Fix not yet pushed to the fork: the force-push after the review rebase was blocked by the permission classifier. The fork has the pre-review head `6d2f2cabcf4`.
