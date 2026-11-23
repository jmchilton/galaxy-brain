Thanks Marius, both great catches. You're right that the test only compared path strings and that `$e.metadata.bam_index` was staging the `.bai` files by itself.

I folded both of your suggestions into the existing test in 34c5ad8 rather than adding `collection_paths_echo` next to it, so the branch keeps one tool and one test for this:

- `collection_input_paths.xml` now `md5sum`s every input and metadata file path it was given. The test checks that each one is in Pulsar's staging directory and matches Galaxy's copy (your `_hda` / `md5_hash_file` comparison).
- A new `metadata_params` boolean turns off the `$x.metadata.bam_index` lines. The test runs both ways: `test_collection_and_metadata_file_accessors_give_staged_paths` and `test_metadata_file_accessors_stage_metadata_files_by_themselves`.

Both pass on the branch. With `release_26.2`'s `lib/` both fail, because `all_metadata_files` returns an `objects/_metadata_files/...` path where the `pulsar_staging/...` path should be. The commit has you as co-author.

I also updated the PR description so it claims the staging fix you found: on `release_26.2`, metadata files read only through `all_metadata_files` / `serialize()` never reached the Pulsar host.

Agreed on `staging_path_and_source_path`. It runs the same `serialize()` code the unit tests cover, so I didn't add a second tool to get around the first-configfile-only parsing.
