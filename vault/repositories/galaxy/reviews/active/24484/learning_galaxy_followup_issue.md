# galaxy-brain research follow-up from #24484

## Stale documentation

[[Component - Galaxy Pulsar Runner Code Sharing]], Channel 2 paragraph:

- Says `pyproject.toml:75` lists `pulsar-galaxy-lib>=0.15.15`, pinned `==0.15.15` at `lib/galaxy/dependencies/pinned-requirements.txt:189`. On `dev` (merge-base `557e7f327839`) the floor is `>=0.16.0` at `pyproject.toml:79` and the pin is `==0.16.0` at `pinned-requirements.txt:205`.

## Post-merge activities

- [[Component - Galaxy Pulsar Runner Code Sharing]]: once #24484 and galaxyproject/pulsar#553 land, record the bumped `pulsar-galaxy-lib` pin (the runner passes `ClientInput(url=...)`, which 0.16.0 lacks) as another lockstep Galaxy↔Pulsar coupling, and the new `object_store_staging_redirect` entry in `MINIMUM_PULSAR_VERSIONS`.
- [[Component - Dataset Display]]: the `/api/datasets/{id}/download` row and #22895 notes cover the object store direct-download/streaming path. After merge `get_direct_download_url` and `get_data_stream` both accept `extra_dir`/`extra_dir_at_root`/`alt_name`, `get_data_stream` takes `write_cache`, and `get_direct_download_url` takes `expires_in` (user downloads keep the old defaults). Add a pointer to the new job staging consumer.
- Fulfil the two queued research requests (`pulsar_input_staging.md`, `object_store_cache_and_direct_access.md`) against merged code.
