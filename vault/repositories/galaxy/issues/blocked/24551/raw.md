# Stream / direct-download metadata and extra files from object stores

**Blocked on #24484 merging.** Don't file until then; re-check its final shape first.

Found while researching [[Component - Object Store Cache and Direct Access]] (gx_research, 2026-10-28). Verified against `origin/dev` @ `7761eeb3256`.

## Problem

Caching object stores have three read paths: pull into cache (`get_filename`), tee stream (`get_data_stream`, #23321) and presigned redirect (`get_direct_download_url`, #22895). On dev the last two take only `obj` — no `extra_dir` / `extra_dir_at_root` / `alt_name` (`objectstore/__init__.py:414-437`) — so they can only serve the primary dataset file. Everything else is pulled whole into the web process's cache first, with the 504-on-large-object and bigger-than-cache failure modes #22895 was written to fix (#19255):

- **Metadata files** — `GET /api/histories/{history_id}/contents/{id}/metadata_file?metadata_file=...` (`webapps/galaxy/api/datasets.py:479`, `services/datasets.py:848+`) returns the `MetadataFile`'s cached path. BAM/CRAM indexes (`bam_index`, `bam_csi_index`), used by IGV/JBrowse/genome browsers, go through here.
- **Extra files** — `display?filename=<relpath>` (`services/datasets.py:794-800`) and composite/HTML report contents via `datatypes/data.py:601-604` address `extra_dir=<dataset_N_files>, alt_name=<relpath>` and always pull. `is_direct_download_candidate` (`services/datasets.py:105-116`) explicitly excludes `filename`.

## What #24484 gives us

Open PR #24484 ("Stage Pulsar job inputs from the object store by identity") adds:
- `get_direct_download_url(..., extra_dir, extra_dir_at_root, alt_name, expires_in)` and `get_data_stream(..., write_cache, extra_dir, extra_dir_at_root, alt_name)`, threaded through Nested/Concrete/caching layers.
- `MetadataFile.object_store_path_kwargs()`.

It uses them only for the new job staging route. Composite-input extra files are deferred to a stacked follow-up PR — check whether that follow-up already covers extra-file *display*; if so, narrow this to metadata files.

## Proposal

After #24484:
1. `get_metadata_file`: try `get_direct_download_url(mf, content_disposition=..., **mf.object_store_path_kwargs())` when the backend has `enable_direct_download`; else `get_data_stream(mf, **kwargs)` wrapped in `GalaxyStreamingResponse`; else today's file path. Keep Range support (genome browsers issue Range requests on indexes) — streaming is GET-without-Range only today (`api/datasets.py:147-155`), so a Range request should fall through to the cached file or the redirect.
2. `display?filename=`: same ladder with `extra_dir=dataset.extra_files_path_name, alt_name=filename`. Relax `is_direct_download_candidate` for `filename` only when the target is a plain file (not a directory listing). HTML reports referencing sibling files via relative URLs must keep working — a redirect changes the document's origin, so redirect probably only for non-HTML extra files; stream is safe for all.
3. Factor the stream-or-redirect-or-file ladder (`_stream_from_object_store` + `direct_download_url`) into one helper taking `obj` + path kwargs, so dataset, metadata file and extra file share it.

## Tests

- Unit: extend `test/unit/webapps/galaxy/services/test_datasets_service.py` gating tests for metadata files and `filename`.
- Integration: `test/integration/objectstore/test_direct_download_redirect.py` / `test_tee_streaming.py` (SeaweedFS) — add a BAM upload and assert the `bam_index` metadata file download redirects/streams with the cache left empty, and an extra file of a composite dataset likewise.

## Labels

kind/enhancement, area/objectstore, area/API. Related: #22895, #23321, #24484, #19255.
