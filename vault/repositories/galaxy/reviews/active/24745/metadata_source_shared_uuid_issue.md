Discovered outputs with `metadata_source` share a metadata file with their input under `metadata_strategy: extended`

Under `metadata_strategy: extended` with `store_by: uuid`, a discovered collection output with `metadata_source` doesn't get its own metadata file. Its `metadata_file` row carries the input's uuid, so both datasets name the same `metadata_<uuid>.dat`.

This silently corrupts the input. When the job indexes the output, it overwrites the input's BAM index with the output's. Setting metadata on the output later does the same. Purging can also remove the shared file: pgcleanup's `RemovesMetadataFiles` actions already can, and #24745 would add `Dataset.full_delete()`.

## Reproduce

Test branch: https://github.com/jmchilton/galaxy/tree/metadata_source_extended_shared_uuid

It adds `test/integration/test_metadata_source_metadata_files.py` and a small test tool, `test/functional/tools/metadata_source_discovered.xml`. The tool has `<collection metadata_source="metadata_input">` with `discover_datasets`, and copies a different BAM into the discovered output: `1.bam` is the metadata source, `3.bam` is the output's data. The same tests run under `extended` and, as a control, `directory`.

```sh
pytest test/integration/test_metadata_source_metadata_files.py
```

| Test | `extended` | `directory` |
| --- | --- | --- |
| `test_output_row_has_own_uuid` | fails, same uuid on both rows | passes |
| `test_output_metadata_resolves_to_its_own_row` | fails, output resolves to the input's row | passes |
| `test_output_and_input_index_paths_differ` | fails, same path | passes |
| `test_tool_job_keeps_input_index` | fails, input's index bytes changed by the tool job | passes |
| `test_set_metadata_on_output_keeps_input_index` | fails, input's file overwritten by the output's set metadata job | passes |
| `test_output_index_matches_output_data` | passes, the shared file holds the output's index | passes |

The extended failures are expected until this is fixed, and the tests on that branch are red for that reason.

## How it happens

This comes from reading the code and fits the test results, but I didn't step through it in a running job.

1. `discover.py` calls `primary_data.init_meta(copy_from=metadata_source)` inside the job (`lib/galaxy/model/store/discover.py:256`).
2. In the job the session is sessionless and imported `MetadataFile` objects have no id, so `FileParameter.make_copy` treats the input's object as new and returns it instead of copying (`lib/galaxy/model/metadata.py:681-684`, the `value and not value.id` branch).
3. `Bam.set_meta` reuses that object and indexes into its path (`lib/galaxy/datatypes/binary.py:988`). `set_datasets_metadata` passes `overwrite=False` here (`discover.py:549`), but `Bam.set_meta` writes the index regardless.
4. Back on the handler, `replace_metadata_file` sees that the uuid's row belongs to another dataset and inserts a new row with the same uuid for the output (`lib/galaxy/model/store/__init__.py:274`).
5. `FileParameter.wrap` resolves the uuid to the oldest row, so the output's `metadata.bam_index` is the input's row (`lib/galaxy/model/metadata.py`, "metadata_file.uuid is not unique in existing databases").

Under `directory`, discovery runs on the handler, where the row has an id, so `make_copy` creates a new row with a new uuid.

## History

- `14dceed32b6` (2021) Enable re-import of exported MetadataFile objects: introduces `replace_metadata_file`.
- `c05028fb37d` (2022) Don't create a new MetadataFile if we don't need it: adds the `make_copy` early return.
- `b37de64b702` (2026, #23714, fixes #23690) Don't duplicate MetadataFile rows when re-importing edited metadata: reuses the dataset's own row, and deliberately keeps inserting for another dataset's uuid so a new dataset isn't left without a file. It also makes `wrap` tolerate duplicates.

## Verified and not verified

Verified, on `dev` at `a1ade917000` with SQLite and a disk object store:

- Everything in the table above, for `bam_index` on a discovered `list` collection output.

Not verified:

- When this started. The history above comes from reading it, and older releases weren't run.
- How many tools or production rows are affected. No test tool in the repo used `metadata_source` on a discovered collection, and production databases weren't checked. Rows with a duplicate uuid on different datasets would show it.
- Other datatypes with metadata files, remote object stores, and `extended_celery`.
- `store_by: id` under `extended`. It can't be reached the same way: a BAM uploaded in that configuration gets no index at all, because `MetadataFile.get_file_name` fails with "ID must be set before MetadataFile used without an HDA/LDDA" and the dataset still ends in `ok`. That looks like a separate problem.

## Direction

- Give a discovered output its own uuid and file when it takes metadata from an input, matching what `directory` does. `make_copy` could tell "new to this dataset" from "new, but belonging to another dataset" by checking the owner, rather than relying on the missing id.
- Existing duplicate rows stay, so anything that removes a metadata file by uuid still needs to tolerate them, and to keep the file while another unpurged row names it. #24745's review branch has a guard like this.
- Overwritten indexes can't be detected from the rows alone. Re-detecting metadata on the affected datasets would repair them while the primary data exists, provided each one gets its own file first.
