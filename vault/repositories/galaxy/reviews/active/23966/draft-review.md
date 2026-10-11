The datatype hook and real-job coverage are useful, and the focused tests pass. I found one reproducible path-construction issue:

**P2 — Percent-encode generated Zarr keys for HTTP requests** (`lib/galaxy/files/uris.py:192`).

`rel_path` comes from Zarr metadata as a literal storage key, but it is appended directly to the directory URL. A valid array named `a b` fails the HTTP source's unencoded-character check; `a#b` / `a?b` address a different request path, and `a%20b` addresses an escaped space rather than a literal percent sequence. I generated consolidated stores with Zarr and confirmed that all four end in dataset state `error` through `DatasetInstanceMaterializer.ensure_materialized()`, although their files exist. An in-memory control that encodes each HTTP key fixes all four and reads back `[1, 2, 3]`.

Could we encode keys at the HTTP URL boundary, retain literal names for the local destination and filesystem-backed sources, and add a round-trip regression with one of these legal names? The root URL should retain its existing encoding. The current HTTP fixtures have only simple ASCII node names.

Validation: 42 focused tests, the remote-materialization integration test, and the local API failed-materialization test passed. Reference-generated nested v2/v3 and sharded v3 stores also round-trip their values.

<details><summary>Risk assessment</summary>

The implementation can be rolled back, but tools/workflows will depend on the new directory materialization contract and the stricter failure policy for all deferred inputs. Discovery completeness and missing-chunk status classification affect scientific correctness. The documented incomplete-listing and S3 403 ambiguity, plus handler occupancy for large stores, merit explicit acceptance. After combining with #24005, verify a deferred wrapped directory uses the new normalization hook before persistence/metadata.

</details>
