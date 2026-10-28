# Stream or redirect metadata-file and extra-file downloads from remote object stores

Downloads of metadata files (e.g. BAM indexes) and of a dataset's extra files still pull the whole file into Galaxy's object store cache before sending a byte, even on stores where the primary dataset now streams or redirects.

| Request on a remote store (`dev`) | Primary file | Metadata file / extra file |
| --- | --- | --- |
| `GET /api/datasets/{id}/display` | streamed from the store while the cache fills (🔀 #23321) | — |
| `GET /api/datasets/{id}/download` | 302 to a presigned URL with `enable_direct_download` (🔀 #22895), else 302 to the streaming `display` | — |
| `GET /api/datasets/{id}/metadata_file?metadata_file=bam_index` (also `/api/histories/{history_id}/contents/{id}/metadata_file`) | — | **pulled into the cache first** |
| `GET /api/datasets/{id}/display?filename=<path>` | — | **pulled into the cache first** |

#22895 and #23321 fixed two problems for primary files on remote stores: requests that time out with 504 while a large object is pulled (🎯 #19255), and objects bigger than the cache that can't be downloaded at all. Metadata files and extra files still have both problems. The history panel's download menu links BAM/CRAM indexes through the `metadata_file` route, and the files inside composite datasets and HTML reports are served through `display?filename=`; both can be large.

<details><summary>Why these paths can't stream or redirect today</summary>

- `ObjectStore.get_data_stream(obj)` and `ObjectStore.get_direct_download_url(obj, content_disposition, content_type)` take no `extra_dir` / `extra_dir_at_root` / `alt_name`, so they can only address a dataset's primary file.
- `DatasetsService.get_metadata_file` returns `MetadataFile.get_file_name()`, which calls `object_store.get_filename(..., sync_cache=True)`.
- `display?filename=` (raw, or through `Data.display_data`) calls `get_filename(dataset, extra_dir=dataset.extra_files_path_name, alt_name=filename)`. `_stream_from_object_store` skips it because `is_direct_download_candidate` excludes any request with `filename`.
- A file larger than the store's cache can't be pulled at all (`_caching_allowed`), so these downloads fail outright where the primary file would stream.

</details>

<details><summary>Reproduction</summary>

A unit test on `dev` using a `boto3` store with `enable_direct_download: true`, a mocked S3 client, a cache of about 1 KB and a 5000-byte remote object. The same object is addressed as a primary file, then with the arguments `MetadataFile.get_file_name` and `display?filename=` use:

```
primary: get_data_stream: 5000 bytes streamed
primary: get_direct_download_url: https://s3.example.org/signed
metadata file: get_filename: ObjectNotFound (larger than cache)
metadata file: get_data_stream: TypeError: BaseObjectStore.get_data_stream() got an unexpected keyword argument 'extra_dir'
extra file: get_filename: ObjectNotFound (larger than cache)
```

Metadata file arguments: `extra_dir="_metadata_files", extra_dir_at_root=True, alt_name="metadata_7.dat"`. Extra file arguments: `extra_dir=<dataset files dir>, alt_name="tracks.bw"`.

</details>

## Context

A follow-up to 🔀 #22895 and 🔀 #23321; 🎯 #19255's discussion suggests not pulling into the cache for viewing or downloading at all. The open 🔀 #24484 adds addressing arguments to `get_data_stream` and `get_direct_download_url`, plus `MetadataFile.object_store_path_kwargs()`, but uses them only for Pulsar job input staging. Its description says composite-input extra files follow in a stacked PR, also for Pulsar staging. This issue covers the user-facing API routes and builds on #24484 once it merges. Display applications (IGV, UCSC, IGB) fetch datasets and indexes through the legacy `dataset/display_application` controller, which also pulls into the cache; that path is out of scope here.

## Proposed Approach

Pull the "redirect if enabled, else stream, else serve the cached file" gating, now split between the `download` and `display` routes, into one helper that takes an object plus its path arguments. The `metadata_file` route, an attachment download, uses all three. `display?filename=` only streams, keeping the rule that `display` never redirects, and its streamed response keeps the headers `display_data` sets today. HEAD and `Range` requests keep the cached-file path, as primary-file streaming already does, so the gain is for whole-file GETs.

<details><summary>Sketch</summary>

1. Helper, e.g. `DatasetsService._serve_from_object_store(trans, obj, *, path_kwargs, headers, allow_redirect, allow_stream)`, returning a redirect URL, a stream, or None for the caller's file fallback.
2. `get_metadata_file`: `obj=mf`, `path_kwargs=mf.object_store_path_kwargs()`, `allow_redirect=True`. The API handlers pass `allow_stream` from `_allows_stream(request)`.
3. `display?filename=`: `obj=dataset`, `path_kwargs={"extra_dir": dataset.extra_files_path_name, "alt_name": filename}`, `allow_redirect=False`. Compute the content type as `display_data` does (`_clean_and_set_mime_type`, the `sanitize_all_html` downgrade to `text/plain`) before streaming. A directory (the generated listing page) or a missing file falls back.
4. Tests: extend the gating tests in `test/unit/webapps/galaxy/services/test_datasets_service.py`. In `test/integration/objectstore/test_direct_download_redirect.py` and `test_tee_streaming.py`, upload a BAM and a composite dataset and assert that their metadata and extra files redirect or stream with the cache left empty.

</details>

## Alternative Approaches

Each route could call `get_data_stream` / `get_direct_download_url` inline, as the primary-file routes do today. That adds two more copies of the gating and fallback logic. Redirecting `display?filename=` as well would offload more traffic, but it reverses the no-redirect rule for `display` and breaks relative links in HTML reports. Raising cache size limits only hides the timeout and size problems.

<details><summary>Alternatives In Detail</summary>

### Alternative: Inline calls per route

<details><summary>Description</summary>

#### Details

Add stream/redirect calls directly in `get_metadata_file` and the `filename` branch of `display`.

#### Why the proposed approach is preferred

The candidate checks, header handling and close-on-error logic already exist in two places. A helper keeps a third and fourth copy from drifting.

</details>

### Alternative: Also redirect extra files

<details><summary>Description</summary>

#### Details

Let `display?filename=` 302 to a presigned URL when `enable_direct_download` is set.

#### Why the proposed approach is preferred

#22895 and #23321 kept `display` as the route that never redirects. An HTML report served from the bucket loses its relative links to sibling extra files and skips Galaxy's HTML sanitization headers.

</details>

### Alternative: Larger caches

<details><summary>Description</summary>

#### Details

Advise admins to size caches for their largest indexes and extra files.

#### Why the proposed approach is preferred

It doesn't fix the first-request pull latency that causes 504s, and cache space is per web process host.

</details>

</details>
