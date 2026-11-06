- [x] P1 1: Purging a dataset can delete the metadata file of a live dataset under `store_by: uuid`
- [x] P2 1: API library purge leaves metadata files behind when an HDA copy or older version exists
- [x] P2 2: `purge_deleted_histories` and `purge_hdas_of_purged_histories` mark files purged without removing them
- [x] P2 3: The deviation from legacy, multiple versions, events and repeat runs have no test
- [x] P3 1: Metadata file addressing belongs on `MetadataFile`
- [x] P3 2: Showing a purged library dataset recreates its metadata file empty
- [x] P3 3: `full_delete()` re-deletes metadata files that are already purged
- [x] P3 4: Every job-cache hit runs the metadata query for nothing
- [x] P3 5: `--force-retry` can't retry a library metadata file whose removal failed
- [x] P3 6: API tests reach into app internals

Other Actions:
