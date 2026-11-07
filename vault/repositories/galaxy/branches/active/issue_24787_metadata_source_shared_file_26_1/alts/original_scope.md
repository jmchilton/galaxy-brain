# Original scope

`issue_24787_metadata_source_shared_file_26_1_alt_original_scope` at `b0de86460d8`.

Stops new discovered `metadata_source` outputs from sharing their input's metadata file, in `FileParameter.make_copy` only. It leaves outputs created before the fix able to destroy their input's index.

The parent adds a `from_external_value` check, so setting metadata on an affected output gives it its own file, and a pgcleanup guard that keeps a file a live row still names.
