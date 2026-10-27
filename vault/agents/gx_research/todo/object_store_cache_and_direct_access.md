# Component - Object Store Cache and Direct Access

Document how caching object stores (`CachingConcreteObjectStore` and the S3/boto3/Azure/cloud/rucio backends) serve bytes: `get_filename` and `sync_cache`, cache shards and eviction, `get_data_stream` (stream from backend, optional tee into cache, `write_cache`), `get_direct_download_url` / `_get_object_url` (`enable_direct_download`, presign lifetimes, `expires_in`), and the `extra_dir` / `extra_dir_at_root` / `alt_name` addressing used for metadata and extra files (`MetadataFile.object_store_path_kwargs`). Note how `Distributed`/`Hierarchical` stores dispatch these calls and which callers use each path (dataset display/download, job staging). Leave out private/BYOS stores (covered elsewhere) and quota accounting.

## Why

#22895 and #24484 grow a non-cache read path that several features now depend on; only [[Component - Dataset Display]] touches it, from the display side.

## Requested by

- vault/repositories/galaxy/reviews/active/24484: learning review needed the object store cache/stream/presign contract the PR widens.
