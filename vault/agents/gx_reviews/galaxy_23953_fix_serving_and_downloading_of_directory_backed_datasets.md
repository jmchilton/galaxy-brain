# galaxy#23953 — [26.1] Fix serving and downloading of directory-backed datasets

- PR: https://github.com/galaxyproject/galaxy/pull/23953 (mvdbeek, DRAFT, base `release_26.1`)
- Head reviewed: `9ac1627fc79` (5 commits, +347/-42, 9 files)
- Worktree: `~/projects/worktrees/galaxy/pr/23953`
- Related: [[galaxy_23956_add_content_path_to_dataset_wrappers_for_zarr_and_other_directory_datatypes]] (#23956, `$input.content_path`, base `dev`)
- Status: reviewed locally, review **unposted**.

## Summary

Four fixes, one commit each, each with a regression test:

1. One shared parser `parse_byte_range` (`lib/galaxy/web/framework/base.py:566`) now backs both the WSGI `send_file` path and FastAPI `GalaxyFileResponse` (`lib/galaxy/webapps/base/api.py:60`). Handles suffix ranges (`bytes=-N`, needed by zarrita.js for Zarr v3 shard indexes), clamps an end past EOF, returns 416 + `Content-Range: bytes */size` for unsatisfiable or malformed ranges, ignores multi-range/other units (serves 200).
2. `_serve_file_download` zips any `Directory` subclass (`data.py:497`), not just hard-coded `directory`/`zarr` — fixes empty downloads for `ome_zarr`, `bwa_index`, etc.
3. Collection zips include directory elements' extra files nested under `<collection>/<element>/` (`data.py:474`).
4. `HEAD` added to `/api/datasets/{id}/extra_files/raw/{path}`.

Local check: `test/unit/webapps/test_range_header.py` + `test_send_file.py` — 39 passed. API tests not run.

## Relation to #23956

- 23953 never needs a "content path": it serves and zips the **whole** `extra_files_path`; extra-file serving is relative to `extra_files_path`, and clients (Vizarr) add `store_root` themselves. So the two PRs don't disagree on what "the content" is — they work at different levels (raw extra files vs tool-facing store root).
- They do share one notion: "is this dataset directory-backed?" 23953 spells it `isinstance(datatype, Directory)` (twice here, plus the dev `is_archive_download` adaptation); 23956 adds a datatype hook `get_content_relpath()` where `None` means "single file" and `""`/`store_root` means directory-backed. One datatype-level predicate would serve both; worth a sentence on whichever lands second on dev.
- No textual conflict between the two PRs. `git merge-tree` of 4a81462fae5 × 9ac1627fc79 conflicts only in `data.py`, `base.py`, `test_datasets.py` and a toolshed test — all 26.1-vs-dev drift (dev moved the archive check into `Data.is_archive_download`, `data.py:504` on dev, still hard-coding `directory`/`zarr`). The PR body already calls out the needed one-line adaptation. Landing order is free; 23956 targets dev directly.

## Findings (ranked)

1. **Third range parser when starlette already ships one** (`base.py:559-596`, `api.py:60-68`, `api.py:173-186`). Pinned starlette 1.1.0's `FileResponse` implements RFC 9110 ranges — suffix, clamping, 416 with `bytes */size`, multi-range (`multipart/byteranges`), `If-Range`. `GalaxyFileResponse` only overrides `__call__` for x-sendfile and session release; delegating range handling to the superclass (`_parse_range_header` / `_handle_single_range` / `_handle_multiple_ranges`) would remove Galaxy's own range code from the FastAPI path. On the WSGI side, webob's `Range.range_for_length()` already resolves suffix/clamped ranges — the old bug came from using `.start` directly. Reasonable for a 26.1 bugfix to keep one shared parser; suggest a dev follow-up to drop the custom one for FastAPI. The private starlette methods are a real cost — say so.
2. **PR body is out of date with the last commit.** The body says a malformed header "is ignored, and the whole file is served with 200"; `9ac1627fc79` changes that to 416 (tests `bytes=a-b`, `bytes=-1-1` → 416). Both are allowed by RFC 9110 (§14.2 lets servers ignore Range; §15.5.17 lets 416 reject invalid ranges), but starlette answers malformed with 400 and other units with ignore — pick one and make the description match.
3. **`If-Range` still ignored** (pre-existing). A conditional range against a changed resource should get 200 + full body. Datasets are mostly immutable, so low impact — skip it, or get it free via finding 1.
4. **Layering**: `parse_byte_range` / `RangeNotSatisfiable` live in `galaxy.web.framework.base` (legacy WSGI framework) and are imported by `galaxy.webapps.base.api`. A neutral module (e.g. `galaxy.util`-level helper) would fit better if the parser stays. Nit.
5. **Merge-forward** — the dev adaptation to `is_archive_download(self, registry, extension)` needs `isinstance(self, Directory)`. The `extension` arg goes partly unused then; consider dropping the hard-coded `directory`/`zarr` appends there too so the two checks don't drift. Also covers the direct object-store download redirect (#22895).
6. Tests: good shape — red-to-green per commit, real API tests for the download/zip/HEAD behavior, unit tests only for the parser. `test_range_header.py` tests the private `_get_range_header` wrapper rather than `parse_byte_range` directly; testing the public parser plus the two end-to-end `GalaxyFileResponse` cases would be cleaner. Not blocking.
7. Imports at module top; typing fine (`Optional[tuple[int, int]]`). No obvious-comment noise.

## Draft GitHub review (UNPOSTED)

> *Posted by Claude (AI assistant) on behalf of jmchilton. Not written by them personally.*
>
> Thanks, a clear set of fixes. One commit per bug with a regression test made this easy to review. Directory subclasses downloading as empty files and collection zips dropping directory contents are both real user-facing bugs, and the `isinstance(..., Directory)` check is the right way to stop the hard-coded extension list drifting.
>
> A few points, none blocking for 26.1:
>
> - **Range parsing reuse.** The pinned starlette (1.1.0) `FileResponse` already handles RFC 9110 ranges: suffix ranges, clamping, 416 with `bytes */size`, multi-range and `If-Range`. `GalaxyFileResponse` mostly diverges for x-sendfile and releasing the DB session. Could it delegate range handling to the superclass, at least on dev, instead of keeping a Galaxy-specific parser? On the WSGI side, webob's `Range.range_for_length()` already resolves suffix and clamped ranges. I get why one shared parser is attractive for a release-branch fix. The cost is depending on starlette's private methods.
> - **Description vs. last commit.** The body says malformed headers are ignored and served with 200. `9ac1627fc79` now answers them with 416. Either is fine per RFC 9110, but the description should match.
> - **Location of `parse_byte_range`.** Putting it in `galaxy.web.framework.base` makes the FastAPI layer import from the legacy WSGI framework. A neutral module would be a little cleaner if the parser stays.
> - **Merge forward.** +1 to the `is_archive_download` adaptation in the description. Could the dev version also drop the hard-coded `directory`/`zarr` appends, so the two checks can't drift?
> - Minor: `test_range_header.py` exercises the private `_get_range_header`. Testing `parse_byte_range` directly, plus the `GalaxyFileResponse` cases you already have, would read more naturally.
>
> FYI, #23956 (`$input.content_path`) adds a datatype hook `get_content_relpath()` that also encodes "this dataset is directory-backed". Once both are on dev, a single datatype-level predicate could back `is_archive_download`, `to_archive` and the wrapper.

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- HTTP behavior changes on dataset/extra-file serving: malformed or unsatisfiable `Range` now gets 416 (some previously 500 or wrong bytes). This is an RFC-conformance fix, but a client that relied on lenient behavior would see a different status.
- Downloads of `ome_zarr`, `bwa_index`, `kmindex`, etc. become zip archives instead of empty files. Clearly a fix.
- Collection zips change layout for directory elements (now nested directories instead of a zero-byte file).
- Merge-forward needs a manual adaptation on dev (`is_archive_download`); if missed, the dev object-store download redirect would still serve empty primaries.

</details>

<details><summary>Risk Review Advice</summary>

Check the dev merge-forward: confirm `is_archive_download` gets the `Directory` check so the direct-download redirect path agrees with `_serve_file_download`. For range handling, decide whether malformed headers should be 416 or ignored, and whether Galaxy should keep its own parser or lean on starlette's on dev.

</details>
